import { useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useNewUser } from '@/hooks/use-new-user';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import AnimatedGuidedTour from './AnimatedGuidedTour';
import InteractiveGuide from './InteractiveGuide';
import { GuidedTour } from './GuidedTour';

export function OnboardingManager() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isNewUser, markUserAsExisting } = useNewUser();
  const { user } = useAuth();
  const [showInteractiveGuide, setShowInteractiveGuide] = useState(false);
  const [showStaticGuide, setShowStaticGuide] = useState(false);
  const [useInteractiveMode, setUseInteractiveMode] = useState(true); // Default to interactive mode for better experience
  const { toast } = useToast();

  // Set up the appropriate onboarding experience when a new user is detected
  useEffect(() => {
    if (isNewUser) {
      // Check if they've seen the animation before
      const hasSeenOnboarding = localStorage.getItem('fairshare_animation_seen');
      
      if (!hasSeenOnboarding) {
        // Determine which guide to show
        if (useInteractiveMode) {
          setShowInteractiveGuide(true);
        } else {
          setShowStaticGuide(true);
        }
        localStorage.setItem('fairshare_animation_seen', 'true');
      }
    }
  }, [isNewUser, useInteractiveMode]);

  // For existing users requesting onboarding, show the non-interactive guide
  useEffect(() => {
    if (showOnboarding && !isNewUser) {
      setShowStaticGuide(true);
    }
  }, [showOnboarding, isNewUser]);

  // Handle completion of interactive guide
  const handleInteractiveGuideComplete = () => {
    setShowInteractiveGuide(false);
    markUserAsExisting();
    completeOnboarding();
    toast({
      title: "Welcome to FairShare!",
      description: "Your account is all set up and ready to go.",
    });
  };

  // Handle completion of static guided tour
  const handleStaticGuideComplete = () => {
    setShowStaticGuide(false);
    markUserAsExisting();
    completeOnboarding();
    toast({
      title: "Welcome to FairShare!",
      description: "Your account is all set up and ready to go.",
    });
  };

  // Show interactive guide that allows app interaction
  if (showInteractiveGuide) {
    return <InteractiveGuide onComplete={handleInteractiveGuideComplete} />;
  }

  // Show animated full-screen guided tour for users who prefer that experience 
  // or for existing users requesting onboarding help
  if (showStaticGuide) {
    return <AnimatedGuidedTour onComplete={handleStaticGuideComplete} />;
  }

  return null;
}

export default OnboardingManager;