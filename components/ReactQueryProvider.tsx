"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useRef } from 'react';
import OnboardingProvider from './OnboardingProvider';

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // useRef ensures the QueryClient instance is stable across renders
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }
  return (
    <QueryClientProvider client={queryClientRef.current}>
      <OnboardingProvider>
        {children}
      </OnboardingProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
} 