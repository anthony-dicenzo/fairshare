import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { OnboardingProvider } from "@/hooks/use-onboarding";
import { NewUserProvider } from "@/hooks/use-new-user";
import { ProtectedRoute } from "./lib/protected-route";
import { OfflineBanner } from "@/components/offline-banner";
import { PWANotification } from "@/components/pwa-notification";
import { OnboardingManager } from "@/components/onboarding";
import HomePage from "@/pages/home-page";
import GroupPage from "@/pages/group-page";
import GroupsPage from "@/pages/groups-page";
import ActivityPage from "@/pages/activity-page";
import ProfilePage from "@/pages/profile-page";
import AuthPage from "@/pages/auth-page";
import InvitePage from "@/pages/invite-page";
import FirebaseDebugPage from "@/pages/firebase-debug";
import GoogleAuthTestPage from "@/pages/google-auth-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <TooltipProvider>
            <OfflineBanner />
            <PWANotification />
            <Toaster />
            <OnboardingManager />
            <Router />
          </TooltipProvider>
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
