'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FavoriteItem, HistoryItem, UserPreferences } from '../types/app';

interface PreferencesState extends UserPreferences {
  favorites: FavoriteItem[];
  history: HistoryItem[];
  watchedEpisodes: string[]; // Array of episode IDs that have been watched
  showWatchedBadges: boolean;
  autoPlayNextEpisode: boolean;
}

interface PreferencesActions {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Language
  setLanguage: (language: string) => void;
  
  // Playback
  setAutoplay: (autoplay: boolean) => void;
  setDefaultSubtitleLanguage: (language: string | null) => void;
  setDefaultAudioLanguage: (language: string | null) => void;
  setBufferSize: (size: number) => void;
  
  // Parental Control
  setParentalControlEnabled: (enabled: boolean) => void;
  toggleParentalControl: () => void;
  setParentalControlPin: (pin: string) => void;
  validatePin: (pin: string) => boolean;
  
  // Favorites
  addToFavorites: (id: string, type: 'channel' | 'movie' | 'series') => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
  
  // History
  addToHistory: (item: Omit<HistoryItem, 'lastWatched'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  updateProgress: (id: string, progress: number, position: number) => void;
  
  // Watched Episodes
  markEpisodeAsWatched: (episodeId: string) => void;
  markEpisodeAsUnwatched: (episodeId: string) => void;
  isEpisodeWatched: (episodeId: string) => boolean;
  getWatchedEpisodes: () => string[];
  
  // UI Preferences
  toggleShowWatchedBadges: () => void;
  toggleAutoPlayNextEpisode: () => void;
}

type PreferencesStore = PreferencesState & PreferencesActions;

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // Default preferences
      theme: 'system',
      language: 'en',
      autoplay: true,
      defaultSubtitleLanguage: null,
      defaultAudioLanguage: null,
      parentalControlEnabled: false,
      parentalControlPin: '0000',
      bufferSize: 30,
      favorites: [],
      history: [],
      watchedEpisodes: [],
      showWatchedBadges: true,
      autoPlayNextEpisode: true,
      
      // Theme
      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });
      },
      
      // Language
      setLanguage: (language: string) => {
        set({ language });
      },
      
      // Playback
      setAutoplay: (autoplay: boolean) => {
        set({ autoplay });
      },
      
      setDefaultSubtitleLanguage: (language: string | null) => {
        set({ defaultSubtitleLanguage: language });
      },
      
      setDefaultAudioLanguage: (language: string | null) => {
        set({ defaultAudioLanguage: language });
      },
      
      setBufferSize: (size: number) => {
        set({ bufferSize: size });
      },
      
      // Parental Control
      setParentalControlEnabled: (enabled: boolean) => {
        set({ parentalControlEnabled: enabled });
      },
      
      toggleParentalControl: () => {
        set(state => ({ parentalControlEnabled: !state.parentalControlEnabled }));
      },
      
      setParentalControlPin: (pin: string) => {
        set({ parentalControlPin: pin });
      },
      
      validatePin: (pin: string) => {
        return pin === get().parentalControlPin;
      },
      
      // Favorites
      addToFavorites: (id: string, type: 'channel' | 'movie' | 'series') => {
        const { favorites } = get();
        
        // Check if already in favorites
        if (favorites.some(item => item.id === id)) {
          return;
        }
        
        set({
          favorites: [
            ...favorites,
            {
              id,
              type,
              addedAt: Date.now(),
            },
          ],
        });
      },
      
      removeFromFavorites: (id: string) => {
        const { favorites } = get();
        set({
          favorites: favorites.filter(item => item.id !== id),
        });
      },
      
      isFavorite: (id: string) => {
        return get().favorites.some(item => item.id === id);
      },
      
      // History
      addToHistory: (item: Omit<HistoryItem, 'lastWatched'>) => {
        const { history } = get();
        
        // Remove existing entry if present
        const filteredHistory = history.filter(historyItem => historyItem.id !== item.id);
        
        // Add new entry with current timestamp
        set({
          history: [
            {
              ...item,
              lastWatched: Date.now(),
            },
            ...filteredHistory,
          ].slice(0, 100), // Limit history to 100 items
        });
      },
      
      removeFromHistory: (id: string) => {
        const { history } = get();
        set({
          history: history.filter(item => item.id !== id),
        });
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
      
      updateProgress: (id: string, progress: number, position: number) => {
        const { history } = get();
        
        const updatedHistory = history.map(item => {
          if (item.id === id) {
            return {
              ...item,
              progress,
              position,
              lastWatched: Date.now(),
            };
          }
          return item;
        });
        
        set({ history: updatedHistory });
      },
      
      // Watched Episodes
      markEpisodeAsWatched: (episodeId: string) => {
        const { watchedEpisodes } = get();
        
        if (!watchedEpisodes.includes(episodeId)) {
          set({
            watchedEpisodes: [...watchedEpisodes, episodeId],
          });
        }
      },
      
      markEpisodeAsUnwatched: (episodeId: string) => {
        const { watchedEpisodes } = get();
        
        set({
          watchedEpisodes: watchedEpisodes.filter(id => id !== episodeId),
        });
      },
      
      isEpisodeWatched: (episodeId: string) => {
        return get().watchedEpisodes.includes(episodeId);
      },
      
      getWatchedEpisodes: () => {
        return get().watchedEpisodes;
      },
      
      // UI Preferences
      toggleShowWatchedBadges: () => {
        set(state => ({ showWatchedBadges: !state.showWatchedBadges }));
      },
      
      toggleAutoPlayNextEpisode: () => {
        set(state => ({ autoPlayNextEpisode: !state.autoPlayNextEpisode }));
      },
    }),
    {
      name: 'iptv-preferences-storage',
    }
  )
);