import { useState } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PaymentForm } from "@/components/expenses/payment-form";
import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedBalanceSummary } from "@/components/dashboard/simplified-balance-summary";
import { SimplifiedGroupsList } from "@/components/dashboard/simplified-groups-list";

// Define filter types
type FilterType = 'all' | 'you-owe' | 'owed-to-you' | 'settled';

export default function HomePage() {
  const { user } = useAuth();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  if (!user) return null;

  return (
    <SimplifiedLayout headerText="Dashboard">
      {/* Overall balance section with filter */}
      <SimplifiedBalanceSummary 
        filterType={filterType} 
        setFilterType={setFilterType}
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
      />
      
      {/* Groups list */}
      <SimplifiedGroupsList 
        filterType={filterType}
        showSettled={showSettled}
        setShowSettled={setShowSettled}
      />
      
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
