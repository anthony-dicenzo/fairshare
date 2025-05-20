import React, { createContext, useState, useContext, useEffect } from 'react';
import InteractiveOnboarding from './InteractiveOnboarding';

// User type that matches auth context
interface UserType {
  id: number;
  username: string;
  name: string;
  email: string;
  createdAt: string | Date;
}

// Context type for onboarding
interface OnboardingContextType {
  isOnboardingComplete: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

// Create context with default values
const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: true,
  startOnboarding: () => {},
  completeOnboarding: () => {},
  skipOnboarding: () => {},
});

// Local storage key
const ONBOARDING_COMPLETE_KEY = 'fairshare_onboarding_complete';

// Hook to use onboarding context
export const useOnboarding = () => useContext(OnboardingContext);

// Onboarding provider component
export const OnboardingProvider: React.FC<{
  children: React.ReactNode;
  user: UserType | null;
}> = ({ children, user }) => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    const saved = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Check if user is new and start onboarding
  useEffect(() => {
    if (user && !isOnboardingComplete) {
      console.log('Starting onboarding for new user:', user.username);
      setShowOnboarding(true);
    }
  }, [user, isOnboardingComplete]);

  // Onboarding actions
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
      
      {/* Show interactive onboarding only if user exists and onboarding should be shown */}
      {user && showOnboarding && (
        <InteractiveOnboarding 
          user={user} 
          onComplete={completeOnboarding} 
          onSkip={skipOnboarding} 
        />
      )}
    </OnboardingContext.Provider>
  );
};