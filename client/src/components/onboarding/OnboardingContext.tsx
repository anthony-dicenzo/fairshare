import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '@shared/schema';
import OnboardingExperience from './OnboardingExperience';

// Define the context type
interface OnboardingContextType {
  isOnboardingComplete: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

// Create the context with default values
export const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: true,
  startOnboarding: () => {},
  completeOnboarding: () => {},
  skipOnboarding: () => {},
});

// Hook to use the onboarding context
export const useOnboarding = () => useContext(OnboardingContext);

// Local storage key
const ONBOARDING_COMPLETE_KEY = 'fairshare_onboarding_complete';

interface OnboardingProviderProps {
  children: React.ReactNode;
  user: User | null;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ 
  children, 
  user 
}) => {
  // Check local storage for onboarding complete status
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    const saved = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Check if the user is new (no onboarding yet) and start onboarding
  useEffect(() => {
    if (user && !isOnboardingComplete) {
      console.log('Starting onboarding for new user:', user.username);
      setShowOnboarding(true);
    }
  }, [user, isOnboardingComplete]);

  // Functions to control onboarding state
  const startOnboarding = () => {
    setIsOnboardingComplete(false);
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(true));
  };

  const skipOnboarding = () => {
    setIsOnboardingComplete(true);
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(true));
  };

  return (
    <OnboardingContext.Provider 
      value={{ 
        isOnboardingComplete, 
        startOnboarding, 
        completeOnboarding, 
        skipOnboarding 
      }}
    >
      {children}
      
      {/* Show the onboarding experience if user exists and onboarding should be shown */}
      {user && showOnboarding && (
        <OnboardingExperience 
          user={user} 
          onComplete={completeOnboarding} 
          onSkip={skipOnboarding} 
        />
      )}
    </OnboardingContext.Provider>
  );
};

export default OnboardingProvider;