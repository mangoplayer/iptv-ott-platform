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
import { rateLimiter } from '../utils/rate-limiter';

// Helper function to use proxy for API requests with retry logic
async function proxyRequest<T>(
  url: string, 
  params: Record<string, any>, 
  options: { 
    bypassCache?: boolean;
    retries?: number;
    retryDelay?: number;
    categoryId?: string;
  } = {}
): Promise<T> {
  const { bypassCache = false, retries = 3, retryDelay = 1000, categoryId } = options;
  let lastError: any = null;
  
  // Add jitter to prevent thundering herd problem
  const getJitteredDelay = (baseDelay: number) => {
    return baseDelay * (0.8 + Math.random() * 0.4); // +/- 20% jitter
  };
  
  // Generate a cache key for this request
  const requestKey = `${url}-${JSON.stringify(params)}`;
  
  // Check if we have cached data for this request
  if (!bypassCache && rateLimiter.hasCachedData(requestKey)) {
    console.log(`Using cached data for request: ${url}`);
    return rateLimiter.getCachedData(requestKey);
  }
  
  // Check if this request is already in progress
  if (rateLimiter.isRequestInProgress(requestKey)) {
    console.log(`Request already in progress: ${url}, waiting...`);
    try {
      const result = await rateLimiter.getQueuedRequest(requestKey);
      return result;
    } catch (error) {
      console.log(`Queued request failed, will retry: ${url}`);
      // Continue with a new request
    }
  }
  
  // Extract domain for rate limiting
  const domain = new URL(url).hostname;
  
  // Check rate limiting
  if (rateLimiter.isRateLimited(domain)) {
    console.log(`Rate limited for domain: ${domain}`);
    
    // If we have cached data, return it even if expired
    if (rateLimiter.hasCachedData(requestKey)) {
      console.log(`Using stale cached data due to rate limiting`);
      return rateLimiter.getCachedData(requestKey);
    }
    
    // Wait for rate limit to reset
    const timeToWait = Math.min(rateLimiter.getTimeUntilReset(domain), 10000); // Max 10s wait
    console.log(`Waiting ${timeToWait}ms for rate limit to reset`);
    await new Promise(resolve => setTimeout(resolve, timeToWait));
  }
  
  // Create a promise for this request
  const fetchPromise = (async () => {
    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          console.log(`Making request to ${url} (attempt ${attempt + 1}/${retries + 1})`);
          
          // Use our proxy API route
          const response = await axios.post('/api/proxy', {
            url,
            method: 'GET',
            data: params,
            bypassCache,
          });
          
          // Check if the response is valid
          if (!response.data) {
            throw new Error('Empty response received');
          }
          
          // Check for error messages in the response
          if (typeof response.data === 'object' && response.data.error) {
            throw new Error(`API error: ${response.data.error}`);
          }
          
          // Cache successful responses
          rateLimiter.cacheData(requestKey, response.data);
          
          return response.data;
        } catch (error: any) {
          lastError = error;
          console.error(`Request error:`, error.message || error);
          
          // If we get a 429 Too Many Requests error
          if (error.response?.status === 429 || 
              (error.message && error.message.includes('429')) ||
              (error.message && error.message.includes('Too Many Requests'))) {
            
            // Get retry delay from headers or use exponential backoff with jitter
            const retryAfter = error.response?.headers?.['retry-after'] || 
                              error.response?.data?.retryAfter || 
                              Math.pow(2, attempt + 2); // Start with 4s and increase
            
            const delayWithJitter = getJitteredDelay(retryAfter * 1000);
            
            console.log(`Rate limited (429), waiting ${delayWithJitter/1000}s before retry ${attempt + 1}/${retries}`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delayWithJitter));
            continue;
          }
          
          // For other errors, only retry server errors (5xx) or network errors
          if (attempt < retries && (
            !error.response || // Network error
            error.response?.status >= 500 || // Server error
            error.message?.includes('timeout') || // Timeout
            error.message?.includes('Network Error') // Generic network error
          )) {
            const delay = getJitteredDelay(retryDelay * Math.pow(2, attempt));
            console.log(`Request failed, retrying in ${delay}ms (${attempt + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If we've exhausted retries or it's a client error, throw
          throw error;
        }
      }
      
      // If we get here, we've exhausted retries
      throw lastError;
    } finally {
      // Remove this request from the queue when done
      rateLimiter.removeQueuedRequest(requestKey);
    }
  })();
  
  // Add to queue
  rateLimiter.queueRequest(requestKey, fetchPromise);
  
  // Wait for the result
  return await fetchPromise;
}

class XtreamAPI {
  private serverUrl: string | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private apiEndpoints: XtreamApiEndpoints | null = null;
  
  // Initialize API with credentials
  public initialize(credentials: XtreamCredentials): void {
    this.serverUrl = credentials.serverUrl;
    this.username = credentials.username;
    this.password = credentials.password;
    
    // Set up API endpoints
    this.apiEndpoints = {
      authenticate: `${this.serverUrl}/player_api.php`,
      panel: `${this.serverUrl}/panel_api.php`,
      xmltv: `${this.serverUrl}/xmltv.php`,
      playerApi: `${this.serverUrl}/player_api.php`,
    };
  }
  
  // Check if API is initialized
  public isInitialized(): boolean {
    return !!(this.serverUrl && this.username && this.password && this.apiEndpoints);
  }
  
  // Get stored credentials
  public getCredentials(): XtreamCredentials | null {
    if (!this.isInitialized()) return null;
    
    return {
      serverUrl: this.serverUrl!,
      username: this.username!,
      password: this.password!,
    };
  }
  
  // Authenticate user
  public async authenticate(credentials?: XtreamCredentials): Promise<XtreamAuthResponse> {
    if (credentials) {
      this.initialize(credentials);
    }
    
    if (!this.isInitialized()) {
      throw new Error('API not initialized. Please provide credentials.');
    }
    
    try {
      const response = await proxyRequest<XtreamAuthResponse>(
        this.apiEndpoints!.authenticate,
        {
          username: this.username,
          password: this.password,
        },
        { retries: 5 } // More retries for authentication
      );
      
      return response;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate with Xtream server');
    }
  }
  
  // Get live TV categories
  public async getLiveCategories(): Promise<XtreamLiveCategory[]> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      return await proxyRequest<XtreamLiveCategory[]>(
        this.apiEndpoints!.playerApi,
        {
          username: this.username,
          password: this.password,
          action: 'get_live_categories',
        }
      );
    } catch (error) {
      console.error('Error fetching live categories:', error);
      throw error;
    }
  }
  
  // Get live streams (channels)
  public async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      const params: Record<string, any> = {
        username: this.username,
        password: this.password,
        action: 'get_live_streams',
      };
      
      if (categoryId) {
        params.category_id = categoryId;
      }
      
      return await proxyRequest<XtreamLiveStream[]>(
        this.apiEndpoints!.playerApi,
        params,
        { categoryId }
      );
    } catch (error) {
      console.error(`Error fetching live streams${categoryId ? ` for category ${categoryId}` : ''}:`, error);
      throw error;
    }
  }
  
  // Get VOD (movie) categories
  public async getVodCategories(): Promise<XtreamVodCategory[]> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      return await proxyRequest<XtreamVodCategory[]>(
        this.apiEndpoints!.playerApi,
        {
          username: this.username,
          password: this.password,
          action: 'get_vod_categories',
        }
      );
    } catch (error) {
      console.error('Error fetching VOD categories:', error);
      throw error;
    }
  }
  
  // Get VOD streams (movies)
  public async getVodStreams(categoryId?: string): Promise<XtreamVodStream[]> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      const params: Record<string, any> = {
        username: this.username,
        password: this.password,
        action: 'get_vod_streams',
      };
      
      if (categoryId) {
        params.category_id = categoryId;
      }
      
      return await proxyRequest<XtreamVodStream[]>(
        this.apiEndpoints!.playerApi,
        params,
        { categoryId }
      );
    } catch (error) {
      console.error(`Error fetching VOD streams${categoryId ? ` for category ${categoryId}` : ''}:`, error);
      throw error;
    }
  }
  
  // Get VOD info
  public async getVodInfo(vodId: string): Promise<XtreamVodInfo> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      return await proxyRequest<XtreamVodInfo>(
        this.apiEndpoints!.playerApi,
        {
          username: this.username,
          password: this.password,
          action: 'get_vod_info',
          vod_id: vodId,
        }
      );
    } catch (error) {
      console.error(`Error fetching VOD info for ID ${vodId}:`, error);
      throw error;
    }
  }
  
  // Get series categories
  public async getSeriesCategories(): Promise<XtreamSeriesCategory[]> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      return await proxyRequest<XtreamSeriesCategory[]>(
        this.apiEndpoints!.playerApi,
        {
          username: this.username,
          password: this.password,
          action: 'get_series_categories',
        }
      );
    } catch (error) {
      console.error('Error fetching series categories:', error);
      throw error;
    }
  }
  
  // Get series
  public async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      const params: Record<string, any> = {
        username: this.username,
        password: this.password,
        action: 'get_series',
      };
      
      if (categoryId) {
        params.category_id = categoryId;
      }
      
      return await proxyRequest<XtreamSeries[]>(
        this.apiEndpoints!.playerApi,
        params,
        { categoryId }
      );
    } catch (error) {
      console.error(`Error fetching series${categoryId ? ` for category ${categoryId}` : ''}:`, error);
      throw error;
    }
  }
  
  // Get series info
  public async getSeriesInfo(seriesId: string): Promise<XtreamSeriesInfo> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      return await proxyRequest<XtreamSeriesInfo>(
        this.apiEndpoints!.playerApi,
        {
          username: this.username,
          password: this.password,
          action: 'get_series_info',
          series_id: seriesId,
        }
      );
    } catch (error) {
      console.error(`Error fetching series info for ID ${seriesId}:`, error);
      throw error;
    }
  }
  
  // Get EPG for a specific channel or all channels
  public async getEpg(streamId?: string): Promise<XtreamEpgListings> {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    try {
      const params: Record<string, any> = {
        username: this.username,
        password: this.password,
        action: 'get_simple_data_table',
      };
      
      if (streamId) {
        params.stream_id = streamId;
      }
      
      return await proxyRequest<XtreamEpgListings>(
        this.apiEndpoints!.playerApi,
        params
      );
    } catch (error) {
      console.error(`Error fetching EPG${streamId ? ` for stream ${streamId}` : ''}:`, error);
      throw error;
    }
  }
  
  // Get stream URL for live TV
  public getLiveStreamUrl(streamId: string): string {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    // Create direct URL
    const directUrl = `${this.serverUrl}/live/${this.username}/${this.password}/${streamId}.m3u8`;
    
    // Add timestamp to prevent caching
    const timestampedUrl = `${directUrl}?_=${Date.now()}`;
    
    // Use our proxy for HLS streams to avoid CORS issues
    const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(timestampedUrl)}`;
    
    // Log the URLs for debugging
    console.log('Generated live stream URL:', directUrl);
    console.log('Proxied live stream URL:', proxyUrl);
    
    // Return the proxied URL to avoid CORS issues
    return proxyUrl;
  }
  
  // Get stream URL for VOD (movie)
  public getVodStreamUrl(vodId: string, extension: string = 'm3u8'): string {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    // Create direct URL
    const directUrl = `${this.serverUrl}/movie/${this.username}/${this.password}/${vodId}.${extension}`;
    
    // Add timestamp to prevent caching
    const timestampedUrl = `${directUrl}?_=${Date.now()}`;
    
    // Use our proxy for HLS streams to avoid CORS issues
    const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(timestampedUrl)}`;
    
    // Log the URLs for debugging
    console.log('Generated VOD stream URL:', directUrl);
    console.log('Proxied VOD stream URL:', proxyUrl);
    
    // Return the proxied URL to avoid CORS issues
    return proxyUrl;
  }
  
  // Get stream URL for series episode
  public getSeriesStreamUrl(seriesId: string, episodeId: string): string {
    if (!this.isInitialized()) {
      throw new Error('API not initialized');
    }
    
    // Create direct URL
    const directUrl = `${this.serverUrl}/series/${this.username}/${this.password}/${episodeId}.m3u8`;
    
    // Add timestamp to prevent caching
    const timestampedUrl = `${directUrl}?_=${Date.now()}`;
    
    // Use our proxy for HLS streams to avoid CORS issues
    const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(timestampedUrl)}`;
    
    // Log the URLs for debugging
    console.log('Generated series stream URL:', directUrl);
    console.log('Proxied series stream URL:', proxyUrl);
    
    // Return the proxied URL to avoid CORS issues
    return proxyUrl;
  }
}

// Export a singleton instance
export const xtreamApi = new XtreamAPI();