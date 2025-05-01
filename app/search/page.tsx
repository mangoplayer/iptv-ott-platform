'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { useContentStore } from '@/app/store/content-store';
import { LiveChannel, Movie, TVShow } from '@/app/types/app';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search as SearchIcon, X, Tv, Film, Layers } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { 
    liveChannels, 
    movies, 
    series, 
    searchLiveChannels, 
    searchMovies, 
    searchSeries,
    loading 
  } = useContentStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filteredChannels, setFilteredChannels] = useState<LiveChannel[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<TVShow[]>([]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Get search query from URL
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);
  
  // Search when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChannels([]);
      setFilteredMovies([]);
      setFilteredSeries([]);
      return;
    }
    
    if (isAuthenticated) {
      const channelResults = searchLiveChannels(searchQuery);
      const movieResults = searchMovies(searchQuery);
      const seriesResults = searchSeries(searchQuery);
      
      setFilteredChannels(channelResults);
      setFilteredMovies(movieResults);
      setFilteredSeries(seriesResults);
    }
  }, [searchQuery, isAuthenticated, searchLiveChannels, searchMovies, searchSeries]);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchQuery.trim()) {
      // Update URL with search query
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      router.push(`/search?${params.toString()}`);
    }
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    router.push('/search');
  };
  
  // Handle item selection
  const handleChannelSelect = (channel: LiveChannel) => {
    router.push('/live-tv');
  };
  
  const handleMovieSelect = (movie: Movie) => {
    router.push(`/movies/${movie.stream_id}`);
  };
  
  const handleSeriesSelect = (show: TVShow) => {
    router.push(`/series/${show.series_id}`);
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  const totalResults = filteredChannels.length + filteredMovies.length + filteredSeries.length;
  
  return (
    <div className="container mx-auto py-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Search</h1>
          
          {/* Search form */}
          <form onSubmit={handleSearch} className="w-full md:w-1/2 lg:w-1/3">
            <div className="relative">
              <Input
                placeholder="Search for channels, movies, series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {searchQuery ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <SearchIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </form>
        </div>
        
        {searchQuery ? (
          <>
            {/* Search results */}
            <div className="mb-4">
              <p className="text-muted-foreground">
                {loading ? 'Searching...' : `Found ${totalResults} results for "${searchQuery}"`}
              </p>
            </div>
            
            {/* Tabs for filtering results */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="all" className="flex items-center">
                  <Layers className="h-4 w-4 mr-2" />
                  All Results ({totalResults})
                </TabsTrigger>
                <TabsTrigger value="channels" className="flex items-center">
                  <Tv className="h-4 w-4 mr-2" />
                  Channels ({filteredChannels.length})
                </TabsTrigger>
                <TabsTrigger value="movies" className="flex items-center">
                  <Film className="h-4 w-4 mr-2" />
                  Movies ({filteredMovies.length})
                </TabsTrigger>
                <TabsTrigger value="series" className="flex items-center">
                  <Layers className="h-4 w-4 mr-2" />
                  Series ({filteredSeries.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                {totalResults > 0 ? (
                  <div className="space-y-8">
                    {/* Channels */}
                    {filteredChannels.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Channels</h2>
                        <ContentGrid
                          items={filteredChannels}
                          type="channel"
                          onItemClick={handleChannelSelect}
                          aspectRatio="video"
                          virtualized={false}
                        />
                      </div>
                    )}
                    
                    {/* Movies */}
                    {filteredMovies.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Movies</h2>
                        <ContentGrid
                          items={filteredMovies}
                          type="movie"
                          onItemClick={handleMovieSelect}
                          aspectRatio="portrait"
                          virtualized={false}
                        />
                      </div>
                    )}
                    
                    {/* Series */}
                    {filteredSeries.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Series</h2>
                        <ContentGrid
                          items={filteredSeries}
                          type="series"
                          onItemClick={handleSeriesSelect}
                          aspectRatio="portrait"
                          virtualized={false}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                    <Button 
                      variant="link" 
                      onClick={handleClearSearch}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="channels">
                {filteredChannels.length > 0 ? (
                  <ContentGrid
                    items={filteredChannels}
                    type="channel"
                    onItemClick={handleChannelSelect}
                    aspectRatio="video"
                  />
                ) : (
                  <div className="text-center py-12">
                    <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No channels found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="movies">
                {filteredMovies.length > 0 ? (
                  <ContentGrid
                    items={filteredMovies}
                    type="movie"
                    onItemClick={handleMovieSelect}
                    aspectRatio="portrait"
                  />
                ) : (
                  <div className="text-center py-12">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No movies found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="series">
                {filteredSeries.length > 0 ? (
                  <ContentGrid
                    items={filteredSeries}
                    type="series"
                    onItemClick={handleSeriesSelect}
                    aspectRatio="portrait"
                  />
                ) : (
                  <div className="text-center py-12">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No series found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Search for content</h2>
            <p className="text-muted-foreground mb-6">
              Enter a search term to find channels, movies, and series
            </p>
            <form onSubmit={handleSearch} className="max-w-md mx-auto">
              <Input
                placeholder="Search for channels, movies, series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              <Button type="submit" disabled={!searchQuery.trim()}>
                <SearchIcon className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}