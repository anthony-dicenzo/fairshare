import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Users, Plus } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PaymentForm } from "@/components/expenses/payment-form";
import { GroupDetail } from "@/components/groups/group-detail";
import { BalancesMatrix } from "@/components/groups/balances-matrix";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Link } from "wouter";
import { GroupInvite } from "@/components/groups/group-invite";
import { ActionButtons } from "@/components/dashboard/action-buttons";

export default function GroupPage() {
  // Get the group ID from the URL parameters
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  
  // Safely extract the group ID from params
  const groupId = params && params.id ? parseInt(params.id) : 0;
  
  // Create a safe string representation for the query key
  const groupIdStr = groupId > 0 ? groupId.toString() : "";
  
  // Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch the group data
  const { 
    data: group = null, 
    isLoading: isLoadingGroup,
    error: groupError
  } = useQuery({
    queryKey: ["/api/groups", groupIdStr],
    enabled: groupId > 0
  });

  // If there's an error fetching the group or the user is not in any groups,
  // show a message with a button to create a group instead of redirecting
  const hasError = !!groupError;

  // Fetch group members
  const { 
    data: members = [], 
    isLoading: isLoadingMembers 
  } = useQuery({
    queryKey: ["/api/groups", groupIdStr, "members"],
    enabled: groupId > 0 && !!group
  });

  // Fetch group expenses
  const { 
    data: expenses = [], 
    isLoading: isLoadingExpenses 
  } = useQuery({
    queryKey: ["/api/groups", groupIdStr, "expenses"],
    enabled: groupId > 0 && !!group
  });

  // Fetch group payments
  const { 
    data: payments = [], 
    isLoading: isLoadingPayments 
  } = useQuery({
    queryKey: ["/api/groups", groupIdStr, "payments"],
    enabled: groupId > 0 && !!group
  });

  // Fetch group balances
  const { 
    data: balances = [], 
    isLoading: isLoadingBalances 
  } = useQuery({
    queryKey: ["/api/groups", groupIdStr, "balances"],
    enabled: groupId > 0 && !!group
  });

  // Fetch group activity
  const { 
    data: activity = [], 
    isLoading: isLoadingActivity 
  } = useQuery({
    queryKey: ["/api/groups", groupIdStr, "activity"],
    enabled: groupId > 0 && !!group
  });

  if (isLoadingGroup) {
    return (
      <MainLayout>
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" asChild className="mr-2">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  // Show a friendly error message if there was an error or no group found
  if (hasError || !group) {
    return (
      <MainLayout>
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" asChild className="mr-2">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Group Not Found</h1>
          </div>
          
          <div className="py-12 px-6 bg-white dark:bg-gray-800 rounded-lg border text-center">
            <h2 className="text-xl font-semibold mb-4">
              {hasError ? "Error accessing this group" : "This group doesn't exist or you don't have access"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {hasError 
                ? "There was an error accessing this group. You may not have permission to view it." 
                : "The group you're looking for doesn't exist or you haven't been invited yet."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild>
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Button variant="ghost" size="sm" asChild className="mr-2">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{group?.name || 'Loading group...'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowInviteModal(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Invite Members</span>
              <span className="sm:hidden">Invite</span>
            </Button>
            <ActionButtons 
              onAddExpense={() => setShowExpenseModal(true)}
              onAddPayment={() => setShowPaymentModal(true)}
              compact 
            />
          </div>
        </div>

        <GroupDetail 
          group={group || { id: 0, name: '', createdAt: new Date().toISOString() }}
          members={Array.isArray(members) ? members : []} 
          balances={Array.isArray(balances) ? balances : []} 
        />

        <div className="mt-8">
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-8">
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="mt-0">
              {Array.isArray(expenses) && expenses.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first expense to start tracking
                  </p>
                  <Button onClick={() => setShowExpenseModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm divide-y">
                  {Array.isArray(expenses) && expenses.map((expense: any) => (
                    <div key={expense?.id || 'unknown'} className="p-4 hover:bg-muted transition-colors">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">{expense?.title || 'Untitled Expense'}</h3>
                          <p className="text-sm text-muted-foreground">
                            Added on {expense?.date ? new Date(expense.date).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${expense?.totalAmount ? parseFloat(expense.totalAmount.toString()).toFixed(2) : '0.00'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Paid by {Array.isArray(members) && 
                              members.find((m: any) => m?.userId === expense?.paidBy)?.user?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="balances" className="mt-0">
              <BalancesMatrix 
                balances={Array.isArray(balances) ? balances : []} 
                members={Array.isArray(members) ? members : []} 
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                {!Array.isArray(activity) || activity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activity.map((item: any) => (
                      <div key={item?.id || 'unknown'} className="p-4 hover:bg-muted transition-colors">
                        <div className="flex">
                          <div className="flex-shrink-0 mr-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {item?.actionType === 'add_expense' && <span className="text-primary">💰</span>}
                              {item?.actionType === 'record_payment' && <span className="text-emerald-500">💸</span>}
                              {item?.actionType === 'add_member' && <span className="text-purple-500">👤</span>}
                              {(!item?.actionType || !['add_expense', 'record_payment', 'add_member'].includes(item.actionType)) && 
                                <span>📝</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">{item?.user?.name || 'Unknown user'}</span>
                              {item?.actionType === 'add_expense' && ' added expense '}
                              {item?.actionType === 'record_payment' && ' recorded payment '}
                              {item?.actionType === 'add_member' && ' added a new member '}
                              {(!item?.actionType || !['add_expense', 'record_payment', 'add_member'].includes(item.actionType)) && 
                                ' performed an action '}
                              
                              {item?.expense && <span className="font-medium">"{item.expense?.title || 'Untitled'}"</span>}
                              {item?.payment && <span className="font-medium">
                                ${item.payment?.amount ? parseFloat(item.payment.amount.toString()).toFixed(2) : '0.00'}
                              </span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item?.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <ExpenseForm 
        open={showExpenseModal} 
        onOpenChange={setShowExpenseModal}
        groupId={groupId} 
      />
      <PaymentForm 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal} 
        groupId={groupId}
      />
      <GroupInvite
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        groupId={groupId}
        members={Array.isArray(members) ? members : []}
      />
    </MainLayout>
  );
}
