import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Coins, UserPlus, ArrowRight } from 'lucide-react';
import CreateGroupTutorial from './CreateGroupTutorial';
import AddExpenseTutorial from './AddExpenseTutorial';
import InviteFriendsTutorial from './InviteFriendsTutorial';
import CompletionCelebration from './CompletionCelebration';
import OnboardingProgress from './OnboardingProgress';

interface AnimatedGuidedTourProps {
  onComplete: () => void;
}

// Define the tour steps
enum TourStep {
  Welcome,
  CreateGroup,
  AddExpense,
  InviteFriend,
  Complete
}

export function AnimatedGuidedTour({ onComplete }: AnimatedGuidedTourProps) {
  const [currentStep, setCurrentStep] = useState<TourStep>(TourStep.Welcome);
  const [isVisible, setIsVisible] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Handle next step
  const handleNext = () => {
    // Animate out current step
    setIsVisible(false);
    
    setTimeout(() => {
      // Update step
      if (currentStep === TourStep.Complete) {
        onComplete();
        return;
      }
      
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Special actions based on the next step
      if (nextStep === TourStep.CreateGroup) {
        navigate('/groups');
        toast({
          title: "Create a Group",
          description: "Start by creating a group for your expenses",
          duration: 5000,
        });
      }
      
      // Show the next step
      setIsVisible(true);
    }, 300); // Match the exit animation duration
  };

  // Handle skip for individual tutorials
  const handleSkip = () => {
    handleNext();
  };

  // Get step content based on current step
  const getStepContent = () => {
    switch (currentStep) {
      case TourStep.Welcome:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="w-full max-w-md mx-auto overflow-hidden bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-950">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
              <CardHeader>
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                >
                  <CardTitle className="text-2xl text-center mb-2">Welcome to FairShare!</CardTitle>
                </motion.div>
                <CardDescription className="text-center">
                  Let's get you set up to manage expenses with friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 py-4">
                  <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex items-center gap-4"
                  >
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">Create Groups</h3>
                      <p className="text-sm text-muted-foreground">Organize expenses by trip, household, or event</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="flex items-center gap-4"
                  >
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                      <Coins className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">Track Expenses</h3>
                      <p className="text-sm text-muted-foreground">Add expenses and see who owes what</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    className="flex items-center gap-4"
                  >
                    <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-full">
                      <UserPlus className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">Invite Friends</h3>
                      <p className="text-sm text-muted-foreground">Share groups with friends to split costs together</p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
              <CardFooter>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className="w-full"
                >
                  <Button onClick={handleNext} className="w-full group" size="lg">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        );
        
      case TourStep.CreateGroup:
        return <CreateGroupTutorial onComplete={handleNext} onSkip={handleSkip} />;
        
      case TourStep.AddExpense:
        return <AddExpenseTutorial onComplete={handleNext} onSkip={handleSkip} />;
        
      case TourStep.InviteFriend:
        return <InviteFriendsTutorial onComplete={handleNext} onSkip={handleSkip} />;
        
      case TourStep.Complete:
        return <CompletionCelebration onComplete={handleNext} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Progress indicator */}
          {currentStep !== TourStep.Welcome && (
            <div className="w-full max-w-md mx-auto mb-4">
              <OnboardingProgress 
                steps={Object.keys(TourStep).length / 2} 
                currentStep={currentStep} 
              />
            </div>
          )}
          
          {/* Content */}
          {getStepContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimatedGuidedTour;