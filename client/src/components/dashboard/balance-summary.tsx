import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Balance {
  totalOwed: number;
  totalOwes: number;
  netBalance: number;
  owedByUsers: { user: { id: number; name: string }; amount: number }[];
  owesToUsers: { user: { id: number; name: string }; amount: number }[];
}

export function BalanceSummary() {
  const { data: balances, isLoading } = useQuery<Balance>({
    queryKey: ["/api/balances"],
  });

  if (isLoading) {
    return <BalanceSummarySkeleton />;
  }

  if (!balances) {
    return null;
  }

  const { totalOwed, totalOwes, netBalance, owedByUsers, owesToUsers } = balances;

  const totalAmountForProgress = totalOwed + totalOwes;
  const percentOwed = totalAmountForProgress === 0 ? 0 : (totalOwed / totalAmountForProgress) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* You Owe Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">You Owe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-rose-500 dark:text-rose-400">
            ${totalOwes.toFixed(2)}
          </p>
          <div className="mt-4 space-y-2">
            {owesToUsers.slice(0, 2).map((item) => (
              <div key={item.user.id} className="flex justify-between items-center">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className="text-xs">
                      {item.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{item.user.name}</span>
                </div>
                <span className="font-medium text-sm text-rose-500 dark:text-rose-400">
                  ${item.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* You Are Owed Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">You Are Owed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-emerald-500 dark:text-emerald-400">
            ${totalOwed.toFixed(2)}
          </p>
          <div className="mt-4 space-y-2">
            {owedByUsers.slice(0, 2).map((item) => (
              <div key={item.user.id} className="flex justify-between items-center">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className="text-xs">
                      {item.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{item.user.name}</span>
                </div>
                <span className="font-medium text-sm text-emerald-500 dark:text-emerald-400">
                  ${item.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${netBalance >= 0 ? "text-primary" : "text-rose-500 dark:text-rose-400"}`}>
            {netBalance >= 0 ? "+" : ""}${netBalance.toFixed(2)}
          </p>
          <div className="mt-4">
            <Progress value={percentOwed} className="h-2.5" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>You owe: ${totalOwes.toFixed(2)}</span>
              <span>You are owed: ${totalOwed.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-4" />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Skeleton className="h-6 w-6 rounded-full mr-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Skeleton className="h-6 w-6 rounded-full mr-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
