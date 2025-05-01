'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from './store/auth-store';
import { useContentStore } from './store/content-store';
import { usePreferencesStore } from './store/preferences-store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { history } = usePreferencesStore();
  const { 
    fetchLiveCategories, 
    fetchMovieCategories, 
    fetchSeriesCategories,
    liveCategories,
    movieCategories,
    seriesCategories,
  } = useContentStore();
  
  // Fetch categories when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchLiveCategories();
      fetchMovieCategories();
      fetchSeriesCategories();
    }
  }, [isAuthenticated, fetchLiveCategories, fetchMovieCategories, fetchSeriesCategories]);
  
  // If not authenticated, show welcome screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to IPTV/OTT Platform
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Your modern streaming solution for live TV, movies, and series
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Try Demo</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-card p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-semibold mb-2">Live TV</h3>
              <p className="text-muted-foreground">
                Watch your favorite channels with EPG support and catch-up features
              </p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-card p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-semibold mb-2">Movies</h3>
              <p className="text-muted-foreground">
                Enjoy a vast library of movies with detailed information and recommendations
              </p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-card p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-semibold mb-2">TV Series</h3>
              <p className="text-muted-foreground">
                Binge-watch complete seasons of your favorite shows
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  // If authenticated, show dashboard
  return (
    <div className="container mx-auto py-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-6">Welcome back, {user?.username}</h1>
        
        {/* Continue Watching Section */}
        {history.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Continue Watching</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {history.slice(0, 6).map((item) => (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  whileHover={{ scale: 1.05 }}
                  className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-2">
                    <div className="h-1 bg-muted-foreground rounded-full w-full mb-2">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-white truncate">
                      {item.type === 'channel' ? 'Live TV' : item.type === 'movie' ? 'Movie' : 'Episode'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
        
        {/* Categories Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Live TV */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card p-6 rounded-lg shadow-md"
          >
            <h2 className="text-2xl font-semibold mb-4">Live TV</h2>
            <p className="text-muted-foreground mb-4">
              {liveCategories.length} categories available
            </p>
            <Button asChild>
              <Link href="/live-tv">Browse Channels</Link>
            </Button>
          </motion.div>
          
          {/* Movies */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card p-6 rounded-lg shadow-md"
          >
            <h2 className="text-2xl font-semibold mb-4">Movies</h2>
            <p className="text-muted-foreground mb-4">
              {movieCategories.length} categories available
            </p>
            <Button asChild>
              <Link href="/movies">Browse Movies</Link>
            </Button>
          </motion.div>
          
          {/* Series */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card p-6 rounded-lg shadow-md"
          >
            <h2 className="text-2xl font-semibold mb-4">TV Series</h2>
            <p className="text-muted-foreground mb-4">
              {seriesCategories.length} categories available
            </p>
            <Button asChild>
              <Link href="/series">Browse Series</Link>
            </Button>
          </motion.div>
        </div>
        
        {/* Account Status */}
        <div className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Account Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Subscription</p>
              <p className="font-medium">{user?.status === 'active' ? 'Active' : 'Expired'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-medium">{new Date(user?.expiryDate || '').toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Connections</p>
              <p className="font-medium">{user?.activeConnections} / {user?.maxConnections}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
