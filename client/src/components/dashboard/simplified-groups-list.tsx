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
    <div className="space-y-4">
      {/* Unsettled groups */}
      <div className="space-y-2">
        {unsettledGroups.map(group => {
          // Get first letter of group name for avatar
          const initial = group.name.charAt(0).toUpperCase();
          
          // Determine if user owes money in this group
          const balance = group.balance || 0;
          const userOwes = balance < 0;
          
          return (
            <div 
              key={group.id}
              className="bg-white rounded-lg shadow-sm p-4 mx-4"
              onClick={() => setLocation(`/group/${group.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 bg-fairshare-accent text-fairshare-dark mr-3">
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-fairshare-dark">{group.name}</h3>
                    <p className="text-sm text-fairshare-dark/70">
                      You owe Jes
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-medium">
                      {userOwes ? (
                        <span className="text-rose-500">you owe</span>
                      ) : (
                        <span className="text-green-600">you're owed</span>
                      )}
                    </p>
                    <p className={`font-medium ${userOwes ? "text-rose-500" : "text-green-600"}`}>
                      ${Math.abs(balance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Settled groups section */}
      {settledGroups.length > 0 && (
        <div className="px-4 pt-2">
          <p className="text-sm text-fairshare-dark/70">
            Hiding groups you settled up with over 7 days ago
          </p>
          <Button
            variant="ghost"
            className="w-full text-sm text-fairshare-primary mt-1"
            onClick={() => {/* Toggle settled groups visibility */}}
          >
            Show {settledGroups.length} settled-up groups
          </Button>
        </div>
      )}
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