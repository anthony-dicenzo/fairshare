import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial } from './tutorial-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const TutorialButton: React.FC = () => {
  const { startTutorial } = useTutorial();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={startTutorial}
            className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
            aria-label="Start Tutorial"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Start Tutorial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TutorialButton;