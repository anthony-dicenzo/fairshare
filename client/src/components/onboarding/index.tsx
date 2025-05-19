import OnboardingTutorial from './OnboardingTutorial';
import { useOnboarding } from '@/hooks/use-onboarding';

export function OnboardingManager() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  
  return (
    <>
      {showOnboarding && (
        <OnboardingTutorial 
          open={showOnboarding} 
          onComplete={completeOnboarding} 
        />
      )}
    </>
  );
}