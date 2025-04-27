import { useState } from "react";
import { BalanceSummary } from "@/components/dashboard/balance-summary";
import { GroupsList } from "@/components/dashboard/groups-list";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PaymentForm } from "@/components/expenses/payment-form";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { ActionButtons } from "@/components/dashboard/action-buttons";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, CreditCard } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!user) return null;

  return (
    <MainLayout>
      <MobilePageHeader>
        <div className="flex md:hidden">
          <h1 className="text-xl font-bold">Dashboard</h1>
        </div>
      </MobilePageHeader>
      
      <div className="px-3 py-3 sm:px-5 sm:py-6 md:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-0 hidden md:block">Dashboard</h1>
          <div className="hidden md:flex justify-start sm:justify-end w-full sm:w-auto">
            <ActionButtons 
              onAddExpense={() => setShowExpenseModal(true)}
              onAddPayment={() => setShowPaymentModal(true)}
            />
          </div>
        </div>

        {/* Balance Summary */}
        <BalanceSummary />

        {/* Groups and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-6">
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

      {/* Mobile floating action buttons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-3 sm:hidden">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg bg-fairshare-primary hover:bg-fairshare-primary-dark"
          onClick={() => setShowExpenseModal(true)}
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
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
      />
      <PaymentForm 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal} 
      />
    </MainLayout>
  );
}
