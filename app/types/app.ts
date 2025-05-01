// Application-specific types

import { XtreamLiveStream, XtreamSeries, XtreamVodStream, XtreamSeriesInfo, XtreamSeriesEpisode } from './xtream';

// User and Authentication
export interface User {
  username: string;
  expiryDate: string;
  maxConnections: number;
  activeConnections: number;
  status: 'active' | 'expired' | 'banned';
  isTrial: boolean;
  createdAt: string;
  serverUrl: string;
  serverInfo?: {
    version: string;
    timezone: string;
    time: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  serverUrl: string;
  loading: boolean;
  error: string | null;
}

// Content Types
export interface LiveChannel extends XtreamLiveStream {
  currentProgram?: EPGProgram;
  nextProgram?: EPGProgram;
}

export interface Movie extends XtreamVodStream {
  tmdbData?: {
    overview: string;
    genres: string[];
    releaseDate: string;
    runtime: number;
    voteAverage: number;
    cast: {
      id: number;
      name: string;
      character: string;
      profilePath: string | null;
    }[];
    director: {
      id: number;
      name: string;
    } | null;
    similar: {
      id: number;
      title: string;
      posterPath: string | null;
    }[];
  };
  progress?: number; // 0-100 percentage of watched
  lastWatched?: number; // timestamp
}

export interface TVShow extends XtreamSeries {
  tmdbData?: {
    overview: string;
    genres: string[];
    firstAirDate: string;
    lastAirDate: string;
    status: string;
    voteAverage: number;
    cast: {
      id: number;
      name: string;
      character: string;
      profilePath: string | null;
    }[];
    creators: {
      id: number;
      name: string;
    }[];
    similar: {
      id: number;
      name: string;
      posterPath: string | null;
    }[];
  };
}

export interface TVShowSeason {
  season_number: string;
  name?: string;
  cover?: string;
  overview?: string;
  air_date?: string;
}

export interface TVShowEpisode extends XtreamSeriesEpisode {
  info?: XtreamSeriesInfo;
  progress?: number; // 0-100 percentage of watched
  lastWatched?: number; // timestamp
}

// TMDB Types
export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: { id: number; name: string }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
    crew: {
      id: number;
      name: string;
      job: string;
      department: string;
    }[];
  };
  similar?: {
    results: {
      id: number;
      title: string;
      poster_path: string | null;
    }[];
  };
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  status: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
    crew: {
      id: number;
      name: string;
      job: string;
      department: string;
    }[];
  };
  similar?: {
    results: {
      id: number;
      name: string;
      poster_path: string | null;
    }[];
  };
}

// EPG (Electronic Program Guide)
export interface EPGProgram {
  id: string;
  title: string;
  description: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  duration: number; // in seconds
  category: string;
  channelId: string;
}

// Player State
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  defaultPlaybackRate: number;
  quality: string;
  defaultQuality: 'auto' | 'high' | 'medium' | 'low';
  source: string;
  type: 'live' | 'movie' | 'series' | null;
  content: LiveChannel | Movie | TVShowEpisode | null;
  seriesInfo: {
    series: TVShow;
    seasonNumber: string;
    episodeNumber: string;
  } | null;
}

// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoplay: boolean;
  defaultSubtitleLanguage: string | null;
  defaultAudioLanguage: string | null;
  parentalControlEnabled: boolean;
  parentalControlPin: string;
  bufferSize: number; // in seconds
}

// Favorites and History
export interface FavoriteItem {
  id: string;
  type: 'channel' | 'movie' | 'series';
  addedAt: number; // timestamp
}

export interface HistoryItem {
  id: string;
  type: 'channel' | 'movie' | 'episode';
  title: string;
  poster?: string;
  progress: number; // 0-100 percentage
  position: number; // in seconds
  duration: number; // in seconds
  lastWatched: number; // timestamp
  seriesId?: string; // Only for episodes
  seasonNumber?: string; // Only for episodes
  episodeNumber?: string; // Only for episodes
}

// Search
export interface SearchResult {
  id: string;
  title: string;
  type: 'channel' | 'movie' | 'series';
  posterPath: string | null;
  overview: string | null;
}