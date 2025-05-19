import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import WelcomeAnimation from './WelcomeAnimation';
import ReliableGuide from './ReliableGuide';

/**
 * Combined onboarding experience that starts with an animation
 * and transitions to an interactive guide
 */
export function CombinedOnboarding({ onComplete }: { onComplete: () => void }) {
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Handle animation completion
  const handleAnimationComplete = () => {
    // Play a small confetti burst when transitioning
    confetti({
      particleCount:.30,
      spread: 60,
      origin: { y: 0.5, x: 0.5 }
    });
    
    // Transition to the interactive guide
    setAnimationComplete(true);
  };
  
  return (
    <>
      {!animationComplete && (
        <WelcomeAnimation 
          onComplete={handleAnimationComplete}
          skipDelay={1500} // Auto-skip after 1.5 seconds for better UX
        />
      )}
      
      {animationComplete && (
        <ReliableGuide onComplete={onComplete} />
      )}
    </>
  );
}

export default CombinedOnboarding;