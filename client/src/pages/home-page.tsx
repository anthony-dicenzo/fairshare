import { useState } from "react";
import { BalanceSummary } from "@/components/dashboard/balance-summary";
import { GroupsList } from "@/components/dashboard/groups-list";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PaymentForm } from "@/components/expenses/payment-form";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { ActionButtons } from "@/components/dashboard/action-buttons";

export default function HomePage() {
  const { user } = useAuth();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!user) return null;

  return (
    <MainLayout>
      <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold mb-3 sm:mb-0">Dashboard</h1>
          <div className="flex justify-start sm:justify-end w-full sm:w-auto">
            <ActionButtons 
              onAddExpense={() => setShowExpenseModal(true)}
              onAddPayment={() => setShowPaymentModal(true)}
            />
          </div>
        </div>

        {/* Balance Summary */}
        <BalanceSummary />

        {/* Groups and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Groups Card */}
          <div className="lg:col-span-2 w-full">
            <GroupsList />
          </div>
          
          {/* Recent Activity */}
          <div className="lg:col-span-3 w-full">
            <ActivityFeed />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseForm 
        open={showExpenseModal} 
        onOpenChange={setShowExpenseModal} 
      />
      <PaymentForm 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal} 
      />
    </MainLayout>
  );
}
