import { useState } from 'react';
import { ExpenseEdit } from '@/components/expenses/expense-edit';
import { PaymentEdit } from '@/components/expenses/payment-edit';

type ActivityItemActionProps = {
  children: React.ReactNode;
  actionType: string;
  expenseId?: number;
  paymentId?: number;
  groupId?: number;
};

export function ActivityItemAction({ 
  children, 
  actionType, 
  expenseId, 
  paymentId, 
  groupId 
}: ActivityItemActionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const isExpense = actionType === 'add_expense' && expenseId && groupId;
  const isPayment = actionType === 'record_payment' && paymentId && groupId;
  
  // If this is not an editable activity type, just render children
  if (!isExpense && !isPayment) {
    return <>{children}</>;
  }
  
  return (
    <>
      {/* Clickable wrapper around children */}
      <div
        onClick={() => setDialogOpen(true)}
        className="cursor-pointer"
      >
        {children}
      </div>
      
      {/* Show appropriate edit dialog based on activity type */}
      {isExpense && (
        <ExpenseEdit
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          expenseId={expenseId}
          groupId={groupId}
        />
      )}
      
      {isPayment && (
        <PaymentEdit
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          paymentId={paymentId}
          groupId={groupId}
        />
      )}
    </>
  );
}