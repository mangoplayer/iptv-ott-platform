// Types for Xtream Codes API

// Authentication
export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface XtreamAuthResponse {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
  };
}

// Live TV
export interface XtreamLiveCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

// VOD (Movies)
export interface XtreamVodCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface XtreamVodInfo {
  info: {
    kinopoisk_id: string;
    tmdb_id: string;
    name: string;
    o_name: string;
    cover_big: string;
    movie_image: string;
    releasedate: string;
    episode_run_time: string;
    youtube_trailer: string;
    director: string;
    actors: string;
    cast: string;
    description: string;
    plot: string;
    age: string;
    country: string;
    genre: string;
    content_rating: string;
    rating: string;
    rating_5based: number;
  };
  movie_data: {
    stream_id: number;
    name: string;
    added: string;
    category_id: string;
    container_extension: string;
    custom_sid: string;
    direct_source: string;
  };
}

// Series
export interface XtreamSeriesCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface XtreamSeriesInfo {
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
  };
  episodes: {
    [seasonNumber: string]: {
      id: number;
      episode_num: number;
      title: string;
      container_extension: string;
      info: {
        tmdb_id: string;
        releasedate: string;
        plot: string;
        duration_secs: number;
        duration: string;
        movie_image: string;
        bitrate: number;
      };
      added: string;
      season: number;
      direct_source: string;
    }[];
  };
  seasons: string[];
}

// EPG
export interface XtreamEpgListings {
  epg_listings: {
    [channelId: string]: {
      id: string;
      start: string;
      end: string;
      title: string;
      description: string;
      lang: string;
      category: string;
      start_timestamp: number;
      stop_timestamp: number;
    }[];
  };
}

// API Endpoints
export interface XtreamApiEndpoints {
  player_api: string;
  xmltv_api: string;
  stream_base_url: string;
}