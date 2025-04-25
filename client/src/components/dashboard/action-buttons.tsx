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
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Expense</span>
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onAddPayment}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Record Payment</span>
          <span className="sm:hidden">Payment</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
      <Button onClick={onAddExpense}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Expense
      </Button>
      <Button variant="outline" onClick={onAddPayment}>
        <CreditCard className="h-4 w-4 mr-2" />
        Record Payment
      </Button>
    </div>
  );
}
