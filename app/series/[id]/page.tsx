'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { useContentStore } from '@/app/store/content-store';
import { usePlayerStore } from '@/app/store/player-store';
import { useTMDBStore } from '@/app/store/tmdb-store';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { TVShow, TVShowSeason, TVShowEpisode, TMDBTVShow } from '@/app/types/app';
import { VideoPlayer } from '@/app/components/player/video-player';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Calendar, 
  Star, 
  Heart, 
  ArrowLeft,
  Info,
  Check
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SeriesDetailPageProps {
  params: {
    id: string;
  };
}

export default function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { getSeriesById, getSimilarSeries, fetchSeriesSeasons, fetchSeriesEpisodes, loading } = useContentStore();
  const { playSeriesEpisode } = usePlayerStore();
  const { fetchTVShowDetails, tvShowDetails } = useTMDBStore();
  const { isFavorite, addToFavorites, removeFromFavorites, getWatchedEpisodes } = usePreferencesStore();
  
  const [series, setSeries] = useState<TVShow | null>(null);
  const [similarSeries, setSimilarSeries] = useState<TVShow[]>([]);
  const [tmdbDetails, setTmdbDetails] = useState<TMDBTVShow | null>(null);
  const [seasons, setSeasons] = useState<TVShowSeason[]>([]);
  const [episodes, setEpisodes] = useState<Record<string, TVShowEpisode[]>>({});
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Fetch series details
  useEffect(() => {
    if (isAuthenticated && params.id) {
      const seriesData = getSeriesById(params.id);
      setSeries(seriesData);
      
      if (seriesData) {
        // Fetch TMDB details
        fetchTVShowDetails(seriesData.name);
        
        // Get similar series from the same category
        const similar = getSimilarSeries(seriesData.category_id, params.id);
        setSimilarSeries(similar);
        
        // Fetch seasons
        fetchSeriesSeasons(params.id).then(seasonsData => {
          setSeasons(seasonsData);
          if (seasonsData.length > 0) {
            setSelectedSeason(seasonsData[0].season_number);
          }
        });
      }
    }
  }, [isAuthenticated, params.id, getSeriesById, fetchTVShowDetails, getSimilarSeries, fetchSeriesSeasons]);
  
  // Update TMDB details when they change
  useEffect(() => {
    if (tvShowDetails) {
      setTmdbDetails(tvShowDetails);
    }
  }, [tvShowDetails]);
  
  // Fetch episodes when selected season changes
  useEffect(() => {
    if (isAuthenticated && params.id && selectedSeason) {
      // Check if we already have episodes for this season
      if (!episodes[selectedSeason]) {
        fetchSeriesEpisodes(params.id, selectedSeason).then(episodesData => {
          setEpisodes(prev => ({
            ...prev,
            [selectedSeason]: episodesData
          }));
        });
      }
    }
  }, [isAuthenticated, params.id, selectedSeason, episodes, fetchSeriesEpisodes]);
  
  // Handle favorite toggle
  const handleToggleFavorite = () => {
    if (!series) return;
    
    const id = series.series_id;
    if (isFavorite(id)) {
      removeFromFavorites(id);
    } else {
      addToFavorites(id, 'series');
    }
  };
  
  // Handle episode play
  const handlePlayEpisode = (episode: TVShowEpisode) => {
    if (series) {
      playSeriesEpisode(episode, series);
    }
  };
  
  // Check if episode is watched
  const isEpisodeWatched = (episodeId: string) => {
    const watchedEpisodes = getWatchedEpisodes();
    return watchedEpisodes.includes(episodeId);
  };
  
  if (!isAuthenticated || !series) {
    return null;
  }
  
  const isFav = isFavorite(series.series_id);
  const currentSeasonEpisodes = selectedSeason ? episodes[selectedSeason] || [] : [];
  
  return (
    <div className="min-h-screen">
      {/* Backdrop image */}
      {tmdbDetails?.backdrop_path && (
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
          <Image
            src={`https://image.tmdb.org/t/p/original${tmdbDetails.backdrop_path}`}
            alt={series.name}
            fill
            className="object-cover opacity-30"
            priority
          />
        </div>
      )}
      
      <div className="container mx-auto py-6 px-4 relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Series
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="md:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg"
            >
              {series.cover ? (
                <Image
                  src={series.cover}
                  alt={series.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : tmdbDetails?.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}`}
                  alt={series.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Info className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </motion.div>
            
            {/* Action buttons */}
            <div className="mt-4 space-y-3">
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={handleToggleFavorite}
              >
                <Heart 
                  className="h-5 w-5 mr-2" 
                  fill={isFav ? 'currentColor' : 'none'} 
                />
                {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
              </Button>
            </div>
            
            {/* Meta information */}
            <div className="mt-6 space-y-4">
              {series.year && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{series.year}</span>
                </div>
              )}
              
              {tmdbDetails?.vote_average && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-500" />
                  <span>{tmdbDetails.vote_average.toFixed(1)}/10</span>
                </div>
              )}
              
              {series.genre && (
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Genre:</span>
                  <span>{series.genre}</span>
                </div>
              )}
              
              {series.plot && (
                <div>
                  <span className="text-muted-foreground mr-2">Plot:</span>
                  <p className="mt-1">{series.plot}</p>
                </div>
              )}
              
              {series.cast && (
                <div>
                  <span className="text-muted-foreground mr-2">Cast:</span>
                  <p className="mt-1">{series.cast}</p>
                </div>
              )}
              
              {series.director && (
                <div>
                  <span className="text-muted-foreground mr-2">Director:</span>
                  <p className="mt-1">{series.director}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Details */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{series.name}</h1>
              
              {/* Overview */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground">
                  {tmdbDetails?.overview || series.plot || 'No overview available.'}
                </p>
              </div>
              
              {/* Seasons and Episodes */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Episodes</h2>
                
                {seasons.length > 0 ? (
                  <Tabs 
                    defaultValue={selectedSeason || seasons[0].season_number} 
                    onValueChange={setSelectedSeason}
                    className="w-full"
                  >
                    <TabsList className="mb-4 flex flex-wrap">
                      {seasons.map(season => (
                        <TabsTrigger 
                          key={season.season_number} 
                          value={season.season_number}
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          Season {season.season_number}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {seasons.map(season => (
                      <TabsContent 
                        key={season.season_number} 
                        value={season.season_number}
                        className="space-y-4"
                      >
                        {loading ? (
                          <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <div 
                                key={index} 
                                className="h-24 bg-muted animate-pulse rounded-lg" 
                              />
                            ))}
                          </div>
                        ) : currentSeasonEpisodes.length > 0 ? (
                          currentSeasonEpisodes.map(episode => (
                            <Card 
                              key={episode.id} 
                              className="overflow-hidden transition-colors hover:bg-muted/50 cursor-pointer"
                              onClick={() => handlePlayEpisode(episode)}
                            >
                              <div className="flex flex-col md:flex-row">
                                {/* Episode thumbnail */}
                                <div className="relative w-full md:w-48 h-32">
                                  {episode.info?.movie_image ? (
                                    <Image
                                      src={episode.info.movie_image}
                                      alt={episode.title}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                      <span className="text-muted-foreground">
                                        Episode {episode.episode_num}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Watched indicator */}
                                  {isEpisodeWatched(episode.id) && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                      <Check className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Episode details */}
                                <CardContent className="p-4 flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-lg">
                                        {episode.episode_num}. {episode.title}
                                      </CardTitle>
                                      <CardDescription className="mt-1">
                                        {episode.info?.plot || 'No description available.'}
                                      </CardDescription>
                                    </div>
                                    
                                    <Button 
                                      size="sm" 
                                      className="ml-4 mt-1"
                                    >
                                      <Play className="h-4 w-4 mr-1" />
                                      Play
                                    </Button>
                                  </div>
                                </CardContent>
                              </div>
                            </Card>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No episodes available for this season.</p>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <p className="text-muted-foreground">No seasons available for this series.</p>
                )}
              </div>
              
              {/* Video player (if playing) */}
              <div className="mt-8">
                <VideoPlayer />
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Similar Series */}
        {similarSeries.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Similar Series</h2>
            <ContentGrid
              items={similarSeries}
              type="series"
              onItemClick={(series) => router.push(`/series/${(series as TVShow).series_id}`)}
              aspectRatio="portrait"
              virtualized={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}