import React from 'react';
import { X, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { useTutorial, TutorialStep } from './tutorial-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Define content for each tutorial step
const tutorialContent: Record<TutorialStep, {
  title: string;
  description: string;
  image?: string;
  highlightSelector?: string; // CSS selector for element to highlight
}> = {
  'welcome': {
    title: 'Welcome to FairShare!',
    description: 'Let\'s walk through the basics of managing shared expenses with your friends. This tutorial will show you how to create a group, invite friends, and add expenses.',
  },
  'create-group': {
    title: 'Create a Group',
    description: 'Start by creating a group for your shared expenses. Click the + button at the bottom of the screen and select "New Group".',
    highlightSelector: '[data-tutorial="create-group-button"]',
  },
  'invite-friends': {
    title: 'Invite Friends',
    description: 'Now invite your friends to join the group. Click the "Invite" button in your group to add members.',
    highlightSelector: '[data-tutorial="invite-button"]',
  },
  'add-expense': {
    title: 'Add an Expense',
    description: 'Record your first shared expense by clicking the + button in the group and selecting "Add Expense". Enter the details and choose how to split it.',
    highlightSelector: '[data-tutorial="add-expense-button"]',
  },
  'complete': {
    title: 'You\'re All Set!',
    description: 'Great job! You now know the basics of using FairShare. Explore more features and start tracking your shared expenses easily.',
  }
};

const TutorialOverlay: React.FC = () => {
  const { 
    currentStep, 
    isTutorialActive,
    nextStep,
    prevStep,
    skipTutorial,
    showTutorial
  } = useTutorial();

  // Don't render if tutorial is not active or shouldn't be shown
  if (!isTutorialActive || !showTutorial) {
    return null;
  }

  const content = tutorialContent[currentStep];
  const isFirstStep = currentStep === 'welcome';
  const isLastStep = currentStep === 'complete';

  // Position the tutorial card based on which element to highlight
  const getCardPosition = () => {
    if (!content.highlightSelector) {
      return {
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        maxWidth: '90%',
        width: '24rem'
      } as React.CSSProperties;
    }

    try {
      const element = document.querySelector(content.highlightSelector);
      if (!element) {
        return {
          position: 'fixed',
          bottom: '5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          maxWidth: '90%',
          width: '24rem'
        } as React.CSSProperties;
      }

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Position above or below the element based on available space
      const topPosition = rect.top > windowHeight / 2;
      
      return {
        position: 'fixed',
        [topPosition ? 'bottom' : 'top']: `${topPosition ? windowHeight - rect.top + 20 : rect.bottom + 20}px`,
        left: `${Math.min(Math.max(rect.left, 20), windowWidth - 360)}px`,
        zIndex: 50,
        maxWidth: '90%',
        width: '20rem'
      } as React.CSSProperties;
    } catch (e) {
      return {
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        maxWidth: '90%',
        width: '24rem'
      } as React.CSSProperties;
    }
  };

  // Add highlight effect to target element
  React.useEffect(() => {
    const highlightElement = () => {
      // Remove any previous highlights
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });

      // Add highlight to current element
      if (content.highlightSelector) {
        const element = document.querySelector(content.highlightSelector);
        if (element) {
          element.classList.add('tutorial-highlight');
        }
      }
    };

    highlightElement();
    
    // Clean up on unmount
    return () => {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStep, content.highlightSelector]);

  return (
    <>
      {/* Semi-transparent overlay */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={skipTutorial}
      />
      
      {/* Tutorial card */}
      <Card style={getCardPosition()}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <Info className="w-5 h-5 mr-2 text-emerald-500" />
              {content.title}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={skipTutorial}
              aria-label="Close tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-muted-foreground">{content.description}</p>
          {content.image && (
            <div className="mt-2">
              <img 
                src={content.image} 
                alt={content.title} 
                className="rounded-md w-full h-auto"
              />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-1 flex justify-between">
          <div>
            {!isFirstStep && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevStep}
                className="mr-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={nextStep}
          >
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

export default TutorialOverlay;