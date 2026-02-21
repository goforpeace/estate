
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
  const [loadingState, setLoadingState] = useState({ isLoading: false, text: 'Loading...' });

  const showLoading = useCallback((text = 'Loading...') => {
    setLoadingState({ isLoading: true, text });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(prev => prev.isLoading ? { ...prev, isLoading: false } : prev);
  }, []);

  const value = useMemo(() => ({
    isLoading: loadingState.isLoading,
    showLoading,
    hideLoading
  }), [loadingState.isLoading, showLoading, hideLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {loadingState.isLoading && <LoadingOverlay text={loadingState.text} />}
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
