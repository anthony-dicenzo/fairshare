import React, { useState, useEffect, CSSProperties } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowRight, Check } from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';

// Define the tour steps with constant values
const STEP_WELCOME = 0;
const STEP_CREATE_GROUP = 1;
const STEP_ADD_EXPENSE = 2;
const STEP_INVITE_USER = 3;
const STEP_COMPLETE = 4;

export function GuidedTour() {
  const [currentStep, setCurrentStep] = useState(STEP_WELCOME);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { completeOnboarding } = useOnboarding();
  const [location, setLocation] = useState<string>(window.location.pathname);

  // Watch for route changes and update location
  useEffect(() => {
    const handleRouteChange = () => {
      setLocation(window.location.pathname);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);
  
  // Find the target elements based on current step
  useEffect(() => {
    setTimeout(() => {
      let element: HTMLElement | null = null;
      
      switch (currentStep) {
        case STEP_WELCOME:
          // No specific target for welcome
          break;
        case STEP_CREATE_GROUP:
          // Target the create group button - find buttons by text content
          element = Array.from(document.querySelectorAll('button'))
            .find(button => button.textContent?.includes('Create group')) as HTMLElement || null;
          break;
        case STEP_ADD_EXPENSE:
          // Target the add expense button or + button
          element = document.querySelector('.add-expense-button') as HTMLElement || 
                    document.querySelector('[data-tour="add-expense"]') as HTMLElement ||
                    Array.from(document.querySelectorAll('button'))
                      .find(button => button.textContent?.includes('+')) as HTMLElement || null;
          break;
        case STEP_INVITE_USER:
          // Target the invite users button
          element = Array.from(document.querySelectorAll('button'))
            .find(button => button.textContent?.includes('Invite')) as HTMLElement || null;
          break;
        case STEP_COMPLETE:
          // No specific target for completion
          break;
      }
      
      setTargetElement(element);
    }, 500); // Short delay to ensure DOM is ready
  }, [currentStep, location]);

  // Handle advancing to next step
  const handleNext = () => {
    // If we're at the last step, complete the onboarding
    if (currentStep === STEP_COMPLETE) {
      completeOnboarding();
      return;
    }
    
    // Otherwise, advance to the next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    // Navigate to appropriate page based on next step
    switch (nextStep) {
      case STEP_CREATE_GROUP:
        navigate('/groups');
        break;
      case STEP_ADD_EXPENSE:
        // If a group exists, navigate to its page
        const firstGroupElement = document.querySelector('[data-group-id]');
        if (firstGroupElement) {
          const groupId = firstGroupElement.getAttribute('data-group-id');
          navigate(`/group/${groupId}`);
        }
        break;
      case STEP_INVITE_USER:
        // Stay on the same page, assuming we're already on a group page
        break;
      case STEP_COMPLETE:
        // No navigation needed
        break;
    }
  };

  // Handle skipping the tour
  const handleSkip = () => {
    completeOnboarding();
    toast({
      title: "Tutorial Skipped",
      description: "You can restart the tutorial anytime from your profile settings.",
    });
  };

  // Calculate position for the tooltip
  const getTooltipPosition = () => {
    if (!targetElement) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      } as CSSProperties;
    }
    
    const rect = targetElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Default position below the element
    let top = rect.bottom + 10;
    let left = rect.left + rect.width / 2;
    let transform = 'translateX(-50%)';
    
    // Adjust if tooltip would go off-screen
    if (top + 200 > viewportHeight) {
      // Position above the element instead
      top = rect.top - 10;
      transform = 'translate(-50%, -100%)';
    }
    
    if (left < 100) left = 100;
    if (left > viewportWidth - 100) left = viewportWidth - 100;
    
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform,
      zIndex: 1000,
      maxWidth: '350px',
      width: '90%'
    } as CSSProperties;
  };

  // Render tooltip content based on step
  const renderTooltipContent = () => {
    switch (currentStep) {
      case STEP_WELCOME:
        return (
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Welcome to FairShare!</CardTitle>
              <CardDescription>
                Let's get you started with a quick tour of the key features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                FairShare helps you track and split expenses with friends, roommates, 
                or anyone you share costs with.
              </p>
              <p className="text-sm">
                This quick tour will show you how to:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1 mt-2">
                <li>Create a group</li>
                <li>Add your first expense</li>
                <li>Invite others to your group</li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip Tour
              </Button>
              <Button size="sm" onClick={handleNext}>
                Start Tour <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case STEP_CREATE_GROUP:
        return (
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Step 1: Create a Group</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Click the "Create group" button to start a new group for tracking expenses.
              </p>
              <p className="text-sm mt-2">
                Give your group a descriptive name like "Roommates" or "Trip to Paris".
              </p>
            </CardContent>
            <CardFooter className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
              <Button size="sm" onClick={handleNext}>
                I've Created a Group <Check className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case STEP_ADD_EXPENSE:
        return (
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Step 2: Add an Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Click the "+" button to add a new expense to your group.
              </p>
              <p className="text-sm mt-2">
                Enter details like amount, description, and who's involved in the expense.
              </p>
              <p className="text-sm mt-2">
                FairShare will automatically calculate who owes what.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
              <Button size="sm" onClick={handleNext}>
                I've Added an Expense <Check className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case STEP_INVITE_USER:
        return (
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Step 3: Invite Friends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Click the "Invite" button to add others to your group.
              </p>
              <p className="text-sm mt-2">
                You can share a link or invite people directly by email.
              </p>
              <p className="text-sm mt-2">
                Once they join, everyone can see expenses and balances.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
              <Button size="sm" onClick={handleNext}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case STEP_COMPLETE:
        return (
          <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-slate-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">You're All Set! 🎉</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                You've completed the FairShare onboarding tour!
              </p>
              <p className="text-sm mt-2">
                Now you can easily manage expenses with friends and keep track of who owes what.
              </p>
              <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Pro Tips:</p>
                <ul className="text-xs text-green-700 dark:text-green-400 list-disc list-inside mt-1">
                  <li>Settle up balances when they get too large</li>
                  <li>Add notes to expenses for clarity</li>
                  <li>Check the Activity feed for recent updates</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="pt-1">
              <Button className="w-full" onClick={handleNext}>
                Start Using FairShare <Check className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );

      default:
        return null;
    }
  };

  // Handle any location-specific modifications
  useEffect(() => {
    // Check if we're on a page that requires specific help
    if (currentStep === STEP_CREATE_GROUP && !location.includes('/groups')) {
      navigate('/groups');
    }
  }, [currentStep, location, navigate]);

  // Early return if we're showing the welcome step with no target
  if (currentStep === STEP_WELCOME || currentStep === STEP_COMPLETE) {
    return (
      <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center bg-black/30 z-50">
        <div className="max-w-md w-full mx-4">
          {renderTooltipContent()}
        </div>
      </div>
    );
  }

  // For steps with targets, position the tooltip relative to the target
  return (
    <>
      {targetElement && (
        <div className="fixed inset-0 bg-black/5 pointer-events-none z-40" aria-hidden="true">
          <div
            className="absolute bg-primary/30 rounded-md animate-pulse pointer-events-none"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.offsetWidth + 8,
              height: targetElement.offsetHeight + 8,
            }}
          />
        </div>
      )}
      <div style={getTooltipPosition()} className="pointer-events-auto">
        {renderTooltipContent()}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-50 rounded-full"
        onClick={handleSkip}
      >
        <XCircle className="h-4 w-4 mr-1" />
        Exit Tour
      </Button>
    </>
  );
}