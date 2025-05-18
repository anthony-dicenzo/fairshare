import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { OfflineBanner } from "@/components/offline-banner";
import { PWANotification } from "@/components/pwa-notification";
import React, { Suspense, lazy, useEffect } from "react";
// Import tutorial components
import { TutorialProvider } from "@/components/tutorial/tutorial-context";
import TutorialOverlay from "@/components/tutorial/tutorial-overlay";
// Import tutorial CSS
import "@/components/tutorial/tutorial.css";

const HomePage = lazy(() => import("@/pages/home-page"));
const GroupPage = lazy(() => import("@/pages/group-page"));
const GroupsPage = lazy(() => import("@/pages/groups-page"));
const ActivityPage = lazy(() => import("@/pages/activity-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const InvitePage = lazy(() => import("@/pages/invite-page"));
const FirebaseDebugPage = lazy(() => import("@/pages/firebase-debug"));
const GoogleAuthTestPage = lazy(() => import("@/pages/google-auth-test"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <Switch>
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/group/:id" component={GroupPage} />
        <ProtectedRoute path="/groups" component={GroupsPage} />
        <ProtectedRoute path="/activity" component={ActivityPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/invite/:inviteCode" component={InvitePage} />
        <Route path="/firebase-debug" component={FirebaseDebugPage} />
        <Route path="/google-auth-test" component={GoogleAuthTestPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Component that adds tutorial data attributes to DOM elements
const TutorialTargets = () => {
  useEffect(() => {
    // Add data attributes for tutorial targeting
    const addButton = document.querySelector('.mobile-nav button[aria-label="Add"]');
    if (addButton) {
      addButton.setAttribute('data-tutorial', 'create-group-button');
    }
    
    // We'll add more data attributes when specific pages load
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <TutorialProvider>
            <OfflineBanner />
            <PWANotification />
            <TutorialTargets />
            <TutorialOverlay />
            <Toaster />
            <Router />
          </TutorialProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
