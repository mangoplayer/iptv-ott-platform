import { NextRequest, NextResponse } from 'next/server';

// No caching for stream proxy
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to rewrite HLS manifest URLs to use our proxy
async function rewriteHlsManifest(manifest: string, baseUrl: string, requestUrl: string): Promise<string> {
  // Get the base URL for the manifest
  const manifestUrl = new URL(baseUrl);
  const manifestPath = manifestUrl.pathname.split('/');
  manifestPath.pop(); // Remove the filename
  const manifestBase = manifestPath.join('/');
  
  // Get our proxy base URL
  const proxyUrl = new URL(requestUrl);
  const proxyBase = `${proxyUrl.protocol}//${proxyUrl.host}/api/stream-proxy`;
  
  console.log('Rewriting manifest with base URL:', manifestUrl.toString());
  console.log('Manifest base path:', manifestBase);
  console.log('Proxy base URL:', proxyBase);
  
  // First, handle any #EXT-X-STREAM-INF lines (variant playlists)
  // These lines are followed by a URI on the next line
  let lines = manifest.split('\n');
  let inStreamInf = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      inStreamInf = true;
      continue;
    }
    
    if (inStreamInf && !line.startsWith('#')) {
      // This is a URI line after #EXT-X-STREAM-INF
      inStreamInf = false;
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Construct the full URL for the variant playlist
      const fullUrl = line.startsWith('http') 
        ? line 
        : line.startsWith('/') 
          ? `${manifestUrl.protocol}//${manifestUrl.host}${line}`
          : `${manifestUrl.protocol}//${manifestUrl.host}${manifestBase}/${line}`;
      
      console.log('Rewriting variant playlist URL:', line, 'to', fullUrl);
      lines[i] = `${proxyBase}?url=${encodeURIComponent(fullUrl)}`;
    }
  }
  
  // Join back into a string
  let rewrittenManifest = lines.join('\n');
  
  // Replace absolute URLs for segments
  rewrittenManifest = rewrittenManifest.replace(
    /(https?:\/\/[^"'\s]+\.ts)/g,
    (match) => {
      console.log('Rewriting absolute TS URL:', match);
      return `${proxyBase}?url=${encodeURIComponent(match)}`;
    }
  );
  
  // Replace relative URLs for segments (those that don't start with http)
  rewrittenManifest = rewrittenManifest.replace(
    /^(?!#)([^#][^"'\s]+\.ts)/gm,
    (match) => {
      // Skip if it's already a full URL
      if (match.startsWith('http')) return match;
      
      // Construct the full URL
      const fullUrl = match.startsWith('/')
        ? `${manifestUrl.protocol}//${manifestUrl.host}${match}`
        : `${manifestUrl.protocol}//${manifestUrl.host}${manifestBase}/${match}`;
      
      console.log('Rewriting relative TS URL:', match, 'to', fullUrl);
      return `${proxyBase}?url=${encodeURIComponent(fullUrl)}`;
    }
  );
  
  // Replace relative URLs for other manifests
  rewrittenManifest = rewrittenManifest.replace(
    /^(?!#)([^#][^"'\s]+\.m3u8)/gm,
    (match) => {
      // Skip if it's already a full URL
      if (match.startsWith('http')) return match;
      
      // Construct the full URL
      const fullUrl = match.startsWith('/')
        ? `${manifestUrl.protocol}//${manifestUrl.host}${match}`
        : `${manifestUrl.protocol}//${manifestUrl.host}${manifestBase}/${match}`;
      
      console.log('Rewriting relative m3u8 URL:', match, 'to', fullUrl);
      return `${proxyBase}?url=${encodeURIComponent(fullUrl)}`;
    }
  );
  
  // Handle key URLs (for encrypted streams)
  rewrittenManifest = rewrittenManifest.replace(
    /#EXT-X-KEY:METHOD=([^,]+),URI="([^"]+)"/g,
    (match, method, uri) => {
      // Skip if it's already proxied
      if (uri.includes('/api/stream-proxy')) return match;
      
      // Construct the full URL
      const fullUrl = uri.startsWith('http') 
        ? uri 
        : uri.startsWith('/') 
          ? `${manifestUrl.protocol}//${manifestUrl.host}${uri}`
          : `${manifestUrl.protocol}//${manifestUrl.host}${manifestBase}/${uri}`;
      
      console.log('Rewriting key URL:', uri, 'to', fullUrl);
      return `#EXT-X-KEY:METHOD=${method},URI="${proxyBase}?url=${encodeURIComponent(fullUrl)}"`;
    }
  );
  
  // Handle map URLs (for fMP4 segments)
  rewrittenManifest = rewrittenManifest.replace(
    /#EXT-X-MAP:URI="([^"]+)"/g,
    (match, uri) => {
      // Skip if it's already proxied
      if (uri.includes('/api/stream-proxy')) return match;
      
      // Construct the full URL
      const fullUrl = uri.startsWith('http') 
        ? uri 
        : uri.startsWith('/') 
          ? `${manifestUrl.protocol}//${manifestUrl.host}${uri}`
          : `${manifestUrl.protocol}//${manifestUrl.host}${manifestBase}/${uri}`;
      
      console.log('Rewriting map URL:', uri, 'to', fullUrl);
      return `#EXT-X-MAP:URI="${proxyBase}?url=${encodeURIComponent(fullUrl)}"`;
    }
  );
  
  return rewrittenManifest;
}

export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }
    
    console.log(`Stream proxy request for: ${url}`);
    
    // Fetch the content with retry logic
    let response;
    let retries = 5; // Increased retries
    let backoffDelay = 1000; // Start with 1s delay
    
    while (retries > 0) {
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': new URL(url).origin,
            'Referer': new URL(url).origin,
          },
          cache: 'no-store',
          credentials: 'include', // Include cookies for cross-origin requests
          mode: 'cors',
          keepalive: true,
        });
        
        if (response.ok) {
          console.log(`Successfully fetched ${url} with status ${response.status}`);
          break;
        }
        
        console.log(`Retry ${6 - retries} for ${url}: Status ${response.status} ${response.statusText}`);
        retries--;
        
        if (retries > 0) {
          // Exponential backoff with jitter
          const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 jitter factor
          const delay = backoffDelay * jitter;
          console.log(`Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
          backoffDelay = Math.min(backoffDelay * 2, 10000); // Double delay up to 10s max
        }
      } catch (error: any) {
        console.error(`Fetch error (${6 - retries}):`, error.message || error);
        retries--;
        
        if (retries > 0) {
          // Exponential backoff with jitter
          const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 jitter factor
          const delay = backoffDelay * jitter;
          console.log(`Waiting ${delay}ms before retry after error`);
          await new Promise(resolve => setTimeout(resolve, delay));
          backoffDelay = Math.min(backoffDelay * 2, 10000); // Double delay up to 10s max
        } else {
          throw error;
        }
      }
    }
    
    if (!response || !response.ok) {
      console.error(`Stream proxy error: ${response?.status} ${response?.statusText}`);
      
      // If we have a response but it's not OK, try to get the response body for more info
      let errorBody = '';
      if (response) {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorJson = await response.json();
            errorBody = JSON.stringify(errorJson);
          } else {
            errorBody = await response.text();
          }
        } catch (e) {
          console.error('Error reading error response:', e);
        }
      }
      
      return NextResponse.json(
        { 
          error: `Failed to fetch stream: ${response?.statusText || 'Unknown error'}`,
          status: response?.status,
          details: errorBody || undefined
        },
        { status: response?.status || 500 }
      );
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType || 'unknown'}`);
    
    // Log all headers for debugging
    console.log('Response headers:');
    response.headers.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });
    
    // Check if this is an HLS manifest
    const isHlsManifest = 
      (contentType?.includes('application/vnd.apple.mpegurl') || 
       contentType?.includes('application/x-mpegurl') ||
       url.endsWith('.m3u8')) &&
      !url.includes('.ts');
    
    // For HLS manifests, we need to rewrite the URLs
    if (isHlsManifest) {
      console.log('Detected HLS manifest, rewriting URLs');
      const manifestText = await response.text();
      
      // Log the original manifest for debugging
      console.log('Original manifest:');
      console.log(manifestText.substring(0, 500) + (manifestText.length > 500 ? '...' : ''));
      
      const rewrittenManifest = await rewriteHlsManifest(manifestText, url, request.url);
      
      // Log the rewritten manifest for debugging
      console.log('Rewritten manifest:');
      console.log(rewrittenManifest.substring(0, 500) + (rewrittenManifest.length > 500 ? '...' : ''));
      
      return new NextResponse(rewrittenManifest, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
          'Access-Control-Allow-Credentials': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    
    // For other content (like TS segments), just proxy as-is
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': response.headers.get('content-length') || '',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Stream proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Origin, Accept, Authorization',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}