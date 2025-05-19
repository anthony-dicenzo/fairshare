import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card,
  CardContent,
  CardFooter, 
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export enum OnboardingStep {
  Welcome = 0,
  CreateGroup = 1,
  AddExpense = 2,
  InviteFriends = 3,
  Complete = 4,
}

interface SimpleGuideProps {
  initialStep?: OnboardingStep;
  onComplete: () => void;
  onSkip?: () => void;
}

const stepDescriptions = [
  {
    title: "Welcome to FairShare!",
    description: "Let's get you started with a simple guide to help you use FairShare effectively.",
    action: "Start the Tour",
    image: "📱"
  },
  {
    title: "Create a Group",
    description: "First, create a group for tracking shared expenses. Click the 'Create group' button on your dashboard.",
    action: "I've Created a Group",
    image: "👥"
  },
  {
    title: "Add an Expense",
    description: "Now add your first expense to the group. Click the '+' button in your group to add expenses.",
    action: "I've Added an Expense",
    image: "💰"
  },
  {
    title: "Invite Friends",
    description: "Share your group with friends to start splitting expenses. Click 'Invite' in your group settings.",
    action: "I've Invited Friends",
    image: "✉️"
  },
  {
    title: "You're All Set!",
    description: "Great job! You now know the basics of using FairShare. Enjoy tracking and splitting expenses with your friends.",
    action: "Finish Tour",
    image: "🎉"
  },
];

export function SimpleGuide({ 
  initialStep = OnboardingStep.Welcome,
  onComplete,
  onSkip
}: SimpleGuideProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  
  const handleNext = () => {
    const nextStep = currentStep + 1;
    
    // If last step, trigger completion
    if (nextStep >= stepDescriptions.length) {
      triggerCelebration();
      onComplete();
      return;
    }
    
    // If completed a major step, trigger celebration animation
    if (nextStep > OnboardingStep.Welcome) {
      triggerCelebration();
    }
    
    // Move to next step
    setCurrentStep(nextStep as OnboardingStep);
  };
  
  const triggerCelebration = () => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };
  
  // Current step data
  const { title, description, action, image } = stepDescriptions[currentStep];
  
  // Check if current step is last
  const isLastStep = currentStep === OnboardingStep.Complete;
  
  // Progress percentage
  const progress = ((currentStep + 1) / stepDescriptions.length) * 100;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md mx-4"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", bounce: 0.3 }}
        >
          <Card className="shadow-xl border-2 border-blue-300 dark:border-blue-800">
            {/* Step counter/progress */}
            <div className="relative h-2 bg-gray-200 dark:bg-gray-800">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-blue-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <CardHeader className="pt-6 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">{title}</CardTitle>
                {onSkip && (
                  <Button variant="ghost" size="icon" onClick={onSkip}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {stepDescriptions.length}
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="flex gap-4 items-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-3xl">
                  {image}
                </div>
                <p className="text-sm text-muted-foreground flex-1">
                  {description}
                </p>
              </div>
              
              {/* Checkboxes for completed steps */}
              {currentStep >= OnboardingStep.Complete && (
                <div className="mt-2 space-y-2">
                  {stepDescriptions.slice(1, 4).map((step, idx) => (
                    <div key={idx} className="flex items-center">
                      <CheckCircle2 className="text-green-500 h-5 w-5 mr-2" />
                      <span className="text-sm">{step.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pt-2 pb-6">
              <Button 
                onClick={handleNext}
                className="w-full"
              >
                {action}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SimpleGuide;