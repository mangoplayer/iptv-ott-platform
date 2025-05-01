'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { useContentStore } from '@/app/store/content-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentGrid } from '@/app/components/ui/content-grid';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Calendar, 
  Clock, 
  LogOut, 
  Moon, 
  Sun, 
  Monitor, 
  Heart,
  History,
  Settings,
  Shield
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { 
    theme, 
    setTheme, 
    favorites, 
    history, 
    clearHistory, 
    parentalControlEnabled,
    toggleParentalControl
  } = usePreferencesStore();
  const { 
    getChannelById, 
    getMovieById, 
    getSeriesById 
  } = useContentStore();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/');
  };
  
  // Get favorite items
  const getFavoriteItems = () => {
    return favorites.map(fav => {
      if (fav.type === 'channel') {
        return getChannelById(fav.id);
      } else if (fav.type === 'movie') {
        return getMovieById(fav.id);
      } else {
        return getSeriesById(fav.id);
      }
    }).filter(Boolean);
  };
  
  // Get history items
  const getHistoryItems = () => {
    return history.map(item => {
      if (item.type === 'channel') {
        return getChannelById(item.id);
      } else if (item.type === 'movie') {
        return getMovieById(item.id);
      } else {
        return getSeriesById(item.id);
      }
    }).filter(Boolean);
  };
  
  if (!isAuthenticated || !user) {
    return null;
  }
  
  const favoriteItems = getFavoriteItems();
  const historyItems = getHistoryItems();
  
  return (
    <div className="container mx-auto py-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">{user.username}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {user.status === 'active' ? (
                    <span className="text-green-500">Active</span>
                  ) : (
                    <span className="text-red-500">Expired</span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Expiry Date</p>
                <p className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  {new Date(user.expiryDate || '').toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <p className="font-medium">{user.activeConnections} / {user.maxConnections}</p>
              </div>
              
              <Button 
                variant="destructive" 
                className="w-full mt-4"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
          
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selector */}
              <div>
                <p className="text-sm font-medium mb-3">Theme</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>
              
              {/* Parental Control */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="parental-control" className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Parental Control
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Restrict access to adult content
                  </p>
                </div>
                <Switch
                  id="parental-control"
                  checked={parentalControlEnabled}
                  onCheckedChange={toggleParentalControl}
                />
              </div>
              
              {/* Clear History */}
              <div>
                <p className="text-sm font-medium mb-2">Watch History</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearHistory}
                  disabled={history.length === 0}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Clear Watch History
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Server Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Server Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Server URL</p>
                <p className="font-medium truncate">{user.serverUrl}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Server Version</p>
                <p className="font-medium">{user.serverInfo?.version || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{user.serverInfo?.timezone || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Server Time</p>
                <p className="font-medium">{user.serverInfo?.time || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Favorites and History */}
        <div className="mt-8">
          <Tabs defaultValue="favorites">
            <TabsList>
              <TabsTrigger value="favorites" className="flex items-center">
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                Watch History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="favorites" className="mt-4">
              {favoriteItems.length > 0 ? (
                <ContentGrid
                  items={favoriteItems}
                  type="movie" // This is just a placeholder, the component will determine the actual type
                  getItemHref={(item) => {
                    const type = favorites.find(f => f.id === (item as any).id || f.id === (item as any).stream_id || f.id === (item as any).series_id)?.type;
                    if (type === 'channel') {
                      return '/live-tv';
                    } else if (type === 'movie') {
                      return `/movies/${(item as any).stream_id}`;
                    } else {
                      return `/series/${(item as any).series_id}`;
                    }
                  }}
                  aspectRatio="portrait"
                  virtualized={false}
                />
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't added any favorites yet.</p>
                  <Button 
                    variant="link" 
                    onClick={() => router.push('/')}
                    className="mt-2"
                  >
                    Browse content
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              {historyItems.length > 0 ? (
                <ContentGrid
                  items={historyItems}
                  type="movie" // This is just a placeholder, the component will determine the actual type
                  getItemHref={(item) => {
                    const type = history.find(h => h.id === (item as any).id || h.id === (item as any).stream_id || h.id === (item as any).series_id)?.type;
                    if (type === 'channel') {
                      return '/live-tv';
                    } else if (type === 'movie') {
                      return `/movies/${(item as any).stream_id}`;
                    } else {
                      return `/series/${(item as any).series_id}`;
                    }
                  }}
                  aspectRatio="portrait"
                  virtualized={false}
                />
              ) : (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your watch history is empty.</p>
                  <Button 
                    variant="link" 
                    onClick={() => router.push('/')}
                    className="mt-2"
                  >
                    Start watching
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}