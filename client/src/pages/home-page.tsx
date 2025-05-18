import { useState, lazy, Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SimplifiedLayout } from "@/components/layout/simplified-layout";
import { SimplifiedBalanceSummary } from "@/components/dashboard/simplified-balance-summary";
import { SimplifiedGroupsList } from "@/components/dashboard/simplified-groups-list";
import { useTutorial } from "@/components/tutorial/tutorial-context";

// Lazy load components
const ExpenseForm = lazy(() => import("@/components/expenses/expense-form").then(module => ({
  default: module.ExpenseForm
})));
const PaymentForm = lazy(() => import("@/components/expenses/payment-form"));
const FirstTimeDialog = lazy(() => import("@/components/tutorial/first-time-dialog"));

// Define filter types
type FilterType = 'all' | 'you-owe' | 'owed-to-you' | 'settled';

export default function HomePage() {
  const { user } = useAuth();
  const { isTutorialActive } = useTutorial();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFirstTimeDialog, setShowFirstTimeDialog] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  // Check if this is the first time the user is visiting the app
  useEffect(() => {
    if (user) {
      const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
      if (!hasSeenTutorial) {
        // Show first-time dialog after a short delay
        const timer = setTimeout(() => {
          setShowFirstTimeDialog(true);
          localStorage.setItem('hasSeenTutorial', 'true');
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

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
      
      {/* First-time tutorial dialog */}
      {showFirstTimeDialog && (
        <Suspense fallback={null}>
          <FirstTimeDialog
            open={showFirstTimeDialog}
            onOpenChange={setShowFirstTimeDialog}
          />
        </Suspense>
      )}
    </SimplifiedLayout>
  );
}
