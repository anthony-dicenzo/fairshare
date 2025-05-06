import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedProfile } from "@/components/profile/simplified-profile";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <SimplifiedLayout headerText="Profile">
      <SimplifiedProfile user={user} onLogout={handleLogout} />
    </SimplifiedLayout>
  );
}