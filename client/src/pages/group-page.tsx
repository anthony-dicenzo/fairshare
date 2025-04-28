import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Users, Plus, PlusCircle, CreditCard, RefreshCw, Settings } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { MinimalExpenseEdit } from "@/components/expenses/minimal-expense-edit";
import { PaymentForm } from "@/components/expenses/payment-form";
import { GroupDetail } from "@/components/groups/group-detail";
import { GroupSettings } from "@/components/groups/group-settings";
import { BalancesMatrix } from "@/components/groups/balances-matrix";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Link } from "wouter";
import { GroupInvite } from "@/components/groups/group-invite";
import { ActionButtons } from "@/components/dashboard/action-buttons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function GroupPage() {
  // Get the group ID from the URL parameters
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Safely extract the group ID from params
  const groupId = params && params.id ? parseInt(params.id) : 0;
  
  // Create a safe string representation for the query key
  const groupIdStr = groupId > 0 ? groupId.toString() : "";
  
  // Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExpenseEditModal, setShowExpenseEditModal] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
  
  // Use refs to prevent duplicate db operations
  const addedMembersRef = useRef(false);
  
  // User authentication data
  const { user } = useAuth();

  // Define the Group type with expected fields to help TypeScript
  interface GroupData {
    id: number;
    name: string;
    createdAt?: string;
    createdBy?: number;
  }
  
  // Fetch the group data with aggressive refresh strategy
  const { 
    data: group = null, 
    isLoading: isLoadingGroup,
    error: groupError,
    refetch: refetchGroup
  } = useQuery<GroupData>({
    queryKey: [`/api/groups/${groupIdStr}`], // Fixed query key pattern to match the API
    enabled: groupId > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true
  });

  // If there's an error fetching the group or the user is not in any groups,
  // show a message with a button to create a group instead of redirecting
  const hasError = !!groupError;

  // Create our own callback for updating the member count cache
  const updateMemberCountCache = (memberData: any[]) => {
    if (Array.isArray(memberData) && memberData.length > 0) {
      try {
        // Update the local cache of member counts
        const cached = localStorage.getItem("fairshare_member_counts");
        let cachedMemberCounts: Record<number, number> = {};
        if (cached) {
          cachedMemberCounts = JSON.parse(cached);
        }
        
        // Update the count for this group
        cachedMemberCounts[groupId] = memberData.length;
        
        // Save back to localStorage
        localStorage.setItem("fairshare_member_counts", JSON.stringify(cachedMemberCounts));
      } catch (e) {
        console.error("Error updating member count cache:", e);
      }
    }
  };

  // Fetch group members - with cache for consistent counts
  const { 
    data: members = [], 
    isLoading: isLoadingMembers 
  } = useQuery<any[]>({
    queryKey: [`/api/groups/${groupIdStr}/members`],
    enabled: groupId > 0 && !!group,
    staleTime: Infinity, // Never refresh automatically to prevent duplicate member count issues
    refetchOnMount: false // Don't refetch when component mounts again
  });
  
  // Apply the cache update when members data changes
  useEffect(() => {
    if (members.length > 0) {
      updateMemberCountCache(members);
    }
  }, [members, groupId]);

  // Mobile optimization: Use pagination for expenses with a reasonable initial load
  const EXPENSES_PER_PAGE = 5;
  const [currentExpensePage, setCurrentExpensePage] = useState(0);
  const [isLoadingMoreExpenses, setIsLoadingMoreExpenses] = useState(false);
  
  // Fetch group expenses with pagination for better mobile performance
  const { 
    data: expensesData,
    isLoading: isLoadingExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [`/api/groups/${groupIdStr}/expenses`],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/groups/${groupIdStr}/expenses?limit=${EXPENSES_PER_PAGE}&offset=${pageParam * EXPENSES_PER_PAGE}`);
      const data = await response.json();
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: groupId > 0 && !!group,
    staleTime: 0 // Always refetch on component mount
  });
  
  // Flatten the paged data for easier use in the component
  const expenses = useMemo(() => {
    if (!expensesData) return [];
    return expensesData.pages.flatMap(page => page.expenses || []);
  }, [expensesData]);
  
  // Function to load more expenses when user scrolls
  const loadMoreExpenses = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage) return;
    setIsLoadingMoreExpenses(true);
    await fetchNextPage();
    setIsLoadingMoreExpenses(false);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Fetch group payments
  const { 
    data: payments = [], 
    isLoading: isLoadingPayments 
  } = useQuery({
    queryKey: [`/api/groups/${groupIdStr}/payments`],
    enabled: groupId > 0 && !!group,
    staleTime: 0
  });

  // Fetch group balances - with aggressive refresh strategy
  const { 
    data: balances = [], 
    isLoading: isLoadingBalances,
    refetch: refetchBalances 
  } = useQuery({
    queryKey: [`/api/groups/${groupIdStr}/balances`],
    enabled: groupId > 0 && !!group,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
  
  // Force refresh balances and group data when component mounts
  useEffect(() => {
    if (groupId > 0) {
      // Call the explicit balance refresh API endpoint
      const refreshBalances = async () => {
        try {
          // First, explicitly trigger balance refresh on the server
          await apiRequest('POST', `/api/groups/${groupIdStr}/refresh-balances`);
          console.log('Explicitly refreshed balances on component mount');
          
          // Then refetch the balances from the updated database
          refetchBalances();
          
          // Also refresh the group data to ensure consistent display
          refetchGroup();
        } catch (error) {
          console.error('Failed to refresh balances on mount:', error);
        }
      };
      
      // Execute immediate refresh
      refreshBalances();
      
      // Schedule another refresh after a delay
      const timer = setTimeout(() => {
        refetchBalances();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [groupId]);
  
  // Mutation for refreshing balances
  const refreshBalancesMutation = useMutation({
    mutationFn: async () => {
      const url = `/api/groups/${groupIdStr}/refresh-balances`;
      return await apiRequest('POST', url);
    },
    onSuccess: () => {
      // Refetch balances after successful refresh
      refetchBalances();
      toast({
        title: "Balances refreshed",
        description: "The group balances have been recalculated."
      });
    },
    onError: () => {
      toast({
        title: "Error refreshing balances",
        description: "Could not refresh balances. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Fetch group activity
  const { 
    data: activity = [], 
    isLoading: isLoadingActivity 
  } = useQuery({
    queryKey: [`/api/groups/${groupIdStr}/activity`],
    enabled: groupId > 0 && !!group,
    staleTime: 0
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
              <Link href="/groups">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Groups
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
                <Link href="/groups">Go to Groups</Link>
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
        <div className="flex flex-col mb-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">
              {group ? group.name : 'Loading group...'}
            </h1>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
            >
              <Link href="/groups">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Groups
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="bg-[#E3976E] hover:bg-[#D38761] text-white border-[#E3976E] rounded-md"
            >
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Invite Members</span>
              <span className="sm:hidden">Invite</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Settings</span>
            </Button>
            {/* Only show action buttons on non-mobile screens */}
            <div className="hidden sm:block">
              <ActionButtons 
                onAddExpense={() => setShowExpenseModal(true)}
                onAddPayment={() => setShowPaymentModal(true)}
                compact 
              />
            </div>
          </div>
        </div>

        <GroupDetail 
          group={group ? {
                id: group.id, 
                name: group.name, 
                createdAt: group.createdAt || new Date().toISOString(),
                createdBy: group.createdBy
              } 
            : { 
                id: 0, 
                name: '', 
                createdAt: new Date().toISOString() 
              }
          }
          members={Array.isArray(members) ? members : []} 
          balances={Array.isArray(balances) ? balances : []}
          expenses={Array.isArray(expenses) ? expenses : []}
          payments={Array.isArray(payments) ? payments : []}
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
                  <Button 
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-[#E3976E] hover:bg-[#D38761] text-white border-[#E3976E]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm divide-y">
                  {Array.isArray(expenses) && expenses.map((expense: any) => {
                    // Always allow clicking to view the expense details
                    return (
                      <div 
                        key={expense?.id || 'unknown'} 
                        className="p-4 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => {
                          if (expense?.id) {
                            setSelectedExpenseId(expense.id);
                            setShowExpenseEditModal(true);
                          }
                        }}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium">
                              {expense?.title || 'Untitled Expense'}
                              <span className="ml-2 text-xs text-muted-foreground">(Click to view)</span>
                            </h3>
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
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="balances" className="mt-0">
              <div className="mb-4 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refreshBalancesMutation.mutate()}
                  disabled={refreshBalancesMutation.isPending}
                  className="gap-2 bg-[#E3976E] hover:bg-[#D38761] text-white border-[#E3976E]"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshBalancesMutation.isPending ? 'animate-spin' : ''}`} />
                  {refreshBalancesMutation.isPending ? 'Refreshing...' : 'Refresh Balances'}
                </Button>
              </div>
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
                    {activity
                      .filter((item: any) => !item.actionType.includes("create_invite"))
                      .map((item: any) => (
                      <div 
                        key={item?.id || 'unknown'} 
                        className={`p-4 hover:bg-muted transition-colors ${
                          item?.actionType === 'add_expense' && item?.expense ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (item?.actionType === 'add_expense' && item?.expense?.id) {
                            // When clicking an expense in the activity feed, open the edit modal
                            setSelectedExpenseId(item.expense.id);
                            setShowExpenseEditModal(true);
                          }
                        }}
                      >
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
                              {item?.actionType === 'join_via_invite' && ' joined '}
                              {(!item?.actionType || !['add_expense', 'record_payment', 'add_member', 'join_via_invite'].includes(item.actionType)) && 
                                ' performed an action '}
                              
                              {item?.expense && (
                                <span className="font-medium">
                                  "{item.expense?.title || 'Untitled'}"
                                  {item?.actionType === 'add_expense' && <span className="ml-1 text-xs text-muted-foreground">(Click to edit)</span>}
                                </span>
                              )}
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

      {/* Mobile action button */}
      <div className="fixed bottom-20 right-4 sm:hidden">
        <Button 
          size="icon" 
          variant="outline" 
          className="h-14 w-14 rounded-full shadow-lg border-fairshare-secondary"
          onClick={() => setShowPaymentModal(true)}
        >
          <CreditCard className="h-6 w-6 text-fairshare-dark" />
        </Button>
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
      <GroupSettings
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        groupId={groupId}
        groupName={group?.name || ''}
        members={Array.isArray(members) ? members : []}
        createdBy={group?.createdBy}
      />
      {/* Expense Edit Modal */}
      {selectedExpenseId && (
        <MinimalExpenseEdit
          open={showExpenseEditModal}
          onOpenChange={setShowExpenseEditModal}
          expenseId={selectedExpenseId}
          groupId={groupId}
        />
      )}
    </MainLayout>
  );
}
