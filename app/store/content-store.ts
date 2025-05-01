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
    } catch (error) {
      console.error('Error fetching live channels:', error);
      set({
        loadingLiveChannels: false,
        error: error instanceof Error ? error.message : 'Failed to fetch live TV channels',
      });
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
    } catch (error) {
      console.error('Error fetching movies:', error);
      set({
        loadingMovies: false,
        error: error instanceof Error ? error.message : 'Failed to fetch movies',
      });
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
    } catch (error) {
      console.error('Error fetching series:', error);
      set({
        loadingSeries: false,
        error: error instanceof Error ? error.message : 'Failed to fetch TV series',
      });
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
  
  // Fetch all movies from all categories
  fetchAllMovies: async () => {
    set({ loadingMovies: true, error: null });
    
    try {
      // First, ensure we have categories
      if (get().movieCategories.length === 0) {
        await get().fetchMovieCategories();
      }
      
      // Get all categories
      const categories = get().movieCategories;
      
      // Fetch movies for each category
      const fetchPromises = categories.map(category => 
        xtreamApi.getVodStreams(category.category_id)
      );
      
      const results = await Promise.all(fetchPromises);
      
      // Process results
      const moviesByCategory: Record<string, Movie[]> = {};
      
      categories.forEach((category, index) => {
        const streams = results[index];
        const streamsArray = Array.isArray(streams) ? streams : [];
        
        // Convert to Movie type
        const movies: Movie[] = streamsArray.map(stream => ({
          ...stream,
        }));
        
        moviesByCategory[category.category_id] = movies;
      });
      
      set({ movies: moviesByCategory, loadingMovies: false });
    } catch (error) {
      console.error('Error fetching all movies:', error);
      set({
        loadingMovies: false,
        error: error instanceof Error ? error.message : 'Failed to fetch all movies',
      });
    }
  },
  
  // Fetch all series from all categories
  fetchAllSeries: async () => {
    set({ loadingSeries: true, error: null });
    
    try {
      // First, ensure we have categories
      if (get().seriesCategories.length === 0) {
        await get().fetchSeriesCategories();
      }
      
      // Get all categories
      const categories = get().seriesCategories;
      
      // Fetch series for each category
      const fetchPromises = categories.map(category => 
        xtreamApi.getSeries(category.category_id)
      );
      
      const results = await Promise.all(fetchPromises);
      
      // Process results
      const seriesByCategory: Record<string, TVShow[]> = {};
      
      categories.forEach((category, index) => {
        const seriesData = results[index];
        const seriesArray = Array.isArray(seriesData) ? seriesData : [];
        
        // Convert to TVShow type
        const tvShows: TVShow[] = seriesArray.map(series => ({
          ...series,
        }));
        
        seriesByCategory[category.category_id] = tvShows;
      });
      
      set({ series: seriesByCategory, loadingSeries: false });
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