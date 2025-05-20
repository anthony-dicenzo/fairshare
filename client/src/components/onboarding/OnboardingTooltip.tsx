import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface TooltipPosition {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

interface OnboardingTooltipProps {
  targetElementId: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  show: boolean;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  targetElementId,
  content,
  position = 'bottom',
  onClose,
  autoClose = false,
  autoCloseDelay = 5000,
  show
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({});
  const [isVisible, setIsVisible] = useState(show);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate position based on target element
  useEffect(() => {
    if (!show) return;
    
    const targetElement = document.getElementById(targetElementId);
    
    if (targetElement) {
      // Add highlight class to target element
      targetElement.classList.add('highlight-element');
      
      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      
      // Default offset from the element
      const offset = 15;
      
      // Calculate position based on specified position
      let newPosition: TooltipPosition = {};
      
      if (tooltipRect) {
        switch (position) {
          case 'top':
            newPosition = {
              bottom: window.innerHeight - targetRect.top + offset,
              left: targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
            };
            break;
          case 'bottom':
            newPosition = {
              top: targetRect.bottom + offset,
              left: targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
            };
            break;
          case 'left':
            newPosition = {
              top: targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2),
              right: window.innerWidth - targetRect.left + offset
            };
            break;
          case 'right':
            newPosition = {
              top: targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2),
              left: targetRect.right + offset
            };
            break;
        }
      }
      
      setTooltipPosition(newPosition);
      setIsVisible(true);
    }
    
    // Clean up function to remove highlight class
    return () => {
      const element = document.getElementById(targetElementId);
      if (element) {
        element.classList.remove('highlight-element');
      }
    };
  }, [targetElementId, position, show]);
  
  // Auto-close logic
  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, isVisible, autoCloseDelay]);
  
  // Set visibility based on show prop
  useEffect(() => {
    setIsVisible(show);
  }, [show]);
  
  const handleClose = () => {
    setIsVisible(false);
    
    // Remove highlight class
    const element = document.getElementById(targetElementId);
    if (element) {
      element.classList.remove('highlight-element');
    }
    
    if (onClose) {
      onClose();
    }
  };
  
  // Get tooltip arrow position
  const getArrowPosition = () => {
    switch (position) {
      case 'top':
        return 'tooltip-arrow-bottom';
      case 'bottom':
        return 'tooltip-arrow-top';
      case 'left':
        return 'tooltip-arrow-right';
      case 'right':
        return 'tooltip-arrow-left';
      default:
        return 'tooltip-arrow-top';
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          className="onboarding-tooltip"
          style={tooltipPosition}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <div className={getArrowPosition()} />
          <p>{content}</p>
          
          {position === 'bottom' && (
            <motion.div 
              className="mt-2 text-center"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowDown size={18} />
            </motion.div>
          )}
          
          {!autoClose && (
            <button 
              className="tooltip-close"
              onClick={handleClose}
            >
              Got it
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTooltip;