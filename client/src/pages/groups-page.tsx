import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ChevronLeft, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { GroupForm } from "@/components/groups/group-form";
import { Group } from "@shared/schema";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";

// Define types for enhanced group data
interface EnhancedGroup extends Group {
  memberCount?: number;
  balance?: number;
}

export default function GroupsPage() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [, setLocation] = useLocation();
  const [enhancedGroups, setEnhancedGroups] = useState<EnhancedGroup[]>([]);
  
  // Fetch groups
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });
  
  // Track if the group member counts have been loaded
  const [membersLoaded, setMembersLoaded] = useState(false);

  // Fetch member counts for each group when groups data is available - only once
  useEffect(() => {
    // Skip if no groups or already loaded
    if (!groups || groups.length === 0 || membersLoaded) return;
    
    // Function to get auth headers for requests
    function getAuthHeaders(): Record<string, string> {
      const headers: Record<string, string> = {};
      try {
        const authData = localStorage.getItem("fairshare_auth_state");
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.userId && parsed.sessionId) {
            headers["X-Session-Backup"] = parsed.sessionId;
            headers["X-User-Id"] = parsed.userId.toString();
          }
        }
      } catch (e) {
        console.error("Error getting auth headers:", e);
      }
      return headers;
    }
    
    // Main function to fetch and enhance groups with member counts - with cache
    async function fetchMemberCounts() {
      try {
        console.log("Fetching member counts for groups");
        
        const authHeaders = getAuthHeaders();
        
        // First try to get members from localStorage cache
        let cachedMemberCounts: Record<number, number> = {};
        try {
          const cached = localStorage.getItem("fairshare_member_counts");
          if (cached) {
            cachedMemberCounts = JSON.parse(cached);
          }
        } catch (e) {
          console.error("Error reading cached member counts:", e);
        }
        
        // Create enhanced groups with member counts
        const groupsWithDetails = await Promise.all(
          (groups || []).map(async (group) => {
            // First check cache
            if (cachedMemberCounts[group.id]) {
              return { ...group, memberCount: cachedMemberCounts[group.id] };
            }
            
            try {
              // Fetch members for this group with auth headers
              const membersResponse = await fetch(`/api/groups/${group.id}/members`, {
                credentials: "include",
                headers: authHeaders
              });
              
              if (!membersResponse.ok) {
                console.warn(`Could not fetch members for group ${group.id}: ${membersResponse.status}`);
                return { ...group, memberCount: 0 };
              }
              
              const members = await membersResponse.json();
              const memberCount = Array.isArray(members) ? members.length : 0;
              
              // Update the cache
              cachedMemberCounts[group.id] = memberCount;
              
              console.log(`Group ${group.name} has ${memberCount} members`);
              
              return {
                ...group,
                memberCount
              };
            } catch (error) {
              console.error(`Error fetching members for group ${group.id}:`, error);
              return { ...group, memberCount: 0 };
            }
          })
        );
        
        // Update localStorage cache
        try {
          localStorage.setItem("fairshare_member_counts", JSON.stringify(cachedMemberCounts));
        } catch (e) {
          console.error("Error caching member counts:", e);
        }
        
        setEnhancedGroups(groupsWithDetails);
        setMembersLoaded(true);
      } catch (error) {
        console.error("Error enhancing groups with member counts:", error);
      }
    }
    
    fetchMemberCounts();
  }, [groups, membersLoaded]);

  // Render loading skeleton cards
  const renderSkeletons = () => {
    return Array(3).fill(0).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <div className="flex items-center">
            <Skeleton className="w-10 h-10 rounded-full mr-3" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    ));
  };

  // Render a group card
  const renderGroupCard = (group: EnhancedGroup) => {
    return (
      <Card 
        key={group.id} 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setLocation(`/group/${group.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <span className="text-sm text-primary font-medium">
                {group.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-lg">{group.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {typeof group.memberCount === 'number' ? `${group.memberCount} member${group.memberCount !== 1 ? 's' : ''}` : '1 member'}
              </p>
            </div>
            
            {group.balance !== undefined && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">Balance</p>
                <p className={`text-lg font-semibold ${
                  group.balance > 0 
                    ? "text-emerald-500 dark:text-emerald-400" 
                    : group.balance < 0
                      ? "text-rose-500 dark:text-rose-400"
                      : ""
                }`}>
                  {group.balance > 0 ? "+" : ""}${Math.abs(group.balance || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.balance > 0 
                    ? "You are owed money" 
                    : group.balance < 0 
                      ? "You owe money" 
                      : "All settled up"}
                </p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/group/${group.id}`);
              }}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render empty state when there are no groups
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-6">You don't have any groups yet. Create one to get started.</p>
        <Button onClick={() => setShowGroupModal(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Your First Group
        </Button>
      </div>
    );
  };

  return (
    <MainLayout>
      <MobilePageHeader title="Your Groups">
        <Button 
          size="sm" 
          onClick={() => setShowGroupModal(true)} 
          className="md:hidden"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          New
        </Button>
      </MobilePageHeader>
      
      <div className="px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" asChild className="mr-2">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Your Groups</h1>
          </div>
          <Button onClick={() => setShowGroupModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderSkeletons()}
          </div>
        ) : !groups || groups.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(enhancedGroups.length > 0 ? enhancedGroups : groups).map(renderGroupCard)}
          </div>
        )}
      </div>
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </MainLayout>
  );
}