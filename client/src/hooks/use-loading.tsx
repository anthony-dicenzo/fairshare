import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  startLoading: () => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgressValue] = useState(0);
  const [location] = useLocation();

  // Start loading when location changes
  useEffect(() => {
    startLoading();
    
    // Simulate progressive loading
    const timer1 = setTimeout(() => setProgressValue(30), 100);
    const timer2 = setTimeout(() => setProgressValue(60), 200);
    const timer3 = setTimeout(() => setProgressValue(85), 300);
    const timer4 = setTimeout(() => {
      setProgressValue(100);
      setTimeout(() => stopLoading(), 150);
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location]);

  const startLoading = () => {
    setIsLoading(true);
    setProgressValue(0);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgressValue(0);
  };

  const setProgress = (newProgress: number) => {
    setProgressValue(Math.min(100, Math.max(0, newProgress)));
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        progress,
        startLoading,
        stopLoading,
        setProgress,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}