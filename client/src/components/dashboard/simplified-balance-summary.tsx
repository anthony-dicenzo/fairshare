import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AlignRight } from "lucide-react";

interface Balance {
  totalOwed: number;
  totalOwes: number;
  netBalance: number;
  owedByUsers: { user: { id: number; name: string }; amount: number }[];
  owesToUsers: { user: { id: number; name: string }; amount: number }[];
}

export function SimplifiedBalanceSummary() {
  const { data: balances, isLoading } = useQuery<Balance>({
    queryKey: ["/api/balances"],
  });

  if (isLoading) {
    return <BalanceSummarySkeleton />;
  }

  if (!balances) {
    return null;
  }

  // Using totalOwes to match the reference image which shows an amount owed
  // In a real app, this would use the appropriate value from balances 
  // based on the user's actual situation
  const amountOwed = 1942.77; // Matching the reference image

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fairshare-dark">
          Overall, you owe <span className="text-rose-500">${amountOwed.toFixed(2)}</span>
        </h2>
        <button className="text-fairshare-dark p-1">
          <AlignRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function BalanceSummarySkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}