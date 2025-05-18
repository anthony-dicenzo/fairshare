import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the tutorial steps
export type TutorialStep = 
  | 'inactive'  // Not in tutorial mode
  | 'welcome'   // Initial welcome
  | 'create-group'  // Creating a group
  | 'invite-members'  // Inviting members to group
  | 'add-expense'  // Adding an expense
  | 'view-balances'  // Viewing balances
  | 'complete';  // Tutorial complete

interface TutorialContextType {
  currentStep: TutorialStep;
  isTutorialActive: boolean;
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: TutorialStep) => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TUTORIAL_STEPS: TutorialStep[] = [
  'welcome',
  'create-group',
  'invite-members',
  'add-expense',
  'view-balances',
  'complete'
];

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('inactive');
  const isTutorialActive = currentStep !== 'inactive' && currentStep !== 'complete';

  // Start the tutorial
  const startTutorial = () => {
    setCurrentStep('welcome');
    localStorage.setItem('tutorialStep', 'welcome');
  };

  // Skip the tutorial
  const skipTutorial = () => {
    setCurrentStep('inactive');
    localStorage.setItem('tutorialStep', 'inactive');
  };

  // Move to the next step
  const nextStep = () => {
    const currentIndex = TUTORIAL_STEPS.indexOf(currentStep);
    if (currentIndex < TUTORIAL_STEPS.length - 1) {
      const nextStep = TUTORIAL_STEPS[currentIndex + 1];
      setCurrentStep(nextStep);
      localStorage.setItem('tutorialStep', nextStep);
    }
  };

  // Move to the previous step
  const prevStep = () => {
    const currentIndex = TUTORIAL_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = TUTORIAL_STEPS[currentIndex - 1];
      setCurrentStep(prevStep);
      localStorage.setItem('tutorialStep', prevStep);
    }
  };

  // Go to a specific step
  const goToStep = (step: TutorialStep) => {
    setCurrentStep(step);
    localStorage.setItem('tutorialStep', step);
  };

  // Complete the tutorial
  const completeTutorial = () => {
    setCurrentStep('complete');
    localStorage.setItem('tutorialStep', 'complete');
    localStorage.setItem('hasCompletedTutorial', 'true');
  };

  // Load tutorial state from localStorage on mount
  useEffect(() => {
    const savedStep = localStorage.getItem('tutorialStep') as TutorialStep | null;
    if (savedStep) {
      setCurrentStep(savedStep);
    }
  }, []);

  const value = {
    currentStep,
    isTutorialActive,
    startTutorial,
    skipTutorial,
    nextStep,
    prevStep,
    goToStep,
    completeTutorial
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

// Custom hook to use the tutorial context
export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};