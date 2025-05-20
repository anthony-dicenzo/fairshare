import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import InteractiveOnboarding from "@/components/onboarding/InteractiveOnboarding";

export default function OnboardingTestPage() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (!user) return null;

  // Handlers for the onboarding experience
  const startOnboarding = () => {
    setShowOnboarding(true);
    // Reset onboarding in local storage
    localStorage.removeItem('fairshare_onboarding_complete');
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
  };

  return (
    <SimplifiedLayout headerText="Onboarding Test">
      <div className="container max-w-xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Interactive Onboarding Tester</CardTitle>
            <CardDescription>
              Use this tool to test the interactive onboarding experience
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <p className="mb-4">
              This page allows you to test the new interactive onboarding tutorial.
              Click the button below to start the onboarding experience.
            </p>
            
            <p className="mb-6">
              The tutorial features:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Interactive tooltips that highlight actual UI elements</li>
                <li>Ability to interact with the app while being guided</li>
                <li>Celebration animations when completing steps</li>
                <li>Step-by-step guidance through key features</li>
              </ul>
            </p>
          </CardContent>
          
          <CardFooter>
            <Button onClick={startOnboarding} className="w-full">
              Start Interactive Tutorial
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Show interactive onboarding when requested */}
      {user && showOnboarding && (
        <InteractiveOnboarding 
          user={user} 
          onComplete={completeOnboarding} 
          onSkip={skipOnboarding} 
        />
      )}
    </SimplifiedLayout>
  );
}