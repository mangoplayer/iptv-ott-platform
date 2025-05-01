'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { useContentStore } from '@/app/store/content-store';
import { usePlayerStore } from '@/app/store/player-store';
import { LiveChannel } from '@/app/types/app';
import { CategorySelector } from '@/app/components/ui/category-selector';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { VideoPlayer } from '@/app/components/player/video-player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export default function LiveTVPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { 
    liveCategories, 
    liveChannels, 
    fetchLiveCategories, 
    fetchLiveChannelsByCategory,
    loading 
  } = useContentStore();
  const { playLiveChannel, isPlaying, source } = usePlayerStore();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChannels, setFilteredChannels] = useState<LiveChannel[]>([]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Fetch categories on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchLiveCategories();
    }
  }, [isAuthenticated, fetchLiveCategories]);
  
  // Fetch channels when category changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchLiveChannelsByCategory(selectedCategoryId);
    }
  }, [isAuthenticated, selectedCategoryId, fetchLiveChannelsByCategory]);
  
  // Filter channels based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChannels(liveChannels);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = liveChannels.filter(channel => 
      channel.name.toLowerCase().includes(query) ||
      (channel.currentProgram?.title?.toLowerCase().includes(query))
    );
    
    setFilteredChannels(filtered);
  }, [searchQuery, liveChannels]);
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };
  
  // Handle channel selection
  const handleChannelSelect = (channel: LiveChannel) => {
    playLiveChannel(channel);
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Live TV</h1>
          
          {/* Search input */}
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search channels..."
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
        {liveCategories.length > 0 && (
          <CategorySelector
            categories={liveCategories.map(cat => ({ id: cat.category_id, name: cat.category_name }))}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleCategorySelect}
          />
        )}
        
        {/* Player area (if channel is playing) */}
        {isPlaying && source && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <VideoPlayer />
          </motion.div>
        )}
        
        {/* Channels grid */}
        <ContentGrid
          items={filteredChannels}
          type="channel"
          onItemClick={handleChannelSelect}
          aspectRatio="video"
          loading={loading}
          emptyContent={
            searchQuery ? (
              <div className="text-center">
                <p className="text-muted-foreground">No channels found matching "{searchQuery}"</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No channels available in this category</p>
            )
          }
        />
      </div>
    </div>
  );
}