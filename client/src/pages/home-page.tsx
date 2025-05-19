import { useState, lazy, Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedBalanceSummary } from "@/components/dashboard/simplified-balance-summary";
import { SimplifiedGroupsList } from "@/components/dashboard/simplified-groups-list";
import { useToast } from "@/hooks/use-toast";

// Lazy load components
const ExpenseForm = lazy(() => import("@/components/expenses/expense-form").then(module => ({
  default: module.ExpenseForm
})));
const PaymentForm = lazy(() => import("@/components/expenses/payment-form").then(module => ({
  default: module.PaymentForm
})));

// Define filter types
type FilterType = 'all' | 'you-owe' | 'owed-to-you' | 'settled';

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  // Check if this is the first time the user is visiting the app
  useEffect(() => {
    if (user) {
      // Create a user-specific key for localStorage to track tips shown
      const tipsKey = `tips_shown_${user.id}`;
      const tipsShown = localStorage.getItem(tipsKey);
      
      if (!tipsShown) {
        // Show a helpful tip after a delay for new users
        const timer = setTimeout(() => {
          toast({
            title: "Tip: Getting Started",
            description: "Use the + button to create a group and start tracking expenses",
          });
          localStorage.setItem(tipsKey, 'true');
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user, toast]);

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
      {showExpenseModal && (
        <Suspense fallback={null}>
          <ExpenseForm
            open={showExpenseModal}
            onOpenChange={setShowExpenseModal}
          />
        </Suspense>
      )}
      {showPaymentModal && (
        <Suspense fallback={null}>
          <PaymentForm
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
          />
        </Suspense>
      )}
      
      {/* No longer needed - using the welcome dialog in App.tsx */}
    </SimplifiedLayout>
  );
}
