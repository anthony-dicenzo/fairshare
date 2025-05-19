import React, { useState, useEffect } from 'react';
import InteractiveGuide from './InteractiveGuide';
import ReliableGuide from './ReliableGuide';

/**
 * This component combines the exact InteractiveGuide and ReliableGuide components
 * without modifications, running them in sequence one after the other
 */
export function ExactSequentialGuide({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'interactive' | 'reliable'>('interactive');

  // Handle the completion of the interactive guide
  const handleInteractiveComplete = () => {
    // Move to the reliable guide phase
    setPhase('reliable');
  };

  return (
    <>
      {/* First show the exact InteractiveGuide component */}
      {phase === 'interactive' && (
        <InteractiveGuide onComplete={handleInteractiveComplete} />
      )}
      
      {/* Once interactive guide is finished, show the exact ReliableGuide component */}
      {phase === 'reliable' && (
        <ReliableGuide 
          onComplete={onComplete} 
          onSkip={onComplete}
        />
      )}
    </>
  );
}

export default ExactSequentialGuide;