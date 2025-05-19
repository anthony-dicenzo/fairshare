import React, { createContext, useState, useContext, useEffect } from 'react';

// Define the type for onboarding state
interface OnboardingState {
  isNewUser: boolean;
  currentStep: string;
  completed: boolean;
  stepHistory: string[];
}

// Create a context for the onboarding state
interface OnboardingContextType {
  onboarding: OnboardingState;
  markStepComplete: (step: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  startOnboarding: () => void;
}

const defaultContext: OnboardingContextType = {
  onboarding: {
    isNewUser: false,
    currentStep: 'welcome',
    completed: false,
    stepHistory: [],
  },
  markStepComplete: () => {},
  skipOnboarding: () => {},
  resetOnboarding: () => {},
  startOnboarding: () => {},
};

// Create the context
const OnboardingContext = createContext<OnboardingContextType>(defaultContext);

// Define onboarding steps
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  CREATE_GROUP: 'create_group',
  ADD_EXPENSE: 'add_expense',
  INVITE_FRIEND: 'invite_friend',
  COMPLETED: 'completed',
};

// Create a provider component
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage or with default values
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    const savedState = localStorage.getItem('onboarding');
    return savedState ? JSON.parse(savedState) : {
      isNewUser: false,
      currentStep: ONBOARDING_STEPS.WELCOME,
      completed: false,
      stepHistory: [],
    };
  });

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('onboarding', JSON.stringify(onboarding));
  }, [onboarding]);

  // Mark a step as complete and advance to next step
  const markStepComplete = (step: string) => {
    // Define the next step based on the current step
    let nextStep = '';
    switch (step) {
      case ONBOARDING_STEPS.WELCOME:
        nextStep = ONBOARDING_STEPS.CREATE_GROUP;
        break;
      case ONBOARDING_STEPS.CREATE_GROUP:
        nextStep = ONBOARDING_STEPS.ADD_EXPENSE;
        break;
      case ONBOARDING_STEPS.ADD_EXPENSE:
        nextStep = ONBOARDING_STEPS.INVITE_FRIEND;
        break;
      case ONBOARDING_STEPS.INVITE_FRIEND:
        nextStep = ONBOARDING_STEPS.COMPLETED;
        break;
      default:
        nextStep = ONBOARDING_STEPS.COMPLETED;
    }

    setOnboarding(prev => ({
      ...prev,
      currentStep: nextStep,
      stepHistory: [...prev.stepHistory, step],
      completed: nextStep === ONBOARDING_STEPS.COMPLETED,
    }));
  };

  // Skip the onboarding process
  const skipOnboarding = () => {
    setOnboarding(prev => ({
      ...prev,
      completed: true,
    }));
  };

  // Reset the onboarding process
  const resetOnboarding = () => {
    setOnboarding({
      isNewUser: true,
      currentStep: ONBOARDING_STEPS.WELCOME,
      completed: false,
      stepHistory: [],
    });
  };

  // Start the onboarding process for a new user
  const startOnboarding = () => {
    setOnboarding({
      isNewUser: true,
      currentStep: ONBOARDING_STEPS.WELCOME,
      completed: false,
      stepHistory: [],
    });
  };

  return (
    <OnboardingContext.Provider value={{
      onboarding,
      markStepComplete,
      skipOnboarding,
      resetOnboarding,
      startOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook to use the onboarding context
export const useOnboarding = () => useContext(OnboardingContext);