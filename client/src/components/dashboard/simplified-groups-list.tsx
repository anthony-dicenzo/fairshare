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

  // Get the settled groups count
  const settledGroupCount = settledGroups.length;
  
  return (
    <div className="space-y-2 px-4">
      {/* Render actual unsettled groups */}
      {unsettledGroups.map(group => {
        // Get first letter of group name for avatar
        const initial = group.name.charAt(0).toUpperCase();
        const balance = group.balance || 0;
        const isNegativeBalance = balance < 0;
        const balanceAbs = Math.abs(balance);
          
        return (
          <div 
            key={group.id}
            className="bg-white rounded-lg p-3 flex items-center justify-between"
            onClick={() => setLocation(`/group/${group.id}`)}
          >
            <div className="flex items-center">
              <Avatar className="h-10 w-10 bg-[#E7EDE4] text-[#32846b] mr-3">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-fairshare-dark">{group.name}</h3>
                <p className="text-sm text-fairshare-dark/70">
                  {isNegativeBalance ? 'You owe others' : 'Others owe you'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-rose-500 mb-1">{isNegativeBalance ? 'you owe' : 'you are owed'}</p>
              <p className={`font-medium ${isNegativeBalance ? 'text-rose-500' : 'text-green-600'}`}>
                ${balanceAbs.toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
      
      {/* Show settled groups if available */}
      {showSettled && settledGroups.map(group => {
        const initial = group.name.charAt(0).toUpperCase();
        
        return (
          <div 
            key={group.id}
            className="bg-white rounded-lg p-3 flex items-center justify-between"
            onClick={() => setLocation(`/group/${group.id}`)}
          >
            <div className="flex items-center">
              <Avatar className="h-10 w-10 bg-[#E7EDE4] text-[#32846b] mr-3">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-fairshare-dark">{group.name}</h3>
                <p className="text-sm text-green-600">Settled up</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-green-600">$0.00</p>
            </div>
          </div>
        );
      })}
      
      {/* Settled groups section */}
      <div className="mt-4 pt-2 text-center">
        <p className="text-sm text-fairshare-dark/70">
          Hiding groups you settled up with over 7 days ago
        </p>
        <button
          className="w-11/12 mx-auto text-sm text-[#32846b] bg-white border border-gray-100 mt-2 rounded-full py-2 px-4 block shadow-sm"
          onClick={() => setShowSettled(!showSettled)}
        >
          Show {settledGroupCount} settled-up groups
        </button>
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