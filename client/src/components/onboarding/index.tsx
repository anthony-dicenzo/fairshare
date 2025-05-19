import { GuidedTour } from './GuidedTour';
import { useOnboarding } from '@/hooks/use-onboarding';

export function OnboardingManager() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  
  return (
    <>
      {showOnboarding && (
        <GuidedTour />
      )}
    </>
  );
}