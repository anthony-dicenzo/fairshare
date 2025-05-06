import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
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
  // Get the group ID and optional 'from' parameter from the URL
  const params = useParams<{ id: string; from?: string }>();
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
  
  // Define the response type for expenses pagination
  interface ExpensePaginatedResponse {
    expenses: any[];
    hasMore: boolean;
  }
  
  // Fetch group expenses with pagination for better mobile performance
  const { 
    data: expensesData,
    isLoading: isLoadingExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ExpensePaginatedResponse>({
    queryKey: [`/api/groups/${groupIdStr}/expenses`],
    queryFn: async ({ pageParam }) => {
      const paramPage = pageParam as number || 0;
      const response = await fetch(`/api/groups/${groupIdStr}/expenses?limit=${EXPENSES_PER_PAGE}&offset=${paramPage * EXPENSES_PER_PAGE}`);
      const data = await response.json();
      return data as ExpensePaginatedResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
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

  // Mobile optimization: Use pagination for payments with a reasonable initial load
  const PAYMENTS_PER_PAGE = 5;
  const [currentPaymentPage, setCurrentPaymentPage] = useState(0);
  const [isLoadingMorePayments, setIsLoadingMorePayments] = useState(false);
  
  // Define the response type for payments pagination
  interface PaymentPaginatedResponse {
    payments: any[];
    hasMore: boolean;
    totalCount: number;
  }
  
  // Fetch group payments with pagination
  const { 
    data: paymentsData,
    isLoading: isLoadingPayments,
    fetchNextPage: fetchNextPaymentPage,
    hasNextPage: hasNextPaymentPage,
    isFetchingNextPage: isFetchingNextPaymentPage 
  } = useInfiniteQuery<PaymentPaginatedResponse>({
    queryKey: [`/api/groups/${groupIdStr}/payments`],
    queryFn: async ({ pageParam }) => {
      const paramPage = pageParam as number || 0;
      const response = await fetch(`/api/groups/${groupIdStr}/payments?limit=${PAYMENTS_PER_PAGE}&offset=${paramPage * PAYMENTS_PER_PAGE}`);
      const data = await response.json();
      return data as PaymentPaginatedResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: groupId > 0 && !!group,
    staleTime: 0 // Always refetch on component mount
  });
  
  // Flatten the paged data for easier use in the component
  const payments = useMemo(() => {
    if (!paymentsData) return [];
    return paymentsData.pages.flatMap(page => page.payments || []);
  }, [paymentsData]);
  
  // Function to load more payments when user scrolls
  const loadMorePayments = useCallback(async () => {
    if (isFetchingNextPaymentPage || !hasNextPaymentPage) return;
    setIsLoadingMorePayments(true);
    await fetchNextPaymentPage();
    setIsLoadingMorePayments(false);
  }, [fetchNextPaymentPage, hasNextPaymentPage, isFetchingNextPaymentPage]);

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

  // Mobile optimization: Use pagination for activity feed
  const ACTIVITY_PER_PAGE = 10;
  const [currentActivityPage, setCurrentActivityPage] = useState(0);
  const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
  
  // Define the response type for activity pagination
  interface ActivityPaginatedResponse {
    activities: any[];
    hasMore: boolean;
    totalCount: number;
  }
  
  // Fetch group activity with pagination
  const { 
    data: activityData,
    isLoading: isLoadingActivity,
    fetchNextPage: fetchNextActivityPage,
    hasNextPage: hasNextActivityPage,
    isFetchingNextPage: isFetchingNextActivityPage 
  } = useInfiniteQuery<ActivityPaginatedResponse>({
    queryKey: [`/api/groups/${groupIdStr}/activity`],
    queryFn: async ({ pageParam }) => {
      const paramPage = pageParam as number || 0;
      const response = await fetch(`/api/groups/${groupIdStr}/activity?limit=${ACTIVITY_PER_PAGE}&offset=${paramPage * ACTIVITY_PER_PAGE}`);
      const data = await response.json();
      return data as ActivityPaginatedResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: groupId > 0 && !!group,
    staleTime: 0 // Always refetch on component mount
  });
  
  // Flatten the paged data for easier use in the component
  const activity = useMemo(() => {
    if (!activityData) return [];
    return activityData.pages.flatMap(page => page.activities || []);
  }, [activityData]);
  
  // Function to load more activity entries when user scrolls
  const loadMoreActivity = useCallback(async () => {
    if (isFetchingNextActivityPage || !hasNextActivityPage) return;
    setIsLoadingMoreActivity(true);
    await fetchNextActivityPage();
    setIsLoadingMoreActivity(false);
  }, [fetchNextActivityPage, hasNextActivityPage, isFetchingNextActivityPage]);

  if (isLoadingGroup) {
    return (
      <SimplifiedLayout headerText="Loading Group">
        <div className="px-4 py-4">
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
      </SimplifiedLayout>
    );
  }

  // Show a friendly error message if there was an error or no group found
  if (hasError || !group) {
    return (
      <SimplifiedLayout headerText={group ? group.name : "Group"}>
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
      </SimplifiedLayout>
    );
  }

  return (
    <SimplifiedLayout headerText={group ? group.name : "Group"}>
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
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="bg-[#32846b] hover:bg-[#276b55] text-white border-[#32846b] rounded-md"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Invite Members</span>
                <span className="sm:hidden">Invite</span>
              </Button>
              {params && params.from === 'newGroup' && (
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 whitespace-nowrap bg-[#32846b]/10 text-[#32846b] text-xs px-3 py-1 rounded-full animate-pulse">
                  Click here to invite members
                </div>
              )}
            </div>

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
                    className="bg-[#32846b] hover:bg-[#276b55] text-white border-[#32846b]"
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
                  
                  {/* Load more expenses button for infinite scrolling */}
                  {hasNextPage && (
                    <div className="p-4 text-center">
                      <Button 
                        onClick={loadMoreExpenses}
                        variant="outline"
                        disabled={isLoadingMoreExpenses || isFetchingNextPage}
                        className="w-full"
                      >
                        {isLoadingMoreExpenses || isFetchingNextPage ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            Load more expenses
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
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
                  className="gap-2 bg-[#32846b] hover:bg-[#276b55] text-white border-[#32846b]"
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
                    
                    {/* Load more activity button for infinite scrolling */}
                    {hasNextActivityPage && (
                      <div className="p-4 text-center">
                        <Button 
                          onClick={loadMoreActivity}
                          variant="outline"
                          disabled={isLoadingMoreActivity || isFetchingNextActivityPage}
                          className="w-full"
                        >
                          {isLoadingMoreActivity || isFetchingNextActivityPage ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              Load more activity
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile action button removed as requested */}

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
    </SimplifiedLayout>
  );
}
