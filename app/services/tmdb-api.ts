'use client';

import axios from 'axios';
import { TMDBMovie, TMDBTVShow } from '../types/app';

// TMDB API configuration
const API_KEY = '42125c682636b68d10d70b487c692685';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MjEyNWM2ODI2MzZiNjhkMTBkNzBiNDg3YzY5MjY4NSIsIm5iZiI6MS42NDM4MjA2NjA2OTUwMDAyZSs5LCJzdWIiOiI2MWZhYjY3NGI3YWJiNTAwNjY1YWQ4MzAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.e06dzH5trScMiz7obFbCFip5dO1XQp-bUC3lecJ8sxU';
const BASE_URL = 'https://api.themoviedb.org/3';

// Create axios instance with default config
const tmdbAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Helper function to handle API errors
const handleApiError = (error: any) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.status_message || error.message;
    throw new Error(`TMDB API Error: ${message}`);
  }
  throw error;
};

class TMDBAPI {
  /**
   * Search for movies by title
   */
  public async searchMovies(query: string) {
    try {
      const response = await tmdbAxios.get('/search/movie', {
        params: {
          query,
          include_adult: false,
          language: 'en-US',
          page: 1,
        },
      });
      
      return response.data.results;
    } catch (error) {
      console.error('Error searching movies:', error);
      return [];
    }
  }
  
  /**
   * Get detailed movie information
   */
  public async getMovieDetails(movieId: number): Promise<TMDBMovie> {
    try {
      const [movieResponse, creditsResponse, similarResponse] = await Promise.all([
        tmdbAxios.get(`/movie/${movieId}`, {
          params: {
            language: 'en-US',
            append_to_response: 'videos',
          },
        }),
        tmdbAxios.get(`/movie/${movieId}/credits`, {
          params: {
            language: 'en-US',
          },
        }),
        tmdbAxios.get(`/movie/${movieId}/similar`, {
          params: {
            language: 'en-US',
            page: 1,
          },
        }),
      ]);
      
      // Combine the responses
      return {
        ...movieResponse.data,
        credits: creditsResponse.data,
        similar: similarResponse.data,
      };
    } catch (error) {
      console.error('Error fetching movie details:', error);
      throw new Error('Failed to fetch movie details from TMDB');
    }
  }
  
  /**
   * Search for TV shows by title
   */
  public async searchTVShows(query: string) {
    try {
      const response = await tmdbAxios.get('/search/tv', {
        params: {
          query,
          include_adult: false,
          language: 'en-US',
          page: 1,
        },
      });
      
      return response.data.results;
    } catch (error) {
      console.error('Error searching TV shows:', error);
      return [];
    }
  }
  
  /**
   * Get detailed TV show information
   */
  public async getTVShowDetails(tvShowId: number): Promise<TMDBTVShow> {
    try {
      const [tvShowResponse, creditsResponse, similarResponse] = await Promise.all([
        tmdbAxios.get(`/tv/${tvShowId}`, {
          params: {
            language: 'en-US',
            append_to_response: 'videos',
          },
        }),
        tmdbAxios.get(`/tv/${tvShowId}/credits`, {
          params: {
            language: 'en-US',
          },
        }),
        tmdbAxios.get(`/tv/${tvShowId}/similar`, {
          params: {
            language: 'en-US',
            page: 1,
          },
        }),
      ]);
      
      // Combine the responses
      return {
        ...tvShowResponse.data,
        credits: creditsResponse.data,
        similar: similarResponse.data,
      };
    } catch (error) {
      console.error('Error fetching TV show details:', error);
      throw new Error('Failed to fetch TV show details from TMDB');
    }
  }
  
  /**
   * Get TV show season details
   */
  public async getSeasonDetails(tvShowId: number, seasonNumber: number) {
    try {
      const response = await tmdbAxios.get(`/tv/${tvShowId}/season/${seasonNumber}`, {
        params: {
          language: 'en-US',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching TV season details:', error);
      throw new Error('Failed to fetch TV season details from TMDB');
    }
  }
  
  /**
   * Get TV show episode details
   */
  public async getEpisodeDetails(tvShowId: number, seasonNumber: number, episodeNumber: number) {
    try {
      const response = await tmdbAxios.get(`/tv/${tvShowId}/season/${seasonNumber}/episode/${episodeNumber}`, {
        params: {
          language: 'en-US',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching TV episode details:', error);
      throw new Error('Failed to fetch TV episode details from TMDB');
    }
  }
  
  /**
   * Get image URL with specified size
   */
  public getImageUrl(path: string | null, size: 'original' | 'w500' | 'w300' | 'w200' = 'original'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
  
  /**
   * Find TMDB ID by external ID (IMDB, etc.)
   */
  public async findByExternalId(externalId: string, externalSource: string): Promise<any> {
    try {
      const response = await tmdbAxios.get('/find/' + externalId, {
        params: {
          external_source: externalSource,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error finding by external ID:', error);
      throw new Error('Failed to find content by external ID from TMDB');
    }
  }
}

// Export a singleton instance
export const tmdbApi = new TMDBAPI();