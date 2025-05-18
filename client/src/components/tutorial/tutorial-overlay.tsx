import React, { useEffect, useState } from 'react';
import { useTutorial, TutorialStep } from './tutorial-context';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Tooltip positions
type TooltipPosition = 'top' | 'right' | 'bottom' | 'left' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface StepConfig {
  target: string;
  title: string;
  description: string;
  position: TooltipPosition;
  showSkip?: boolean;
  showBack?: boolean;
}

const TutorialOverlay: React.FC = () => {
  const { currentStep, isTutorialActive, nextStep, prevStep, skipTutorial, completeTutorial } = useTutorial();
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [tooltipClass, setTooltipClass] = useState<string>('');
  const [targetFound, setTargetFound] = useState<boolean>(false);
  
  // Define tutorial steps configuration
  const stepConfigs: Record<TutorialStep, StepConfig | null> = {
    'inactive': null,
    'complete': null,
    'welcome': {
      target: 'body',
      title: 'Welcome to FairShare!',
      description: 'This tutorial will help you learn the basics of using the app. Let\'s start by creating a group for expense sharing.',
      position: 'top',
      showSkip: true,
    },
    'create-group': {
      target: '[data-tutorial="create-group-button"]',
      title: 'Create a Group',
      description: 'First, let\'s create a group. Click the + button to add a new group.',
      position: 'top',
      showSkip: true,
      showBack: true
    },
    'invite-members': {
      target: '[data-tutorial="group-members"]',
      title: 'Invite Members',
      description: 'Now invite your friends to the group. This is where you\'ll see all group members.',
      position: 'bottom',
      showSkip: true,
      showBack: true
    },
    'add-expense': {
      target: '[data-tutorial="add-expense"]',
      title: 'Add an Expense',
      description: 'Record expenses for the group by clicking the Add Expense button.',
      position: 'bottom',
      showSkip: true,
      showBack: true
    },
    'view-balances': {
      target: '[data-tutorial="view-balances"]',
      title: 'Balance Summary',
      description: 'View who owes what and track your balances here.',
      position: 'bottom',
      showSkip: true,
      showBack: true
    }
  };

  useEffect(() => {
    if (!isTutorialActive || !stepConfigs[currentStep]) return;
    
    // Find target element
    const config = stepConfigs[currentStep]!;
    let targetEl: Element | null;
    
    if (config.target === 'body') {
      targetEl = document.body;
      setTargetFound(true);
    } else {
      targetEl = document.querySelector(config.target);
      setTargetFound(!!targetEl);
    }
    
    if (!targetEl) {
      console.log(`Tutorial target not found: ${config.target}`);
      return;
    }
    
    // Position tooltip relative to target
    positionTooltip(targetEl, config.position);
    
    // Handle welcome step specially
    if (currentStep === 'welcome') {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '400px',
        width: '90%',
        zIndex: 1000,
      });
      setTooltipClass('tutorial-tooltip tutorial-center');
    }
    
    // Add highlight effect to target element
    if (config.target !== 'body') {
      targetEl.classList.add('tutorial-highlight');
    }
    
    return () => {
      // Clean up highlight effect
      if (targetEl && config.target !== 'body') {
        targetEl.classList.remove('tutorial-highlight');
      }
    };
  }, [currentStep, isTutorialActive]);
  
  // Position tooltip relative to target element
  const positionTooltip = (targetEl: Element, position: TooltipPosition) => {
    if (targetEl === document.body) return;
    
    const rect = targetEl.getBoundingClientRect();
    const offset = 15; // offset in pixels
    let style: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
      maxWidth: '300px',
    };
    
    let tooltipPositionClass = `tutorial-tooltip tutorial-${position}`;
    
    switch (position) {
      case 'top':
        style.bottom = `${window.innerHeight - rect.top + offset}px`;
        style.left = `${rect.left + rect.width / 2}px`;
        style.transform = 'translateX(-50%)';
        break;
      case 'right':
        style.left = `${rect.right + offset}px`;
        style.top = `${rect.top + rect.height / 2}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        style.top = `${rect.bottom + offset}px`;
        style.left = `${rect.left + rect.width / 2}px`;
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.right = `${window.innerWidth - rect.left + offset}px`;
        style.top = `${rect.top + rect.height / 2}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'top-right':
        style.bottom = `${window.innerHeight - rect.top + offset}px`;
        style.left = `${rect.right - 100}px`;
        break;
      case 'top-left':
        style.bottom = `${window.innerHeight - rect.top + offset}px`;
        style.left = `${rect.left}px`;
        break;
      case 'bottom-right':
        style.top = `${rect.bottom + offset}px`;
        style.left = `${rect.right - 100}px`;
        break;
      case 'bottom-left':
        style.top = `${rect.bottom + offset}px`;
        style.left = `${rect.left}px`;
        break;
    }
    
    setTooltipStyle(style);
    setTooltipClass(tooltipPositionClass);
  };
  
  const handleNext = () => {
    if (currentStep === 'view-balances') {
      completeTutorial();
    } else {
      nextStep();
    }
  };
  
  if (!isTutorialActive || !stepConfigs[currentStep]) {
    return null;
  }
  
  const config = stepConfigs[currentStep]!;
  
  return (
    <>
      {/* Add dark overlay on entire page */}
      <div className="tutorial-overlay fixed inset-0 bg-black/50 z-[999]" />
      
      {/* Tooltip */}
      <div className={tooltipClass} style={tooltipStyle}>
        <button 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={skipTutorial}
          aria-label="Close tutorial"
        >
          <X size={18} />
        </button>
        
        <div className="p-4">
          <h3 className="text-lg font-medium mb-2">{config.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
          
          <div className="flex justify-between">
            {config.showBack ? (
              <Button variant="outline" size="sm" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div></div>
            )}
            
            {config.showSkip && (
              <Button variant="ghost" size="sm" onClick={skipTutorial}>
                Skip Tutorial
              </Button>
            )}
            
            <Button size="sm" onClick={handleNext}>
              {currentStep === 'view-balances' ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Show warning if target not found */}
      {!targetFound && isTutorialActive && currentStep !== 'welcome' && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 p-3 rounded-md shadow-lg z-[1001]">
          <p className="text-sm text-yellow-800">
            Looking for tutorial target... Navigate to the right screen to continue.
          </p>
          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={skipTutorial}>
              End Tutorial
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorialOverlay;