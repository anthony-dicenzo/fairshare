import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the tutorial steps
export type TutorialStep = 
  | 'welcome'
  | 'create-group'
  | 'invite-friends'
  | 'add-expense'
  | 'complete';

// Define the tutorial context type
type TutorialContextType = {
  currentStep: TutorialStep;
  setCurrentStep: (step: TutorialStep) => void;
  isTutorialActive: boolean;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  resetTutorial: () => void;
  skipTutorial: () => void;
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
};

// Create the tutorial context
export const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Define the step order
const stepOrder: TutorialStep[] = [
  'welcome',
  'create-group',
  'invite-friends',
  'add-expense',
  'complete'
];

// Save tutorial state to localStorage
const saveTutorialState = (active: boolean, step: TutorialStep, show: boolean) => {
  localStorage.setItem('tutorialState', JSON.stringify({
    active,
    step,
    show,
    completed: !active && step === 'complete'
  }));
};

// Tutorial provider component
export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  // Load tutorial state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('tutorialState');
    if (savedState) {
      const { active, step, show } = JSON.parse(savedState);
      setIsTutorialActive(active);
      setCurrentStep(step);
      setShowTutorial(show);
    }
  }, []);

  // Save tutorial state when it changes
  useEffect(() => {
    saveTutorialState(isTutorialActive, currentStep, showTutorial);
  }, [isTutorialActive, currentStep, showTutorial]);

  const startTutorial = () => {
    setCurrentStep('welcome');
    setIsTutorialActive(true);
    setShowTutorial(true);
  };

  const endTutorial = () => {
    setIsTutorialActive(false);
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    setCurrentStep('welcome');
    setIsTutorialActive(true);
    setShowTutorial(true);
  };

  const skipTutorial = () => {
    setIsTutorialActive(false);
    setShowTutorial(false);
    saveTutorialState(false, 'complete', false);
  };

  const nextStep = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    } else {
      // If we're at the last step, complete the tutorial
      setCurrentStep('complete');
      setIsTutorialActive(false);
    }
  };

  const prevStep = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        isTutorialActive,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
        resetTutorial,
        skipTutorial,
        showTutorial,
        setShowTutorial
      }}
    >
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