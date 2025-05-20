import React, { createContext, useState, useContext, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Plus, UserPlus, DollarSign, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

// Define user type that matches what auth provides
interface UserType {
  id: number;
  username: string;
  name: string;
  email: string;
  createdAt: string | Date;
}

// Onboarding step enum
enum OnboardingStep {
  WELCOME = 'welcome',
  CREATE_GROUP = 'create_group',
  ADD_EXPENSE = 'add_expense',
  INVITE_FRIEND = 'invite_friend',
  COMPLETED = 'completed',
}

// Context type
interface OnboardingContextType {
  isOnboardingComplete: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

// Create context with default values
const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: true,
  startOnboarding: () => {},
  completeOnboarding: () => {},
  skipOnboarding: () => {},
});

// Local storage key
const ONBOARDING_COMPLETE_KEY = 'fairshare_onboarding_complete';

// Hook to use onboarding context
export const useOnboarding = () => useContext(OnboardingContext);

// Onboarding experience component
const OnboardingExperience: React.FC<{
  user: UserType;
  onComplete: () => void;
  onSkip: () => void;
}> = ({ user, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [, setLocation] = useLocation();
  
  // Track if we're in the full screen animation
  const [isIntroAnimation, setIsIntroAnimation] = useState(true);
  
  // Handle next step
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
  
  // Handle action for current step
  const handleStepAction = () => {
    switch (currentStep) {
      case OnboardingStep.CREATE_GROUP:
        setLocation('/groups/new');
        break;
      case OnboardingStep.ADD_EXPENSE:
        // This would ideally check if the user has any groups
        setLocation('/groups/1/expenses/new');
        break;
      case OnboardingStep.INVITE_FRIEND:
        setLocation('/groups/1/invite');
        break;
      default:
        break;
    }
  };
  
  // Complete onboarding
  const completeOnboarding = () => {
    triggerConfetti('complete');
    
    setTimeout(() => {
      setShowOnboarding(false);
      onComplete();
    }, 2000);
  };
  
  // Confetti animation
  const triggerConfetti = (type: 'step' | 'complete' = 'step') => {
    const particleCount = type === 'complete' ? 200 : 100;
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#32846b', '#10B981', '#F59E0B'],
      disableForReducedMotion: true,
      zIndex: 9999,
      scalar: 2
    });
    
    if (type === 'complete') {
      // Add a second burst for completion
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.7 },
          colors: ['#32846b', '#10B981', '#F59E0B'],
          disableForReducedMotion: true,
          zIndex: 9999
        });
      }, 500);
    }
  };
  
  // Render intro animation
  const renderIntroAnimation = () => {
    return (
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-[#32846b] to-[#A3D5FF] flex flex-col items-center justify-center z-50 text-white p-8"
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
            <DollarSign size={40} className="text-[#32846b]" />
          </motion.div>
          
          <motion.p 
            className="text-xl mb-8 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
          >
            Hi {user.name}! Let's get you started with sharing expenses fairly with your friends and family.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.5 }}
          >
            <Button 
              size="lg" 
              onClick={handleNextStep}
              className="bg-white text-[#32846b] hover:bg-slate-100"
            >
              Let's Go! <ChevronRight className="ml-2" size={18} />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };
  
  // Render step content
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
              <Check size={24} className="text-white" />
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
  
  if (!showOnboarding) {
    return null;
  }
  
  if (isIntroAnimation) {
    return renderIntroAnimation();
  }
  
  return (
    <div className="onboarding-container">
      <AnimatePresence mode="wait">
        <div className="onboarding-overlay">
          <div className="onboarding-content">
            {renderStepContent()}
            
            <Button 
              variant="ghost" 
              className="onboarding-skip" 
              onClick={onSkip}
            >
              Skip Tutorial <X size={16} className="ml-2" />
            </Button>
            
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

// Onboarding provider component
export const OnboardingProvider: React.FC<{
  children: React.ReactNode;
  user: UserType | null;
}> = ({ children, user }) => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    const saved = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Check if user is new and start onboarding
  useEffect(() => {
    if (user && !isOnboardingComplete) {
      console.log('Starting onboarding for new user:', user.username);
      setShowOnboarding(true);
    }
  }, [user, isOnboardingComplete]);

  // Onboarding actions
  const startOnboarding = () => {
    setIsOnboardingComplete(false);
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(true));
  };

  const skipOnboarding = () => {
    setIsOnboardingComplete(true);
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(true));
  };

  return (
    <OnboardingContext.Provider 
      value={{ 
        isOnboardingComplete, 
        startOnboarding, 
        completeOnboarding, 
        skipOnboarding 
      }}
    >
      {children}
      
      {user && showOnboarding && (
        <OnboardingExperience 
          user={user} 
          onComplete={completeOnboarding} 
          onSkip={skipOnboarding} 
        />
      )}
    </OnboardingContext.Provider>
  );
};