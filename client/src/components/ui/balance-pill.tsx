import { Skeleton } from "@/components/ui/skeleton";

interface BalancePillProps {
  balance: number | undefined;
  isLoading: boolean;
  className?: string;
}

export function BalancePill({ balance, isLoading, className = "" }: BalancePillProps) {
  // Always show skeleton when loading OR when balance is undefined
  if (isLoading || balance === undefined) {
    return <Skeleton className={`h-6 w-24 bg-gray-200 animate-pulse rounded ${className}`} />;
  }

  const isPositive = balance > 0;
  const isSettled = Math.abs(balance) < 0.01;

  if (isSettled) {
    return (
      <span className={`text-green-600 font-medium ${className}`}>
        All settled up
      </span>
    );
  }

  return (
    <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-rose-500'} ${className}`}>
      {isPositive ? `You're owed $${balance.toFixed(2)}` : `You owe $${Math.abs(balance).toFixed(2)}`}
    </span>
  );
}