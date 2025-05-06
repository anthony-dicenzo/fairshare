import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

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

  const { totalOwes } = balances;

  return (
    <div className="px-4 py-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold text-fairshare-dark mb-1">
          Overall, you owe <span className="text-rose-500">${totalOwes.toFixed(2)}</span>
        </h2>
      </div>
    </div>
  );
}

function BalanceSummarySkeleton() {
  return (
    <div className="px-4 py-2">
      <Skeleton className="h-6 w-2/3 mb-1" />
    </div>
  );
}