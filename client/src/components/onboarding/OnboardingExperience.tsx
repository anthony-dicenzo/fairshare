import React, { useState, useEffect } from 'react';
import { useNavigate } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@shared/schema';
import { ChevronRight, Plus, UserPlus, DollarSign, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

// Define the onboarding steps
export enum OnboardingStep {
  WELCOME = 'welcome',
  CREATE_GROUP = 'create_group',
  ADD_EXPENSE = 'add_expense',
  INVITE_FRIEND = 'invite_friend',
  COMPLETED = 'completed',
}

interface OnboardingExperienceProps {
  user: User;
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingExperience: React.FC<OnboardingExperienceProps> = ({ 
  user, 
  onComplete, 
  onSkip 
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const navigate = useNavigate();

  // Track if we're in the full screen animation
  const [isIntroAnimation, setIsIntroAnimation] = useState(true);

  // Handle the next step
  const handleNextStep = () => {
    // Trigger confetti for step completion
    triggerConfetti();
    
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        setCurrentStep(OnboardingStep.CREATE_GROUP);
        setIsIntroAnimation(false);
        break;
      case OnboardingStep.CREATE_GROUP:
        setCurrentStep(OnboardingStep.ADD_EXPENSE);
        break;
      case OnboardingStep.ADD_EXPENSE:
        setCurrentStep(OnboardingStep.INVITE_FRIEND);
        break;
      case OnboardingStep.INVITE_FRIEND:
        setCurrentStep(OnboardingStep.COMPLETED);
        break;
      case OnboardingStep.COMPLETED:
        completeOnboarding();
        break;
    }
  };

  // Handle navigation based on the step
  const handleStepAction = () => {
    switch (currentStep) {
      case OnboardingStep.CREATE_GROUP:
        navigate('/groups/new');
        break;
      case OnboardingStep.ADD_EXPENSE:
        // Assumes user created a group
        // This should be improved to check if user has groups
        navigate('/groups/1/expenses/new');
        break;
      case OnboardingStep.INVITE_FRIEND:
        // Same assumption as above
        navigate('/groups/1/invite');
        break;
      default:
        break;
    }
  };

  const completeOnboarding = () => {
    // Trigger final confetti celebration
    triggerConfetti('complete');
    
    // Delay to allow confetti to show
    setTimeout(() => {
      setShowOnboarding(false);
      onComplete();
    }, 2000);
  };

  // Confetti animation
  const triggerConfetti = (type: 'step' | 'complete' = 'step') => {
    const duration = type === 'complete' ? 3000 : 1500;
    const particleCount = type === 'complete' ? 200 : 100;
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4F46E5', '#10B981', '#F59E0B'],
      disableForReducedMotion: true,
      zIndex: 9999,
      scalar: 2
    });
    
    if (type === 'complete') {
      // For completion, add a second burst after a delay
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.7 },
          colors: ['#4F46E5', '#10B981', '#F59E0B'],
          disableForReducedMotion: true,
          zIndex: 9999
        });
      }, 500);
    }
  };

  // Render the intro animation
  const renderIntroAnimation = () => {
    return (
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-indigo-600 to-cyan-500 flex flex-col items-center justify-center z-50 text-white p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <motion.h1 
            className="text-4xl font-bold mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Welcome to FairShare
          </motion.h1>
          
          <motion.div
            className="h-20 w-20 rounded-full bg-white mx-auto mb-8 flex items-center justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.2, duration: 0.7, type: "spring" }}
          >
            <DollarSign size={40} className="text-indigo-600" />
          </motion.div>
          
          <motion.p 
            className="text-xl mb-8 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
          >
            Let's get you started with sharing expenses fairly with your friends and family!
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.5 }}
          >
            <Button 
              size="lg" 
              onClick={handleNextStep}
              className="bg-white text-indigo-600 hover:bg-slate-100"
            >
              Let's Go! <ChevronRight className="ml-2" size={18} />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  // Render the specific step content
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        return renderIntroAnimation();
      
      case OnboardingStep.CREATE_GROUP:
        return (
          <motion.div 
            className="onboarding-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="step-icon">
              <Plus size={24} />
            </div>
            <h3>Create a Group</h3>
            <p>Start by creating a group for your household, trip, or any shared expense.</p>
            <Button onClick={handleStepAction}>Create a Group</Button>
          </motion.div>
        );
      
      case OnboardingStep.ADD_EXPENSE:
        return (
          <motion.div 
            className="onboarding-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="step-icon">
              <DollarSign size={24} />
            </div>
            <h3>Add an Expense</h3>
            <p>Record your first shared expense to keep track of who paid what.</p>
            <Button onClick={handleStepAction}>Add an Expense</Button>
          </motion.div>
        );
      
      case OnboardingStep.INVITE_FRIEND:
        return (
          <motion.div 
            className="onboarding-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="step-icon">
              <UserPlus size={24} />
            </div>
            <h3>Invite Friends</h3>
            <p>Add friends to your group so they can see and add expenses too.</p>
            <Button onClick={handleStepAction}>Invite Friends</Button>
          </motion.div>
        );
      
      case OnboardingStep.COMPLETED:
        return (
          <motion.div 
            className="onboarding-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="step-icon">
              <Check size={24} className="text-green-500" />
            </div>
            <h3>You're All Set!</h3>
            <p>Great job! You've completed the tutorial and are ready to use FairShare.</p>
            <Button onClick={handleNextStep}>Start Using FairShare</Button>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  // If onboarding is not shown, return null
  if (!showOnboarding) {
    return null;
  }

  // If we're in the intro animation, show it full screen
  if (isIntroAnimation) {
    return renderIntroAnimation();
  }

  // Otherwise show the guided tutorial overlay
  return (
    <div className="onboarding-container">
      <AnimatePresence mode="wait">
        <div className="onboarding-overlay">
          <div className="onboarding-content">
            {renderStepContent()}
            
            {/* Skip button */}
            <Button 
              variant="ghost" 
              className="onboarding-skip" 
              onClick={onSkip}
            >
              Skip Tutorial <X size={16} className="ml-2" />
            </Button>
            
            {/* Progress indicators */}
            <div className="onboarding-progress">
              {Object.values(OnboardingStep).map((step, index) => (
                <div 
                  key={step}
                  className={`progress-dot ${currentStep === step ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingExperience;