import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingBag, Trash } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ExpenseEditProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: number;
  groupId: number;
};

/**
 * A minimalist expense edit component to fix the title edit issue
 */
export function MinimalExpenseEdit({ open, onOpenChange, expenseId, groupId }: ExpenseEditProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Simple state for the form values
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  
  // Fetch expense details when the modal is open
  const { data: expense, isLoading: isLoadingExpense } = useQuery({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: open && expenseId > 0,
    staleTime: 0
  });
  
  // Use an effect to populate form fields when data changes
  useEffect(() => {
    if (expense) {
      setTitle(expense.title || "");
      setAmount(expense.totalAmount?.toString() || "");
      setPaidBy(expense.paidBy?.toString() || "");
      
      if (expense.date) {
        try {
          const dateObj = new Date(expense.date);
          setDate(formatISO(dateObj, { representation: "date" }));
        } catch (e) {
          setDate(formatISO(new Date(), { representation: "date" }));
        }
      } else {
        setDate(formatISO(new Date(), { representation: "date" }));
      }
      
      setNotes(expense.notes || "");
    }
  }, [expense]);

  // Fetch expense participants
  const { data: expenseParticipants = [] } = useQuery({
    queryKey: [`/api/expenses/${expenseId}/participants`],
    enabled: open && expenseId > 0,
    staleTime: 0,
  });

  // Helper to invalidate queries after updates
  const invalidateQueries = async () => {
    try {
      await apiRequest('POST', `/api/groups/${groupId}/refresh-balances`);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}/participants`] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      
      const groupIdStr = groupId.toString();
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
      
      // Force a complete cache reset
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };
  
  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      totalAmount: number;
      paidBy: number;
      date: string;
      notes?: string;
      participants: { userId: number; amountOwed: number }[];
    }) => {
      const res = await apiRequest("PATCH", `/api/expenses/${expenseId}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update expense");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully.",
      });
      
      onOpenChange(false);
      await invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Failed to update expense",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/expenses/${expenseId}`);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Expense deleted",
        description: "Your expense has been deleted successfully.",
      });
      
      onOpenChange(false);
      await invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Simple submit handler that preserves the participants
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    // Use the existing participants
    const participants = Array.isArray(expenseParticipants) 
      ? expenseParticipants.map((p: any) => ({
          userId: p.userId,
          amountOwed: p.amountOwed,
        }))
      : [];
      
    // If no participants (shouldn't happen), add the current user
    if (participants.length === 0 && user?.id) {
      participants.push({
        userId: user.id,
        amountOwed: totalAmount,
      });
    }
    
    // Update the expense
    updateExpenseMutation.mutate({
      title,
      totalAmount,
      paidBy: parseInt(paidBy || user?.id?.toString() || "0"),
      date,
      notes,
      participants,
    });
  };

  if (isLoadingExpense) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading expense...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-4 rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5 text-[#E3976E]" />
            Edit Expense
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enter the details of your expense to split it with your group.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium">Title</label>
                <Input 
                  id="title"
                  placeholder="e.g. Groceries, Dinner" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="amount" className="text-sm font-medium">Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-sm">$</span>
                  <Input 
                    id="amount"
                    type="text"
                    placeholder="0.00" 
                    className="pl-8 h-10" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="date" className="text-sm font-medium">Date</label>
                <Input 
                  id="date"
                  type="date" 
                  className="h-10 mt-1" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
                <Input 
                  id="notes"
                  placeholder="Add any additional details here" 
                  className="h-10 mt-1" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={updateExpenseMutation.isPending}
          >
            {updateExpenseMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-gray-200"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          
          <ConfirmDialog
            title="Delete Expense"
            description="Are you sure you want to delete this expense? This action cannot be undone."
            onConfirm={() => deleteExpenseMutation.mutate()}
            variant="destructive"
            trigger={
              <Button
                type="button"
                variant="destructive"
                className="w-full h-10 flex items-center justify-center gap-1"
                disabled={deleteExpenseMutation.isPending}
              >
                <Trash className="h-4 w-4" />
                Delete Expense
              </Button>
            }
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}