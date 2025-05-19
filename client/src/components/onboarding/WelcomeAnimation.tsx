import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface WelcomeAnimationProps {
  onComplete: () => void;
  userName?: string;
}

export function WelcomeAnimation({ onComplete, userName }: WelcomeAnimationProps) {
  const [stage, setStage] = useState(0);
  const displayName = userName || 'there';

  // Auto-advance through the animation stages
  useEffect(() => {
    if (stage < 3) {
      const timer = setTimeout(() => {
        setStage(stage + 1);
      }, stage === 0 ? 1000 : 1800);
      
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-950 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Logo Animation */}
          <AnimatePresence mode="wait">
            {stage === 0 && (
              <motion.div
                key="logo"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="text-white text-5xl font-bold flex flex-col items-center"
              >
                <span className="text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-cyan-200 mb-2">
                  FairShare
                </span>
              </motion.div>
            )}

            {/* Welcome Text */}
            {stage === 1 && (
              <motion.div
                key="welcome"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center px-6"
              >
                <h1 className="text-4xl font-bold text-white mb-3">
                  Hi, {displayName}!
                </h1>
                <p className="text-xl text-blue-100 max-w-md mx-auto">
                  Welcome to a smarter way to manage shared expenses
                </p>
              </motion.div>
            )}

            {/* Features */}
            {stage === 2 && (
              <motion.div
                key="features"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center px-6"
              >
                <h2 className="text-2xl font-semibold text-white mb-4">
                  With FairShare you can:
                </h2>
                <div className="space-y-4 max-w-md mx-auto">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center bg-white/10 p-3 rounded-lg"
                  >
                    <div className="bg-blue-500 rounded-full p-2 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <span className="text-white text-left">Create groups for trips, roommates, or events</span>
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center bg-white/10 p-3 rounded-lg"
                  >
                    <div className="bg-green-500 rounded-full p-2 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white text-left">Track expenses & get automatic balance calculations</span>
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center bg-white/10 p-3 rounded-lg"
                  >
                    <div className="bg-purple-500 rounded-full p-2 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white text-left">Invite friends & receive real-time updates</span>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Get Started Button */}
            {stage === 3 && (
              <motion.div
                key="getStarted"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center px-6"
              >
                <h2 className="text-3xl font-bold text-white mb-4">
                  Ready to get started?
                </h2>
                <p className="text-xl text-blue-100 max-w-md mx-auto mb-8">
                  Let's set up your account with a quick tour
                </p>
                <Button 
                  onClick={onComplete}
                  size="lg" 
                  className="px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-none"
                >
                  Start Tour <ArrowRight className="ml-2" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated circles in background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/5"
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: Math.random() * window.innerHeight,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  scale: Math.random() * 0.5 + 0.5,
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                style={{
                  width: `${Math.random() * 300 + 50}px`,
                  height: `${Math.random() * 300 + 50}px`,
                }}
              />
            ))}
          </div>

          {/* Skip button */}
          {stage < 3 && (
            <motion.button
              className="absolute bottom-8 text-blue-300 hover:text-white text-sm"
              onClick={() => setStage(3)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Skip Animation
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default WelcomeAnimation;