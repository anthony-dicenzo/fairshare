import React from 'react';
import { createPortal } from 'react-dom';

// Define button positions and styles for highlighting
interface ButtonHighlight {
  step: string;
  style: React.CSSProperties;
}

// Define the steps in the onboarding process
enum OnboardingStep {
  WELCOME = 'welcome',
  CREATE_GROUP = 'create_group',
  ADD_EXPENSE = 'add_expense',
  INVITE_FRIEND = 'invite_friend',
  COMPLETED = 'completed',
}

// Component to create a highlight that precisely targets specific UI elements
const HighlightOverlay: React.FC<{
  currentStep: OnboardingStep;
}> = ({ currentStep }) => {
  
  // Define highlight styles for each button/element we want to highlight
  const buttonHighlights: ButtonHighlight[] = [
    {
      step: OnboardingStep.CREATE_GROUP,
      style: {
        position: 'fixed',
        top: '112px',
        right: '20px',
        width: '140px',
        height: '42px',
        borderRadius: '8px',
        border: '3px dashed #ff5500',
        boxShadow: '0 0 10px rgba(255, 85, 0, 0.7)',
        zIndex: 9001,
        pointerEvents: 'none',
        animation: 'pulse 2s infinite'
      }
    },
    {
      step: OnboardingStep.ADD_EXPENSE,
      style: {
        position: 'fixed',
        bottom: '55px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        border: '3px dashed #ff5500',
        boxShadow: '0 0 10px rgba(255, 85, 0, 0.7)',
        zIndex: 9001,
        pointerEvents: 'none',
        animation: 'pulse 2s infinite'
      }
    },
    {
      step: OnboardingStep.INVITE_FRIEND,
      style: {
        position: 'fixed',
        top: '60px',
        right: '20px',
        width: '100px',
        height: '40px',
        borderRadius: '20px',
        border: '3px dashed #ff5500',
        boxShadow: '0 0 10px rgba(255, 85, 0, 0.7)',
        zIndex: 9001,
        pointerEvents: 'none',
        animation: 'pulse 2s infinite'
      }
    }
  ];
  
  // Find the highlight for the current step
  const currentHighlight = buttonHighlights.find(h => h.step === currentStep);
  
  // If no highlight is found for the current step, don't render anything
  if (!currentHighlight) return null;
  
  // Create a portal to render the highlight directly to the document body
  return createPortal(
    <div style={currentHighlight.style} />,
    document.body
  );
};

export default HighlightOverlay;
export { OnboardingStep };