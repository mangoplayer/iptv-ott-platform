'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { useContentStore } from '@/app/store/content-store';
import { Movie } from '@/app/types/app';
import { CategorySelector } from '@/app/components/ui/category-selector';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';

export default function MoviesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { 
    movieCategories, 
    movies, 
    fetchMovieCategories, 
    fetchMoviesByCategory,
    loading 
  } = useContentStore();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Fetch categories on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchMovieCategories();
    }
  }, [isAuthenticated, fetchMovieCategories]);
  
  // Fetch movies when category changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchMoviesByCategory(selectedCategoryId);
    }
  }, [isAuthenticated, selectedCategoryId, fetchMoviesByCategory]);
  
  // Filter movies based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMovies(movies);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = movies.filter(movie => 
      movie.name.toLowerCase().includes(query) ||
      (movie.genre && movie.genre.toLowerCase().includes(query)) ||
      (movie.director && movie.director.toLowerCase().includes(query)) ||
      (movie.cast && movie.cast.toLowerCase().includes(query))
    );
    
    setFilteredMovies(filtered);
  }, [searchQuery, movies]);
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };
  
  // Handle movie selection
  const handleMovieSelect = (movie: Movie) => {
    router.push(`/movies/${movie.stream_id}`);
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Movies</h1>
          
          {/* Search input */}
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {searchQuery ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Search className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Category selector */}
        {movieCategories.length > 0 && (
          <CategorySelector
            categories={movieCategories.map(cat => ({ id: cat.category_id, name: cat.category_name }))}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleCategorySelect}
          />
        )}
        
        {/* Movies grid */}
        <ContentGrid
          items={filteredMovies}
          type="movie"
          onItemClick={handleMovieSelect}
          aspectRatio="portrait"
          loading={loading}
          emptyContent={
            searchQuery ? (
              <div className="text-center">
                <p className="text-muted-foreground">No movies found matching "{searchQuery}"</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No movies available in this category</p>
            )
          }
        />
      </div>
    </div>
  );
}