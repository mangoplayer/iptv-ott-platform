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
  
  // Replace absolute URLs
  let rewrittenManifest = manifest.replace(
    /(https?:\/\/[^"'\s]+)/g,
    (match) => `${proxyBase}?url=${encodeURIComponent(match)}`
  );
  
  // Replace relative URLs (those that don't start with http)
  rewrittenManifest = rewrittenManifest.replace(
    /^(?!#)([^#][^"'\s]+\.ts|[^#][^"'\s]+\.m3u8)/gm,
    (match) => {
      // Construct the full URL
      const fullUrl = match.startsWith('/')
        ? `${manifestUrl.protocol}//${manifestUrl.host}${match}`
        : `${manifestUrl.protocol}//${manifestUrl.host}${manifestBase}/${match}`;
      
      return `${proxyBase}?url=${encodeURIComponent(fullUrl)}`;
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
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          cache: 'no-store',
        });
        
        if (response.ok) break;
        
        console.log(`Retry ${4 - retries} for ${url}: Status ${response.status}`);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Fetch error (${4 - retries}):`, error);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
    
    if (!response || !response.ok) {
      console.error(`Stream proxy error: ${response?.status} ${response?.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch stream: ${response?.statusText || 'Unknown error'}` },
        { status: response?.status || 500 }
      );
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type');
    
    // Check if this is an HLS manifest
    const isHlsManifest = 
      (contentType?.includes('application/vnd.apple.mpegurl') || 
       contentType?.includes('application/x-mpegurl') ||
       url.endsWith('.m3u8')) &&
      !url.includes('.ts');
    
    // For HLS manifests, we need to rewrite the URLs
    if (isHlsManifest) {
      console.log('Rewriting HLS manifest URLs');
      const manifestText = await response.text();
      const rewrittenManifest = await rewriteHlsManifest(manifestText, url, request.url);
      
      return new NextResponse(rewrittenManifest, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}