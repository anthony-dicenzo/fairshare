import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Tutorial steps as a simple array to avoid typing issues
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to FairShare!',
    description: 'This tutorial will guide you through the app\'s main features. Let\'s start by creating a group for expense sharing.'
  },
  {
    id: 'create-group',
    title: 'Create a Group',
    description: 'Create a group to share expenses with friends, roommates, or for trips. Click the + button at the bottom of the screen and select "New Group".'
  },
  {
    id: 'add-expense',
    title: 'Add an Expense',
    description: 'Record expenses for your group by clicking the + button and selecting "Add Expense". Enter the amount, description, and who paid.'
  },
  {
    id: 'view-balances',
    title: 'Track Balances',
    description: 'See who owes what and who you owe. The dashboard shows your overall balance, and each group page shows group-specific balances.'
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'You\'ve completed the tutorial. Enjoy using FairShare to make expense sharing easy!'
  }
];

export function BasicTutorial() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [hasShownTutorial, setHasShownTutorial] = useState(false);
  
  // Check if this is a new user
  useEffect(() => {
    // Tutorial should only show once per browser
    const hasSeenTutorial = localStorage.getItem('fairshare_tutorial_seen');
    
    if (!hasSeenTutorial && !hasShownTutorial) {
      // Wait a bit for the app to load before showing tutorial
      const timer = setTimeout(() => {
        setOpen(true);
        setHasShownTutorial(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasShownTutorial]);
  
  // Move to next step
  const handleNext = () => {
    const steps: TutorialStep[] = ['welcome', 'create_group', 'add_expense', 'view_balances', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentStep === 'complete') {
      // End of tutorial
      handleClose();
    } else if (currentIndex < steps.length - 1) {
      // Move to next step
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  
  // Close the tutorial
  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('fairshare_tutorial_seen', 'true');
    
    toast({
      title: "Tutorial completed",
      description: "You can access help anytime from the menu",
      variant: "default"
    });
  };
  
  // Get current step content
  const stepContent = TUTORIAL_STEPS[currentStep];
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      setOpen(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{stepContent.title}</DialogTitle>
          <DialogDescription>
            {stepContent.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {currentStep === 'welcome' && (
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                </div>
                <p className="text-sm">Create groups for trips, roommates, or events</p>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                      <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                      <line x1="2" x2="22" y1="10" y2="10"></line>
                    </svg>
                  </div>
                </div>
                <p className="text-sm">Add expenses and split them automatically</p>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                </div>
                <p className="text-sm">Track who owes what with balance summaries</p>
              </div>
            </div>
          )}
          
          {stepContent.image && (
            <div className="mt-4 border rounded-md overflow-hidden">
              <img src={stepContent.image} alt={stepContent.title} className="w-full" />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            {currentStep === 'complete' ? 'Close' : 'Skip Tour'}
          </Button>
          
          {currentStep !== 'complete' && (
            <Button onClick={handleNext}>
              Next
            </Button>
          )}
          
          {currentStep === 'complete' && (
            <Button onClick={handleClose}>
              Get Started
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}