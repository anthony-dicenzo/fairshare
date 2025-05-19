import { useState, useEffect } from 'react';
import { useNavigate } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, ArrowRight, Plus, UserPlus } from 'lucide-react';

// Define each step of the onboarding
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to FairShare!',
    description: 'Let\'s get you started with a quick tour of the essential features.',
    icon: CheckCircle2,
  },
  {
    id: 'create-group',
    title: 'Create your first group',
    description: 'Start by creating a group for sharing expenses with friends, roommates, or colleagues.',
    icon: Plus,
    action: '/groups',
    actionText: 'Create a group',
  },
  {
    id: 'add-expense',
    title: 'Add your first expense',
    description: 'Now let\'s add an expense to your group. This could be rent, a meal, utilities, or anything you share with others.',
    icon: Plus,
    actionText: 'Add an expense',
  },
  {
    id: 'invite-friend',
    title: 'Invite others to join',
    description: 'Share your group with friends so they can see expenses and contribute their share.',
    icon: UserPlus,
    actionText: 'Invite a friend',
  },
  {
    id: 'completed',
    title: 'You\'re all set!',
    description: 'You\'ve completed the basic onboarding. Enjoy using FairShare to manage your shared expenses!',
    icon: CheckCircle2,
  },
];

export default function OnboardingTutorial({ 
  userId, 
  isNewUser = false 
}: { 
  userId: number, 
  isNewUser?: boolean 
}) {
  const [open, setOpen] = useState(isNewUser);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [userProgress, setUserProgress] = useState({
    groupCreated: false,
    expenseAdded: false,
    friendInvited: false,
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check user's progress when component mounts
  useEffect(() => {
    const checkUserProgress = async () => {
      try {
        // Check if user has groups
        const groupsResponse = await apiRequest('/api/groups');
        setUserProgress(prev => ({ 
          ...prev, 
          groupCreated: groupsResponse.groups && groupsResponse.groups.length > 0 
        }));

        // For more advanced progress tracking, you could add API endpoints to check:
        // - If the user has created expenses
        // - If the user has invited anyone
      } catch (error) {
        console.error('Error checking user progress:', error);
      }
    };

    if (open && userId) {
      checkUserProgress();
    }
  }, [open, userId]);

  // Save onboarding progress to user preferences
  const saveProgress = async (step: string, completed: boolean) => {
    try {
      await apiRequest('/api/user/preferences', {
        method: 'POST',
        body: JSON.stringify({
          onboardingStep: step,
          onboardingCompleted: completed
        })
      });
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  };

  const handleNextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      saveProgress(ONBOARDING_STEPS[currentStep + 1].id, false);
    } else {
      handleComplete();
    }
  };

  const handleActionClick = () => {
    const currentStepData = ONBOARDING_STEPS[currentStep];
    
    // If there's a specific action (link), navigate there
    if (currentStepData.action) {
      navigate(currentStepData.action);
    }
    
    // Handle specific actions based on the step ID
    switch (currentStepData.id) {
      case 'create-group':
        // The navigate above will take them to the groups page
        // We'll close the tutorial temporarily so they can create a group
        setOpen(false);
        break;
      case 'add-expense':
        // Close tutorial to let them add an expense 
        setOpen(false);
        break;
      case 'invite-friend':
        // Close tutorial to let them invite someone
        setOpen(false);
        break;
    }
  };

  const handleComplete = () => {
    setTutorialCompleted(true);
    setOpen(false);
    saveProgress('completed', true);
  };

  const handleSkip = () => {
    setOpen(false);
    saveProgress('skipped', true);
  };

  // Handle reopening the tutorial when a user returns after completing a step
  useEffect(() => {
    if (!open && isNewUser && !tutorialCompleted) {
      // Check if they've created a group since closing the tutorial
      const checkCompletion = async () => {
        try {
          const groupsResponse = await apiRequest('/api/groups');
          const hasGroups = groupsResponse.groups && groupsResponse.groups.length > 0;
          
          // If they've created a group and were on the create-group step, advance to next step
          if (hasGroups && ONBOARDING_STEPS[currentStep].id === 'create-group') {
            setCurrentStep(prev => prev + 1);
            setOpen(true);
          }
          
          // Similar logic could be added for expenses and invites
        } catch (error) {
          console.error('Error checking completion:', error);
        }
      };
      
      // Set a timeout to check if they've completed the action
      const timer = setTimeout(checkCompletion, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, isNewUser, tutorialCompleted, currentStep]);

  if (!isNewUser && !open) return null;

  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStepData.icon && <currentStepData.icon className="h-5 w-5 text-primary" />}
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2 py-4">
          {ONBOARDING_STEPS.map((step, index) => (
            <div 
              key={step.id} 
              className={cn(
                "h-2 w-2 rounded-full",
                index === currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {currentStep === ONBOARDING_STEPS.length - 1 ? (
            <Button onClick={handleComplete} className="w-full">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              {currentStepData.actionText && (
                <Button 
                  onClick={handleActionClick}
                  variant="default" 
                  className="w-full"
                >
                  {currentStepData.actionText}
                </Button>
              )}
              <Button 
                onClick={handleNextStep}
                variant="outline" 
                className="w-full"
              >
                {currentStepData.actionText ? 'I\'ll do this later' : 'Next'}
              </Button>
            </>
          )}
          
          {currentStep < ONBOARDING_STEPS.length - 1 && (
            <Button 
              onClick={handleSkip} 
              variant="ghost" 
              className="text-muted-foreground text-xs"
            >
              Skip tutorial
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}