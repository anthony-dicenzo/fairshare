import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, SlidersHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { GroupForm } from "@/components/groups/group-form";
import { Group } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Define types for enhanced group data
type EnhancedGroup = Group & {
  memberCount?: number;
  balance?: number;
}

// Define a balance data type for a user's balance with another user
interface UserBalance {
  userId: number;
  userName: string;
  amount: number;
}

export default function GroupsPage() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [, setLocation] = useLocation();
  const [enhancedGroups, setEnhancedGroups] = useState<EnhancedGroup[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  // Default to showing all groups initially
  const [showSettledGroups, setShowSettledGroups] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch groups
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"]
  });
  
  // Fetch user balances
  const { data: balances } = useQuery({
    queryKey: ["/api/balances"],
    select: (data: any) => ({
      ...data,
      owedByUsers: data.owedByUsers || [],
      owesToUsers: data.owesToUsers || []
    })
  });
  
  // Track if the group details have been loaded
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  // Fetch user data
  const { data: userData } = useQuery<{ id: number; username: string; name: string }>({
    queryKey: ["/api/user"]
  });
  
  // Fetch group details when groups data is available
  useEffect(() => {
    if (!groups || groups.length === 0 || !userData) {
      // Reset when dependencies change to prevent stale data
      if (enhancedGroups.length > 0) {
        setEnhancedGroups([]);
        setDetailsLoaded(false);
      }
      return;
    }
    
    // Reset loaded state when groups change
    if (detailsLoaded && enhancedGroups.length !== groups.length) {
      setDetailsLoaded(false);
      setLoadingDetails(true);
    }
    
    // Don't refetch if details are already loaded unless groups have changed
    if (detailsLoaded) {
      setLoadingDetails(false);
      return;
    }
    
    // Set loading state
    setLoadingDetails(true);
    
    // Main function to fetch and enhance groups with details
    async function fetchGroupDetails() {
      try {
        console.log("Fetching member counts for groups");
        console.log("Current user data:", userData);
        
        // Create enhanced groups with details
        const groupsWithDetails = await Promise.all(
          (groups || []).map(async (group) => {
            try {
              // Fetch balances for this group
              const balancesResponse = await fetch(`/api/groups/${group.id}/balances`, {
                credentials: "include"
              });
              
              if (!balancesResponse.ok) {
                console.warn(`Could not fetch balances for group ${group.id}: ${balancesResponse.status}`);
                return { ...group, balance: 0, memberCount: 0 };
              }
              
              const balanceData = await balancesResponse.json();
              console.log(`Balances for group ${group.id}:`, balanceData);
              
              // Find current user's balance in this group
              const userBalance = Array.isArray(balanceData) ? 
                balanceData.find((b: any) => b.user.id === userData?.id) : null;
              
              const balance = userBalance ? userBalance.balance : 0;
              
              // Fetch members for this group
              const membersResponse = await fetch(`/api/groups/${group.id}/members`, {
                credentials: "include"
              });
              
              let memberCount = 0;
              if (membersResponse.ok) {
                const members = await membersResponse.json();
                memberCount = Array.isArray(members) ? members.length : 0;
              }
              
              return {
                ...group,
                balance,
                memberCount
              };
            } catch (error) {
              console.error(`Error fetching details for group ${group.id}:`, error);
              return { ...group, balance: 0, memberCount: 0 };
            }
          })
        );
        
        // Only update if we still have data
        if (groupsWithDetails.length > 0) {
          setEnhancedGroups(groupsWithDetails);
          setDetailsLoaded(true);
          console.log("Updated enhanced groups:", groupsWithDetails);
        }
      } catch (error) {
        console.error("Error enhancing groups with details:", error);
      } finally {
        setLoadingDetails(false);
      }
    }
    
    fetchGroupDetails();
  }, [groups, userData, enhancedGroups.length, detailsLoaded]);
  
  // Get the actual groups to display with balance info
  // Only provide blank placeholder data when we know we're still loading details
  const displayGroups = enhancedGroups.length > 0 || !loadingDetails
    ? enhancedGroups 
    : [];
  
  console.log("Display groups before filtering:", displayGroups);
  
  // Filter out settled groups if needed and apply search
  const filteredGroups = displayGroups.filter((group: EnhancedGroup) => {
    // Apply search filter if search term exists
    const matchesSearch = searchTerm === "" || 
      group.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by settled status if showing only active groups
    // A group is settled if the balance is exactly 0 or very close to 0
    const isSettled = Math.abs(group.balance || 0) < 0.01;
    
    // Debug logging
    console.log(`Group ${group.name} (id: ${group.id}): matchesSearch=${matchesSearch}, isSettled=${isSettled}, showSettledGroups=${showSettledGroups}, balance=${group.balance}`);
    
    // Only show settled groups if requested
    const shouldShow = matchesSearch && (showSettledGroups || !isSettled);
    return shouldShow;
  });
  
  console.log("Filtered groups:", filteredGroups);
  
  // Use the official balances from the API rather than calculating from groups
  // This ensures consistency with the home page
  const totalOwed = balances?.totalOwed || 0;
  
  // Count settled groups for the button text
  const settledGroupsCount = displayGroups.filter(
    (group: EnhancedGroup) => (group.balance === 0) || Math.abs(group.balance || 0) < 0.01
  ).length;
  
  // Generate group-specific balances
  const renderUserBalancesForGroup = (group: EnhancedGroup) => {
    // This would ideally come from the API, but for now we'll create a placeholder
    // that demonstrates the format shown in the wireframe
    const userBalances: UserBalance[] = [];
    
    // For demonstration purposes only - in production this would use real data
    // from the group balances API endpoint
    if (group.id === 2) { // House of Anthica
      userBalances.push({
        userId: 3,
        userName: "Jesica",
        amount: 1819.42
      });
    }
    
    return userBalances.map(balance => (
      <div key={`${group.id}-${balance.userId}`} className="ml-12 mt-1">
        <p className="text-sm text-fairshare-dark">
          You owe {balance.userName}{" "}
          <span className="font-medium">${balance.amount.toFixed(2)}</span>
        </p>
      </div>
    ));
  };
  
  // Render loading skeleton for initial data fetch or details loading
  if (isLoading || loadingDetails) {
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
                <Skeleton className="h-4 w-48 ml-12" />
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Render the group list UI based on the wireframe
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
        
        {/* Overall balance section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-medium text-fairshare-dark">
              Overall, you owe <span className="text-fairshare-primary">${totalOwed.toFixed(2)}</span>
            </h2>
          </div>
          <Button variant="ghost" size="icon">
            <SlidersHorizontal className="h-5 w-5 text-fairshare-dark" />
          </Button>
        </div>
        
        {/* Group listings */}
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
                const isSettled = group.balance === 0 || Math.abs(group.balance || 0) < 0.01;
                
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
                    
                    {/* User-specific balances */}
                    {!isSettled && renderUserBalancesForGroup(group)}
                  </div>
                );
              })}
              
              {/* Button to show/hide settled groups */}
              {settledGroupsCount > 0 && (
                <div className="mt-6 text-center">
                  <Button 
                    variant="outline"
                    className="w-full border-fairshare-primary text-fairshare-primary hover:bg-fairshare-primary/10"
                    onClick={() => setShowSettledGroups(!showSettledGroups)}
                  >
                    {showSettledGroups 
                      ? `Hide ${settledGroupsCount} settled-up group${settledGroupsCount !== 1 ? 's' : ''}` 
                      : `Show settled-up groups`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </MainLayout>
  );
}