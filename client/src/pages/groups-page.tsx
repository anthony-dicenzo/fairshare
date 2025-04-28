import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle } from "lucide-react";
import { useLocation } from "wouter";
import { GroupForm } from "@/components/groups/group-form";
import { Group } from "@shared/schema";
import { Input } from "@/components/ui/input";

// Define enhanced group type
type EnhancedGroup = Group & {
  memberCount?: number;
  balance?: number;
}

export default function GroupsPage() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get user data
  const { data: userData } = useQuery<{ id: number; username: string; name: string }>({
    queryKey: ["/api/user"]
  });
  
  // Get user's overall balance with aggressive refresh strategy
  const { data: balances, isLoading: isBalancesLoading, refetch: refetchBalances } = useQuery({
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
  
  // Force refetch balances when component mounts
  useEffect(() => {
    // Immediate refetch
    refetchBalances();
    
    // Also schedule another refetch after a delay
    const timer = setTimeout(() => {
      refetchBalances();
    }, 700); // Slightly longer than groups refetch to ensure latest data
    
    return () => clearTimeout(timer);
  }, []);
  
  // Mobile optimization: Use pagination for groups with a reasonable page size
  const GROUPS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(0);
  
  // Get groups with pagination for better mobile performance
  const { 
    data: groupsData,
    isLoading: isGroupsLoading,
    refetch: refetchGroups
  } = useQuery<{groups: EnhancedGroup[], totalCount: number}>({
    queryKey: ["/api/groups", { limit: GROUPS_PER_PAGE, offset: currentPage * GROUPS_PER_PAGE, includeCounts: true }],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true
  });
  
  // Extract groups and provide a fallback empty array
  const groups = groupsData?.groups || [];
  
  // Force refetch when component mounts
  useEffect(() => {
    // Immediate refetch
    refetchGroups();
    
    // Also schedule another refetch after a delay to ensure all calculation updates are applied
    const timer = setTimeout(() => {
      refetchGroups();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Apply search filter to groups
  const filteredGroups = groups?.filter(group => 
    searchTerm === "" || group.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Calculate total balance correctly
  const totalOwed = balances?.totalOwes || 0;
  
  // Show loading skeleton while data is loading
  const isLoading = isBalancesLoading || isGroupsLoading;
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full mr-3" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-64 ml-12" />
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Calculate net owed amount (what you owe minus what you're owed)
  // This ensures consistency across the app
  const netOwed = Math.max(0, balances?.totalOwes - (balances?.totalOwed || 0));
  
  return (
    <MainLayout>
      <div className="p-3 bg-fairshare-cream">
        {/* Search and Create Group header */}
        <div className="flex items-center justify-between mb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2 h-4 w-4 text-fairshare-dark/60" />
            <Input
              placeholder="Search groups"
              className="pl-9 pr-4 py-1.5 w-full h-9 bg-white border-fairshare-dark/10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setShowGroupModal(true)}
            className="ml-2 whitespace-nowrap text-white bg-fairshare-primary hover:bg-fairshare-primary/90 rounded-xl h-9 text-sm py-0"
          >
            Create group
          </Button>
        </div>
        
        {/* Overall balance section with corrected calculation */}
        <div className="mb-3">
          <div>
            <h2 className="text-lg font-medium text-fairshare-dark">
              Overall, you owe <span className="text-fairshare-primary">${netOwed.toFixed(2)}</span>
            </h2>
          </div>
        </div>
        
        {/* Group listings with optimized rendering */}
        <div className="space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-fairshare-dark/60">No groups found</p>
              <Button 
                onClick={() => setShowGroupModal(true)}
                className="mt-4 bg-fairshare-primary hover:bg-fairshare-primary/90 text-white rounded-xl"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Group
              </Button>
            </div>
          ) : (
            <>
              {filteredGroups.map(group => {
                const isSettled = Math.abs(group.balance || 0) < 0.01;
                
                return (
                  <div 
                    key={group.id}
                    className="cursor-pointer bg-white rounded-md p-2 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/group/${group.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-fairshare-primary/10 flex items-center justify-center mr-2 text-fairshare-primary">
                          <span className="font-medium text-sm">{group.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-fairshare-dark">{group.name}</h3>
                          <p className="text-xs text-fairshare-dark/50">{group.memberCount || 2} members</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {isSettled ? (
                          <span className="text-fairshare-dark/60 text-sm">settled up</span>
                        ) : (group.balance || 0) > 0 ? (
                          <div className="text-right">
                            <p className="font-medium text-emerald-500">
                              +${(group.balance || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-fairshare-dark/70">You Are Owed</p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="font-medium text-rose-500">
                              -${Math.abs(group.balance || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-fairshare-dark/70">You Owe</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
      
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </MainLayout>
  );
}