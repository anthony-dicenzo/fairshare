import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, DollarSign, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tutorial steps enum
enum TutorialStep {
  Welcome,
  CreateGroup,
  AddExpense,
  InviteUser,
  Complete
}

interface OnboardingTutorialProps {
  open: boolean;
  onComplete: () => void;
}

const OnboardingTutorial = ({ open, onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(TutorialStep.Welcome);
  const [dialogOpen, setDialogOpen] = useState(open);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Calculate progress percentage based on current step
  const progressPercentage = (currentStep / (Object.keys(TutorialStep).length / 2 - 1)) * 100;

  // Handle next step
  const handleNext = () => {
    if (currentStep === TutorialStep.Complete) {
      setDialogOpen(false);
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
      
      // If we're moving to create group step, navigate to groups page
      if (currentStep === TutorialStep.Welcome) {
        navigate('/groups');
      }
      
      // If we're moving to add expense step, show a toast with instructions
      if (currentStep === TutorialStep.CreateGroup) {
        toast({
          title: '💡 Create an Expense',
          description: "Now let's add your first expense. Select a group and click the + button.",
          duration: 5000,
        });
      }
      
      // If we're moving to invite user step, show a toast with instructions
      if (currentStep === TutorialStep.AddExpense) {
        toast({
          title: '💡 Invite Someone',
          description: "Finally, invite friends to join your group by clicking 'Invite' on the group page.",
          duration: 5000,
        });
      }
    }
  };

  // Handle skip tutorial
  const handleSkip = () => {
    setDialogOpen(false);
    onComplete();
  };

  // Show content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case TutorialStep.Welcome:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Welcome to FairShare!</DialogTitle>
              <DialogDescription className="text-base py-2">
                Let's get you started with a quick tour of how to use the app.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4 py-4">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Create a Group</h3>
                  <p className="text-sm text-muted-foreground">Start by creating a group for your expenses</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Add Expenses</h3>
                  <p className="text-sm text-muted-foreground">Track shared expenses within your group</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Invite Friends</h3>
                  <p className="text-sm text-muted-foreground">Share the group with friends to split expenses</p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext}>
                Start Tour
              </Button>
            </DialogFooter>
          </>
        );
        
      case TutorialStep.CreateGroup:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Step 1: Create a Group</DialogTitle>
              <DialogDescription>
                Create a group to start tracking expenses with friends, roommates, or family.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center space-x-2 mb-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Click "Create group"</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can find the "Create group" button at the top of the Groups page.
                  Give your group a descriptive name like "Roommates" or "Trip to Paris".
                </p>
              </div>
              <div className="flex justify-center">
                <img 
                  src="/create-group-demo.png" 
                  alt="Create Group Demonstration" 
                  className="rounded-md border shadow-sm max-w-full h-auto"
                  onError={(e) => e.currentTarget.style.display = 'none'} // Hide image if it fails to load
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext}>
                I've Created a Group
              </Button>
            </DialogFooter>
          </>
        );
        
      case TutorialStep.AddExpense:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Step 2: Add an Expense</DialogTitle>
              <DialogDescription>
                Record expenses within your group to keep track of who paid what.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-medium">Click the "+" button in your group</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the expense details including title, amount, date, and how to split it.
                  FairShare will automatically calculate who owes what.
                </p>
              </div>
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-1">Pro Tips:</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Use descriptive titles like "Groceries" or "Dinner at Luigi's"</li>
                  <li>Select who participated in the expense</li>
                  <li>Choose how to split: equally, by percentage, or custom amounts</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext}>
                I've Added an Expense
              </Button>
            </DialogFooter>
          </>
        );
        
      case TutorialStep.InviteUser:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Step 3: Invite Friends</DialogTitle>
              <DialogDescription>
                Share your group with friends so they can view and add expenses too.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Click "Invite" in your group</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can find the Invite button in your group details page.
                  Share the invite link with your friends so they can join.
                </p>
              </div>
              <div className="rounded-lg border p-4 bg-primary/10">
                <h4 className="font-medium mb-1 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  Why invite friends?
                </h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>They'll be able to see all group expenses</li>
                  <li>They can add their own expenses</li>
                  <li>Everyone stays on the same page about who owes what</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext}>
                Continue
              </Button>
            </DialogFooter>
          </>
        );
        
      case TutorialStep.Complete:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">You're All Set! 🎉</DialogTitle>
              <DialogDescription>
                You've completed the basic tutorial for FairShare.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-md">
                <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Here's what you can do now:</h4>
                <ul className="text-sm text-green-700 dark:text-green-400 list-disc list-inside space-y-2">
                  <li>Create more groups for different purposes</li>
                  <li>Add recurring expenses for monthly bills</li>
                  <li>Settle up with friends when debts build up</li>
                  <li>Check the Activity tab to see recent updates</li>
                </ul>
              </div>
              <p className="text-sm text-center text-muted-foreground pt-2">
                Need help? Check out our Help section or contact support.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleNext} className="w-full">
                Start Using FairShare
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="mb-4">
          <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTutorial;