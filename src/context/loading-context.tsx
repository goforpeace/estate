'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

type LoadingContextType = {
  showLoading: (text?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');

  const showLoading = useCallback((text = 'Loading...') => {
    setLoadingText(text);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const value = useMemo(() => ({
    isLoading,
    showLoading,
    hideLoading
  }), [isLoading, showLoading, hideLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && <LoadingOverlay text={loadingText} />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
