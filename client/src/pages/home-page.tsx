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
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <ActionButtons 
            onAddExpense={() => setShowExpenseModal(true)}
            onAddPayment={() => setShowPaymentModal(true)}
          />
        </div>

        {/* Balance Summary */}
        <BalanceSummary />

        {/* Groups and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Groups Card */}
          <div className="lg:col-span-2">
            <GroupsList />
          </div>
          
          {/* Recent Activity */}
          <div className="lg:col-span-3">
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
