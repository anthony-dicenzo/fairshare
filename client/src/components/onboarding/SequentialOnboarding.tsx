import React, { useState } from 'react';
import AnimatedGuidedTour from './AnimatedGuidedTour';
import ReliableGuide from './ReliableGuide';

/**
 * A sequential onboarding experience that shows the full animated tour first
 * and then transitions directly to the reliable interactive guide
 */
export function SequentialOnboarding({ onComplete }: { onComplete: () => void }) {
  const [animatedTourComplete, setAnimatedTourComplete] = useState(false);
  
  // Handle the completion of the animated tour
  const handleAnimatedTourComplete = () => {
    setAnimatedTourComplete(true);
  };
  
  return (
    <>
      {!animatedTourComplete && (
        <AnimatedGuidedTour onComplete={handleAnimatedTourComplete} />
      )}
      
      {animatedTourComplete && (
        <ReliableGuide 
          onComplete={onComplete}
          onSkip={onComplete}
        />
      )}
    </>
  );
}

export default SequentialOnboarding;