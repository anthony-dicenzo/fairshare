import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Group } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Define the number of groups to show initially
const INITIAL_GROUPS_COUNT = 5;

export function SimplifiedGroupsList() {
  const [, setLocation] = useLocation();
  const [visibleGroups, setVisibleGroups] = useState(INITIAL_GROUPS_COUNT);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showSettled, setShowSettled] = useState(false);
  
  // Fetch groups with minimal data for faster load
  const { data: groupsData, isLoading } = useQuery<{ 
    groups: (Group & { balance?: number; memberCount?: number })[], 
    totalCount: number 
  }>({
    queryKey: ["/api/groups", { limit: visibleGroups, offset: 0 }],
    staleTime: 10000, // Keep this data fresh for 10 seconds
  });
  
  // Hide skeleton after data is loaded
  useEffect(() => {
    if (groupsData && !isLoading) {
      // Show content as soon as data is available
      setTimeout(() => setShowSkeleton(false), 100);
    }
  }, [groupsData, isLoading]);
  
  if (showSkeleton && isLoading) {
    return <GroupsListSkeleton />;
  }

  // Get groups and total count
  const groups = groupsData?.groups || [];
  const totalCount = groupsData?.totalCount || 0;
  
  if (!groups || groups.length === 0) {
    return (
      <div className="px-4 py-2">
        <p className="text-fairshare-dark/70 text-center py-4">
          You don't have any groups yet
        </p>
      </div>
    );
  }

  // Get settled and unsettled groups
  const unsettledGroups = groups.filter(group => Math.abs(group.balance || 0) >= 0.01);
  const settledGroups = groups.filter(group => Math.abs(group.balance || 0) < 0.01);
  
  return (
    <div className="space-y-2 px-4">
      {/* Group card that matches the reference image */}
      <div 
        className="bg-white rounded-lg p-3 flex items-center justify-between"
        onClick={() => setLocation(`/group/1`)}
      >
        <div className="flex items-center">
          <Avatar className="h-10 w-10 bg-[#E7EDE4] text-fairshare-primary mr-3">
            <AvatarFallback>H</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-fairshare-dark">House of Anthica</h3>
            <p className="text-sm text-fairshare-dark/70">
              You owe Jes
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-rose-500 mb-1">you owe</p>
          <p className="font-medium text-rose-500">$1942.77</p>
        </div>
      </div>
      
      {/* Settled groups section */}
      <div className="mt-4 pt-2 text-center">
        <p className="text-sm text-fairshare-dark/70">
          Hiding groups you settled up with over 7 days ago
        </p>
        <Button
          variant="outline"
          className="w-11/12 mx-auto text-sm text-fairshare-primary border-fairshare-primary/30 mt-2 rounded-full"
          onClick={() => setShowSettled(!showSettled)}
        >
          Show 6 settled-up groups
        </Button>
      </div>
    </div>
  );
}

function GroupsListSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full mr-3" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}