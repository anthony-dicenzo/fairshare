import { Button } from "@/components/ui/button";
import { PlusCircle, CreditCard, AlertCircle } from "lucide-react";
import { PersistentNotification } from "@/components/ui/persistent-notification";

interface ActionButtonsProps {
  onAddExpense: () => void;
  onAddPayment: () => void;
  compact?: boolean;
  showExpenseNotification?: boolean;
  onDismissExpenseNotification?: () => void;
}

export function ActionButtons({ onAddExpense, onAddPayment, compact = false, showExpenseNotification = false, onDismissExpenseNotification }: ActionButtonsProps) {
  if (compact) {
    return (
      <div className="flex space-x-2">
        <div className="relative">
          <Button 
            size="sm" 
            onClick={onAddExpense}
            className={`flex-1 sm:flex-none ${
              showExpenseNotification 
              ? 'animate-flash-mango' 
              : ''
            }`}
          >
            <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">Expense</span>
          </Button>
          {showExpenseNotification && onDismissExpenseNotification && (
            <PersistentNotification
              message="Add your first expense"
              position="tooltip"
              variant="default"
              size="sm"
              animate={true}
              icon={<AlertCircle className="h-3 w-3 text-fairshare-primary" />}
              onDismiss={onDismissExpenseNotification}
              style={{
                bottom: "calc(100% + 8px)",
                right: "auto",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                zIndex: 50,
              }}
            />
          )}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onAddPayment}
          className="flex-1 sm:flex-none"
        >
          <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Record Payment</span>
          <span className="sm:hidden">Payment</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full space-x-2 sm:space-x-3">
      <Button 
        onClick={onAddExpense}
        className={`flex-1 sm:flex-none text-xs sm:text-sm py-2 px-3 sm:px-4 ${
          showExpenseNotification 
          ? 'animate-flash-mango' 
          : 'bg-fairshare-primary text-white hover:bg-fairshare-primary-dark'
        }`}
      >
        <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
        <span className="hidden xs:inline">Add Expense</span>
        <span className="xs:hidden">Expense</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={onAddPayment}
        className="flex-1 sm:flex-none text-xs sm:text-sm py-2 px-3 sm:px-4 border-fairshare-secondary text-fairshare-dark hover:bg-fairshare-secondary/20"
      >
        <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
        <span className="hidden xs:inline">Record Payment</span>
        <span className="xs:hidden">Payment</span>
      </Button>
    </div>
  );
}
