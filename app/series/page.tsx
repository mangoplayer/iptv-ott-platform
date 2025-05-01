'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { useContentStore } from '@/app/store/content-store';
import { TVShow } from '@/app/types/app';
import { CategorySelector } from '@/app/components/ui/category-selector';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function SeriesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { 
    seriesCategories, 
    series, 
    fetchSeriesCategories, 
    fetchSeriesByCategory,
    loading 
  } = useContentStore();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSeries, setFilteredSeries] = useState<TVShow[]>([]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Fetch categories on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchSeriesCategories();
    }
  }, [isAuthenticated, fetchSeriesCategories]);
  
  // Fetch series when category changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSeriesByCategory(selectedCategoryId);
    }
  }, [isAuthenticated, selectedCategoryId, fetchSeriesByCategory]);
  
  // Filter series based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSeries(series);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = series.filter(show => 
      show.name.toLowerCase().includes(query) ||
      (show.genre && show.genre.toLowerCase().includes(query)) ||
      (show.director && show.director.toLowerCase().includes(query)) ||
      (show.cast && show.cast.toLowerCase().includes(query))
    );
    
    setFilteredSeries(filtered);
  }, [searchQuery, series]);
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };
  
  // Handle series selection
  const handleSeriesSelect = (show: TVShow) => {
    router.push(`/series/${show.series_id}`);
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">TV Series</h1>
          
          {/* Search input */}
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search series..."
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
        {seriesCategories.length > 0 && (
          <CategorySelector
            categories={seriesCategories.map(cat => ({ id: cat.category_id, name: cat.category_name }))}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleCategorySelect}
          />
        )}
        
        {/* Series grid */}
        <ContentGrid
          items={filteredSeries}
          type="series"
          onItemClick={handleSeriesSelect}
          aspectRatio="portrait"
          loading={loading}
          emptyContent={
            searchQuery ? (
              <div className="text-center">
                <p className="text-muted-foreground">No series found matching "{searchQuery}"</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No series available in this category</p>
            )
          }
        />
      </div>
    </div>
  );
}