import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // No caching

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = 'GET', headers = {}, data = null } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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
    const response = await fetch(fetchUrl, fetchOptions);
    
    if (!response.ok) {
      console.error(`Proxy error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Proxy request failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': contentType || 'text/plain',
        },
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