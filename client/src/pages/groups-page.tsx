import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, SlidersHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { GroupForm } from "@/components/groups/group-form";
import { Group } from "@shared/schema";
import { Input } from "@/components/ui/input";

// Define types for enhanced group data
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
  
  // Get user's overall balance
  const { data: balances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ["/api/balances"],
    select: (data: any) => ({
      ...data,
      owedByUsers: data.owedByUsers || [],
      owesToUsers: data.owesToUsers || []
    })
  });
  
  // Get groups with efficient batched fetching
  const { data: groups, isLoading: isGroupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"]
  });
  
  // Get all group balances in a single query
  const { data: groupsWithBalances, isLoading: isDetailsLoading } = useQuery<EnhancedGroup[]>({
    queryKey: ["/api/groups", "with-balances"],
    enabled: !!groups && !!userData,
    queryFn: async () => {
      if (!groups || !userData) return [];
      
      // Process groups in batches of 2 to reduce concurrent requests
      const result: EnhancedGroup[] = [];
      const batchSize = 2;
      
      for (let i = 0; i < groups.length; i += batchSize) {
        const batch = groups.slice(i, i + batchSize);
        
        // Process each batch in parallel
        const batchPromises = batch.map(async (group) => {
          try {
            // Get balances for this group
            const balanceResponse = await fetch(`/api/groups/${group.id}/balances`, {
              credentials: "include"
            });
            
            if (!balanceResponse.ok) {
              return { ...group, balance: 0, memberCount: 0 };
            }
            
            const balanceData = await balanceResponse.json();
            
            // Find current user's balance
            const userBalance = Array.isArray(balanceData) ? 
              balanceData.find((b: any) => b.user.id === userData.id) : null;
              
            // Get member count in the same request to avoid extra calls
            const memberCount = Array.isArray(balanceData) ? balanceData.length : 0;
            
            return {
              ...group,
              balance: userBalance ? userBalance.balance : 0,
              memberCount
            };
          } catch (error) {
            return { ...group, balance: 0, memberCount: 0 };
          }
        });
        
        // Wait for this batch to complete
        const batchResults = await Promise.all(batchPromises);
        result.push(...batchResults);
      }
      
      return result;
    }
  });
  
  // Apply search filter to groups
  const filteredGroups = groupsWithBalances?.filter(group => 
    searchTerm === "" || group.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Calculate total balance correctly
  const totalOwed = balances?.totalOwes || 0;
  
  // Show loading skeleton while data is loading
  const isLoading = isBalancesLoading || isGroupsLoading || isDetailsLoading;
  
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
      <div className="p-4 bg-fairshare-cream">
        {/* Search and Create Group header */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-fairshare-dark/60" />
            <Input
              placeholder="Search groups"
              className="pl-9 pr-4 py-2 w-full bg-white border-fairshare-dark/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setShowGroupModal(true)}
            className="ml-2 whitespace-nowrap text-fairshare-primary border-fairshare-primary bg-transparent hover:bg-fairshare-primary/10"
            variant="outline"
          >
            Create group
          </Button>
        </div>
        
        {/* Overall balance section with corrected calculation */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-medium text-fairshare-dark">
              Overall, you owe <span className="text-fairshare-primary">${netOwed.toFixed(2)}</span>
            </h2>
          </div>
          <Button variant="ghost" size="icon">
            <SlidersHorizontal className="h-5 w-5 text-fairshare-dark" />
          </Button>
        </div>
        
        {/* Group listings with optimized rendering */}
        <div className="space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-fairshare-dark/60">No groups found</p>
              <Button 
                onClick={() => setShowGroupModal(true)}
                className="mt-4"
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
                    className="cursor-pointer"
                    onClick={() => setLocation(`/group/${group.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-md bg-fairshare-primary/10 flex items-center justify-center mr-3 text-fairshare-primary">
                          <span className="font-medium">{group.name.charAt(0)}</span>
                        </div>
                        <h3 className="font-medium text-fairshare-dark">{group.name}</h3>
                      </div>
                      
                      <div className="text-right">
                        {isSettled ? (
                          <span className="text-fairshare-dark/60 text-sm">settled up</span>
                        ) : (group.balance || 0) > 0 ? (
                          <div className="text-right">
                            <p className="text-sm text-fairshare-dark/70">you are owed</p>
                            <p className="font-medium text-emerald-500">
                              ${(group.balance || 0).toFixed(2)}
                            </p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-sm text-fairshare-dark/70">you owe</p>
                            <p className="font-medium text-fairshare-primary">
                              ${Math.abs(group.balance || 0).toFixed(2)}
                            </p>
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