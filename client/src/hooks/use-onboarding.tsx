import { useState, useEffect, createContext, useContext } from "react";

interface OnboardingContextProps {
  hasCompletedOnboarding: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

const STORAGE_KEY = "fairshare_onboarding_completed";

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  // Check if onboarding has been completed before
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    // Check localStorage for onboarding completion status
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  // Control whether to show onboarding or not
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Initialize onboarding based on user status
  useEffect(() => {
    // We only show onboarding to new users who haven't completed it
    if (!hasCompletedOnboarding) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding]);

  // Function to mark onboarding as completed
  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    
    // Save completion status to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        showOnboarding,
        setShowOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  
  return context;
};