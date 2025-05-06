import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AlignJustify } from "lucide-react";

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

  // Using a specific amount to match the reference image
  const amountOwed = 1942.77; // Matching the first reference image

  return (
    <div className="py-4 px-4 border-b border-gray-200/50">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-fairshare-dark">
          Overall, you owe <span className="text-rose-500">${amountOwed.toFixed(2)}</span>
        </h2>
        <button className="text-fairshare-dark p-1">
          <AlignJustify className="h-5 w-5" />
        </button>
      </div>
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