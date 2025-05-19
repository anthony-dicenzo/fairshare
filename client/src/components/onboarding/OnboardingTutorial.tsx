import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useOnboarding, ONBOARDING_STEPS } from '../../context/OnboardingContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, ArrowRight, Users, Receipt, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingTutorial() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { onboarding, markStepComplete, skipOnboarding } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<number | null>(null);

  // Open the tutorial dialog when not completed
  useEffect(() => {
    if (!onboarding.completed && onboarding.isNewUser) {
      setOpen(true);
    }
  }, [onboarding.completed, onboarding.isNewUser]);

  // Check if we're on the groups page
  const isGroupsPage = location === '/groups';

  // Determine which step to show based on current step
  const renderContent = () => {
    switch (onboarding.currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return (
          <WelcomeStep 
            onComplete={() => markStepComplete(ONBOARDING_STEPS.WELCOME)} 
          />
        );
      case ONBOARDING_STEPS.CREATE_GROUP:
        return (
          <CreateGroupStep 
            onComplete={() => markStepComplete(ONBOARDING_STEPS.CREATE_GROUP)}
            setGroupId={setGroupId}
          />
        );
      case ONBOARDING_STEPS.ADD_EXPENSE:
        return (
          <AddExpenseStep 
            onComplete={() => markStepComplete(ONBOARDING_STEPS.ADD_EXPENSE)}
            groupId={groupId}
          />
        );
      case ONBOARDING_STEPS.INVITE_FRIEND:
        return (
          <InviteFriendStep 
            onComplete={() => markStepComplete(ONBOARDING_STEPS.INVITE_FRIEND)}
            groupId={groupId}
          />
        );
      case ONBOARDING_STEPS.COMPLETED:
        return (
          <CompletedStep 
            onClose={() => setOpen(false)}
          />
        );
      default:
        return null;
    }
  };

  if (!open || !onboarding.isNewUser) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {getTitleFromStep(onboarding.currentStep)}
          </DialogTitle>
          <DialogDescription>
            Let's help you get started with FairShare
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={skipOnboarding}
            className="mr-auto"
          >
            Skip tutorial
          </Button>
          <div className="flex space-x-1 text-xs text-muted-foreground">
            {renderStepIndicator(onboarding.currentStep)}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get a title based on the current step
const getTitleFromStep = (step: string) => {
  switch (step) {
    case ONBOARDING_STEPS.WELCOME:
      return "Welcome to FairShare";
    case ONBOARDING_STEPS.CREATE_GROUP:
      return "Create your first group";
    case ONBOARDING_STEPS.ADD_EXPENSE:
      return "Add your first expense";
    case ONBOARDING_STEPS.INVITE_FRIEND:
      return "Invite your friends";
    case ONBOARDING_STEPS.COMPLETED:
      return "You're all set!";
    default:
      return "Onboarding Tutorial";
  }
};

// Step indicator component
const renderStepIndicator = (currentStep: string) => {
  const steps = [
    ONBOARDING_STEPS.WELCOME,
    ONBOARDING_STEPS.CREATE_GROUP,
    ONBOARDING_STEPS.ADD_EXPENSE,
    ONBOARDING_STEPS.INVITE_FRIEND,
    ONBOARDING_STEPS.COMPLETED
  ];
  
  return (
    <div className="flex space-x-2">
      {steps.map((step, index) => (
        <div 
          key={step}
          className={`w-2 h-2 rounded-full ${
            currentStep === step 
              ? 'bg-primary' 
              : steps.indexOf(currentStep) > index 
                ? 'bg-primary/50' 
                : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
};

// Individual step components
const WelcomeStep = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="py-4">
      <p className="mb-4">
        FairShare makes it easy to split expenses with friends, roommates, and travel groups.
      </p>
      <p className="mb-4">
        This quick tutorial will help you learn the basics:
      </p>
      <ul className="space-y-2 mb-4">
        <li className="flex items-center">
          <Users className="mr-2 h-4 w-4" />
          Create expense groups
        </li>
        <li className="flex items-center">
          <Receipt className="mr-2 h-4 w-4" />
          Track shared expenses
        </li>
        <li className="flex items-center">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite friends to join
        </li>
      </ul>
      <Button onClick={onComplete} className="w-full">
        Let's get started <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const CreateGroupStep = ({ 
  onComplete,
  setGroupId
}: { 
  onComplete: () => void,
  setGroupId: (id: number) => void
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Create a default group
  const createDefaultGroup = async () => {
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'My First Group',
          description: 'Created during onboarding',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success!',
          description: 'Your first group has been created.',
        });
        setGroupId(data.id);
        onComplete();
        // Navigate to the groups page
        setLocation('/groups');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create group. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="py-4">
      <p className="mb-4">
        Groups help you organize expenses with different people.
        Create your first group to get started.
      </p>
      
      <Button 
        onClick={createDefaultGroup} 
        className="w-full"
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Create My First Group'} <Users className="ml-2 h-4 w-4" />
      </Button>
      
      <div className="mt-4 text-sm text-muted-foreground">
        You can also create it manually from the Groups page.
      </div>
    </div>
  );
};

const AddExpenseStep = ({ 
  onComplete,
  groupId
}: { 
  onComplete: () => void,
  groupId: number | null
}) => {
  const [location, setLocation] = useLocation();
  
  // Navigate to the group page
  const navigateToGroup = () => {
    if (groupId) {
      setLocation(`/groups/${groupId}`);
    }
    onComplete();
  };
  
  return (
    <div className="py-4">
      <p className="mb-4">
        Now let's add your first expense to the group.
      </p>
      <p className="mb-4">
        Whenever you pay for something that should be split with others, 
        add it as an expense. FairShare will track who owes what.
      </p>
      
      <Button onClick={navigateToGroup} className="w-full">
        Add an expense <Receipt className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const InviteFriendStep = ({ 
  onComplete,
  groupId
}: { 
  onComplete: () => void,
  groupId: number | null
}) => {
  return (
    <div className="py-4">
      <p className="mb-4">
        Now it's time to invite others to join your group.
      </p>
      <p className="mb-4">
        You can share an invite link directly, or add members through their email.
      </p>
      
      <Button onClick={onComplete} className="w-full">
        Got it <Check className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const CompletedStep = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="py-4 text-center">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-green-100 p-3">
          <Check className="h-8 w-8 text-green-600" />
        </div>
      </div>
      <p className="mb-4 font-medium text-lg">
        You're all set to start using FairShare!
      </p>
      <p className="mb-6">
        You now know the basics to get started. Explore the app to discover more features.
      </p>
      
      <Button onClick={onClose} className="w-full">
        Start using FairShare
      </Button>
    </div>
  );
};