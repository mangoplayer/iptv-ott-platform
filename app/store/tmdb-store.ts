'use client';

import { create } from 'zustand';
import { TMDBMovie, TMDBTVShow } from '../types/app';
import { tmdbApi } from '../services/tmdb-api';

interface TMDBState {
  movieDetails: TMDBMovie | null;
  tvShowDetails: TMDBTVShow | null;
  loading: boolean;
  error: string | null;
}

interface TMDBActions {
  fetchMovieDetails: (title: string) => Promise<void>;
  fetchTVShowDetails: (title: string) => Promise<void>;
  clearMovieDetails: () => void;
  clearTVShowDetails: () => void;
}

type TMDBStore = TMDBState & TMDBActions;

export const useTMDBStore = create<TMDBStore>((set, get) => ({
  // Initial state
  movieDetails: null,
  tvShowDetails: null,
  loading: false,
  error: null,
  
  // Actions
  fetchMovieDetails: async (title: string) => {
    try {
      set({ loading: true, error: null });
      
      // Search for the movie
      const searchResults = await tmdbApi.searchMovies(title);
      
      if (searchResults.length === 0) {
        set({ 
          loading: false, 
          error: 'Movie not found in TMDB database',
          movieDetails: null
        });
        return;
      }
      
      // Get the first result (most relevant)
      const movieId = searchResults[0].id;
      
      // Fetch detailed movie information
      const movieDetails = await tmdbApi.getMovieDetails(movieId);
      
      set({ 
        loading: false, 
        movieDetails,
        error: null
      });
    } catch (error) {
      console.error('Error fetching movie details:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch movie details',
        movieDetails: null
      });
    }
  },
  
  fetchTVShowDetails: async (title: string) => {
    try {
      set({ loading: true, error: null });
      
      // Search for the TV show
      const searchResults = await tmdbApi.searchTVShows(title);
      
      if (searchResults.length === 0) {
        set({ 
          loading: false, 
          error: 'TV show not found in TMDB database',
          tvShowDetails: null
        });
        return;
      }
      
      // Get the first result (most relevant)
      const tvShowId = searchResults[0].id;
      
      // Fetch detailed TV show information
      const tvShowDetails = await tmdbApi.getTVShowDetails(tvShowId);
      
      set({ 
        loading: false, 
        tvShowDetails,
        error: null
      });
    } catch (error) {
      console.error('Error fetching TV show details:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch TV show details',
        tvShowDetails: null
      });
    }
  },
  
  clearMovieDetails: () => {
    set({ movieDetails: null });
  },
  
  clearTVShowDetails: () => {
    set({ tvShowDetails: null });
  },
}));