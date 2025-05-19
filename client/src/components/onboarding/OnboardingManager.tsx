import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useToast } from '@/hooks/use-toast';
import { AnimatedGuidedTour } from './AnimatedGuidedTour';
import { GuidedTour } from './GuidedTour';

export function OnboardingManager() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [isNewUser, setIsNewUser] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Check if this is a new user
  useEffect(() => {
    // We'll consider someone a new user if they don't have any onboarding info in localStorage
    const hasOnboardingData = localStorage.getItem('fairshare_onboarding_completed');
    const hasSeenAnimation = localStorage.getItem('fairshare_animation_seen');
    
    // If they've never seen the onboarding or animation, they're a new user
    if (!hasOnboardingData && !hasSeenAnimation) {
      console.log('Starting onboarding for new user:', localStorage.getItem('fairshare_username'));
      setIsNewUser(true);
      localStorage.setItem('fairshare_animation_seen', 'true');
    }
  }, []);

  // Delay showing the guided tour for new users to show the welcome animation first
  useEffect(() => {
    if (isNewUser) {
      // After the welcome animation, navigate to groups to start the tour
      const timer = setTimeout(() => {
        navigate('/groups');
      }, 3000); // Allow time for the welcome animation
      
      return () => clearTimeout(timer);
    }
  }, [isNewUser, navigate]);

  // If we're showing onboarding and it's not a brand new user, show the regular guided tour
  if (showOnboarding && !isNewUser) {
    return <GuidedTour />;
  }

  // If it's a new user, show the animated guided tour
  if (isNewUser) {
    return <AnimatedGuidedTour onComplete={() => {
      setIsNewUser(false);
      completeOnboarding();
      toast({
        title: "Welcome to FairShare!",
        description: "Your account is all set up and ready to go.",
      });
    }} />;
  }

  return null;
}

export default OnboardingManager;