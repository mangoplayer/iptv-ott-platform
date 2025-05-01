'use client';

import { ReactNode } from 'react';
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { LiveChannel, Movie, TVShow } from '@/app/types/app';
import { ContentCard } from './content-card';

interface ContentGridProps {
  items: (LiveChannel | Movie | TVShow)[];
  type: 'channel' | 'movie' | 'series';
  getItemHref?: (item: LiveChannel | Movie | TVShow) => string;
  onItemClick?: (item: LiveChannel | Movie | TVShow) => void;
  aspectRatio?: 'portrait' | 'square' | 'video';
  columnCount?: number;
  gap?: number;
  virtualized?: boolean;
  loading?: boolean;
  emptyContent?: ReactNode;
}

export function ContentGrid({
  items,
  type,
  getItemHref,
  onItemClick,
  aspectRatio = 'portrait',
  columnCount,
  gap = 16,
  virtualized = false,
  loading = false,
  emptyContent,
}: ContentGridProps) {
  // Ensure items is an array
  const itemsArray = Array.isArray(items) ? items : [];
  
  // If no items and not loading, show empty content
  if (itemsArray.length === 0 && !loading) {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        {emptyContent || (
          <p className="text-muted-foreground">No content available</p>
        )}
      </div>
    );
  }
  
  // If loading, show skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div 
            key={index} 
            className={`bg-muted animate-pulse rounded-lg ${
              aspectRatio === 'portrait' 
                ? 'aspect-[2/3]' 
                : aspectRatio === 'square' 
                  ? 'aspect-square' 
                  : 'aspect-video'
            }`} 
          />
        ))}
      </div>
    );
  }
  
  // If not virtualized, render a simple grid
  if (!virtualized) {
    return (
      <div 
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-${gap / 4}`}
        style={{ gap: `${gap}px` }}
      >
        {itemsArray.map((item, index) => {
          const id = type === 'channel' 
            ? (item as LiveChannel).stream_id 
            : type === 'movie' 
              ? (item as Movie).stream_id 
              : (item as TVShow).series_id;
          
          return (
            <ContentCard
              key={`${type}-${id}-${index}`}
              content={item}
              type={type}
              aspectRatio={aspectRatio}
              href={getItemHref ? getItemHref(item) : undefined}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            />
          );
        })}
      </div>
    );
  }
  
  // Virtualized grid for better performance with large lists
  return (
    <div className="w-full h-[80vh]">
      <AutoSizer>
        {({ height, width }) => {
          // Calculate columns based on container width
          const cols = columnCount || Math.max(2, Math.floor(width / 200));
          const itemWidth = (width - (cols - 1) * gap) / cols;
          const itemHeight = aspectRatio === 'portrait' 
            ? itemWidth * 1.5 
            : aspectRatio === 'square' 
              ? itemWidth 
              : itemWidth * 0.5625;
          
          return (
            <FixedSizeGrid
              columnCount={cols}
              columnWidth={itemWidth}
              height={height}
              rowCount={Math.ceil(itemsArray.length / cols)}
              rowHeight={itemHeight + gap}
              width={width}
              itemData={{
                items: itemsArray,
                type,
                cols,
                getItemHref,
                onItemClick,
                aspectRatio,
              }}
            >
              {({ columnIndex, rowIndex, style, data }) => {
                const index = rowIndex * data.cols + columnIndex;
                
                if (index >= data.items.length) {
                  return null;
                }
                
                const item = data.items[index];
                const id = data.type === 'channel' 
                  ? (item as LiveChannel).stream_id 
                  : data.type === 'movie' 
                    ? (item as Movie).stream_id 
                    : (item as TVShow).series_id;
                
                // Adjust style to add gap
                const adjustedStyle = {
                  ...style,
                  width: (style.width as number) - (columnIndex < data.cols - 1 ? gap : 0),
                  height: (style.height as number) - gap,
                };
                
                return (
                  <div style={adjustedStyle}>
                    <ContentCard
                      key={`${data.type}-${id}-${index}`}
                      content={item}
                      type={data.type}
                      aspectRatio={data.aspectRatio}
                      width={adjustedStyle.width as number}
                      height={adjustedStyle.height as number}
                      href={data.getItemHref ? data.getItemHref(item) : undefined}
                      onClick={data.onItemClick ? () => data.onItemClick(item) : undefined}
                    />
                  </div>
                );
              }}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
}