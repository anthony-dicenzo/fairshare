import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { OfflineBanner } from "@/components/offline-banner";
import { PWANotification } from "@/components/pwa-notification";
import { OnboardingProvider } from "@/components/onboarding";
import HomePage from "@/pages/home-page";
import GroupPage from "@/pages/group-page";
import GroupsPage from "@/pages/groups-page";
import ActivityPage from "@/pages/activity-page";
import ProfilePage from "@/pages/profile-page";
import AuthPage from "@/pages/auth-page";
import InvitePage from "@/pages/invite-page";
import FirebaseDebugPage from "@/pages/firebase-debug";
import GoogleAuthTestPage from "@/pages/google-auth-test";
import OnboardingTestPage from "@/pages/onboarding-test";
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
      <ProtectedRoute path="/onboarding-test" component={OnboardingTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrapper for OnboardingProvider that has access to auth
function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  return (
    <OnboardingProvider user={user}>
      {children}
    </OnboardingProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <OnboardingWrapper>
            <OfflineBanner />
            <PWANotification />
            <Toaster />
            <Router />
          </OnboardingWrapper>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
