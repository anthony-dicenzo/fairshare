import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Group } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GroupForm } from "@/components/groups/group-form";
import { Plus } from "lucide-react";

// Define the number of groups to show initially
const INITIAL_GROUPS_COUNT = 10;

export function SimplifiedGroupsView() {
  const [, setLocation] = useLocation();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState(INITIAL_GROUPS_COUNT);
  const [showSkeleton, setShowSkeleton] = useState(true);
  // Search functionality removed as requested
  
  // Get user's overall balance
  const { data: balances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ["/api/balances"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    select: (data: any) => ({
      ...data,
      owedByUsers: data.owedByUsers || [],
      owesToUsers: data.owesToUsers || []
    })
  });
  
  // Fetch groups with faster load
  const { data: groupsData, isLoading } = useQuery<{ 
    groups: (Group & { balance?: number; memberCount?: number })[], 
    totalCount: number 
  }>({
    queryKey: ["/api/groups", { limit: visibleGroups, offset: 0, includeCounts: true }],
    staleTime: 10000, // Keep this data fresh for 10 seconds
  });
  
  // Hide skeleton after data is loaded
  useEffect(() => {
    if (groupsData && !isLoading) {
      // Show content as soon as data is available
      setTimeout(() => setShowSkeleton(false), 100);
    }
  }, [groupsData, isLoading]);
  
  if ((showSkeleton && isLoading) || isBalancesLoading) {
    return <GroupsViewSkeleton />;
  }

  // Get groups and total count
  const groups = groupsData?.groups || [];
  const totalCount = groupsData?.totalCount || 0;
  
  // Calculate total balance
  const totalOwed = balances?.totalOwes || 0;
  
  // All groups are now shown directly since search was removed
  const filteredGroups = groups;
  
  if (!groups || groups.length === 0) {
    return (
      <div className="px-4 py-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-fairshare-dark">
            Overall, you owe <span className="text-rose-500">${totalOwed.toFixed(2)}</span>
          </h2>
          <Button 
            onClick={() => setShowGroupModal(true)}
            className="text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full py-1 px-4 text-sm font-medium transition-colors"
            variant="outline"
            size="sm"
          >
            Create group
          </Button>
        </div>
        
        <div className="text-center py-8">
          <p className="text-fairshare-dark/70 mb-4">You don't have any groups yet</p>
          <Button 
            onClick={() => setShowGroupModal(true)}
            className="bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-full px-6 py-2 font-medium transition-colors"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
        
        <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Overall balance and create button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-fairshare-dark">
          Overall, you owe <span className="text-rose-500">${totalOwed.toFixed(2)}</span>
        </h2>
        <Button 
          onClick={() => setShowGroupModal(true)}
          className="text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full py-1 px-4 text-sm font-medium transition-colors"
          variant="outline"
          size="sm"
        >
          Create group
        </Button>
      </div>
      

      
      {/* Groups list */}
      <div className="space-y-3">
        {filteredGroups.map(group => {
          // Get first letter of group name for avatar
          const initial = group.name.charAt(0).toUpperCase();
          
          // Determine if user owes money in this group
          const balance = group.balance || 0;
          const isSettled = Math.abs(balance) < 0.01;
          const userOwes = balance < 0;
          
          return (
            <div 
              key={group.id}
              className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm"
              onClick={() => setLocation(`/group/${group.id}`)}
            >
              <div className="flex items-center">
                <Avatar className="h-10 w-10 bg-[#E7EDE4] text-fairshare-primary mr-3">
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-fairshare-dark">{group.name}</h3>
                  {!isSettled && userOwes && (
                    <p className="text-sm text-fairshare-dark/70">
                      You owe others
                    </p>
                  )}
                  {!isSettled && !userOwes && (
                    <p className="text-sm text-fairshare-dark/70">
                      Others owe you
                    </p>
                  )}
                  {isSettled && (
                    <p className="text-sm text-green-600">
                      Settled up
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {!isSettled && (
                  <>
                    <p className="text-xs mb-1">
                      {userOwes ? (
                        <span className="text-rose-500">you owe</span>
                      ) : (
                        <span className="text-green-600">you're owed</span>
                      )}
                    </p>
                    <p className={`font-medium ${userOwes ? "text-rose-500" : "text-green-600"}`}>
                      ${Math.abs(balance).toFixed(2)}
                    </p>
                  </>
                )}
                {isSettled && (
                  <p className="text-sm text-green-600 font-medium">
                    $0.00
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </div>
  );
}

function GroupsViewSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      
      {/* Search bar skeleton removed */}
      
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
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
    </div>
  );
}