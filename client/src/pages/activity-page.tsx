import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { 
  ShoppingBag, 
  CreditCard, 
  UserPlus, 
  Users,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityItemAction } from "@/components/activity/activity-item-action";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { apiRequest } from "@/lib/queryClient";

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

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const { data: allActivity, isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/activity"],
  });
  
  // Fetch activity data for expense tab
  const { data: rawExpenseActivity, isLoading: isLoadingExpense } = useQuery({
    queryKey: ["/api/activity", "expenses"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/activity?type=expenses");
      return await response.json() as Activity[];
    },
    enabled: activeTab === "expenses",
  });
  
  // Fetch activity data for payment tab
  const { data: rawPaymentActivity, isLoading: isLoadingPayment } = useQuery({
    queryKey: ["/api/activity", "payments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/activity?type=payments");
      return await response.json() as Activity[];
    },
    enabled: activeTab === "payments",
  });

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

  return (
    <MainLayout>
      <MobilePageHeader title="Activity" useBrandColor={false} />
      
      <div className="px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="hidden md:flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Activity</h1>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all">All Activity</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
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
            ) : !activities || activities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No activity found.</p>
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((activity: Activity) => (
                  <div key={activity.id} className="px-5 py-4 hover:bg-accent transition-colors">
                    <ActivityItemAction 
                      actionType={activity.actionType}
                      expenseId={activity.expense?.id}
                      paymentId={activity.payment?.id}
                      groupId={activity.group?.id}
                    >
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
                              <Link 
                                href={`/group/${activity.group.id}`} 
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()} // Prevent clicking the wrapper
                              >
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
                    </ActivityItemAction>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
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
    case "join_via_invite":
      return "joined";
    default:
      return `performed action "${activity.actionType}" in`;
  }
}