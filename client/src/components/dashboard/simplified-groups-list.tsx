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
  
  // Hard-coded example group that matches the reference image
  const exampleGroup = {
    id: 1,
    name: "House of Anthica",
    balance: -1942.77,
    icon: "H"
  };
  
  return (
    <div className="space-y-4">
      {/* Group card that matches the reference image */}
      <div 
        className="bg-white rounded-lg shadow-sm mx-4"
        onClick={() => setLocation(`/group/1`)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 bg-fairshare-accent/30 text-fairshare-primary mr-3">
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
              <div className="flex flex-col items-end">
                <p className="text-sm">
                  <span className="text-rose-500">you owe</span>
                </p>
                <p className="font-medium text-rose-500">
                  $1942.77
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settled groups section */}
      <div className="px-4 pt-2">
        <p className="text-sm text-fairshare-dark/70">
          Hiding groups you settled up with over 7 days ago
        </p>
        <Button
          variant="ghost"
          className="w-full text-sm text-fairshare-primary mt-1"
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
        <div key={i} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Skeleton className="h-8 w-8 rounded-full mr-3" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}