import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Group } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Filter,
  X
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Define the number of groups to show initially
const INITIAL_GROUPS_COUNT = 5;

// Define filter types
type FilterType = 'all' | 'you-owe' | 'owed-to-you' | 'settled';

export function SimplifiedGroupsList() {
  const [, setLocation] = useLocation();
  const [visibleGroups, setVisibleGroups] = useState(INITIAL_GROUPS_COUNT);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showSettled, setShowSettled] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  
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

  // Get groups by balance type
  const negativeBalanceGroups = groups.filter(group => (group.balance || 0) < 0);
  const positiveBalanceGroups = groups.filter(group => (group.balance || 0) > 0);

  // Get the settled groups count
  const settledGroupCount = settledGroups.length;
  
  // Filter groups based on selected filter type
  const filterGroups = () => {
    switch (filterType) {
      case 'you-owe':
        return negativeBalanceGroups;
      case 'owed-to-you':
        return positiveBalanceGroups;
      case 'settled':
        return settledGroups;
      case 'all':
      default:
        return filterType === 'all' || !showSettled 
          ? unsettledGroups 
          : [...unsettledGroups, ...settledGroups];
    }
  };
  
  // Get filtered groups
  const filteredGroups = filterGroups();
  
  // Get display name for current filter
  const getFilterDisplayName = () => {
    switch (filterType) {
      case 'you-owe':
        return 'You owe';
      case 'owed-to-you':
        return 'Owed to you';
      case 'settled':
        return 'Settled up';
      case 'all':
      default:
        return 'All groups';
    }
  };
  
  return (
    <div className="space-y-2 px-4">
      {/* Filter Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-fairshare-dark">
          {filterType !== 'all' ? (
            <div className="flex items-center">
              <span>Filtered: {getFilterDisplayName()}</span>
              <button
                onClick={() => setFilterType('all')}
                className="ml-2 bg-gray-100 rounded-full p-1"
              >
                <X className="h-3 w-3 text-fairshare-dark" />
              </button>
            </div>
          ) : (
            <span>Your groups</span>
          )}
        </div>
        
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <button 
              className="text-[#32846b] bg-white rounded-full p-2 shadow-sm flex items-center"
              aria-label="Filter groups"
            >
              <Filter className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-fairshare-dark">Filter groups by</h4>
              <RadioGroup value={filterType} onValueChange={(value) => {
                setFilterType(value as FilterType);
                setFilterOpen(false);
                if (value === 'settled') {
                  setShowSettled(true);
                }
              }}>
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="all" id="filter-all" />
                  <Label htmlFor="filter-all">All groups</Label>
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="you-owe" id="filter-you-owe" />
                  <Label htmlFor="filter-you-owe">You owe</Label>
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="owed-to-you" id="filter-owed-to-you" />
                  <Label htmlFor="filter-owed-to-you">Owed to you</Label>
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="settled" id="filter-settled" />
                  <Label htmlFor="filter-settled">Settled up</Label>
                </div>
              </RadioGroup>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Render filtered groups */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center">
          <p className="text-fairshare-dark/70">No groups match this filter</p>
        </div>
      ) : (
        filteredGroups.map(group => {
          // Get first letter of group name for avatar
          const initial = group.name.charAt(0).toUpperCase();
          const balance = group.balance || 0;
          const isNegativeBalance = balance < 0;
          const balanceAbs = Math.abs(balance);
          const isSettled = Math.abs(balance) < 0.01;
          
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
                  {isSettled ? (
                    <p className="text-sm text-green-600">Settled up</p>
                  ) : (
                    <p className="text-sm text-fairshare-dark/70">
                      {isNegativeBalance ? 'You owe others' : 'Others owe you'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {isSettled ? (
                  <p className="font-medium text-green-600">$0.00</p>
                ) : (
                  <>
                    <p className="text-xs text-rose-500 mb-1">
                      {isNegativeBalance ? 'you owe' : 'you are owed'}
                    </p>
                    <p className={`font-medium ${isNegativeBalance ? 'text-rose-500' : 'text-green-600'}`}>
                      ${balanceAbs.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
      
      {/* Settled groups section - only show when not already filtering */}
      {filterType === 'all' && settledGroupCount > 0 && (
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
      )}
    </div>
  );
}

function GroupsListSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {/* Filter skeleton */}
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Group items skeleton */}
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