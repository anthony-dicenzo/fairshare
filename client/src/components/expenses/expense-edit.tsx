import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ShoppingBag, Trash } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Group } from "@shared/schema";

// Define a schema for expense editing
const expenseEditSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" }),
  totalAmount: z
    .string()
    .min(1, { message: "Amount is required" })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  paidBy: z
    .string()
    .min(1, { message: "Payer is required" }),
  notes: z.string().optional(),
  date: z.string().min(1, { message: "Date is required" }),
});

type ExpenseEditValues = z.infer<typeof expenseEditSchema>;

type ExpenseEditProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: number;
  groupId: number;
};

export function ExpenseEdit({ open, onOpenChange, expenseId, groupId }: ExpenseEditProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Fetch expense details
  const { data: expense, isLoading: isLoadingExpense } = useQuery({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: open && expenseId > 0,
  });

  // Fetch group members for the dropdown
  const { data: groupMembers = [] } = useQuery({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: !!groupId && open,
    staleTime: 0, // Always fetch fresh data
  });

  const form = useForm<ExpenseEditValues>({
    resolver: zodResolver(expenseEditSchema),
    defaultValues: {
      title: "",
      totalAmount: "",
      paidBy: user?.id.toString() || "",
      date: formatISO(new Date(), { representation: "date" }),
      notes: "",
    },
  });

  // Auto-populate form when expense data is loaded
  const [formPopulated, setFormPopulated] = useState(false);
  
  // This runs when expense data changes
  if (expense && !formPopulated && form) {
    try {
      if (typeof expense === 'object') {
        // Update all form fields
        const title = expense.title ? String(expense.title) : '';
        const amount = expense.totalAmount ? String(expense.totalAmount) : '0';
        const payer = expense.paidBy ? String(expense.paidBy) : user?.id?.toString() || '';
        const expenseDate = expense.date ? String(expense.date) : formatISO(new Date(), { representation: "date" });
        const notes = expense.notes ? String(expense.notes) : '';
        
        // Update the form
        setTimeout(() => {
          form.setValue('title', title);
          form.setValue('totalAmount', amount);
          form.setValue('paidBy', payer);
          form.setValue('date', expenseDate);
          form.setValue('notes', notes);
          setFormPopulated(true);
        }, 0);
      }
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      totalAmount: number;
      paidBy: number;
      date: string;
      notes?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/expenses/${expenseId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully.",
      });
      onOpenChange(false);
      form.reset();
      
      // Invalidate all relevant queries
      invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Failed to update expense",
        description: error.message,
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
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "Your expense has been deleted successfully.",
      });
      onOpenChange(false);
      
      // Invalidate all relevant queries
      invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to invalidate all relevant queries
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity", "expenses"] });
    
    // Group specific queries
    const groupIdStr = groupId.toString();
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
    
    // Also invalidate the more general query patterns
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "expenses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
  };

  const handleSubmit = form.handleSubmit((values) => {
    updateExpenseMutation.mutate({
      title: values.title,
      totalAmount: parseFloat(values.totalAmount),
      paidBy: parseInt(values.paidBy),
      date: values.date,
      notes: values.notes,
    });
  });

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    deleteExpenseMutation.mutate();
  };

  // Check if the current user is the one who paid or created the expense
  const canEdit = expense && user && expense.paidBy === user.id;

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Edit Expense
          </DialogTitle>
          <DialogDescription>
            Update the details of your expense or delete it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Groceries, Dinner, Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">$</span>
                      <Input 
                        type="text"
                        placeholder="0.00" 
                        className="pl-8" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid by</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={user?.id.toString() || ""}>
                        You
                      </SelectItem>
                      {Array.isArray(groupMembers) && groupMembers
                        .filter((member) => member?.userId !== user?.id)
                        .map((member) => (
                          <SelectItem 
                            key={member?.userId} 
                            value={(member?.userId || 0).toString()}
                          >
                            {member?.user?.name || "Unknown User"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any details about this expense"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-1"
                disabled={!canEdit || deleteExpenseMutation.isPending}
              >
                <Trash className="h-4 w-4" />
                {deleteConfirm ? "Confirm Delete" : "Delete Expense"}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={!canEdit || updateExpenseMutation.isPending}
                >
                  {updateExpenseMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}