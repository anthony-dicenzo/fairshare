import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useNewUser } from '@/hooks/use-new-user';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import AnimatedGuidedTour from './AnimatedGuidedTour';
import WelcomeAnimation from './WelcomeAnimation';
import { GuidedTour } from './GuidedTour';

export function OnboardingManager() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isNewUser, markUserAsExisting } = useNewUser();
  const { user } = useAuth();
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Set up animation flag when a new user is detected
  useEffect(() => {
    if (isNewUser) {
      // Check if they've seen the animation before
      const hasSeenAnimation = localStorage.getItem('fairshare_animation_seen');
      
      if (!hasSeenAnimation) {
        setShowWelcomeAnimation(true);
        localStorage.setItem('fairshare_animation_seen', 'true');
      } else {
        // If they've seen the animation but are still new, show the guided tour
        setShowGuidedTour(true);
      }
    }
  }, [isNewUser]);

  // If we're showing onboarding for an existing user, show the regular guided tour
  useEffect(() => {
    if (showOnboarding && !isNewUser) {
      setShowGuidedTour(true);
    }
  }, [showOnboarding, isNewUser]);

  // Handle completion of welcome animation
  const handleWelcomeAnimationComplete = () => {
    setShowWelcomeAnimation(false);
    setShowGuidedTour(true);
    navigate('/groups');
  };

  // Handle completion of guided tour
  const handleGuidedTourComplete = () => {
    setShowGuidedTour(false);
    markUserAsExisting();
    completeOnboarding();
    toast({
      title: "Welcome to FairShare!",
      description: "Your account is all set up and ready to go.",
    });
  };

  // Show welcome animation for brand new users
  if (showWelcomeAnimation) {
    return (
      <WelcomeAnimation 
        onComplete={handleWelcomeAnimationComplete}
        userName={user?.name}
      />
    );
  }

  // Show animated guided tour for users in the onboarding process
  if (showGuidedTour) {
    return <AnimatedGuidedTour onComplete={handleGuidedTourComplete} />;
  }

  return null;
}

export default OnboardingManager;