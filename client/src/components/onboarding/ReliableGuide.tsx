import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card,
  CardContent,
  CardFooter, 
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export enum TutorialStep {
  Welcome = 0,
  CreateGroup = 1,
  AddExpense = 2,
  InviteFriends = 3,
  Complete = 4,
}

interface ReliableGuideProps {
  initialStep?: TutorialStep;
  onComplete: () => void;
  onSkip?: () => void;
}

// Step content
const steps = [
  {
    title: "Welcome to FairShare!",
    description: "Let's get you started with a quick tour of the app's key features. We'll show you how to create a group, add expenses, and invite friends.",
    buttonText: "Start Tour",
    highlight: null,
  },
  {
    title: "Create a Group",
    description: "First, create a group by clicking the 'Create group' button on your dashboard. Groups help you track expenses with specific people.",
    buttonText: "I've Created a Group",
    highlight: ".add-group-button, [data-tour='create-group'], button:contains('Create group')",
  },
  {
    title: "Add an Expense",
    description: "Now add your first expense by clicking the '+' button in your group. Enter the expense details and select who paid for it.",
    buttonText: "I've Added an Expense",
    highlight: ".add-expense-button, [data-tour='add-expense'], button:contains('+ Add expense')",
  },
  {
    title: "Invite Friends",
    description: "Share your group with friends by clicking the 'Invite' button. You can send them an email invitation or copy a direct link.",
    buttonText: "I've Invited Friends",
    highlight: ".invite-button, [data-tour='invite-button'], button:contains('Invite')",
  },
  {
    title: "You're All Set!",
    description: "Great job! You now know the basics of using FairShare. Start tracking expenses and see how FairShare makes splitting costs easy.",
    buttonText: "Finish Tour",
    highlight: null,
  },
];

export function ReliableGuide({ 
  initialStep = TutorialStep.Welcome,
  onComplete,
  onSkip
}: ReliableGuideProps) {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(initialStep);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [highlightPosition, setHighlightPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0
  });
  const [showHighlight, setShowHighlight] = useState(false);

  // Handle highlighting elements
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (!currentStepData.highlight) {
      setShowHighlight(false);
      return;
    }

    // Try to find the element to highlight
    const findElementToHighlight = () => {
      if (!currentStepData.highlight) return;

      // Try various selectors
      const selectors = currentStepData.highlight.split(',').map(s => s.trim());
      let element: HTMLElement | null = null;

      for (const selector of selectors) {
        try {
          // Handle special case for button text content
          if (selector.includes('button:contains(')) {
            const buttonText = selector.match(/button:contains\('?(.+?)'?\)/)?.at(1);
            if (buttonText) {
              const buttons = Array.from(document.querySelectorAll('button'));
              element = buttons.find(btn => 
                btn.textContent?.includes(buttonText)
              ) as HTMLElement || null;
            }
          } else {
            element = document.querySelector(selector) as HTMLElement;
          }

          if (element) break;
        } catch (e) {
          console.error('Invalid selector:', selector);
        }
      }

      if (element) {
        // Apply styles directly to the element for visibility
        element.style.position = 'relative';
        element.style.zIndex = '9500';
        
        // Store the element
        setHighlightedElement(element);
        
        // Get position for highlight overlay
        const rect = element.getBoundingClientRect();
        setHighlightPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        
        setShowHighlight(true);
      } else {
        setShowHighlight(false);
      }
    };

    // Initial find
    findElementToHighlight();
    
    // Set up an interval to keep checking (for elements that load later)
    const interval = setInterval(findElementToHighlight, 500);
    
    return () => {
      clearInterval(interval);
      
      // Clean up styling
      if (highlightedElement) {
        highlightedElement.style.zIndex = '';
      }
    };
  }, [currentStep]);

  const handleNextStep = () => {
    // If this is the last step, complete the tutorial
    if (currentStep === TutorialStep.Complete) {
      triggerCelebration();
      onComplete();
      return;
    }
    
    // Otherwise, move to the next step
    const nextStep = currentStep + 1;
    
    // Celebrate completing a step
    if (nextStep > TutorialStep.Welcome) {
      triggerCelebration();
    }
    
    setCurrentStep(nextStep as TutorialStep);
  };
  
  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };
  
  // Get current step data
  const { title, description, buttonText } = steps[currentStep];
  
  // Calculate progress percentage
  const progress = (currentStep / (steps.length - 1)) * 100;
  
  return (
    <>
      {/* Semi-transparent overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-[9000]" />
      
      {/* Highlight around element */}
      {showHighlight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed z-[9100] pointer-events-none"
          style={{
            top: highlightPosition.top - 6,
            left: highlightPosition.left - 6,
            width: highlightPosition.width + 12,
            height: highlightPosition.height + 12,
            borderRadius: '8px',
            boxShadow: '0 0 0 6px rgba(37, 99, 235, 0.5), 0 0 0 3000px rgba(0, 0, 0, 0.1)'
          }}
        >
          <motion.div 
            className="absolute inset-0 rounded-lg"
            animate={{ 
              boxShadow: [
                '0 0 0 3px rgba(255, 255, 255, 0.3)', 
                '0 0 0 6px rgba(255, 255, 255, 0.2)', 
                '0 0 0 3px rgba(255, 255, 255, 0.3)'
              ] 
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      )}
      
      {/* Tutorial card */}
      <AnimatePresence>
        <motion.div
          className="fixed bottom-4 right-4 w-80 z-[9200]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", bounce: 0.3 }}
        >
          <Card className="shadow-xl border-2 border-blue-300 dark:border-blue-800">
            {/* Progress bar */}
            <div className="relative h-1.5 bg-gray-200 dark:bg-gray-800">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-blue-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <CardHeader className="p-4 pb-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                {onSkip && (
                  <Button variant="ghost" size="icon" onClick={onSkip} className="h-7 w-7">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
            </CardHeader>
            
            <CardContent className="p-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            </CardContent>
            
            <CardFooter className="p-4 pt-0">
              <Button 
                onClick={handleNextStep}
                className="w-full"
              >
                {buttonText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default ReliableGuide;