import { useState } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PaymentForm } from "@/components/expenses/payment-form";
import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedBalanceSummary } from "@/components/dashboard/simplified-balance-summary";
import { SimplifiedGroupsList } from "@/components/dashboard/simplified-groups-list";

export default function HomePage() {
  const { user } = useAuth();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!user) return null;

  return (
    <SimplifiedLayout headerText="">
      {/* Dashboard content area with colored header - using a softer orange to match reference image */}
      <div 
        className="p-4 mb-2" 
        style={{ background: '#E8B195' }} // Soft orange color from the reference image
      >
        <h1 className="text-white text-xl font-bold">Dashboard</h1>
      </div>
      
      {/* Overall balance section */}
      <SimplifiedBalanceSummary />
      
      {/* Groups list */}
      <SimplifiedGroupsList />
      
      {/* Modals */}
      <ExpenseForm 
        open={showExpenseModal} 
        onOpenChange={setShowExpenseModal} 
      />
      <PaymentForm 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal} 
      />
    </SimplifiedLayout>
  );
}
