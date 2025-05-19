import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card,
  CardContent,
  CardFooter, 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ChevronsRight } from 'lucide-react';

interface FloatingGuideProps {
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  onComplete: () => void;
  onSkip?: () => void;
  showHighlight?: boolean;
  completionText?: string;
  isVisible: boolean;
  highlightColor?: string;
}

export function FloatingGuide({ 
  title, 
  description, 
  targetSelector,
  position = 'bottom',
  onComplete,
  onSkip,
  showHighlight = true,
  completionText = "Got it",
  isVisible,
  highlightColor = 'rgba(59, 130, 246, 0.5)' // default blue highlight
}: FloatingGuideProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const [foundTarget, setFoundTarget] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Find target element and update coordinates
  useEffect(() => {
    if (!isVisible || !targetSelector) return;
    
    const findTargetAndPosition = () => {
      // Handle multiple selectors separated by commas
      const selectors = targetSelector.split(',').map(s => s.trim());
      let targetElement: HTMLElement | null = null;
      
      // Try each selector until we find a match
      for (const selector of selectors) {
        try {
          // Special case for "contains" text content
          if (selector.includes('button:contains(')) {
            const buttonText = selector.match(/button:contains\('(.+?)'\)/)?.[1];
            if (buttonText) {
              const buttons = Array.from(document.querySelectorAll('button'));
              targetElement = buttons.find(btn => 
                btn.textContent?.includes(buttonText)
              ) as HTMLElement || null;
              if (targetElement) break;
            }
          } else {
            // Regular selector
            targetElement = document.querySelector(selector) as HTMLElement;
            if (targetElement) break;
          }
        } catch (e) {
          console.error('Invalid selector:', selector);
        }
      }
      
      if (targetElement) {
        setFoundTarget(true);
        const rect = targetElement.getBoundingClientRect();
        setCoords({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        });
      } else {
        setFoundTarget(false);
      }
    };

    // Initial find
    findTargetAndPosition();
    
    // Set up observer to watch for DOM changes
    const observer = new MutationObserver(findTargetAndPosition);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
    
    // Check periodically too for elements that might appear from JS
    const interval = setInterval(findTargetAndPosition, 500);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [isVisible, targetSelector]);
  
  // Calculate card position based on target element
  useEffect(() => {
    if (!foundTarget || !cardRef.current) return;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const cardWidth = cardRef.current.offsetWidth;
    const cardHeight = cardRef.current.offsetHeight;
    
    let top = 0;
    let left = 0;
    
    // Position based on specified preference
    switch (position) {
      case 'top':
        top = coords.y - cardHeight - 10;
        left = coords.x + (coords.width / 2) - (cardWidth / 2);
        break;
      case 'right':
        top = coords.y + (coords.height / 2) - (cardHeight / 2);
        left = coords.x + coords.width + 10;
        break;
      case 'bottom':
        top = coords.y + coords.height + 10;
        left = coords.x + (coords.width / 2) - (cardWidth / 2);
        break;
      case 'left':
        top = coords.y + (coords.height / 2) - (cardHeight / 2);
        left = coords.x - cardWidth - 10;
        break;
      case 'center':
        top = windowHeight / 2 - cardHeight / 2;
        left = windowWidth / 2 - cardWidth / 2;
        break;
    }
    
    // Adjust if card would be off-screen
    if (left < 20) left = 20;
    if (left + cardWidth > windowWidth - 20) left = windowWidth - cardWidth - 20;
    if (top < 20) top = 20;
    if (top + cardHeight > windowHeight - 20) top = windowHeight - cardHeight - 20;
    
    setCardPosition({ top, left });
  }, [coords, foundTarget, position]);
  
  // Don't render if not visible
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* Highlight overlay for target element */}
        {foundTarget && showHighlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute"
            style={{
              top: coords.y - 4,
              left: coords.x - 4,
              width: coords.width + 8,
              height: coords.height + 8,
              backgroundColor: highlightColor,
              borderRadius: '4px',
              zIndex: 50,
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)'
            }}
          >
            <motion.div 
              className="absolute inset-0"
              animate={{ 
                boxShadow: ['0 0 0 2px rgba(255,255,255,0.3)', '0 0 0 4px rgba(255,255,255,0.2)', '0 0 0 2px rgba(255,255,255,0.3)'] 
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
        
        {/* Guide card */}
        <motion.div
          ref={cardRef}
          className="fixed pointer-events-auto"
          style={{ 
            top: cardPosition.top, 
            left: cardPosition.left,
            zIndex: 60
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="w-64 shadow-lg border border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-2">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm">{title}</h3>
                {onSkip && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" onClick={onSkip}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
              
              {/* Animated arrow pointing to target for extra emphasis */}
              {foundTarget && position === 'top' && (
                <motion.div 
                  className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-blue-500"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronsRight className="h-6 w-6 rotate-90" />
                </motion.div>
              )}
              
              {foundTarget && position === 'right' && (
                <motion.div 
                  className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 text-blue-500"
                  animate={{ x: [0, -4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronsRight className="h-6 w-6 rotate-180" />
                </motion.div>
              )}
              
              {foundTarget && position === 'bottom' && (
                <motion.div 
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-blue-500"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronsRight className="h-6 w-6 -rotate-90" />
                </motion.div>
              )}
              
              {foundTarget && position === 'left' && (
                <motion.div 
                  className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 text-blue-500"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronsRight className="h-6 w-6" />
                </motion.div>
              )}
            </CardContent>
            
            <CardFooter className="pt-0 pb-3">
              <Button 
                size="sm" 
                onClick={onComplete}
                className="w-full text-xs h-8"
              >
                {completionText}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default FloatingGuide;