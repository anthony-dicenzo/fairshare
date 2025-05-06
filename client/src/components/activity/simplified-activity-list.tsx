import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { 
  ShoppingBag, 
  CreditCard, 
  UserPlus, 
  Users,
  RefreshCw,
  UserMinus,
  Edit
} from "lucide-react";
import { ActivityItemAction } from "@/components/activity/activity-item-action";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function SimplifiedActivityList() {
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const { data: allActivityData, isLoading: isLoadingAll } = useQuery<{ activities: Activity[] }>({
    queryKey: ["/api/activity"],
  });
  
  const allActivity = allActivityData?.activities || [];
  
  // Fetch activity data for expense tab
  const { data: rawExpenseActivityData, isLoading: isLoadingExpense } = useQuery<{ activities: Activity[] }>({
    queryKey: ["/api/activity", "expenses"],
    queryFn: async () => {
      // Use normal fetch instead of apiRequest to avoid type issues
      const response = await fetch("/api/activity?type=expenses", {
        method: "GET",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch expense activity data");
      }
      return response.json();
    },
    enabled: activeTab === "expenses",
  });
  
  const rawExpenseActivity = rawExpenseActivityData?.activities || [];
  
  // Fetch activity data for payment tab
  const { data: rawPaymentActivityData, isLoading: isLoadingPayment } = useQuery<{ activities: Activity[] }>({
    queryKey: ["/api/activity", "payments"],
    queryFn: async () => {
      // Use normal fetch instead of apiRequest to avoid type issues
      const response = await fetch("/api/activity?type=payments", {
        method: "GET",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch payment activity data");
      }
      return response.json();
    },
    enabled: activeTab === "payments",
  });
  
  const rawPaymentActivity = rawPaymentActivityData?.activities || [];

  // Filter activities by type when needed and remove "create_invite" and "create_invite_link" activities
  const filteredAllActivities = allActivity?.filter((a: Activity) => 
    !a.actionType.includes("create_invite")
  ) || [];
  
  // Filter expense activities to remove invite-related actions
  const filteredExpenseActivities = rawExpenseActivity?.filter((a: Activity) => 
    !a.actionType.includes("create_invite")
  ) || [];
  
  // Filter payment activities to remove invite-related actions
  const filteredPaymentActivities = rawPaymentActivity?.filter((a: Activity) => 
    !a.actionType.includes("create_invite")
  ) || [];
  
  // Choose which filtered set to display based on active tab
  const activities = activeTab === "expenses" 
    ? (filteredExpenseActivities.length > 0 ? filteredExpenseActivities : filteredAllActivities.filter(a => a.actionType === "add_expense")) 
    : activeTab === "payments"
      ? (filteredPaymentActivities.length > 0 ? filteredPaymentActivities : filteredAllActivities.filter(a => a.actionType === "record_payment"))
      : filteredAllActivities;
  
  const isLoading = activeTab === "all" 
    ? isLoadingAll 
    : activeTab === "expenses" 
      ? isLoadingExpense 
      : isLoadingPayment;

  if (isLoading) {
    return <ActivityListSkeleton />;
  }

  return (
    <div className="px-4 py-3">
      {/* Activity Tabs */}
      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger value="all" className="text-xs">All Activity</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Activity List */}
      {!activities || activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-fairshare-dark/60 mb-4">No activity found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity: Activity) => (
            <ActivityItemAction 
              key={activity.id}
              actionType={activity.actionType}
              expenseId={activity.expense?.id}
              paymentId={activity.payment?.id}
              groupId={activity.group?.id}
            >
              <div className="bg-white rounded-lg p-3 flex items-start shadow-sm">
                <div className="flex-shrink-0 mr-3">
                  <ActivityIcon type={activity.actionType} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fairshare-dark">
                    <span>{activity.user.name}</span>
                    {" "}
                    {getActionText(activity)}
                    {" "}
                    {activity.group && (
                      <Link 
                        href={`/group/${activity.group.id}`} 
                        className="text-[#32846b] hover:underline"
                        onClick={(e) => e.stopPropagation()} // Prevent clicking the wrapper
                      >
                        {activity.group.name}
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-fairshare-dark/60 mt-1">
                    {activity.expense && `$${parseFloat(activity.expense.totalAmount.toString()).toFixed(2)} · `}
                    {activity.payment && `$${parseFloat(activity.payment.amount.toString()).toFixed(2)} · `}
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </ActivityItemAction>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconClassName = "h-4 w-4";
  
  switch (type) {
    case "add_expense":
      return (
        <div className="w-8 h-8 rounded-full bg-[#32846b]/10 flex items-center justify-center">
          <ShoppingBag className={`${iconClassName} text-[#32846b]`} />
        </div>
      );
    case "record_payment":
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <CreditCard className={`${iconClassName} text-emerald-500`} />
        </div>
      );
    case "payment_reassigned":
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <RefreshCw className={`${iconClassName} text-amber-500`} />
        </div>
      );
    case "add_member":
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <UserPlus className={`${iconClassName} text-purple-500`} />
        </div>
      );
    case "remove_member":
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <UserMinus className={`${iconClassName} text-red-500`} />
        </div>
      );
    case "create_group":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Users className={`${iconClassName} text-blue-500`} />
        </div>
      );
    case "update_group":
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <Edit className={`${iconClassName} text-amber-500`} />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-500">?</span>
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

function ActivityListSkeleton() {
  return (
    <div className="px-4 py-3">
      <div className="mb-4">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex">
              <Skeleton className="flex-shrink-0 w-8 h-8 rounded-full mr-3" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}