import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  title: z.string().min(1, "Title is required"),
  totalAmount: z.string().min(1, "Amount is required").refine(
    (val) => {
      const amount = parseFloat(val);
      return !isNaN(amount) && amount > 0;
    },
    { message: "Amount must be a positive number" }
  ),
  paidBy: z.string().min(1, "Payer is required"),
  splitMethod: z.enum(["equal", "unequal", "percentage"]),
  // Use string for date to avoid type issues with the input field
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
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
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  // Track custom amounts for unequal splits
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>({});
  // Track custom percentages for percentage splits
  const [customPercentages, setCustomPercentages] = useState<Record<number, number>>({});
  
  // Fetch expense details
  const { data: expense, isLoading: isLoadingExpense } = useQuery({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: open && expenseId > 0,
  });

  // Fetch expense participants
  const { data: expenseParticipants = [], isLoading: isLoadingParticipants } = useQuery({
    queryKey: [`/api/expenses/${expenseId}/participants`],
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
      splitMethod: "equal",
      date: formatISO(new Date(), { representation: "date" }),
      notes: "",
    },
  });

  // Auto-populate form when expense data is loaded
  const [formPopulated, setFormPopulated] = useState(false);
  
  // Initialize selectedUserIds with participants when expense data is loaded
  useEffect(() => {
    if (expense && Array.isArray(groupMembers) && groupMembers.length > 0 && !formPopulated) {
      try {
        if (typeof expense === 'object') {
          // Update all form fields
          const expenseObj = expense as any;
          const title = expenseObj.title ? String(expenseObj.title) : '';
          const amount = expenseObj.totalAmount ? String(expenseObj.totalAmount) : '0';
          const payer = expenseObj.paidBy ? String(expenseObj.paidBy) : user?.id?.toString() || '';
          const expenseDate = expenseObj.date ? String(expenseObj.date) : formatISO(new Date(), { representation: "date" });
          const notes = expenseObj.notes ? String(expenseObj.notes) : '';
          const splitMethod = "equal"; // Default to equal - we'll determine actual split later
          
          // Set selected user IDs from participants
          const participantIds = Array.isArray(expenseParticipants) 
            ? expenseParticipants.map((p: any) => p.userId)
            : [];
          
          setSelectedUserIds(participantIds.length > 0 ? participantIds : 
            groupMembers.map((m: any) => m.userId));
          
          // Update the form
          form.setValue('title', title);
          form.setValue('totalAmount', amount);
          form.setValue('paidBy', payer);
          form.setValue('date', expenseDate);
          form.setValue('notes', notes);
          form.setValue('splitMethod', splitMethod);
          
          // Initialize amounts and percentages based on participants
          if (Array.isArray(expenseParticipants) && expenseParticipants.length > 0) {
            const totalAmount = parseFloat(amount);
            const newAmounts: Record<number, number> = {};
            const newPercentages: Record<number, number> = {};
            
            // Determine if it's an equal split or custom split
            const firstAmount = expenseParticipants[0]?.amountOwed;
            const isEqualSplit = expenseParticipants.every((p: any) => 
              Math.abs(p.amountOwed - firstAmount) < 0.01);
            
            if (isEqualSplit) {
              form.setValue('splitMethod', 'equal');
            } else {
              // Determine if it's percentage or custom amount
              const totalOwed = expenseParticipants.reduce((sum: number, p: any) => 
                sum + parseFloat(p.amountOwed), 0);
              
              if (Math.abs(totalOwed - totalAmount) < 0.01) {
                form.setValue('splitMethod', 'unequal');
              } else {
                form.setValue('splitMethod', 'percentage');
              }
            }
            
            // Set custom amounts and percentages
            expenseParticipants.forEach((p: any) => {
              newAmounts[p.userId] = parseFloat(p.amountOwed);
              newPercentages[p.userId] = (parseFloat(p.amountOwed) / totalAmount) * 100;
            });
            
            setCustomAmounts(newAmounts);
            setCustomPercentages(newPercentages);
          } else {
            handleInitializeAmountsAndPercentages();
          }
          
          setFormPopulated(true);
        }
      } catch (error) {
        console.error('Error populating form:', error);
      }
    }
  }, [expense, expenseParticipants, groupMembers, form, formPopulated]);
  
  // Initialize or update custom amounts and percentages when users change
  useEffect(() => {
    if (formPopulated && selectedUserIds.length > 0) {
      handleInitializeAmountsAndPercentages();
    }
  }, [selectedUserIds, form.watch('splitMethod'), form.watch('totalAmount')]);
  
  // Function to initialize custom amounts and percentages
  const handleInitializeAmountsAndPercentages = () => {
    if (selectedUserIds.length === 0) return;
    
    const totalAmount = parseFloat(form.getValues("totalAmount") || "0");
    const equalAmount = totalAmount / selectedUserIds.length;
    const equalPercentage = 100 / selectedUserIds.length;
    
    // Initialize custom amounts
    const newAmounts: Record<number, number> = {};
    const newPercentages: Record<number, number> = {};
    
    selectedUserIds.forEach(userId => {
      newAmounts[userId] = equalAmount;
      newPercentages[userId] = equalPercentage;
    });
    
    setCustomAmounts(newAmounts);
    setCustomPercentages(newPercentages);
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
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] }); // Invalidate the groups list
    
    // Group specific queries
    const groupIdStr = groupId.toString();
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] }); // Invalidate group details
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
    
    // Also invalidate the more general query patterns
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "expenses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
  };

  const handleSubmit = form.handleSubmit((values) => {
    // Calculate split amounts based on method
    const totalAmount = parseFloat(values.totalAmount);
    
    // Ensure we have at least one participant (even if it's just the current user)
    let participantIds = [...selectedUserIds];
    
    // If no users are selected, add the current user as the only participant
    if (participantIds.length === 0 && user?.id) {
      participantIds = [user.id];
    }
    
    const splitMethod = values.splitMethod;
    
    // Calculate amount owed based on split method
    const participants = participantIds.map((userId) => {
      let amountOwed = 0;
      
      if (splitMethod === "equal") {
        // Equal split
        amountOwed = totalAmount / participantIds.length;
      } 
      else if (splitMethod === "unequal") {
        // Unequal split - use custom amounts if available
        if (customAmounts[userId]) {
          amountOwed = customAmounts[userId];
        } else {
          // Fall back to equal split if no custom amount
          amountOwed = totalAmount / participantIds.length;
        }
      } 
      else if (splitMethod === "percentage") {
        // Percentage split - use custom percentages if available
        if (customPercentages[userId]) {
          amountOwed = (totalAmount * customPercentages[userId]) / 100;
        } else {
          // Fall back to equal percentage split
          amountOwed = totalAmount / participantIds.length;
        }
      }
      
      return {
        userId,
        amountOwed,
      };
    });

    // The date is already in the correct format from the input field
    const formattedDate = values.date;

    updateExpenseMutation.mutate({
      title: values.title,
      totalAmount,
      paidBy: parseInt(values.paidBy),
      date: formattedDate,
      notes: values.notes,
      participants,
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
      <DialogContent className="sm:max-w-[500px] p-4 rounded-lg" autoFocus={false}>
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
          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
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
                        autoFocus={false}
                      />
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
                    <FormLabel className="text-xs font-medium">From</FormLabel>
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
            </div>
           
            <div className="grid grid-cols-2 gap-3">
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
                          autoFocus={false}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-9" autoFocus={false} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="splitMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Split:</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="equal" className="h-3.5 w-3.5" id="equal-split" />
                        <FormLabel htmlFor="equal-split" className="text-xs cursor-pointer font-normal">Equal</FormLabel>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="unequal" className="h-3.5 w-3.5" id="unequal-split" />
                        <FormLabel htmlFor="unequal-split" className="text-xs cursor-pointer font-normal">Unequal</FormLabel>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="percentage" className="h-3.5 w-3.5" id="percentage-split" />
                        <FormLabel htmlFor="percentage-split" className="text-xs cursor-pointer font-normal">Percentage</FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Display members with checkboxes */}
            <div className="bg-muted/30 p-3 rounded-md">
              <h4 className="text-xs font-medium mb-2">Split between:</h4>
              <div className="space-y-2">
                {Array.isArray(groupMembers) && groupMembers.map((member: any) => {
                  const userId = member?.userId;
                  const isSelected = selectedUserIds.includes(userId);
                  const name = member?.user?.name || "Unknown User";
                  
                  // Calculate what to display based on split method
                  let secondaryText = "";
                  if (form.watch("splitMethod") === "equal" && isSelected && selectedUserIds.length > 0) {
                    const amount = parseFloat(form.watch("totalAmount") || "0") / selectedUserIds.length;
                    secondaryText = `$${amount.toFixed(2)}`;
                  } else if (form.watch("splitMethod") === "unequal" && isSelected) {
                    const amount = customAmounts[userId] || 0;
                    secondaryText = `$${amount.toFixed(2)}`;
                  } else if (form.watch("splitMethod") === "percentage" && isSelected) {
                    const percentage = customPercentages[userId] || 0;
                    secondaryText = `${percentage.toFixed(1)}%`;
                  }
                  
                  return (
                    <div key={userId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`user-${userId}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds(prev => [...prev, userId]);
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== userId));
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`user-${userId}`} className="text-xs cursor-pointer">{name}</label>
                      </div>
                      
                      {isSelected && form.watch("splitMethod") !== "equal" && (
                        <div className="flex items-center">
                          {form.watch("splitMethod") === "unequal" && (
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs">$</span>
                              <Input 
                                type="number"
                                value={customAmounts[userId] || 0}
                                onChange={(e) => {
                                  const newAmount = parseFloat(e.target.value);
                                  if (!isNaN(newAmount)) {
                                    setCustomAmounts(prev => ({
                                      ...prev,
                                      [userId]: newAmount
                                    }));
                                  }
                                }}
                                className="w-20 h-7 text-xs pl-6"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          )}
                          
                          {form.watch("splitMethod") === "percentage" && (
                            <div className="relative">
                              <Input 
                                type="number"
                                value={customPercentages[userId] || 0}
                                onChange={(e) => {
                                  const newPercentage = parseFloat(e.target.value);
                                  if (!isNaN(newPercentage)) {
                                    setCustomPercentages(prev => ({
                                      ...prev,
                                      [userId]: newPercentage
                                    }));
                                  }
                                }}
                                className="w-16 h-7 text-xs pr-6"
                                step="0.1"
                                min="0"
                                max="100"
                              />
                              <span className="absolute right-2 top-1.5 text-xs">%</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {isSelected && form.watch("splitMethod") === "equal" && (
                        <span className="text-xs text-muted-foreground">{secondaryText}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3">
              <Button 
                type="submit"
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!canEdit || updateExpenseMutation.isPending}
              >
                {updateExpenseMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 mt-2 border-gray-200"
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