import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Users, Coins, UserPlus, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { celebrateSuccess } from '@/components/ui/confetti';

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

  // Trigger confetti explosion on completion
  useEffect(() => {
    if (currentStep === TourStep.Complete) {
      celebrateSuccess();
    }
  }, [currentStep]);

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
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg border-primary/10">
              <div className="relative h-40 bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Users className="h-20 w-20 text-white" />
                </motion.div>
                
                {/* Animated circles in background */}
                <motion.div 
                  className="absolute w-32 h-32 rounded-full bg-white/10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0.2 }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    repeatType: "loop"
                  }}
                />
              </div>
              
              <CardHeader>
                <CardTitle>Create Your First Group</CardTitle>
                <CardDescription>
                  Groups help you organize expenses with different people
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="space-y-4"
                >
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Tips for Creating Groups:</h4>
                    <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Give your group a descriptive name (e.g. "Summer Vacation")</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Create different groups for different sets of people</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>You can invite members later, so don't worry about that now</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              </CardContent>
              
              <CardFooter>
                <Button onClick={handleNext} className="w-full" size="lg">
                  I've Created a Group
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
        
      case TourStep.AddExpense:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg border-primary/10">
              <div className="relative h-40 bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Coins className="h-20 w-20 text-white" />
                </motion.div>
                
                {/* Floating coins animation */}
                <motion.div 
                  className="absolute top-12 left-20 w-8 h-8 rounded-full bg-yellow-300"
                  animate={{ 
                    y: [0, -15, 0],
                    opacity: [1, 0.7, 1],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    repeatType: "loop",
                    times: [0, 0.5, 1]
                  }}
                />
                <motion.div 
                  className="absolute top-16 right-20 w-6 h-6 rounded-full bg-yellow-400"
                  animate={{ 
                    y: [0, -20, 0],
                    opacity: [1, 0.8, 1],
                    scale: [1, 0.9, 1]
                  }}
                  transition={{ 
                    duration: 1.8, 
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 0.3,
                    times: [0, 0.5, 1]
                  }}
                />
              </div>
              
              <CardHeader>
                <CardTitle>Add Your First Expense</CardTitle>
                <CardDescription>
                  Track who paid and how to split the cost
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="space-y-4"
                >
                  <p className="text-sm">
                    Click the <span className="font-bold">+</span> button in your group to add an expense.
                  </p>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800 space-y-3">
                    <h4 className="font-medium text-purple-700 dark:text-purple-300">When adding an expense:</h4>
                    <ul className="space-y-2 text-sm text-purple-600 dark:text-purple-400">
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="mr-2 text-lg">1.</span>
                        <span>Enter a description and amount</span>
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="mr-2 text-lg">2.</span>
                        <span>Select who paid for it</span>
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="mr-2 text-lg">3.</span>
                        <span>Choose how to split it (equal, percentage, or custom)</span>
                      </motion.li>
                    </ul>
                  </div>
                </motion.div>
              </CardContent>
              
              <CardFooter>
                <Button onClick={handleNext} className="w-full" size="lg">
                  I've Added an Expense
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
        
      case TourStep.InviteFriend:
        return (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg border-primary/10">
              <div className="relative h-40 bg-gradient-to-r from-pink-400 to-pink-600 flex items-center justify-center">
                <motion.div
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <UserPlus className="h-20 w-20 text-white" />
                </motion.div>
                
                {/* People connection animation */}
                <motion.div 
                  className="absolute top-1/2 left-1/4 w-3 h-3 rounded-full bg-white"
                  animate={{ 
                    x: [0, 100, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    times: [0, 0.5, 1]
                  }}
                />
                <motion.div 
                  className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-white"
                  animate={{ 
                    x: [-80, 0, -80],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{ 
                    duration: 2.5, 
                    delay: 0.3,
                    repeat: Infinity,
                    times: [0, 0.5, 1]
                  }}
                />
              </div>
              
              <CardHeader>
                <CardTitle>Invite Your Friends</CardTitle>
                <CardDescription>
                  Share your group with friends to track expenses together
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="space-y-4"
                >
                  <p className="text-sm">
                    Find the <span className="font-bold">Invite</span> button in your group to share it with friends.
                  </p>
                  
                  <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-100 dark:border-pink-800">
                    <h4 className="font-medium text-pink-700 dark:text-pink-300 mb-2">Why invite friends?</h4>
                    <ul className="space-y-2 text-sm text-pink-600 dark:text-pink-400">
                      <motion.li 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        className="flex items-start"
                      >
                        <span className="mr-2">•</span>
                        <span>Everyone can add their own expenses</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.4 }}
                        className="flex items-start"
                      >
                        <span className="mr-2">•</span>
                        <span>Everyone can see who owes whom</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.4 }}
                        className="flex items-start"
                      >
                        <span className="mr-2">•</span>
                        <span>All activity is tracked in real-time</span>
                      </motion.li>
                    </ul>
                  </div>
                </motion.div>
              </CardContent>
              
              <CardFooter>
                <Button onClick={handleNext} className="w-full" size="lg">
                  Continue to Final Step
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
        
      case TourStep.Complete:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg border-primary/10 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
              <div className="relative h-40 bg-gradient-to-r from-green-400 to-teal-500 flex items-center justify-center overflow-hidden">
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.3
                  }}
                >
                  <CheckCircle className="h-24 w-24 text-white" />
                </motion.div>
                
                {/* Celebration animation effects */}
                <motion.div
                  className="absolute inset-0 bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                />
                
                {/* Random confetti-like dots */}
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: ['#FFD700', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6'][i % 5],
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`
                    }}
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: [0, 1, 0],
                      y: [0, Math.random() * -30],
                      x: [0, (Math.random() - 0.5) * 40]
                    }}
                    transition={{ 
                      duration: 1 + Math.random(),
                      delay: 0.3 + Math.random() * 0.5,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 2
                    }}
                  />
                ))}
              </div>
              
              <CardHeader>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <CardTitle className="text-center text-2xl">You're All Set! 🎉</CardTitle>
                  <CardDescription className="text-center">
                    You've completed the FairShare onboarding
                  </CardDescription>
                </motion.div>
              </CardHeader>
              
              <CardContent>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="space-y-4"
                >
                  <p className="text-center text-sm">
                    Now you can easily manage expenses with friends and keep track of who owes what.
                  </p>
                  
                  <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 text-center">Pro Tips:</h4>
                    <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.3 }}
                        className="flex items-start"
                      >
                        <span className="mr-2">✓</span>
                        <span>Check your balances on the dashboard</span>
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                        className="flex items-start"
                      >
                        <span className="mr-2">✓</span>
                        <span>Settle debts using the "Settle Up" feature</span>
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.3 }}
                        className="flex items-start"
                      >
                        <span className="mr-2">✓</span>
                        <span>Check the Activity feed to see recent updates</span>
                      </motion.li>
                    </ul>
                  </div>
                </motion.div>
              </CardContent>
              
              <CardFooter>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.5 }}
                  className="w-full"
                >
                  <Button onClick={handleNext} className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600" size="lg">
                    Start Using FairShare
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {getStepContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimatedGuidedTour;