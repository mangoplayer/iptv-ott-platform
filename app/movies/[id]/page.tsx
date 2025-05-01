'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import React from 'react';
import { useAuthStore } from '@/app/store/auth-store';
import { useContentStore } from '@/app/store/content-store';
import { usePlayerStore } from '@/app/store/player-store';
import { useTMDBStore } from '@/app/store/tmdb-store';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { Movie, TMDBMovie } from '@/app/types/app';
import { VideoPlayer } from '@/app/components/player/video-player';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Clock, 
  Calendar, 
  Star, 
  Heart, 
  ArrowLeft,
  Info
} from 'lucide-react';

interface MovieDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function MovieDetailPage({ params }: MovieDetailPageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const contentStore = useContentStore();
  const { playMovie } = usePlayerStore();
  const { fetchMovieDetails, movieDetails } = useTMDBStore();
  const { isFavorite, addToFavorites, removeFromFavorites } = usePreferencesStore();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [tmdbDetails, setTmdbDetails] = useState<TMDBMovie | null>(null);
  const [movieId, setMovieId] = useState<string | null>(null);
  
  // Unwrap params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setMovieId(resolvedParams.id);
    };
    
    getParams();
  }, [params]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Fetch movie details
  useEffect(() => {
    if (!isAuthenticated || !movieId) return;
    
    // Get all movies from all categories
    const allMovies: Movie[] = [];
    Object.values(contentStore.movies).forEach(categoryMovies => {
      if (Array.isArray(categoryMovies)) {
        allMovies.push(...categoryMovies);
      }
    });
    
    // Find the movie by ID
    const movieData = allMovies.find(m => m.stream_id === movieId) || null;
    setMovie(movieData);
    
    if (movieData) {
      // Fetch TMDB details
      fetchMovieDetails(movieData.name);
      
      // Get similar movies from the same category
      const categoryMovies = contentStore.movies[movieData.category_id] || [];
      const similar = Array.isArray(categoryMovies) 
        ? categoryMovies.filter(m => m.stream_id !== movieId).slice(0, 10)
        : [];
      setSimilarMovies(similar);
    }
  }, [isAuthenticated, movieId, contentStore.movies, fetchMovieDetails]);
  
  // Update TMDB details when they change
  useEffect(() => {
    if (movieDetails) {
      setTmdbDetails(movieDetails);
    }
  }, [movieDetails]);
  
  // Handle play button click
  const handlePlay = () => {
    if (movie) {
      playMovie(movie);
    }
  };
  
  // Handle favorite toggle
  const handleToggleFavorite = () => {
    if (!movie) return;
    
    const id = movie.stream_id;
    if (isFavorite(id)) {
      removeFromFavorites(id);
    } else {
      addToFavorites(id, 'movie');
    }
  };
  
  if (!isAuthenticated || !movie) {
    return null;
  }
  
  const isFav = isFavorite(movie.stream_id);
  
  return (
    <div className="min-h-screen">
      {/* Backdrop image */}
      {tmdbDetails?.backdrop_path && (
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
          <Image
            src={`https://image.tmdb.org/t/p/original${tmdbDetails.backdrop_path}`}
            alt={movie.name}
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
          Back to Movies
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="md:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg"
            >
              {movie.stream_icon ? (
                <Image
                  src={movie.stream_icon}
                  alt={movie.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : tmdbDetails?.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}`}
                  alt={movie.name}
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
                className="w-full" 
                size="lg"
                onClick={handlePlay}
              >
                <Play className="h-5 w-5 mr-2" />
                Play Movie
              </Button>
              
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
          </div>
          
          {/* Details */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{movie.name}</h1>
              
              {/* Meta information */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                {movie.year && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {movie.year}
                  </div>
                )}
                
                {movie.duration && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {movie.duration} min
                  </div>
                )}
                
                {tmdbDetails?.vote_average && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    {tmdbDetails.vote_average.toFixed(1)}/10
                  </div>
                )}
                
                {movie.genre && (
                  <div className="flex items-center">
                    {movie.genre}
                  </div>
                )}
              </div>
              
              {/* Overview */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground">
                  {tmdbDetails?.overview || movie.plot || 'No overview available.'}
                </p>
              </div>
              
              {/* Cast & Crew */}
              {(movie.director || movie.cast || tmdbDetails?.credits) && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-2">Cast & Crew</h2>
                  
                  {movie.director && (
                    <div className="mb-2">
                      <span className="font-medium">Director: </span>
                      <span className="text-muted-foreground">{movie.director}</span>
                    </div>
                  )}
                  
                  {movie.cast && (
                    <div className="mb-2">
                      <span className="font-medium">Cast: </span>
                      <span className="text-muted-foreground">{movie.cast}</span>
                    </div>
                  )}
                  
                  {tmdbDetails?.credits?.cast && (
                    <div className="flex flex-wrap gap-4 mt-4">
                      {tmdbDetails.credits.cast.slice(0, 5).map(actor => (
                        <div key={actor.id} className="text-center">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted mb-1 mx-auto">
                            {actor.profile_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                                alt={actor.name}
                                width={64}
                                height={64}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  {actor.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate max-w-[80px]">{actor.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[80px]">{actor.character}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Video player (only show when playing) */}
              {usePlayerStore.getState().isPlaying && usePlayerStore.getState().source && (
                <div className="mt-8">
                  <VideoPlayer />
                </div>
              )}
            </motion.div>
          </div>
        </div>
        
        {/* Similar Movies */}
        {similarMovies.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Similar Movies</h2>
            <ContentGrid
              items={similarMovies}
              type="movie"
              onItemClick={(movie) => router.push(`/movies/${(movie as Movie).stream_id}`)}
              aspectRatio="portrait"
              virtualized={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}