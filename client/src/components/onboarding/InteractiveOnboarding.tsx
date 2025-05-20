import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Plus, UserPlus, DollarSign, Check, X, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { createPortal } from 'react-dom';

// Define user type
interface UserType {
  id: number;
  username: string;
  name: string;
  email: string;
  createdAt: string | Date;
}

// Onboarding steps
enum OnboardingStep {
  WELCOME = 'welcome',
  CREATE_GROUP = 'create_group',
  ADD_EXPENSE = 'add_expense',
  INVITE_FRIEND = 'invite_friend',
  COMPLETED = 'completed',
}

interface InteractiveOnboardingProps {
  user: UserType;
  onComplete: () => void;
  onSkip: () => void;
}

const InteractiveOnboarding: React.FC<InteractiveOnboardingProps> = ({
  user,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [, setLocation] = useLocation();

  // Element refs for positioning tooltips
  const [addButtonRef, setAddButtonRef] = useState<DOMRect | null>(null);
  const [groupsButtonRef, setGroupsButtonRef] = useState<DOMRect | null>(null);
  
  // Track completion elements
  const [groupCreated, setGroupCreated] = useState(false);
  const [expenseCreated, setExpenseCreated] = useState(false);
  const [friendInvited, setFriendInvited] = useState(false);

  // Find UI elements to highlight
  useEffect(() => {
    if (!showWelcomeScreen) {
      // Find the add button (typically the + button at the bottom of the screen)
      const addButton = document.querySelector('.add-button, [aria-label="Add new"]');
      if (addButton instanceof HTMLElement) {
        setAddButtonRef(addButton.getBoundingClientRect());
      }
      
      // Find the groups navigation button
      const groupsButton = document.querySelector('.groups-button, [aria-label="Groups"]');
      if (groupsButton instanceof HTMLElement) {
        setGroupsButtonRef(groupsButton.getBoundingClientRect());
      }
    }
  }, [showWelcomeScreen, currentStep]);

  // Listen for URL changes to detect step completion
  useEffect(() => {
    const checkProgress = () => {
      const currentPath = window.location.pathname;
      
      // Check if user has created a group (likely on a page like /groups/1)
      if (currentPath.match(/\/groups\/\d+$/) && currentStep === OnboardingStep.CREATE_GROUP) {
        handleStepCompletion();
        setGroupCreated(true);
      }
      
      // Check if user has added an expense
      if (currentPath.match(/\/groups\/\d+\/expenses\/\d+$/) && currentStep === OnboardingStep.ADD_EXPENSE) {
        handleStepCompletion();
        setExpenseCreated(true);
      }
      
      // Check if user has invited a friend (typically returns to the group page after inviting)
      if (currentPath.match(/\/groups\/\d+$/) && currentPath.includes('invite') && currentStep === OnboardingStep.INVITE_FRIEND) {
        handleStepCompletion();
        setFriendInvited(true);
      }
    };
    
    window.addEventListener('popstate', checkProgress);
    return () => window.removeEventListener('popstate', checkProgress);
  }, [currentStep]);

  // Confetti animation
  const triggerConfetti = (type: 'step' | 'complete' = 'step') => {
    const particleCount = type === 'complete' ? 200 : 100;
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#32846b', '#10B981', '#F59E0B'],
      disableForReducedMotion: true,
      zIndex: 9999
    });
    
    if (type === 'complete') {
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

  // Handle step completion
  const handleStepCompletion = () => {
    triggerConfetti();
    
    // Move to next step after a short delay to allow confetti to show
    setTimeout(() => {
      switch (currentStep) {
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
    }, 1000);
  };

  // Handle navigation based on step
  const handleStepAction = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        setShowWelcomeScreen(false);
        setCurrentStep(OnboardingStep.CREATE_GROUP);
        break;
      case OnboardingStep.CREATE_GROUP:
        setLocation('/groups/new');
        break;
      case OnboardingStep.ADD_EXPENSE:
        // Navigate to add expense page of the first group
        setLocation('/groups/1/expenses/new');
        break;
      case OnboardingStep.INVITE_FRIEND:
        // Navigate to invite page of the first group
        setLocation('/groups/1/invite');
        break;
      case OnboardingStep.COMPLETED:
        completeOnboarding();
        break;
    }
  };

  // Complete the onboarding process
  const completeOnboarding = () => {
    triggerConfetti('complete');
    
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  // Render welcome screen (full screen)
  if (showWelcomeScreen) {
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
            Hi {user.name}! Let's explore how to use FairShare to track and share expenses.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.5 }}
          >
            <Button 
              size="lg" 
              onClick={handleStepAction}
              className="bg-white text-[#32846b] hover:bg-slate-100"
            >
              Let's Go! <ChevronRight className="ml-2" size={18} />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // For the completion screen, show a full-screen overlay again
  if (currentStep === OnboardingStep.COMPLETED) {
    return createPortal(
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg p-8 max-w-md text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-white" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4">You're All Set!</h2>
          
          <p className="mb-6 text-gray-600">
            Great job! You've learned how to create groups, add expenses, and invite friends.
            You're ready to start using FairShare to make expense sharing easier.
          </p>
          
          <Button onClick={completeOnboarding}>
            Start Using FairShare
          </Button>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  // Calculate tooltip position for each step
  const getTooltipPosition = () => {
    switch (currentStep) {
      case OnboardingStep.CREATE_GROUP:
        return {
          position: 'fixed',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case OnboardingStep.ADD_EXPENSE:
        return {
          position: 'fixed',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case OnboardingStep.INVITE_FRIEND:
        return {
          position: 'fixed',
          top: '100px',
          right: '20px'
        };
      default:
        return {};
    }
  };

  // Calculate highlight position for each step
  const getHighlightPosition = () => {
    switch (currentStep) {
      case OnboardingStep.CREATE_GROUP:
        return {
          position: 'fixed',
          top: '120px',
          right: '30px',
          width: '140px',
          height: '40px',
          borderRadius: '8px'
        };
      case OnboardingStep.ADD_EXPENSE:
        return {
          position: 'fixed',
          bottom: '55px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70px',
          height: '70px',
          borderRadius: '50%'
        };
      case OnboardingStep.INVITE_FRIEND:
        return {
          position: 'fixed',
          top: '60px',
          right: '20px',
          width: '100px',
          height: '40px',
          borderRadius: '20px'
        };
      default:
        return {};
    }
  };

  // Get step content
  const getStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.CREATE_GROUP:
        return (
          <>
            <div className="mb-3">
              <Plus size={24} className="text-white mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-white">Create a Group</h3>
            </div>
            <p className="text-white mb-3 text-sm">
              Click the "Create group" button to start your first group for shared expenses.
            </p>
            <motion.div 
              animate={{ x: [0, 5, 0] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white"
            >
              <div className="rotate-180 transform">
                <ArrowDown size={18} className="mx-auto rotate-90" />
              </div>
            </motion.div>
          </>
        );
        
      case OnboardingStep.ADD_EXPENSE:
        return (
          <>
            <div className="mb-3">
              <DollarSign size={24} className="text-white mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-white">Add an Expense</h3>
            </div>
            <p className="text-white mb-3 text-sm">
              Tap the floating + button to add your first expense to the group.
            </p>
            <motion.div 
              animate={{ y: [0, 5, 0] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white"
            >
              <ArrowDown size={18} className="mx-auto" />
            </motion.div>
          </>
        );
        
      case OnboardingStep.INVITE_FRIEND:
        return (
          <>
            <div className="mb-3">
              <UserPlus size={24} className="text-white mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-white">Invite Friends</h3>
            </div>
            <p className="text-white mb-3 text-sm">
              Look for the "Invite" option to add friends to your group.
            </p>
          </>
        );
        
      default:
        return null;
    }
  };

  // Render interactive tooltips
  return createPortal(
    <>
      {/* Interactive tooltip */}
      <AnimatePresence>
        <motion.div
          className="onboarding-tooltip"
          style={{
            position: 'fixed',
            maxWidth: '250px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(50, 132, 107, 0.9)',
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            textAlign: 'center',
            ...(currentStep === OnboardingStep.CREATE_GROUP ? {
              bottom: '120px',
              left: '50%',
              transform: 'translateX(-50%)'
            } : currentStep === OnboardingStep.ADD_EXPENSE ? {
              bottom: '120px',
              left: '50%',
              transform: 'translateX(-50%)'
            } : currentStep === OnboardingStep.INVITE_FRIEND ? {
              top: '100px',
              right: '20px'
            } : {})
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {getStepContent()}
          
          {/* Skip button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-[rgba(255,255,255,0.1)] mt-2"
            onClick={onSkip}
          >
            Skip Tutorial <X size={14} className="ml-1" />
          </Button>
        </motion.div>
      </AnimatePresence>
      
      {/* Highlight element */}
      <div
        className="highlight-element"
        style={{
          position: 'fixed',
          border: '3px dashed rgba(255, 255, 255, 0.8)',
          zIndex: 999,
          pointerEvents: 'none',
          animation: 'pulse 2s infinite',
          ...(currentStep === OnboardingStep.CREATE_GROUP ? {
            bottom: '55px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70px',
            height: '70px',
            borderRadius: '50%'
          } : currentStep === OnboardingStep.ADD_EXPENSE ? {
            bottom: '55px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70px',
            height: '70px',
            borderRadius: '50%'
          } : currentStep === OnboardingStep.INVITE_FRIEND ? {
            top: '60px',
            right: '20px',
            width: '100px',
            height: '40px',
            borderRadius: '20px'
          } : {})
        }}
      />
    </>,
    document.body
  );
};

export default InteractiveOnboarding;