import axios from 'axios';
import {
  XtreamApiEndpoints,
  XtreamAuthResponse,
  XtreamCredentials,
  XtreamEpgListings,
  XtreamLiveCategory,
  XtreamLiveStream,
  XtreamSeriesCategory,
  XtreamSeries,
  XtreamSeriesInfo,
  XtreamVodCategory,
  XtreamVodInfo,
  XtreamVodStream,
} from '../types/xtream';

// Helper function to use proxy for API requests with retry logic
async function proxyRequest<T>(
  url: string, 
  params: Record<string, any>, 
  options: { 
    bypassCache?: boolean;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const { bypassCache = false, retries = 3, retryDelay = 1000 } = options;
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use our proxy API route
      const response = await axios.post('/api/proxy', {
        url,
        method: 'GET',
        data: params,
        bypassCache,
      });
      
      return response.data;
    } catch (error: any) {
      lastError = error;
      
      // If we get a 429 Too Many Requests error
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 
                          error.response.data?.retryAfter || 
                          Math.pow(2, attempt);
                          
        console.log(`Rate limited (429), waiting ${retryAfter}s before retry ${attempt + 1}/${retries}`);
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }
      
      // For other errors, use exponential backoff if we have retries left
      if (attempt < retries) {
        const waitTime = retryDelay * Math.pow(2, attempt);
        console.log(`Request failed, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If we've exhausted all retries or it's not a retryable error
      console.error('Proxy request failed after retries:', error);
      throw error;
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError;
}

class XtreamAPI {
  private credentials: XtreamCredentials | null = null;
  private endpoints: XtreamApiEndpoints | null = null;

  /**
   * Initialize the API with credentials
   */
  public initialize(credentials: XtreamCredentials): void {
    this.credentials = credentials;
    
    // Normalize server URL (remove trailing slash if present)
    const serverUrl = credentials.serverUrl.endsWith('/')
      ? credentials.serverUrl.slice(0, -1)
      : credentials.serverUrl;
    
    this.endpoints = {
      player_api: `${serverUrl}/player_api.php`,
      xmltv_api: `${serverUrl}/xmltv.php`,
      stream_base_url: serverUrl,
    };
  }

  /**
   * Check if the API is initialized
   */
  private isInitialized(): boolean {
    if (!this.credentials || !this.endpoints) {
      console.error('XtreamAPI is not initialized. Call initialize() first.');
      return false;
    }
    return true;
  }

  /**
   * Authenticate user and get account info
   */
  public async authenticate(): Promise<XtreamAuthResponse> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for authentication
      const data = await proxyRequest<XtreamAuthResponse>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
      });

      return data;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate with Xtream server');
    }
  }

  /**
   * Get live TV categories
   */
  public async getLiveCategories(): Promise<XtreamLiveCategory[]> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for live categories
      const data = await proxyRequest<XtreamLiveCategory[]>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_live_categories',
      });

      return data;
    } catch (error) {
      console.error('Error fetching live categories:', error);
      throw new Error('Failed to fetch live TV categories');
    }
  }

  /**
   * Get live streams (channels)
   */
  public async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      const params: any = {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_live_streams',
      };

      if (categoryId) {
        params.category_id = categoryId;
      }

      // Use proxy for live streams
      const data = await proxyRequest<XtreamLiveStream[]>(this.endpoints.player_api, params);

      return data;
    } catch (error) {
      console.error('Error fetching live streams:', error);
      throw new Error('Failed to fetch live TV channels');
    }
  }

  /**
   * Get VOD (movie) categories
   */
  public async getVodCategories(): Promise<XtreamVodCategory[]> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for VOD categories
      const data = await proxyRequest<XtreamVodCategory[]>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_vod_categories',
      });

      return data;
    } catch (error) {
      console.error('Error fetching VOD categories:', error);
      throw new Error('Failed to fetch movie categories');
    }
  }

  /**
   * Get VOD streams (movies)
   */
  public async getVodStreams(categoryId?: string): Promise<XtreamVodStream[]> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      const params: any = {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_vod_streams',
      };

      if (categoryId) {
        params.category_id = categoryId;
      }

      // Use proxy for VOD streams
      const data = await proxyRequest<XtreamVodStream[]>(this.endpoints.player_api, params);

      return data;
    } catch (error) {
      console.error('Error fetching VOD streams:', error);
      throw new Error('Failed to fetch movies');
    }
  }

  /**
   * Get VOD info (movie details)
   */
  public async getVodInfo(vodId: number): Promise<XtreamVodInfo> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for VOD info
      const data = await proxyRequest<XtreamVodInfo>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_vod_info',
        vod_id: vodId,
      });

      return data;
    } catch (error) {
      console.error('Error fetching VOD info:', error);
      throw new Error('Failed to fetch movie details');
    }
  }

  /**
   * Get series categories
   */
  public async getSeriesCategories(): Promise<XtreamSeriesCategory[]> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for series categories
      const data = await proxyRequest<XtreamSeriesCategory[]>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_series_categories',
      });

      return data;
    } catch (error) {
      console.error('Error fetching series categories:', error);
      throw new Error('Failed to fetch TV series categories');
    }
  }

  /**
   * Get series
   */
  public async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      const params: any = {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_series',
      };

      if (categoryId) {
        params.category_id = categoryId;
      }

      // Use proxy for series
      const data = await proxyRequest<XtreamSeries[]>(this.endpoints.player_api, params);

      return data;
    } catch (error) {
      console.error('Error fetching series:', error);
      throw new Error('Failed to fetch TV series');
    }
  }

  /**
   * Get series info (details, seasons, episodes)
   */
  public async getSeriesInfo(seriesId: number): Promise<XtreamSeriesInfo> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for series info
      const data = await proxyRequest<XtreamSeriesInfo>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_series_info',
        series_id: seriesId,
      });

      return data;
    } catch (error) {
      console.error('Error fetching series info:', error);
      throw new Error('Failed to fetch TV series details');
    }
  }

  /**
   * Get EPG for a specific channel
   */
  public async getEpg(streamId: number): Promise<XtreamEpgListings> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for EPG
      const data = await proxyRequest<XtreamEpgListings>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_short_epg',
        stream_id: streamId,
      });

      return data;
    } catch (error) {
      console.error('Error fetching EPG:', error);
      throw new Error('Failed to fetch program guide');
    }
  }

  /**
   * Get EPG for a specific channel for a specific timeframe
   */
  public async getEpgWithTimeframe(streamId: number, limit: number): Promise<XtreamEpgListings> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for EPG with timeframe
      const data = await proxyRequest<XtreamEpgListings>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_short_epg',
        stream_id: streamId,
        limit,
      });

      return data;
    } catch (error) {
      console.error('Error fetching EPG with timeframe:', error);
      throw new Error('Failed to fetch program guide');
    }
  }

  /**
   * Get all EPG for a specific channel
   */
  public async getAllEpg(streamId: number): Promise<XtreamEpgListings> {
    if (!this.isInitialized() || !this.endpoints) {
      throw new Error('API not initialized');
    }

    try {
      // Use proxy for all EPG
      const data = await proxyRequest<XtreamEpgListings>(this.endpoints.player_api, {
        username: this.credentials?.username,
        password: this.credentials?.password,
        action: 'get_simple_data_table',
        stream_id: streamId,
      });

      return data;
    } catch (error) {
      console.error('Error fetching all EPG:', error);
      throw new Error('Failed to fetch program guide');
    }
  }

  /**
   * Get stream URL for live TV
   */
  public getLiveStreamUrl(streamId: number): string {
    if (!this.isInitialized() || !this.endpoints || !this.credentials) {
      throw new Error('API not initialized');
    }

    return `${this.endpoints.stream_base_url}/live/${this.credentials.username}/${this.credentials.password}/${streamId}.ts`;
  }

  /**
   * Get stream URL for VOD (movie)
   */
  public getVodStreamUrl(vodId: number, extension: string = 'mp4'): string {
    if (!this.isInitialized() || !this.endpoints || !this.credentials) {
      throw new Error('API not initialized');
    }

    return `${this.endpoints.stream_base_url}/movie/${this.credentials.username}/${this.credentials.password}/${vodId}.${extension}`;
  }

  /**
   * Get stream URL for series episode
   */
  public getSeriesStreamUrl(seriesId: number, episodeId: number, extension: string = 'mp4'): string {
    if (!this.isInitialized() || !this.endpoints || !this.credentials) {
      throw new Error('API not initialized');
    }

    return `${this.endpoints.stream_base_url}/series/${this.credentials.username}/${this.credentials.password}/${episodeId}.${extension}`;
  }
}

// Export a singleton instance
export const xtreamApi = new XtreamAPI();