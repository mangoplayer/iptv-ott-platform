'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/app/store/auth-store';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { usePlayerStore } from '@/app/store/player-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  Moon, 
  Sun, 
  Monitor, 
  Settings,
  Shield,
  Volume2,
  Tv,
  Film,
  Languages,
  RefreshCw,
  Lock
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// PIN form schema
const pinFormSchema = z.object({
  currentPin: z.string().min(4, { message: 'PIN must be at least 4 characters' }),
  newPin: z.string().min(4, { message: 'PIN must be at least 4 characters' }),
  confirmPin: z.string().min(4, { message: 'PIN must be at least 4 characters' }),
}).refine((data) => data.newPin === data.confirmPin, {
  message: "New PIN and confirmation don't match",
  path: ['confirmPin'],
});

type PinFormValues = z.infer<typeof pinFormSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { 
    theme, 
    setTheme, 
    language,
    setLanguage,
    parentalControlEnabled,
    toggleParentalControl,
    parentalControlPin,
    setParentalControlPin,
    autoPlayNextEpisode,
    toggleAutoPlayNextEpisode,
    showWatchedBadges,
    toggleShowWatchedBadges
  } = usePreferencesStore();
  const {
    volume,
    setVolume,
    isMuted,
    setMuted,
    defaultPlaybackRate,
    setDefaultPlaybackRate,
    defaultQuality,
    setDefaultQuality
  } = usePlayerStore();
  
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  
  // PIN form
  const pinForm = useForm<PinFormValues>({
    resolver: zodResolver(pinFormSchema),
    defaultValues: {
      currentPin: '',
      newPin: '',
      confirmPin: '',
    },
  });
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);
  
  // Handle PIN form submission
  const onPinSubmit = (values: PinFormValues) => {
    if (values.currentPin === parentalControlPin) {
      setParentalControlPin(values.newPin);
      pinForm.reset();
      setIsPinDialogOpen(false);
    } else {
      pinForm.setError('currentPin', {
        type: 'manual',
        message: 'Current PIN is incorrect',
      });
    }
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="appearance">
          <TabsList className="mb-6">
            <TabsTrigger value="appearance" className="flex items-center">
              <Monitor className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="playback" className="flex items-center">
              <Film className="h-4 w-4 mr-2" />
              Playback
            </TabsTrigger>
            <TabsTrigger value="parental" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Parental Control
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center">
              <Languages className="h-4 w-4 mr-2" />
              Language
            </TabsTrigger>
          </TabsList>
          
          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the application looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selector */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('system')}
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Show Watched Badges */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Watched Badges</Label>
                    <p className="text-sm text-muted-foreground">
                      Display badges on content you've already watched
                    </p>
                  </div>
                  <Switch
                    checked={showWatchedBadges}
                    onCheckedChange={toggleShowWatchedBadges}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Playback Settings */}
          <TabsContent value="playback">
            <Card>
              <CardHeader>
                <CardTitle>Playback</CardTitle>
                <CardDescription>
                  Configure video playback settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Volume */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Default Volume</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMuted(!isMuted)}
                      >
                        <Volume2 className={`h-4 w-4 ${isMuted ? 'text-muted-foreground' : ''}`} />
                      </Button>
                      <Slider
                        value={[volume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        className="w-48"
                        onValueChange={(value) => setVolume(value[0] / 100)}
                      />
                      <span className="w-8 text-center">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Default Playback Speed */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Default Playback Speed</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[defaultPlaybackRate * 100]}
                        min={50}
                        max={200}
                        step={25}
                        className="w-48"
                        onValueChange={(value) => setDefaultPlaybackRate(value[0] / 100)}
                      />
                      <span className="w-12 text-center">{defaultPlaybackRate}x</span>
                    </div>
                  </div>
                </div>
                
                {/* Default Quality */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label>Default Quality</Label>
                      <p className="text-sm text-muted-foreground">
                        Select preferred video quality when available
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={defaultQuality === 'auto' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDefaultQuality('auto')}
                      >
                        Auto
                      </Button>
                      <Button
                        variant={defaultQuality === 'high' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDefaultQuality('high')}
                      >
                        High
                      </Button>
                      <Button
                        variant={defaultQuality === 'medium' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDefaultQuality('medium')}
                      >
                        Medium
                      </Button>
                      <Button
                        variant={defaultQuality === 'low' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDefaultQuality('low')}
                      >
                        Low
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Auto Play Next Episode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Play Next Episode</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically play the next episode when current one ends
                    </p>
                  </div>
                  <Switch
                    checked={autoPlayNextEpisode}
                    onCheckedChange={toggleAutoPlayNextEpisode}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Parental Control Settings */}
          <TabsContent value="parental">
            <Card>
              <CardHeader>
                <CardTitle>Parental Control</CardTitle>
                <CardDescription>
                  Manage content restrictions and PIN settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Parental Control */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Parental Control</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to adult content with PIN protection
                    </p>
                  </div>
                  <Switch
                    checked={parentalControlEnabled}
                    onCheckedChange={toggleParentalControl}
                  />
                </div>
                
                {/* Change PIN */}
                <div className="space-y-2">
                  <Label>Parental Control PIN</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Change your parental control PIN
                  </p>
                  
                  <Form {...pinForm}>
                    <form onSubmit={pinForm.handleSubmit(onPinSubmit)} className="space-y-4">
                      <FormField
                        control={pinForm.control}
                        name="currentPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current PIN</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter current PIN"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pinForm.control}
                        name="newPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New PIN</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter new PIN"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pinForm.control}
                        name="confirmPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New PIN</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm new PIN"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit">
                        <Lock className="h-4 w-4 mr-2" />
                        Change PIN
                      </Button>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Language Settings */}
          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle>Language</CardTitle>
                <CardDescription>
                  Set your preferred language for the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language Selection */}
                <div className="space-y-4">
                  <Label>Interface Language</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    <Button
                      variant={language === 'en' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('en')}
                    >
                      <span className="mr-2">🇬🇧</span>
                      English
                    </Button>
                    <Button
                      variant={language === 'tr' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('tr')}
                    >
                      <span className="mr-2">🇹🇷</span>
                      Türkçe
                    </Button>
                    <Button
                      variant={language === 'de' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('de')}
                    >
                      <span className="mr-2">🇩🇪</span>
                      Deutsch
                    </Button>
                    <Button
                      variant={language === 'fr' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('fr')}
                    >
                      <span className="mr-2">🇫🇷</span>
                      Français
                    </Button>
                    <Button
                      variant={language === 'es' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('es')}
                    >
                      <span className="mr-2">🇪🇸</span>
                      Español
                    </Button>
                    <Button
                      variant={language === 'it' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('it')}
                    >
                      <span className="mr-2">🇮🇹</span>
                      Italiano
                    </Button>
                    <Button
                      variant={language === 'ru' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('ru')}
                    >
                      <span className="mr-2">🇷🇺</span>
                      Русский
                    </Button>
                    <Button
                      variant={language === 'ar' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setLanguage('ar')}
                    >
                      <span className="mr-2">🇸🇦</span>
                      العربية
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Note: Changing the language will reload the application.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}