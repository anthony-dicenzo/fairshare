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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
      console.log("Sending update with data:", data);
      const res = await apiRequest("PATCH", `/api/expenses/${expenseId}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server response:", errorData);
        throw new Error(errorData.error || "Failed to update expense");
      }
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
      console.error("Update expense error:", error);
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
      <DialogContent className="sm:max-w-[500px] p-4 rounded-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Edit Expense
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update the details of your expense or delete it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Groceries, Dinner" 
                      {...field} 
                      className="h-9"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm">$</span>
                      <Input 
                        type="text"
                        placeholder="0.00" 
                        className="pl-8 h-9" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Paid by</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9">
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
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
           
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Note (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Groceries, Cash"
                        className="h-9"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-2">
              <Button 
                type="submit"
                className="w-full h-10"
                disabled={!canEdit || updateExpenseMutation.isPending}
              >
                {updateExpenseMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 mt-2"
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
                    className="w-full h-9 mt-2 flex items-center justify-center gap-1"
                    disabled={!canEdit || deleteExpenseMutation.isPending}
                  >
                    <Trash className="h-4 w-4" />
                    Delete Expense
                  </Button>
                }
              />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}