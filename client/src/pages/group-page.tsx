import { useState } from "react";
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
  const params = useParams<{ id: string }>();
  const groupId = parseInt(params.id);
  const [, navigate] = useLocation();
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: group, isLoading: isLoadingGroup } = useQuery({
    queryKey: ["/api/groups", groupId.toString()],
    onError: () => navigate("/")
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/api/groups", groupId.toString(), "members"],
    enabled: !!groupId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/groups", groupId.toString(), "expenses"],
    enabled: !!groupId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/groups", groupId.toString(), "payments"],
    enabled: !!groupId
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["/api/groups", groupId.toString(), "balances"],
    enabled: !!groupId
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["/api/groups", groupId.toString(), "activity"],
    enabled: !!groupId
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

  if (!group) return null;

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
            <h1 className="text-2xl font-bold">{group.name}</h1>
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
          group={group} 
          members={members} 
          balances={balances} 
        />

        <div className="mt-8">
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-8">
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="mt-0">
              {expenses.length === 0 ? (
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
                  {expenses.map((expense) => (
                    <div key={expense.id} className="p-4 hover:bg-muted transition-colors">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">{expense.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Added on {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${parseFloat(expense.totalAmount.toString()).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Paid by {members.find(m => m.userId === expense.paidBy)?.user.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="balances" className="mt-0">
              <BalancesMatrix balances={balances} members={members} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                {activity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activity.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-muted transition-colors">
                        <div className="flex">
                          <div className="flex-shrink-0 mr-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {item.actionType === 'add_expense' && <span className="text-primary">💰</span>}
                              {item.actionType === 'record_payment' && <span className="text-emerald-500">💸</span>}
                              {item.actionType === 'add_member' && <span className="text-purple-500">👤</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">{item.user.name}</span>
                              {item.actionType === 'add_expense' && ' added expense '}
                              {item.actionType === 'record_payment' && ' recorded payment '}
                              {item.actionType === 'add_member' && ' added a new member '}
                              
                              {item.expense && <span className="font-medium">"{item.expense.title}"</span>}
                              {item.payment && <span className="font-medium">${parseFloat(item.payment.amount.toString()).toFixed(2)}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString()}
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
        members={members}
      />
    </MainLayout>
  );
}
