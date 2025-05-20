import { useState } from "react";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedGroupsView } from "@/components/groups/simplified-groups-view";
import { useAuth } from "@/hooks/use-auth";
import ArrowIndicator from "@/components/onboarding/ArrowIndicator";

export default function GroupsPage() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <SimplifiedLayout headerText="Groups">
      <SimplifiedGroupsView />
      <ArrowIndicator position="left" top="115px" right="160px" color="#ff5500" />
    </SimplifiedLayout>
  );
}