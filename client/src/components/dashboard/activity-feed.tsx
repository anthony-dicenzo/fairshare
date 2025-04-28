import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  CreditCard, 
  UserPlus, 
  Users,
  Edit,
  RefreshCw,
  UserMinus
} from "lucide-react";
import { ActivityItemAction } from "@/components/activity/activity-item-action";

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

  // Filter out all "create_invite" and "create_invite_link" activities
  const filteredActivities = activities?.filter(a => 
    !a.actionType.includes("create_invite")
  ) || [];
  
  if (!filteredActivities.length) {
    return (
      <Card className="w-full">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4 sm:py-6 px-4">
          <p className="text-sm text-muted-foreground">No recent activity to show.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="px-3 sm:px-5 py-3 sm:py-4 hover:bg-accent transition-colors">
              <ActivityItemAction 
                actionType={activity.actionType}
                expenseId={activity.expense?.id}
                paymentId={activity.payment?.id}
                groupId={activity.group?.id}
              >
                <div className="flex">
                  <div className="flex-shrink-0 mr-2 sm:mr-4">
                    <ActivityIcon type={activity.actionType} />
                  </div>
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      <span>{activity.user.name}</span>
                      {" "}
                      {getActionText(activity)}
                      {" "}
                      {activity.group && (
                        <Link 
                          href={`/group/${activity.group.id}`} 
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()} // Prevent clicking the wrapper
                        >
                          {activity.group.name}
                        </Link>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {activity.expense && `$${parseFloat(activity.expense.totalAmount.toString()).toFixed(2)} · `}
                      {activity.payment && `$${parseFloat(activity.payment.amount.toString()).toFixed(2)} · `}
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </ActivityItemAction>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t px-4 py-3">
        <Link href="/activity" className="text-xs sm:text-sm text-primary hover:underline">
          View all activity
        </Link>
      </CardFooter>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconClassName = "h-4 w-4 sm:h-5 sm:w-5";
  
  switch (type) {
    case "add_expense":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ShoppingBag className={`${iconClassName} text-primary`} />
        </div>
      );
    case "record_payment":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
          <CreditCard className={`${iconClassName} text-emerald-500 dark:text-emerald-400`} />
        </div>
      );
    case "payment_reassigned":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
          <RefreshCw className={`${iconClassName} text-amber-500 dark:text-amber-400`} />
        </div>
      );
    case "add_member":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <UserPlus className={`${iconClassName} text-purple-500 dark:text-purple-400`} />
        </div>
      );
    case "remove_member":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <UserMinus className={`${iconClassName} text-red-500 dark:text-red-400`} />
        </div>
      );
    case "create_group":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Users className={`${iconClassName} text-blue-500 dark:text-blue-400`} />
        </div>
      );
    case "update_group":
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
          <Edit className={`${iconClassName} text-amber-500 dark:text-amber-400`} />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
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
    case "payment_reassigned":
      return (
        <>
          reassigned a payment in
        </>
      );
    case "add_member":
      return "added a new member to";
    case "remove_member":
      return "removed a member from";
    case "create_group":
      return "created group";
    case "join_via_invite":
      return "joined";
    case "update_group":
      return "updated group";
    default:
      return `performed action "${activity.actionType}" in`;
  }
}

function ActivityFeedSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="px-4 pt-4 pb-2">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex">
                <Skeleton className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-4" />
                <div className="min-w-0 w-full">
                  <Skeleton className="h-3 sm:h-4 w-full mb-2" />
                  <Skeleton className="h-2.5 sm:h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t px-4 py-3">
        <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
      </CardFooter>
    </Card>
  );
}
