import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedProfile } from "@/components/profile/simplified-profile";
import { ToastTester } from "@/components/test-toast";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <SimplifiedLayout headerText="Profile">
      <SimplifiedProfile user={user} onLogout={handleLogout} />
      <div className="mt-6 px-4">
        <h2 className="text-lg font-medium mb-4 text-fairshare-dark">Test Notifications</h2>
        <ToastTester />
      </div>
    </SimplifiedLayout>
  );
}