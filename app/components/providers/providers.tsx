'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './theme-provider';
import { useAuthStore } from '@/app/store/auth-store';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));
  
  const initializeApi = useAuthStore(state => state.initializeApi);
  
  // Initialize API on app load
  useEffect(() => {
    // Initialize API with stored credentials
    initializeApi();
  }, [initializeApi]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}