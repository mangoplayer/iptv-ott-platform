'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/app/store/player-store';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  X
} from 'lucide-react';

interface VideoPlayerProps {
  onClose?: () => void;
  isFullPage?: boolean;
}

export function VideoPlayer({ onClose, isFullPage = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hls, setHls] = useState<Hls | null>(null);
  
  const { 
    isPlaying, 
    source, 
    type, 
    content,
    volume,
    isMuted,
    playbackRate,
    quality,
    isFullscreen,
    togglePlay,
    setVolume,
    setMuted,
    setPlaybackRate,
    setQuality,
    setCurrentTime: storeSetCurrentTime,
    toggleFullscreen,
    stopPlayback
  } = usePlayerStore();
  
  const { updateProgress } = usePreferencesStore();
  
  // Initialize HLS.js when source changes
  useEffect(() => {
    if (!videoRef.current || !source) return;
    
    // Clean up previous instance if it exists
    if (hls) {
      hls.destroy();
      setHls(null);
    }
    
    let hlsInstance: Hls | null = null;
    let playAttempted = false;
    
    const initializePlayer = () => {
      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        
        hlsInstance.loadSource(source);
        hlsInstance.attachMedia(videoRef.current!);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isPlaying && videoRef.current && !playAttempted) {
            playAttempted = true;
            // Add a small delay before attempting to play
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().catch(error => {
                  console.error('Error playing video:', error);
                  // If autoplay was prevented, we can try again with user interaction
                  if (error.name === 'NotAllowedError') {
                    console.log('Autoplay prevented, waiting for user interaction');
                  }
                });
              }
            }, 100);
          }
        });
        
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error:', data);
                hlsInstance?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error:', data);
                hlsInstance?.recoverMediaError();
                break;
              default:
                console.error('Unrecoverable error:', data);
                hlsInstance?.destroy();
                break;
            }
          }
        });
        
        setHls(hlsInstance);
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = source;
      }
    };
    
    initializePlayer();
    
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [source]);
  
  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      // Add a small delay to avoid rapid play/pause calls
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing video:', error);
          // If autoplay was prevented, we can try again with user interaction
          if (error.name === 'NotAllowedError') {
            console.log('Autoplay prevented, waiting for user interaction');
          }
        });
      }
    } else {
      // Check if the video is actually playing before pausing
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);
  
  // Handle volume changes
  useEffect(() => {
    if (!videoRef.current) return;
    
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }, [volume, isMuted]);
  
  // Handle playback rate changes
  useEffect(() => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);
  
  // Handle fullscreen changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const enterFullscreen = () => {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any)?.mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any)?.msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    };
    
    const exitFullscreen = () => {
      try {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
          }
        }
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    };
    
    if (isFullscreen) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
    
    // Cleanup function to handle component unmounting
    return () => {
      if (isFullscreen) {
        try {
          if (document.fullscreenElement) {
            exitFullscreen();
          }
        } catch (error) {
          console.error('Error cleaning up fullscreen:', error);
        }
      }
    };
  }, [isFullscreen]);
  
  // Handle controls visibility
  const resetControlsTimeout = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    setShowControls(true);
    
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
  };
  
  // Handle video events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 0;
    
    setCurrentTime(currentTime);
    setDuration(duration);
    
    if (duration > 0) {
      setProgress((currentTime / duration) * 100);
      
      // Update progress in store every 5 seconds
      if (content && (type === 'vod' || type === 'series') && Math.floor(currentTime) % 5 === 0) {
        updateProgress(
          content.id,
          Math.floor((currentTime / duration) * 100),
          Math.floor(currentTime)
        );
      }
    }
  };
  
  const handleSeek = (value: number[]) => {
    if (!videoRef.current || !duration) return;
    
    const newTime = (value[0] / 100) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    storeSetCurrentTime(newTime);
  };
  
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Skip forward/backward
  const skipForward = () => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime += 10;
  };
  
  const skipBackward = () => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime -= 10;
  };
  
  return (
    <motion.div
      ref={containerRef}
      className={`relative ${isFullPage ? 'w-full h-screen' : 'w-full aspect-video'} bg-black overflow-hidden`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseMove={resetControlsTimeout}
      onClick={() => togglePlay()}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          if (type === 'vod' || type === 'series') {
            togglePlay();
          }
        }}
      />
      
      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Controls overlay */}
      {showControls && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top controls */}
          <div className="flex justify-between items-center">
            <div className="text-white font-medium">
              {content ? (
                type === 'live' ? (
                  <span>Live: {(content as any).name}</span>
                ) : type === 'vod' ? (
                  <span>Movie: {(content as any).name}</span>
                ) : (
                  <span>Episode: {(content as any).title}</span>
                )
              ) : (
                <span>Now Playing</span>
              )}
            </div>
            
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  stopPlayback();
                  onClose();
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            )}
          </div>
          
          {/* Center play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-black/50 text-white pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
          </div>
          
          {/* Bottom controls */}
          <div className="space-y-2">
            {/* Progress bar */}
            {type !== 'live' && (
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[progress]}
                  min={0}
                  max={100}
                  step={0.1}
                  className="flex-1"
                  onValueChange={handleSeek}
                />
                <span className="text-white text-sm">
                  {formatTime(duration)}
                </span>
              </div>
            )}
            
            {/* Control buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                
                {type !== 'live' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        skipBackward();
                      }}
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        skipForward();
                      }}
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </>
                )}
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMuted(!isMuted);
                    }}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    min={0}
                    max={100}
                    step={1}
                    className="w-24"
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open settings menu
                  }}
                >
                  <Settings className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}