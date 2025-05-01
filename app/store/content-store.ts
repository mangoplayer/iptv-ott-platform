'use client';

import { create } from 'zustand';
import { LiveChannel, Movie, TVShow } from '../types/app';
import { XtreamLiveCategory, XtreamSeriesCategory, XtreamVodCategory } from '../types/xtream';
import { xtreamApi } from '../services/xtream-api';
import { tmdbApi } from '../services/tmdb-api';

interface ContentState {
  // Live TV
  liveCategories: XtreamLiveCategory[];
  liveChannels: Record<string, LiveChannel[]>; // categoryId -> channels
  selectedLiveCategory: string | null;
  
  // Movies
  movieCategories: XtreamVodCategory[];
  movies: Record<string, Movie[]>; // categoryId -> movies
  selectedMovieCategory: string | null;
  
  // Series
  seriesCategories: XtreamSeriesCategory[];
  series: Record<string, TVShow[]>; // categoryId -> series
  selectedSeriesCategory: string | null;
  
  // Loading states
  loadingLiveCategories: boolean;
  loadingLiveChannels: boolean;
  loadingMovieCategories: boolean;
  loadingMovies: boolean;
  loadingSeriesCategories: boolean;
  loadingSeries: boolean;
  
  // Error states
  error: string | null;
}

interface ContentActions {
  // Live TV actions
  fetchLiveCategories: () => Promise<void>;
  fetchLiveChannels: (categoryId?: string) => Promise<void>;
  fetchLiveChannelsByCategory: (categoryId: string | null) => Promise<void>;
  setSelectedLiveCategory: (categoryId: string | null) => void;
  
  // Movies actions
  fetchMovieCategories: () => Promise<void>;
  fetchMovies: (categoryId?: string) => Promise<void>;
  fetchMoviesByCategory: (categoryId: string | null) => Promise<void>;
  fetchAllMovies: () => Promise<void>;
  setSelectedMovieCategory: (categoryId: string | null) => void;
  
  // Series actions
  fetchSeriesCategories: () => Promise<void>;
  fetchSeries: (categoryId?: string) => Promise<void>;
  fetchSeriesByCategory: (categoryId: string | null) => Promise<void>;
  fetchAllSeries: () => Promise<void>;
  fetchSeriesSeasons: (seriesId: string) => Promise<any[]>;
  fetchSeriesEpisodes: (seriesId: string, seasonNumber: string) => Promise<any[]>;
  setSelectedSeriesCategory: (categoryId: string | null) => void;
  
  // Reset store
  resetStore: () => void;
}

type ContentStore = ContentState & ContentActions;

export const useContentStore = create<ContentStore>((set, get) => ({
  // Initial state
  liveCategories: [],
  liveChannels: {},
  selectedLiveCategory: null,
  
  movieCategories: [],
  movies: {},
  selectedMovieCategory: null,
  
  seriesCategories: [],
  series: {},
  selectedSeriesCategory: null,
  
  loadingLiveCategories: false,
  loadingLiveChannels: false,
  loadingMovieCategories: false,
  loadingMovies: false,
  loadingSeriesCategories: false,
  loadingSeries: false,
  
  error: null,
  
  // Live TV actions
  fetchLiveCategories: async () => {
    set({ loadingLiveCategories: true, error: null });
    
    try {
      const categories = await xtreamApi.getLiveCategories();
      set({ liveCategories: categories, loadingLiveCategories: false });
    } catch (error) {
      console.error('Error fetching live categories:', error);
      set({
        loadingLiveCategories: false,
        error: error instanceof Error ? error.message : 'Failed to fetch live TV categories',
      });
    }
  },
  
  fetchLiveChannels: async (categoryId?: string) => {
    set({ loadingLiveChannels: true, error: null });
    
    try {
      // If we already have channels for this category, use them
      if (categoryId && get().liveChannels[categoryId]?.length > 0) {
        console.log(`Using cached live channels for category ${categoryId}`);
        set({ loadingLiveChannels: false });
        return;
      }
      
      // Try up to 3 times with exponential backoff
      let attempt = 0;
      let success = false;
      let lastError: any = null;
      
      while (attempt < 3 && !success) {
        try {
          if (attempt > 0) {
            console.log(`Retrying live channels fetch (attempt ${attempt + 1}/3) for category ${categoryId || 'all'}`);
            // Wait with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
          
          const streams = await xtreamApi.getLiveStreams(categoryId);
          
          // Ensure streams is an array
          const streamsArray = Array.isArray(streams) ? streams : [];
          
          // Convert to LiveChannel type
          const channels: LiveChannel[] = streamsArray.map(stream => ({
            ...stream,
          }));
          
          // Update state based on whether a category was specified
          if (categoryId) {
            set(state => ({
              liveChannels: {
                ...state.liveChannels,
                [categoryId]: channels,
              },
              loadingLiveChannels: false,
            }));
          } else {
            // If no category specified, create a map of all channels by category
            const channelsByCategory: Record<string, LiveChannel[]> = {};
            
            channels.forEach(channel => {
              if (!channelsByCategory[channel.category_id]) {
                channelsByCategory[channel.category_id] = [];
              }
              channelsByCategory[channel.category_id].push(channel);
            });
            
            set({ liveChannels: channelsByCategory, loadingLiveChannels: false });
          }
          
          success = true;
        } catch (error) {
          lastError = error;
          console.error(`Error fetching live channels (attempt ${attempt + 1}/3):`, error);
          attempt++;
          
          // If this was the last attempt, propagate the error
          if (attempt >= 3) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching live channels after retries:', error);
      
      // If we have a specific category, set an empty array to prevent repeated fetch attempts
      if (categoryId) {
        set(state => ({
          liveChannels: {
            ...state.liveChannels,
            [categoryId]: [],
          },
          loadingLiveChannels: false,
          error: error instanceof Error ? error.message : 'Failed to fetch live TV channels',
        }));
      } else {
        set({
          loadingLiveChannels: false,
          error: error instanceof Error ? error.message : 'Failed to fetch live TV channels',
        });
      }
    }
  },
  
  fetchLiveChannelsByCategory: async (categoryId: string | null) => {
    if (categoryId) {
      return get().fetchLiveChannels(categoryId);
    } else {
      // If no category is selected, fetch all channels
      return get().fetchLiveChannels();
    }
  },
  
  setSelectedLiveCategory: (categoryId: string | null) => {
    set({ selectedLiveCategory: categoryId });
    
    // If we have a category ID and don't have channels for it yet, fetch them
    if (categoryId && !get().liveChannels[categoryId]) {
      get().fetchLiveChannels(categoryId);
    }
  },
  
  // Movies actions
  fetchMovieCategories: async () => {
    set({ loadingMovieCategories: true, error: null });
    
    try {
      const categories = await xtreamApi.getVodCategories();
      set({ movieCategories: categories, loadingMovieCategories: false });
    } catch (error) {
      console.error('Error fetching movie categories:', error);
      set({
        loadingMovieCategories: false,
        error: error instanceof Error ? error.message : 'Failed to fetch movie categories',
      });
    }
  },
  
  fetchMovies: async (categoryId?: string) => {
    set({ loadingMovies: true, error: null });
    
    try {
      // If we already have movies for this category, use them
      if (categoryId && get().movies[categoryId]?.length > 0) {
        console.log(`Using cached movies for category ${categoryId}`);
        set({ loadingMovies: false });
        return;
      }
      
      // Try up to 3 times with exponential backoff
      let attempt = 0;
      let success = false;
      let lastError: any = null;
      
      while (attempt < 3 && !success) {
        try {
          if (attempt > 0) {
            console.log(`Retrying movie fetch (attempt ${attempt + 1}/3) for category ${categoryId || 'all'}`);
            // Wait with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
          
          const streams = await xtreamApi.getVodStreams(categoryId);
          
          // Ensure streams is an array
          const streamsArray = Array.isArray(streams) ? streams : [];
          
          // Convert to Movie type
          const movies: Movie[] = streamsArray.map(stream => ({
            ...stream,
          }));
          
          // Update state based on whether a category was specified
          if (categoryId) {
            set(state => ({
              movies: {
                ...state.movies,
                [categoryId]: movies,
              },
              loadingMovies: false,
            }));
          } else {
            // If no category specified, create a map of all movies by category
            const moviesByCategory: Record<string, Movie[]> = {};
            
            movies.forEach(movie => {
              if (!moviesByCategory[movie.category_id]) {
                moviesByCategory[movie.category_id] = [];
              }
              moviesByCategory[movie.category_id].push(movie);
            });
            
            set({ movies: moviesByCategory, loadingMovies: false });
          }
          
          success = true;
        } catch (error) {
          lastError = error;
          console.error(`Error fetching movies (attempt ${attempt + 1}/3):`, error);
          attempt++;
          
          // If this was the last attempt, propagate the error
          if (attempt >= 3) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching movies after retries:', error);
      
      // If we have a specific category, set an empty array to prevent repeated fetch attempts
      if (categoryId) {
        set(state => ({
          movies: {
            ...state.movies,
            [categoryId]: [],
          },
          loadingMovies: false,
          error: error instanceof Error ? error.message : 'Failed to fetch movies',
        }));
      } else {
        set({
          loadingMovies: false,
          error: error instanceof Error ? error.message : 'Failed to fetch movies',
        });
      }
    }
  },
  
  fetchMoviesByCategory: async (categoryId: string | null) => {
    if (categoryId) {
      return get().fetchMovies(categoryId);
    } else {
      // If no category is selected, fetch all movies
      return get().fetchMovies();
    }
  },
  
  setSelectedMovieCategory: (categoryId: string | null) => {
    set({ selectedMovieCategory: categoryId });
    
    // If we have a category ID and don't have movies for it yet, fetch them
    if (categoryId && !get().movies[categoryId]) {
      get().fetchMovies(categoryId);
    }
  },
  
  // Series actions
  fetchSeriesCategories: async () => {
    set({ loadingSeriesCategories: true, error: null });
    
    try {
      const categories = await xtreamApi.getSeriesCategories();
      set({ seriesCategories: categories, loadingSeriesCategories: false });
    } catch (error) {
      console.error('Error fetching series categories:', error);
      set({
        loadingSeriesCategories: false,
        error: error instanceof Error ? error.message : 'Failed to fetch TV series categories',
      });
    }
  },
  
  fetchSeries: async (categoryId?: string) => {
    set({ loadingSeries: true, error: null });
    
    try {
      // If we already have series for this category, use them
      if (categoryId && get().series[categoryId]?.length > 0) {
        console.log(`Using cached series for category ${categoryId}`);
        set({ loadingSeries: false });
        return;
      }
      
      // Try up to 3 times with exponential backoff
      let attempt = 0;
      let success = false;
      let lastError: any = null;
      
      while (attempt < 3 && !success) {
        try {
          if (attempt > 0) {
            console.log(`Retrying series fetch (attempt ${attempt + 1}/3) for category ${categoryId || 'all'}`);
            // Wait with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
          
          const seriesData = await xtreamApi.getSeries(categoryId);
          
          // Ensure seriesData is an array
          const seriesArray = Array.isArray(seriesData) ? seriesData : [];
          
          // Convert to TVShow type
          const tvShows: TVShow[] = seriesArray.map(series => ({
            ...series,
          }));
          
          // Update state based on whether a category was specified
          if (categoryId) {
            set(state => ({
              series: {
                ...state.series,
                [categoryId]: tvShows,
              },
              loadingSeries: false,
            }));
          } else {
            // If no category specified, create a map of all series by category
            const seriesByCategory: Record<string, TVShow[]> = {};
            
            tvShows.forEach(show => {
              if (!seriesByCategory[show.category_id]) {
                seriesByCategory[show.category_id] = [];
              }
              seriesByCategory[show.category_id].push(show);
            });
            
            set({ series: seriesByCategory, loadingSeries: false });
          }
          
          success = true;
        } catch (error) {
          lastError = error;
          console.error(`Error fetching series (attempt ${attempt + 1}/3):`, error);
          attempt++;
          
          // If this was the last attempt, propagate the error
          if (attempt >= 3) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching series after retries:', error);
      
      // If we have a specific category, set an empty array to prevent repeated fetch attempts
      if (categoryId) {
        set(state => ({
          series: {
            ...state.series,
            [categoryId]: [],
          },
          loadingSeries: false,
          error: error instanceof Error ? error.message : 'Failed to fetch TV series',
        }));
      } else {
        set({
          loadingSeries: false,
          error: error instanceof Error ? error.message : 'Failed to fetch TV series',
        });
      }
    }
  },
  
  fetchSeriesByCategory: async (categoryId: string | null) => {
    if (categoryId) {
      return get().fetchSeries(categoryId);
    } else {
      // If no category is selected, fetch all series
      return get().fetchSeries();
    }
  },
  
  setSelectedSeriesCategory: (categoryId: string | null) => {
    set({ selectedSeriesCategory: categoryId });
    
    // If we have a category ID and don't have series for it yet, fetch them
    if (categoryId && !get().series[categoryId]) {
      get().fetchSeries(categoryId);
    }
  },
  
  // Fetch all movies from all categories with batch processing
  fetchAllMovies: async () => {
    set({ loadingMovies: true, error: null });
    
    try {
      // First, ensure we have categories
      if (get().movieCategories.length === 0) {
        await get().fetchMovieCategories();
      }
      
      // Get all categories
      const categories = get().movieCategories;
      
      // Process in batches to avoid rate limiting
      const batchSize = 3; // Process 3 categories at a time
      const moviesByCategory: Record<string, Movie[]> = { ...get().movies };
      
      // Process categories in batches
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize);
        console.log(`Processing movie categories batch ${i/batchSize + 1}/${Math.ceil(categories.length/batchSize)}`);
        
        try {
          // Fetch movies for each category in the batch
          const fetchPromises = batch.map(category => {
            // Skip categories we already have data for
            if (moviesByCategory[category.category_id]?.length > 0) {
              console.log(`Using cached movies for category ${category.category_id}`);
              return Promise.resolve(moviesByCategory[category.category_id]);
            }
            
            return xtreamApi.getVodStreams(category.category_id);
          });
          
          const results = await Promise.allSettled(fetchPromises);
          
          // Process results
          batch.forEach((category, index) => {
            const result = results[index];
            
            if (result.status === 'fulfilled') {
              const streams = result.value;
              
              // Skip if we already have this data from cache
              if (Array.isArray(streams) && streams.length > 0 && 'stream_id' in streams[0]) {
                // Convert to Movie type
                const movies: Movie[] = streams.map(stream => ({
                  ...stream,
                }));
                
                moviesByCategory[category.category_id] = movies;
              }
            } else {
              console.error(`Failed to fetch movies for category ${category.category_id}:`, result.reason);
              // Initialize with empty array to prevent repeated fetch attempts
              moviesByCategory[category.category_id] = [];
            }
          });
          
          // Update state after each batch to show progress
          set({ movies: { ...moviesByCategory } });
          
          // Add a small delay between batches to avoid rate limiting
          if (i + batchSize < categories.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (batchError) {
          console.error(`Error processing movie batch ${i/batchSize + 1}:`, batchError);
          // Continue with next batch despite errors
        }
      }
      
      set({ loadingMovies: false });
    } catch (error) {
      console.error('Error fetching all movies:', error);
      set({
        loadingMovies: false,
        error: error instanceof Error ? error.message : 'Failed to fetch all movies',
      });
    }
  },
  
  // Fetch all series from all categories with batch processing
  fetchAllSeries: async () => {
    set({ loadingSeries: true, error: null });
    
    try {
      // First, ensure we have categories
      if (get().seriesCategories.length === 0) {
        await get().fetchSeriesCategories();
      }
      
      // Get all categories
      const categories = get().seriesCategories;
      
      // Process in batches to avoid rate limiting
      const batchSize = 3; // Process 3 categories at a time
      const seriesByCategory: Record<string, TVShow[]> = { ...get().series };
      
      // Process categories in batches
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize);
        console.log(`Processing series categories batch ${i/batchSize + 1}/${Math.ceil(categories.length/batchSize)}`);
        
        try {
          // Fetch series for each category in the batch
          const fetchPromises = batch.map(category => {
            // Skip categories we already have data for
            if (seriesByCategory[category.category_id]?.length > 0) {
              console.log(`Using cached series for category ${category.category_id}`);
              return Promise.resolve(seriesByCategory[category.category_id]);
            }
            
            return xtreamApi.getSeries(category.category_id);
          });
          
          const results = await Promise.allSettled(fetchPromises);
          
          // Process results
          batch.forEach((category, index) => {
            const result = results[index];
            
            if (result.status === 'fulfilled') {
              const seriesData = result.value;
              
              // Skip if we already have this data from cache
              if (Array.isArray(seriesData) && seriesData.length > 0 && 'series_id' in seriesData[0]) {
                // Convert to TVShow type
                const tvShows: TVShow[] = seriesData.map(series => ({
                  ...series,
                }));
                
                seriesByCategory[category.category_id] = tvShows;
              }
            } else {
              console.error(`Failed to fetch series for category ${category.category_id}:`, result.reason);
              // Initialize with empty array to prevent repeated fetch attempts
              seriesByCategory[category.category_id] = [];
            }
          });
          
          // Update state after each batch to show progress
          set({ series: { ...seriesByCategory } });
          
          // Add a small delay between batches to avoid rate limiting
          if (i + batchSize < categories.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (batchError) {
          console.error(`Error processing series batch ${i/batchSize + 1}:`, batchError);
          // Continue with next batch despite errors
        }
      }
      
      set({ loadingSeries: false });
    } catch (error) {
      console.error('Error fetching all series:', error);
      set({
        loadingSeries: false,
        error: error instanceof Error ? error.message : 'Failed to fetch all series',
      });
    }
  },
  
  // Fetch seasons for a series
  fetchSeriesSeasons: async (seriesId: string) => {
    try {
      const seriesInfo = await xtreamApi.getSeriesInfo(Number(seriesId));
      
      if (seriesInfo && seriesInfo.seasons) {
        return Object.values(seriesInfo.seasons);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching series seasons:', error);
      return [];
    }
  },
  
  // Fetch episodes for a season
  fetchSeriesEpisodes: async (seriesId: string, seasonNumber: string) => {
    try {
      const seriesInfo = await xtreamApi.getSeriesInfo(Number(seriesId));
      
      if (seriesInfo && seriesInfo.episodes && seriesInfo.episodes[seasonNumber]) {
        return Object.values(seriesInfo.episodes[seasonNumber]);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching series episodes:', error);
      return [];
    }
  },
  
  // Reset store
  resetStore: () => {
    set({
      liveCategories: [],
      liveChannels: {},
      selectedLiveCategory: null,
      
      movieCategories: [],
      movies: {},
      selectedMovieCategory: null,
      
      seriesCategories: [],
      series: {},
      selectedSeriesCategory: null,
      
      loadingLiveCategories: false,
      loadingLiveChannels: false,
      loadingMovieCategories: false,
      loadingMovies: false,
      loadingSeriesCategories: false,
      loadingSeries: false,
      
      error: null,
    });
  },
}));