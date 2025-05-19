import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import InteractiveGuide from './InteractiveGuide';
import AnimatedGuidedTour from './AnimatedGuidedTour';
import SimpleGuide from './SimpleGuide';
import ReliableGuide from './ReliableGuide';
import CombinedOnboarding from './CombinedOnboarding';
import DemoButtons from './DemoButtons';
import { toast } from '@/hooks/use-toast';

export function TestOnboarding() {
  const [showInteractive, setShowInteractive] = useState(false);
  const [showAnimated, setShowAnimated] = useState(false);
  const [showSimple, setShowSimple] = useState(false);
  const [showReliable, setShowReliable] = useState(false);
  const [showCombined, setShowCombined] = useState(false);

  const handleCompleteInteractive = () => {
    setShowInteractive(false);
    toast({
      title: "Interactive Onboarding Completed",
      description: "You've finished the interactive onboarding experience.",
    });
  };

  const handleCompleteAnimated = () => {
    setShowAnimated(false);
    toast({
      title: "Animated Onboarding Completed",
      description: "You've finished the guided tour experience.",
    });
  };
  
  const handleCompleteSimple = () => {
    setShowSimple(false);
    toast({
      title: "Simple Guide Completed",
      description: "You've completed the simple guided tour.",
    });
  };

  const handleCompleteReliable = () => {
    setShowReliable(false);
    toast({
      title: "Reliable Guide Completed",
      description: "You've completed the reliable interactive guide.",
      variant: "success",
    });
  };

  const handleCompleteCombined = () => {
    setShowCombined(false);
    toast({
      title: "Complete Onboarding Experience Finished",
      description: "You've completed the full onboarding experience with animation and interactive guide.",
      variant: "success",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Test Onboarding Experiences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Choose an onboarding experience to test. Both experiences will guide you through creating a group, 
            adding an expense, and inviting friends.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
            onClick={() => setShowCombined(true)}
          >
            Try Complete Onboarding Experience ✨ RECOMMENDED
          </Button>
          <div className="w-full border-t my-1 border-gray-200 dark:border-gray-700"></div>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowReliable(true)}
          >
            Try Reliable Interactive Guide
          </Button>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => setShowSimple(true)}
          >
            Try Simple Guide
          </Button>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowInteractive(true)}
          >
            Try Original Interactive Guide
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowAnimated(true)}
          >
            Try Full-Screen Guided Tour
          </Button>
        </CardFooter>
      </Card>
      
      {/* Demo buttons for testing the interactive guide */}
      <DemoButtons />

      <div className="text-sm text-muted-foreground">
        <h3 className="font-medium mb-2">How these differ:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Simple Guide (Recommended):</strong> A step-by-step guide with clear instructions that doesn't rely on finding UI elements.</li>
          <li><strong>Interactive Guide:</strong> Allows you to interact with the app while following tooltips that guide you through each step.</li>
          <li><strong>Full-Screen Guided Tour:</strong> A more traditional step-by-step tutorial that explains features before you use them.</li>
        </ul>
      </div>

      {showCombined && (
        <CombinedOnboarding
          onComplete={handleCompleteCombined}
        />
      )}
      
      {showReliable && (
        <ReliableGuide 
          onComplete={handleCompleteReliable} 
          onSkip={() => setShowReliable(false)} 
        />
      )}

      {showSimple && (
        <SimpleGuide 
          onComplete={handleCompleteSimple} 
          onSkip={() => setShowSimple(false)} 
        />
      )}

      {showInteractive && (
        <InteractiveGuide onComplete={handleCompleteInteractive} />
      )}

      {showAnimated && (
        <AnimatedGuidedTour onComplete={handleCompleteAnimated} />
      )}
    </div>
  );
}

export default TestOnboarding;