import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  CreditCard, 
  UserPlus, 
  Users
} from "lucide-react";

type Activity = {
  id: number;
  actionType: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
  expense?: {
    id: number;
    title: string;
    totalAmount: number;
  };
  payment?: {
    id: number;
    amount: number;
    paidTo: number;
    paidBy: number;
  };
};

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activity"],
  });

  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">No recent activity to show.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activities.map((activity) => (
            <div key={activity.id} className="px-5 py-4 hover:bg-accent transition-colors">
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <ActivityIcon type={activity.actionType} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span>{activity.user.name}</span>
                    {" "}
                    {getActionText(activity)}
                    {" "}
                    {activity.group && (
                      <Link href={`/group/${activity.group.id}`} className="text-primary hover:underline">
                        {activity.group.name}
                      </Link>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.expense && `$${parseFloat(activity.expense.totalAmount.toString()).toFixed(2)} · `}
                    {activity.payment && `$${parseFloat(activity.payment.amount.toString()).toFixed(2)} · `}
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Link href="/activity" className="text-sm text-primary hover:underline">
          View all activity
        </Link>
      </CardFooter>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconClassName = "h-5 w-5";
  
  switch (type) {
    case "add_expense":
      return (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ShoppingBag className={`${iconClassName} text-primary`} />
        </div>
      );
    case "record_payment":
      return (
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
          <CreditCard className={`${iconClassName} text-emerald-500 dark:text-emerald-400`} />
        </div>
      );
    case "add_member":
      return (
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <UserPlus className={`${iconClassName} text-purple-500 dark:text-purple-400`} />
        </div>
      );
    case "create_group":
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Users className={`${iconClassName} text-blue-500 dark:text-blue-400`} />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">?</span>
        </div>
      );
  }
}

function getActionText(activity: Activity) {
  switch (activity.actionType) {
    case "add_expense":
      return (
        <>
          added expense <span className="font-semibold">{activity.expense?.title}</span> in
        </>
      );
    case "record_payment":
      return (
        <>
          {activity.payment?.paidBy === activity.user.id ? "paid" : "received payment"} in
        </>
      );
    case "add_member":
      return "added a new member to";
    case "create_group":
      return "created group";
    default:
      return `performed action "${activity.actionType}" in`;
  }
}

function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex">
                <Skeleton className="flex-shrink-0 w-10 h-10 rounded-full mr-4" />
                <div className="min-w-0 w-full">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Skeleton className="h-4 w-20" />
      </CardFooter>
    </Card>
  );
}
