import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedActivityList } from "@/components/activity/simplified-activity-list";

export default function ActivityPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <SimplifiedLayout headerText="Activity">
      <SimplifiedActivityList />
    </SimplifiedLayout>
  );
}