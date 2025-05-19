import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import FloatingGuide from './FloatingGuide';
import WelcomeAnimation from './WelcomeAnimation';
import CompletionCelebration from './CompletionCelebration';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface InteractiveGuideProps {
  onComplete: () => void;
}

// Define the onboarding steps
enum OnboardingStep {
  Welcome,
  FindCreateGroup,
  FillGroupForm,
  FindAddExpense,
  FillExpenseForm,
  FindInviteButton,
  InviteFriends,
  Complete
}

export function InteractiveGuide({ onComplete }: InteractiveGuideProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.Welcome);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showExitButton, setShowExitButton] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Show exit button after welcome screen
  useEffect(() => {
    if (currentStep > OnboardingStep.Welcome && !showWelcome && !showCompletion) {
      setShowExitButton(true);
    } else {
      setShowExitButton(false);
    }
  }, [currentStep, showWelcome, showCompletion]);

  // Handle welcome animation completion
  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    navigate('/groups');
    toast({
      title: "Let's get started!",
      description: "First, create a group to organize your expenses.",
      duration: 5000,
    });
    
    // Delay showing first guide to ensure navigation completes
    setTimeout(() => {
      setCurrentStep(OnboardingStep.FindCreateGroup);
    }, 500);
  };

  // Handle completing the current step
  const handleStepComplete = () => {
    // Special handling for certain steps
    if (currentStep === OnboardingStep.FindCreateGroup) {
      // User is about to create a group, no navigation needed
      setCurrentStep(OnboardingStep.FillGroupForm);
    }
    else if (currentStep === OnboardingStep.FillGroupForm) {
      // User has filled in the group form, let them see their new group
      // We'll wait for them to navigate to their group and then proceed
      setTimeout(() => {
        setCurrentStep(OnboardingStep.FindAddExpense);
      }, 1000);
    }
    else if (currentStep === OnboardingStep.FindAddExpense) {
      // User has clicked add expense button
      setCurrentStep(OnboardingStep.FillExpenseForm);
    }
    else if (currentStep === OnboardingStep.FillExpenseForm) {
      // User has filled expense form, now guide to invite
      setCurrentStep(OnboardingStep.FindInviteButton);
    }
    else if (currentStep === OnboardingStep.FindInviteButton) {
      // User found invite button
      setCurrentStep(OnboardingStep.InviteFriends);
    }
    else if (currentStep === OnboardingStep.InviteFriends) {
      // User completed invite step, show completion
      setShowCompletion(true);
      setCurrentStep(OnboardingStep.Complete);
    }
    else if (currentStep === OnboardingStep.Complete) {
      // All done!
      onComplete();
    }
  };

  // Handle skipping the current step
  const handleSkipStep = () => {
    if (currentStep === OnboardingStep.Complete - 1) {
      // If it's the last step before completion, go to completion
      setShowCompletion(true);
      setCurrentStep(OnboardingStep.Complete);
    } else {
      // Otherwise just go to the next step
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle exit button click - confirms before exiting
  const handleExitClick = () => {
    const confirmed = window.confirm("Are you sure you want to exit the tutorial? You can restart it later from your profile settings.");
    if (confirmed) {
      onComplete();
    }
  };

  // Render the appropriate guide based on current step
  const renderGuide = () => {
    switch (currentStep) {
      case OnboardingStep.FindCreateGroup:
        return (
          <FloatingGuide
            title="Create a Group"
            description="Click the 'Create group' button to organize your shared expenses."
            targetSelector="[data-tour='create-group'], button.add-group-button"
            position="bottom"
            onComplete={handleStepComplete}
            onSkip={handleSkipStep}
            isVisible={true}
            highlightColor="rgba(59, 130, 246, 0.3)"
          />
        );
        
      case OnboardingStep.FillGroupForm:
        return (
          <FloatingGuide
            title="Name Your Group"
            description="Give your group a descriptive name like 'Roommates' or 'Trip to Paris'."
            targetSelector="form input[name='name'], [data-tour='group-name']"
            position="right"
            onComplete={handleStepComplete}
            onSkip={handleSkipStep}
            isVisible={true}
            completionText="I've Created a Group"
            highlightColor="rgba(59, 130, 246, 0.3)"
          />
        );
        
      case OnboardingStep.FindAddExpense:
        return (
          <FloatingGuide
            title="Add an Expense"
            description="Now click the '+' button to add your first expense to the group."
            targetSelector="[data-tour='add-expense'], .add-expense-button, button.add-expense"
            position="bottom"
            onComplete={handleStepComplete}
            onSkip={handleSkipStep}
            isVisible={true}
            highlightColor="rgba(124, 58, 237, 0.3)" // Purple highlight
          />
        );
        
      case OnboardingStep.FillExpenseForm:
        return (
          <FloatingGuide
            title="Enter Expense Details"
            description="Fill in the expense title, amount, and who paid for it."
            targetSelector="[data-tour='expense-form'], input[name='description'], form input[type='text']"
            position="right"
            onComplete={handleStepComplete}
            onSkip={handleSkipStep}
            isVisible={true}
            completionText="I've Added an Expense"
            highlightColor="rgba(124, 58, 237, 0.3)" // Purple highlight
          />
        );
        
      case OnboardingStep.FindInviteButton:
        return (
          <FloatingGuide
            title="Invite Friends"
            description="Click 'Invite' to share this group with friends."
            targetSelector="[data-tour='invite-button'], .invite-button, button.invite"
            position="bottom"
            onComplete={handleStepComplete}
            onSkip={handleSkipStep}
            isVisible={true}
            highlightColor="rgba(236, 72, 153, 0.3)" // Pink highlight
          />
        );
        
      case OnboardingStep.InviteFriends:
        return (
          <FloatingGuide
            title="Share with Friends"
            description="You can copy the invite link or send an email invitation."
            targetSelector="[data-tour='invite-link'], input[readonly], .invite-link"
            position="bottom"
            onComplete={handleStepComplete}
            onSkip={handleSkipStep}
            isVisible={true}
            completionText="Continue to Final Step"
            highlightColor="rgba(236, 72, 153, 0.3)" // Pink highlight
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      {/* Welcome screen - fullscreen */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeAnimation onComplete={handleWelcomeComplete} />
        )}
      </AnimatePresence>
      
      {/* Floating guides - non-intrusive */}
      {!showWelcome && !showCompletion && renderGuide()}
      
      {/* Exit button */}
      <AnimatePresence>
        {showExitButton && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50"
          >
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleExitClick}
            >
              <X className="h-4 w-4 mr-1 text-red-500" />
              <span className="text-red-500">Exit Tutorial</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Completion screen - fullscreen */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          >
            <CompletionCelebration onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default InteractiveGuide;