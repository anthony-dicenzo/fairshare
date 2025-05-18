import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function WelcomeDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Check if this is a first-time user
  useEffect(() => {
    // Use a simple localStorage flag to track if the welcome message has been shown
    const hasSeenWelcome = localStorage.getItem('fairshare_welcome_seen');
    
    console.log('Checking if user has seen welcome:', hasSeenWelcome);
    
    if (!hasSeenWelcome) {
      console.log('First time user detected, showing welcome dialog');
      // Show welcome dialog after a short delay
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Handle getting started
  const handleGetStarted = () => {
    setOpen(false);
    
    // Mark the welcome as seen
    localStorage.setItem('fairshare_welcome_seen', 'true');
    
    // Show a toast with a quick tip
    toast({
      title: "Tip: Use the + button",
      description: "Create a group to get started with expense sharing",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to FairShare!</DialogTitle>
          <DialogDescription>
            Track expenses, split bills, and settle up with friends and groups.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Here's what you can do:
          </p>
          
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
        </div>
        
        <DialogFooter>
          <Button onClick={handleGetStarted} className="w-full">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}