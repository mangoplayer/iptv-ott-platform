import { NextRequest, NextResponse } from 'next/server';
import { cache } from 'react';

// Cache for 5 minutes by default
export const dynamic = 'force-dynamic';
export const revalidate = 300;

// Simple in-memory cache for rate limiting
const requestCache = new Map<string, { data: any; timestamp: number }>();
const requestQueue = new Map<string, Promise<any>>();
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Cache GET requests
const cachedFetch = cache(async (cacheKey: string, url: string, options: RequestInit) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
});

// Helper to generate a cache key from request details
function generateCacheKey(url: string, method: string, data: any): string {
  const baseKey = `${method}:${url}`;
  if (data && method === 'GET') {
    return `${baseKey}:${JSON.stringify(data)}`;
  }
  return baseKey;
}

// Helper to check if we should use cached data
function shouldUseCache(cacheKey: string, method: string): boolean {
  if (method !== 'GET') return false;
  
  const cached = requestCache.get(cacheKey);
  if (!cached) return false;
  
  // Cache valid for 5 minutes (300000ms)
  const now = Date.now();
  return now - cached.timestamp < 300000;
}

// Helper to handle rate limiting
function checkRateLimit(domain: string): boolean {
  const now = Date.now();
  const limit = rateLimit.get(domain);
  
  if (!limit) {
    // Initialize rate limit for this domain
    rateLimit.set(domain, { count: 1, resetTime: now + 60000 }); // Reset after 1 minute
    return true;
  }
  
  // Reset counter if time has passed
  if (now > limit.resetTime) {
    rateLimit.set(domain, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  // Check if we're over the limit (10 requests per minute per domain)
  if (limit.count >= 10) {
    return false;
  }
  
  // Increment counter
  limit.count += 1;
  rateLimit.set(domain, limit);
  return true;
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = 'GET', headers = {}, data = null, bypassCache = false } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Generate a cache key for this request
    const cacheKey = generateCacheKey(url, method, data);
    const domain = extractDomain(url);
    
    // Check if we have a cached response and should use it
    if (!bypassCache && shouldUseCache(cacheKey, method)) {
      console.log(`Using cached response for: ${url}`);
      const cached = requestCache.get(cacheKey);
      return NextResponse.json(cached?.data);
    }
    
    // Check if this request is already in progress
    if (requestQueue.has(cacheKey)) {
      console.log(`Request already in progress for: ${url}, waiting...`);
      try {
        const result = await requestQueue.get(cacheKey);
        return NextResponse.json(result);
      } catch (error) {
        // If the queued request failed, we'll try again
        console.log(`Queued request failed, retrying: ${url}`);
      }
    }
    
    // Check rate limiting
    if (!checkRateLimit(domain)) {
      console.log(`Rate limit exceeded for domain: ${domain}`);
      
      // Return cached data if available, even if expired
      const cached = requestCache.get(cacheKey);
      if (cached) {
        console.log(`Returning stale cached data due to rate limiting`);
        return NextResponse.json(cached.data, {
          headers: {
            'X-Rate-Limited': 'true',
            'X-Cache-Status': 'stale'
          }
        });
      }
      
      // If no cache available, return 429 with retry-after header
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { 
          status: 429,
          headers: {
            'Retry-After': '60'
          }
        }
      );
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      cache: 'no-store',
    };

    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    // For GET requests with data, append as query params
    let fetchUrl = url;
    if (method === 'GET' && data) {
      const queryParams = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      fetchUrl = `${url}${url.includes('?') ? '&' : '?'}${queryParams.toString()}`;
    }

    console.log(`Proxying request to: ${fetchUrl}`);
    
    // Create a promise for this request and add it to the queue
    const fetchPromise = (async () => {
      try {
        // Implement retry logic for 429 responses
        let retries = 3;
        let delay = 1000; // Start with 1 second delay
        
        while (retries > 0) {
          try {
            const response = await fetch(fetchUrl, fetchOptions);
            
            // Handle rate limiting from the target server
            if (response.status === 429) {
              console.log(`Received 429 from target server, retrying after delay...`);
              retries--;
              
              // Get retry-after header or use exponential backoff
              const retryAfter = response.headers.get('retry-after');
              const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
              
              await new Promise(resolve => setTimeout(resolve, waitTime));
              delay *= 2; // Exponential backoff
              continue;
            }
            
            if (!response.ok) {
              console.error(`Proxy error: ${response.status} ${response.statusText}`);
              throw new Error(`Proxy request failed with status ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            let responseData;
            
            if (contentType?.includes('application/json')) {
              responseData = await response.json();
            } else {
              responseData = await response.text();
            }
            
            // Cache successful GET responses
            if (method === 'GET') {
              requestCache.set(cacheKey, { 
                data: responseData, 
                timestamp: Date.now() 
              });
            }
            
            return responseData;
          } catch (error) {
            if (retries <= 1) throw error;
            
            retries--;
            console.log(`Request failed, retrying (${retries} left): ${error}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          }
        }
        
        throw new Error('Max retries exceeded');
      } finally {
        // Remove this request from the queue when done
        requestQueue.delete(cacheKey);
      }
    })();
    
    // Add to queue
    requestQueue.set(cacheKey, fetchPromise);
    
    // Wait for the result
    const result = await fetchPromise;
    
    // Return the appropriate response
    if (typeof result === 'string') {
      return new NextResponse(result, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Cache-Status': 'miss'
        },
      });
    } else {
      return NextResponse.json(result, {
        headers: {
          'X-Cache-Status': 'miss'
        }
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}