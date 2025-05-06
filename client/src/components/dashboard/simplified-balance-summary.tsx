import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, X } from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Define filter types
type FilterType = 'all' | 'you-owe' | 'owed-to-you' | 'settled';

interface Balance {
  totalOwed: number;
  totalOwes: number;
  netBalance: number;
  owedByUsers: { user: { id: number; name: string }; amount: number }[];
  owesToUsers: { user: { id: number; name: string }; amount: number }[];
}

export function SimplifiedBalanceSummary({ 
  filterType = 'all', 
  setFilterType,
  filterOpen = false,
  setFilterOpen
}: { 
  filterType?: FilterType; 
  setFilterType: (type: FilterType) => void;
  filterOpen?: boolean;
  setFilterOpen: (open: boolean) => void;
}) {
  const { data: balances, isLoading } = useQuery<Balance>({
    queryKey: ["/api/balances"],
  });

  if (isLoading) {
    return <BalanceSummarySkeleton />;
  }

  if (!balances) {
    return null;
  }

  // Use the real balance data from the API
  const { totalOwes } = balances;

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
    <div className="py-4 px-4 border-b border-gray-200/50">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-fairshare-dark">
          Overall, you owe <span className="text-rose-500">${totalOwes.toFixed(2)}</span>
        </h2>
        
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <button 
              className="text-[#32846b] rounded-full p-2 flex items-center"
              aria-label="Filter groups"
            >
              <Filter className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-fairshare-dark">Filter groups by</h4>
              <RadioGroup value={filterType} onValueChange={(value) => {
                setFilterType(value as FilterType);
                setFilterOpen(false);
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
      
      {filterType !== 'all' && (
        <div className="mt-2 flex items-center">
          <div className="text-sm text-[#32846b] bg-[#32846b]/10 px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">Filtered: {getFilterDisplayName()}</span>
            <button 
              onClick={() => setFilterType('all')}
              className="ml-1 rounded-full"
            >
              <X className="h-3 w-3 text-[#32846b]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceSummarySkeleton() {
  return (
    <div className="py-4 px-4 border-b border-gray-200/50">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}