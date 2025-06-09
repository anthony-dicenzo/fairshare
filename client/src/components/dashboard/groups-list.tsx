import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import { useLocation } from "wouter";
import { PlusCircle, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { GroupForm } from "../groups/group-form";
import { queryClient } from "@/lib/queryClient";
import { BalancePill } from "@/components/ui/balance-pill";
import { useAuth } from "@/hooks/use-auth";

// Define the number of groups to show initially (above the fold)
const INITIAL_GROUPS_COUNT = 3;
const ADDITIONAL_GROUPS_COUNT = 5;

// Ultras-fast loading without balance data
const ULTRAFAST_LOADING = true;

export function GroupsList() {
  const { user } = useAuth();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [, setLocation] = useLocation();
  const [visibleGroups, setVisibleGroups] = useState(INITIAL_GROUPS_COUNT);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Step 1: Fetch minimal group data with no balances for immediate display
  const { data: minimalData, isLoading: isMinimalLoading, isFetching: isMinimalFetching } = useQuery<{ 
    groups: (Group & { memberCount?: number })[], 
    totalCount: number 
  }>({
    queryKey: ["/api/groups", { limit: INITIAL_GROUPS_COUNT, offset: 0 }],
    staleTime: 30000, // Keep this data fresh for 30 seconds
  });
  
  // Step 2: In parallel, fetch the initial groups with partial data
  const { data: initialData, isLoading: isInitialLoading } = useQuery<{ 
    groups: (Group & { balance?: number; memberCount?: number })[], 
    totalCount: number 
  }>({
    queryKey: ["/api/groups", { limit: INITIAL_GROUPS_COUNT, offset: 0, aboveTheFold: true }],
    staleTime: 10000, // Keep this data fresh for 10 seconds
  });

  // Step 3: Fetch all loaded groups based on the visibleGroups count (deferred)
  const { data: fullData, isLoading } = useQuery<{ 
    groups: (Group & { balance?: number; memberCount?: number })[], 
    totalCount: number 
  }>({
    queryKey: ["/api/groups", { limit: visibleGroups, offset: 0 }],
    // Skip this query if we're just showing the initial groups or if initial loading is still in progress
    enabled: visibleGroups > INITIAL_GROUPS_COUNT && !isInitialLoading,
    staleTime: 5000, // Keep this data fresh for 5 seconds
  });

  // Unified cache seeding function
  const seedBalanceCache = (groups: any[], source: string) => {
    if (!groups || !user?.id) return;
    
    console.log('CACHE SEED:', source, 'checking', groups.length, 'groups for user', user.id);
    groups.forEach(group => {
      if (group.balance !== undefined) {
        const balanceArray = [{ 
          userId: user.id,
          balance: group.balance,
          user: { id: user.id, name: user.name || "User" }
        }];
        console.log('CACHE SEED:', source, 'setting cache for group', group.id, 'balance:', group.balance);
        queryClient.setQueryData(['balance', group.id], balanceArray);
      } else {
        console.log('CACHE SEED:', source, 'group', group.id, 'has no balance data');
      }
    });
  };

  // Seed cache for initial data (above-the-fold)
  useEffect(() => {
    seedBalanceCache(initialData?.groups || [], 'initialData');
  }, [initialData, user?.id]);

  // Seed cache for full data when it loads  
  useEffect(() => {
    seedBalanceCache(fullData?.groups || [], 'fullData');
  }, [fullData, user?.id]);
  
  // Get the total count from either query
  const totalCount = initialData?.totalCount || minimalData?.totalCount || 0;
  
  // Hide skeleton after initial data is loaded
  useEffect(() => {
    if (minimalData && !isMinimalFetching) {
      // Critical: Show content immediately even if balances are still loading
      setTimeout(() => setShowSkeleton(false), 100); 
    }
  }, [minimalData, isMinimalFetching]);
  
  // Choose the best available data based on what's loaded
  // Order of preference: full data > initial data > minimal data
  const groups = (() => {
    // If we requested more than the initial count and have that data, use it
    if (visibleGroups > INITIAL_GROUPS_COUNT && fullData?.groups) {
      return fullData.groups;
    }
    // Otherwise, if we have the initial data with balances, use that
    if (initialData?.groups) {
      return initialData.groups;
    }
    // As a last resort, use the minimal data (without balances) for fastest display
    return minimalData?.groups || [];
  })();
  
  // This is critical - use minimal data immediately even if it doesn't have balances
  // Don't show skeleton if we have any data to display
  if (showSkeleton && isMinimalLoading && !minimalData) {
    return <GroupsListSkeleton />;
  }

  if ((!isMinimalLoading && !minimalData?.groups?.length) || (!groups || groups.length === 0)) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
          <CardTitle className="text-base sm:text-lg">Your Groups</CardTitle>
          <Button
            onClick={() => setShowGroupModal(true)}
            variant="ghost"
            className="text-xs sm:text-sm text-primary h-8 px-2"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New
          </Button>
        </CardHeader>
        <CardContent className="text-center py-4 sm:py-6 px-4">
          <p className="text-sm text-muted-foreground">
            You don't have any groups yet. Create one to get started.
          </p>
          <Button
            onClick={() => setShowGroupModal(true)}
            className="mt-4 text-xs sm:text-sm px-3 py-2"
          >
            <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
            Create Group
          </Button>
        </CardContent>
        <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
          <CardTitle className="text-base sm:text-lg">Your Groups</CardTitle>
          <Button
            onClick={() => setShowGroupModal(true)}
            variant="ghost"
            className="text-xs sm:text-sm text-primary h-8 px-2"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {groups.map((group) => (
              <div 
                key={group.id} 
                className="hover:bg-accent transition-colors cursor-pointer" 
                onClick={() => {
                  // Transform balance to array format for unified state passing
                  const preloadArray = ('balance' in group && (group as any).balance !== undefined && user?.id) 
                    ? [{ 
                        userId: user.id,
                        balance: (group as any).balance,
                        user: { id: user.id, name: user.name || "User" }
                      }] 
                    : undefined;
                  
                  setLocation(`/group/${group.id}`, { 
                    replace: false,
                    state: { preload: preloadArray }
                  });
                }}
                onMouseEnter={() => {
                  // Prefetch group balance on hover for instant loading
                  queryClient.prefetchQuery({
                    queryKey: [`/api/groups/${group.id}/balances`],
                    staleTime: 30000
                  });
                }}
              >
                <div className="px-3 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                        <span className="text-xs sm:text-sm text-primary font-medium">
                          {group.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{group.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {group.memberCount || "..."} members
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <BalancePill 
                        balance={'balance' in group ? (group as any).balance : undefined}
                        isLoading={!('balance' in group)}
                        className="text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show load more button if there are more groups to load */}
            {totalCount > visibleGroups && (
              <div className="px-3 sm:px-5 py-2 sm:py-3 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs sm:text-sm text-muted-foreground flex items-center"
                  onClick={() => setVisibleGroups(prev => Math.min(prev + ADDITIONAL_GROUPS_COUNT, totalCount))}
                >
                  Load more groups
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </>
  );
}

function GroupsListSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-3 flex-shrink-0" />
                  <div>
                    <Skeleton className="h-4 w-20 sm:w-24 mb-2" />
                    <Skeleton className="h-3 w-14 sm:w-16" />
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <Skeleton className="h-4 w-12 sm:w-16 mb-2" />
                  <Skeleton className="h-3 w-10 sm:w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
