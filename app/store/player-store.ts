'use client';

import { create } from 'zustand';
import { TVShowEpisode, LiveChannel, Movie, PlayerState, TVShow } from '../types/app';
import { xtreamApi } from '../services/xtream-api';
import { usePreferencesStore } from './preferences-store';

interface PlayerActions {
  playLiveChannel: (channel: LiveChannel) => void;
  playMovie: (movie: Movie) => void;
  playSeriesEpisode: (episode: TVShowEpisode, series: TVShow) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setDefaultPlaybackRate: (rate: number) => void;
  setQuality: (quality: string) => void;
  setDefaultQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  toggleFullscreen: () => void;
  stopPlayback: () => void;
  playNextEpisode: () => void;
  playPreviousEpisode: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  playbackRate: 1,
  defaultPlaybackRate: 1,
  quality: 'auto',
  defaultQuality: 'auto',
  source: '',
  type: null,
  content: null,
  seriesInfo: null,
  
  // Actions
  playLiveChannel: (channel: LiveChannel) => {
    try {
      const streamUrl = xtreamApi.getLiveStreamUrl(channel.stream_id);
      
      // Add to history
      const { addToHistory } = usePreferencesStore.getState();
      addToHistory({
        id: channel.stream_id,
        type: 'channel',
        title: channel.name,
        poster: channel.stream_icon,
        progress: 0,
        position: 0,
        duration: 0,
      });
      
      set({
        isPlaying: true,
        currentTime: 0,
        duration: 0, // Live content doesn't have a fixed duration
        source: streamUrl,
        type: 'live',
        content: channel,
        seriesInfo: null,
      });
    } catch (error) {
      console.error('Error playing live channel:', error);
    }
  },
  
  playMovie: (movie: Movie) => {
    try {
      const streamUrl = xtreamApi.getVodStreamUrl(movie.stream_id, movie.container_extension);
      
      // Get last position from history
      const { history, addToHistory } = usePreferencesStore.getState();
      const historyItem = history.find(item => item.id === movie.stream_id);
      const startPosition = historyItem?.position || 0;
      
      // Add to history
      addToHistory({
        id: movie.stream_id,
        type: 'movie',
        title: movie.name,
        poster: movie.stream_icon,
        progress: historyItem?.progress || 0,
        position: startPosition,
        duration: movie.duration ? parseInt(movie.duration) * 60 : 0, // Convert minutes to seconds
      });
      
      set({
        isPlaying: true,
        currentTime: startPosition,
        duration: movie.duration ? parseInt(movie.duration) * 60 : 0, // Convert minutes to seconds
        source: streamUrl,
        type: 'movie',
        content: movie,
        seriesInfo: null,
      });
    } catch (error) {
      console.error('Error playing movie:', error);
    }
  },
  
  playSeriesEpisode: (episode: TVShowEpisode, series: TVShow) => {
    try {
      // Construct the URL for the episode
      const streamUrl = xtreamApi.getSeriesStreamUrl(series.series_id, episode.id);
      
      // Get last position from history
      const { history, addToHistory, markEpisodeAsWatched } = usePreferencesStore.getState();
      const historyItem = history.find(item => item.id === episode.id);
      const startPosition = historyItem?.position || 0;
      
      // Add to history
      addToHistory({
        id: episode.id,
        type: 'episode',
        title: `${series.name} - S${episode.season_number}E${episode.episode_num}: ${episode.title}`,
        poster: episode.info?.movie_image || series.cover,
        progress: historyItem?.progress || 0,
        position: startPosition,
        duration: episode.info?.duration ? parseInt(episode.info.duration) * 60 : 0, // Convert minutes to seconds
        seriesId: series.series_id,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_num,
      });
      
      // Mark as watched when starting playback
      markEpisodeAsWatched(episode.id);
      
      set({
        isPlaying: true,
        currentTime: startPosition,
        duration: episode.info?.duration ? parseInt(episode.info.duration) * 60 : 0, // Convert minutes to seconds
        source: streamUrl,
        type: 'series',
        content: episode,
        seriesInfo: {
          series,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_num,
        },
      });
    } catch (error) {
      console.error('Error playing episode:', error);
    }
  },
  
  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },
  
  setMuted: (muted: boolean) => {
    set({ isMuted: muted });
  },
  
  setPlaybackRate: (rate: number) => {
    set({ playbackRate: rate });
  },
  
  setDefaultPlaybackRate: (rate: number) => {
    set({ defaultPlaybackRate: rate, playbackRate: rate });
  },
  
  setQuality: (quality: string) => {
    set({ quality });
  },
  
  setDefaultQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => {
    set({ defaultQuality: quality, quality });
  },
  
  setCurrentTime: (time: number) => {
    const { content, type, duration } = get();
    set({ currentTime: time });
    
    // Update progress in history
    if (content && type !== 'live' && duration > 0) {
      const { updateProgress } = usePreferencesStore.getState();
      const progress = Math.floor((time / duration) * 100);
      const id = type === 'series' 
        ? (content as TVShowEpisode).id 
        : (content as Movie).stream_id;
      
      updateProgress(id, progress, time);
    }
  },
  
  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },
  
  toggleFullscreen: () => {
    set(state => ({ isFullscreen: !state.isFullscreen }));
  },
  
  stopPlayback: () => {
    set({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      source: '',
      type: null,
      content: null,
      seriesInfo: null,
    });
  },
  
  playNextEpisode: () => {
    const { type, seriesInfo, content } = get();
    
    if (type !== 'series' || !seriesInfo || !content) {
      return;
    }
    
    const currentEpisode = content as TVShowEpisode;
    const { series } = seriesInfo;
    
    // This would need to be implemented with a function to get the next episode
    // from the content store based on the current episode information
    const nextEpisode = null; // contentStore.getNextEpisode(series.series_id, currentEpisode.season_number, currentEpisode.episode_num);
    
    if (nextEpisode) {
      get().playSeriesEpisode(nextEpisode, series);
    }
  },
  
  playPreviousEpisode: () => {
    const { type, seriesInfo, content } = get();
    
    if (type !== 'series' || !seriesInfo || !content) {
      return;
    }
    
    const currentEpisode = content as TVShowEpisode;
    const { series } = seriesInfo;
    
    // This would need to be implemented with a function to get the previous episode
    // from the content store based on the current episode information
    const prevEpisode = null; // contentStore.getPreviousEpisode(series.series_id, currentEpisode.season_number, currentEpisode.episode_num);
    
    if (prevEpisode) {
      get().playSeriesEpisode(prevEpisode, series);
    }
  },
}));