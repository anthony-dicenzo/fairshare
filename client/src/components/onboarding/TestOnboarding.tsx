import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import InteractiveGuide from './InteractiveGuide';
import AnimatedGuidedTour from './AnimatedGuidedTour';
import { toast } from '@/hooks/use-toast';

export function TestOnboarding() {
  const [showInteractive, setShowInteractive] = useState(false);
  const [showAnimated, setShowAnimated] = useState(false);

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
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowInteractive(true)}
          >
            Try Interactive Guide
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

      <div className="text-sm text-muted-foreground">
        <h3 className="font-medium mb-2">How these differ:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Interactive Guide:</strong> Allows you to interact with the app while following tooltips that guide you through each step.</li>
          <li><strong>Full-Screen Guided Tour:</strong> A more traditional step-by-step tutorial that explains features before you use them.</li>
        </ul>
      </div>

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