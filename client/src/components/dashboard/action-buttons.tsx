import { Button } from "@/components/ui/button";
import { PlusCircle, CreditCard } from "lucide-react";

interface ActionButtonsProps {
  onAddExpense: () => void;
  onAddPayment: () => void;
  compact?: boolean;
}

export function ActionButtons({ onAddExpense, onAddPayment, compact = false }: ActionButtonsProps) {
  if (compact) {
    return (
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          onClick={onAddExpense}
          className="flex-1 sm:flex-none"
        >
          <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Expense</span>
        </Button>
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
        className="flex-1 sm:flex-none text-xs sm:text-sm py-2 px-3 sm:px-4"
      >
        <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
        <span className="hidden xs:inline">Add Expense</span>
        <span className="xs:hidden">Expense</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={onAddPayment}
        className="flex-1 sm:flex-none text-xs sm:text-sm py-2 px-3 sm:px-4"
      >
        <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
        <span className="hidden xs:inline">Record Payment</span>
        <span className="xs:hidden">Payment</span>
      </Button>
    </div>
  );
}
