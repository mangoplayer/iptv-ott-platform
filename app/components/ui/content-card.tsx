'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LiveChannel, Movie, TVShow } from '@/app/types/app';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface ContentCardProps {
  content: LiveChannel | Movie | TVShow;
  type: 'channel' | 'movie' | 'series';
  aspectRatio?: 'portrait' | 'square' | 'video';
  width?: number;
  height?: number;
  href?: string;
  onClick?: () => void;
}

export function ContentCard({
  content,
  type,
  aspectRatio = 'portrait',
  width,
  height,
  href,
  onClick,
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isFavorite, addToFavorites, removeFromFavorites } = usePreferencesStore();
  
  const id = type === 'channel' 
    ? (content as LiveChannel).stream_id 
    : type === 'movie' 
      ? (content as Movie).stream_id 
      : (content as TVShow).series_id;
  
  const name = type === 'channel' || type === 'movie'
    ? (content as LiveChannel | Movie).name
    : (content as TVShow).name;
  
  const imageUrl = type === 'channel'
    ? (content as LiveChannel).stream_icon
    : type === 'movie'
      ? (content as Movie).stream_icon
      : (content as TVShow).cover;
  
  const isFav = isFavorite(id);
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFav) {
      removeFromFavorites(id);
    } else {
      addToFavorites(id, type);
    }
  };
  
  const getAspectRatio = () => {
    switch (aspectRatio) {
      case 'portrait':
        return 'aspect-[2/3]';
      case 'square':
        return 'aspect-square';
      case 'video':
        return 'aspect-video';
      default:
        return 'aspect-[2/3]';
    }
  };
  
  const cardContent = (
    <motion.div
      className={`relative overflow-hidden rounded-lg bg-muted ${getAspectRatio()} group`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
      
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform group-hover:scale-110"
          sizes={width ? `${width}px` : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
          unoptimized={true} // Disable optimization for external images
        />
      ) : (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground">{name.charAt(0)}</span>
        </div>
      )}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
        <h3 className="text-white font-medium text-sm truncate">{name}</h3>
        
        {type === 'channel' && (content as LiveChannel).currentProgram && (
          <p className="text-white/80 text-xs truncate mt-1">
            {(content as LiveChannel).currentProgram?.title}
          </p>
        )}
      </div>
      
      {/* Favorite button */}
      <Button
        variant="ghost"
        size="icon"
        className={`absolute top-2 right-2 z-20 ${
          isFav ? 'text-red-500' : 'text-white/80'
        } hover:text-red-500 hover:bg-white/10 opacity-${isHovered || isFav ? '100' : '0'} transition-opacity`}
        onClick={toggleFavorite}
      >
        <Heart className="h-5 w-5" fill={isFav ? 'currentColor' : 'none'} />
      </Button>
      
      {/* Progress bar for movies */}
      {type === 'movie' && (content as Movie).progress !== undefined && (content as Movie).progress! > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground z-20">
          <div 
            className="h-full bg-primary" 
            style={{ width: `${(content as Movie).progress}%` }} 
          />
        </div>
      )}
    </motion.div>
  );
  
  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }
  
  if (onClick) {
    return (
      <div onClick={onClick} className="cursor-pointer">
        {cardContent}
      </div>
    );
  }
  
  return cardContent;
}