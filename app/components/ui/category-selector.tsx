'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  allCategoriesOption?: boolean;
  allCategoriesLabel?: string;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
  allCategoriesOption = true,
  allCategoriesLabel = 'All Categories',
}: CategorySelectorProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Check if we need to show scroll arrows
  useEffect(() => {
    const checkScroll = () => {
      if (!scrollAreaRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = scrollAreaRef.current;
      
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10); // 10px buffer
    };
    
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
      
      // Check again after a short delay to account for any layout shifts
      setTimeout(checkScroll, 100);
      
      return () => {
        scrollArea.removeEventListener('scroll', checkScroll);
      };
    }
  }, [categories]);
  
  // Scroll functions
  const scrollLeft = () => {
    if (!scrollAreaRef.current) return;
    
    scrollAreaRef.current.scrollBy({
      left: -200,
      behavior: 'smooth',
    });
  };
  
  const scrollRight = () => {
    if (!scrollAreaRef.current) return;
    
    scrollAreaRef.current.scrollBy({
      left: 200,
      behavior: 'smooth',
    });
  };
  
  return (
    <div className="relative">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
      
      {/* Categories scroll area */}
      <ScrollArea className="w-full pb-4" ref={scrollAreaRef}>
        <div className="flex space-x-2 p-1">
          {allCategoriesOption && (
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => onSelectCategory(null)}
            >
              {allCategoriesLabel}
            </Button>
          )}
          
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => onSelectCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {/* Right scroll arrow */}
      {showRightArrow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}