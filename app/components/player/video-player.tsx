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
    
    console.log('Initializing video player with source:', source);
    
    // Clean up previous instance if it exists
    if (hls) {
      console.log('Destroying previous HLS instance');
      hls.destroy();
      setHls(null);
    }
    
    let hlsInstance: Hls | null = null;
    let playAttempted = false;
    
    const initializePlayer = () => {
      try {
        if (Hls.isSupported()) {
          console.log('HLS is supported, creating new instance');
          
          // Enable debug mode for troubleshooting
          Hls.DefaultConfig.debug = true;
          
          hlsInstance = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            // Modern retry policy configuration
            fragLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 20000, // Increased timeout
                maxLoadTimeMs: 120000,
                timeoutRetry: {
                  maxNumRetry: 8, // Increased retries
                  retryDelayMs: 1000,
                  maxRetryDelayMs: 0
                },
                errorRetry: {
                  maxNumRetry: 8, // Increased retries
                  retryDelayMs: 1000,
                  maxRetryDelayMs: 8000
                }
              }
            },
            manifestLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 20000, // Increased timeout
                maxLoadTimeMs: 120000,
                timeoutRetry: {
                  maxNumRetry: 8, // Increased retries
                  retryDelayMs: 1000,
                  maxRetryDelayMs: 0
                },
                errorRetry: {
                  maxNumRetry: 8, // Increased retries
                  retryDelayMs: 1000,
                  maxRetryDelayMs: 8000
                }
              }
            },
            // Enable debug logs
            debug: true,
            // Use fetch instead of XHR for better CORS handling
            xhrSetup: function(xhr, url) {
              // Log URL being requested
              console.log('HLS requesting URL:', url);
              
              // Set withCredentials to true to include cookies in cross-origin requests
              xhr.withCredentials = true;
              
              // Add custom headers if needed
              // xhr.setRequestHeader('X-Custom-Header', 'value');
            },
            // Enable low latency mode
            lowLatencyMode: true,
            // Increase buffer size
            backBufferLength: 90
          });
          
          // Add event listeners before loading source
          hlsInstance.on(Hls.Events.MANIFEST_LOADING, () => {
            console.log('Manifest loading...', source);
            setIsBuffering(true);
          });
          
          hlsInstance.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
            console.log('Manifest loaded successfully', data);
          });
          
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('Manifest parsed, ready to play', data);
            
            // Check if we have levels (quality options)
            if (data.levels && data.levels.length > 0) {
              console.log(`Available quality levels: ${data.levels.length}`);
              data.levels.forEach((level, index) => {
                console.log(`Level ${index}: ${level.width}x${level.height} @ ${level.bitrate}bps`);
              });
            }
            
            if (isPlaying && videoRef.current && !playAttempted) {
              playAttempted = true;
              // Add a small delay before attempting to play
              setTimeout(() => {
                if (videoRef.current) {
                  console.log('Attempting to play video...');
                  videoRef.current.play().catch(error => {
                    console.error('Error playing video:', error);
                    // If autoplay was prevented, we can try again with user interaction
                    if (error.name === 'NotAllowedError') {
                      console.log('Autoplay prevented, waiting for user interaction');
                    }
                  });
                }
              }, 1000); // Increased delay for more stability
            }
          });
          
          hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            console.warn('HLS error:', data.type, data.details, data);
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('Network error:', data);
                  
                  // Check if this is a CORS error
                  if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                      data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
                      data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
                    console.log('Possible CORS issue or network error, trying to recover...');
                  }
                  
                  console.log('Trying to recover from network error...');
                  // Try to recover with a delay
                  setTimeout(() => {
                    if (hlsInstance) {
                      console.log('Restarting load after network error');
                      hlsInstance.startLoad();
                    }
                  }, 2000);
                  break;
                  
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('Media error:', data);
                  console.log('Trying to recover from media error...');
                  if (hlsInstance) {
                    hlsInstance.recoverMediaError();
                  }
                  break;
                  
                default:
                  console.error('Unrecoverable error:', data);
                  // Try to recreate the instance
                  if (hlsInstance) {
                    hlsInstance.destroy();
                    // Create a new instance after a delay
                    setTimeout(() => {
                      console.log('Recreating HLS instance after unrecoverable error');
                      initializePlayer();
                    }, 2000);
                  }
                  break;
              }
            }
          });
          
          // Add more event listeners for debugging
          hlsInstance.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            console.log('Level loaded:', data.level, data);
          });
          
          hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
            console.log('Fragment loaded:', data.frag.url);
            setIsBuffering(false); // Turn off buffering indicator when fragments load
          });
          
          hlsInstance.on(Hls.Events.FRAG_LOADING, (event, data) => {
            console.log('Fragment loading:', data.frag.url);
          });
          
          hlsInstance.on(Hls.Events.BUFFER_CREATED, () => {
            console.log('Buffer created');
          });
          
          hlsInstance.on(Hls.Events.BUFFER_APPENDED, () => {
            console.log('Buffer appended');
          });
          
          // Now load the source
          console.log('Loading source into HLS.js:', source);
          
          // Check if the source URL is valid
          if (!source.startsWith('http')) {
            console.error('Invalid source URL:', source);
            return;
          }
          
          hlsInstance.loadSource(source);
          hlsInstance.attachMedia(videoRef.current!);
          
          // Set initial quality to auto
          hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            console.log(`Quality changed to level ${data.level}`);
          });
          
          // Start with auto quality
          hlsInstance.autoLevelEnabled = true;
          
          setHls(hlsInstance);
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          console.log('Using native HLS support');
          videoRef.current.src = source;
        } else {
          console.error('HLS is not supported in this browser and no native support');
          // Fallback to direct source if possible
          videoRef.current.src = source;
        }
      } catch (error) {
        console.error('Error initializing HLS player:', error);
      }
    };
    
    // Small delay before initializing to avoid rapid source changes
    const initTimer = setTimeout(() => {
      initializePlayer();
    }, 500);
    
    return () => {
      clearTimeout(initTimer);
      if (hlsInstance) {
        console.log('Cleaning up HLS instance');
        hlsInstance.destroy();
      }
    };
  }, [source, hls, isPlaying]);
  
  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current || !source) return;
    
    console.log('Play state changed:', isPlaying);
    
    if (isPlaying) {
      // Only attempt to play if we have a valid source and HLS is ready
      if (hls && hls.media) {
        console.log('HLS is ready, attempting to play');
        // Add a small delay to avoid rapid play/pause calls
        setTimeout(() => {
          if (videoRef.current) {
            try {
              const playPromise = videoRef.current.play();
              
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.error('Error playing video:', error);
                  // If autoplay was prevented, we can try again with user interaction
                  if (error.name === 'NotAllowedError') {
                    console.log('Autoplay prevented, waiting for user interaction');
                  } else if (error.name === 'AbortError') {
                    console.log('Play request was aborted, likely due to another play request');
                  }
                });
              }
            } catch (error) {
              console.error('Exception during play attempt:', error);
            }
          }
        }, 500);
      } else {
        console.log('HLS not ready yet, waiting for initialization');
        
        // If HLS isn't ready but we have a video element, try direct play as fallback
        if (videoRef.current && videoRef.current.src === source) {
          console.log('Attempting direct play without HLS...');
          try {
            videoRef.current.play().catch(error => {
              console.error('Error with direct play:', error);
            });
          } catch (error) {
            console.error('Exception during direct play attempt:', error);
          }
        }
      }
    } else {
      // Check if the video is actually playing before pausing
      if (videoRef.current && !videoRef.current.paused) {
        console.log('Pausing video');
        try {
          videoRef.current.pause();
        } catch (error) {
          console.error('Error pausing video:', error);
        }
      }
    }
  }, [isPlaying, source, hls]);
  
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