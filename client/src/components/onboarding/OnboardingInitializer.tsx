import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOnboarding } from '../../context/OnboardingContext';

/**
 * This component initializes the onboarding experience for new users.
 * It monitors auth state changes and triggers onboarding when appropriate.
 */
export function OnboardingInitializer() {
  const auth = useAuth();
  const { startOnboarding, onboarding } = useOnboarding();

  // Check if this is a new user when they sign in
  useEffect(() => {
    if (auth && auth.user) {
      // We can detect if someone is a new user using different methods:
      // 1. Check if account was created recently (within the last few minutes)
      // 2. Check localStorage to see if we've already shown onboarding 
      // 3. In the future, we could also check a database flag
      
      const hasSeenOnboarding = localStorage.getItem('hasCompletedOnboarding');
      const userCreationTime = auth.user.createdAt ? new Date(auth.user.createdAt).getTime() : 0;
      const now = new Date().getTime();
      const isNewAccount = now - userCreationTime < 5 * 60 * 1000; // 5 minutes
      
      // If the user account was just created or they haven't completed onboarding
      if ((isNewAccount || !hasSeenOnboarding) && !onboarding.completed) {
        console.log('Starting onboarding for new user:', auth.user.username);
        startOnboarding();
      }
    }
  }, [auth, startOnboarding, onboarding.completed]);
  
  // Mark onboarding as completed in localStorage when user completes all steps
  useEffect(() => {
    if (onboarding.completed) {
      localStorage.setItem('hasCompletedOnboarding', 'true');
    }
  }, [onboarding.completed]);

  // This is a utility component that doesn't render anything
  return null;
}