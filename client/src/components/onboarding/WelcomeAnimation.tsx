import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface WelcomeAnimationProps {
  onComplete: () => void;
  skipDelay?: number;
}

export function WelcomeAnimation({ 
  onComplete,
  skipDelay 
}: WelcomeAnimationProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  
  const phrases = [
    "Welcome to FairShare!",
    "Let's get you started...",
    "Manage your shared expenses with ease"
  ];
  
  // Auto-advance through animation phases
  useEffect(() => {
    if (currentPhase >= phrases.length) {
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setCurrentPhase(prev => prev + 1);
    }, 1200); // Each phrase shows for 1.2 seconds
    
    return () => clearTimeout(timer);
  }, [currentPhase, phrases.length, onComplete]);
  
  // Auto-skip the entire animation after skipDelay (if provided)
  useEffect(() => {
    if (skipDelay) {
      const timer = setTimeout(() => {
        onComplete();
      }, skipDelay);
      
      return () => clearTimeout(timer);
    }
  }, [skipDelay, onComplete]);
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center z-50">
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20"
          onClick={onComplete}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="text-center px-6">
          {currentPhase < phrases.length && (
            <motion.div
              key={`phrase-${currentPhase}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-white text-3xl font-bold mb-3">
                {phrases[currentPhase]}
              </h1>
              
              {currentPhase === 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-6xl mb-8"
                >
                  💰
                </motion.div>
              )}
              
              {currentPhase === 1 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-6xl mb-8"
                >
                  👋
                </motion.div>
              )}
              
              {currentPhase === 2 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-6xl mb-8"
                >
                  👥
                </motion.div>
              )}
            </motion.div>
          )}
          
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={onComplete}
              variant="outline"
              className="bg-white text-blue-900 hover:bg-blue-50"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

export default WelcomeAnimation;