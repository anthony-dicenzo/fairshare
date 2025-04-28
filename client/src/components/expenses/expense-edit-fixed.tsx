import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ShoppingBag, Trash, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Expense edit schema
const expenseEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  totalAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  paidBy: z.string(),
  date: z.string(),
  splitMethod: z.enum(["equal", "unequal", "percentage"]),
  notes: z.string().optional(),
});

type ExpenseEditValues = z.infer<typeof expenseEditSchema>;

type ExpenseEditProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: number;
  groupId: number;
};

export function ExpenseEditFixed({ open, onOpenChange, expenseId, groupId }: ExpenseEditProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Basic state for form values and tracking
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<number, number>>({});
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  
  // Form definition with default empty values
  const form = useForm<ExpenseEditValues>({
    resolver: zodResolver(expenseEditSchema),
    defaultValues: {
      title: "",
      totalAmount: "",
      paidBy: user?.id?.toString() || "",
      date: formatISO(new Date(), { representation: "date" }),
      splitMethod: "equal",
      notes: "",
    },
  });
  
  // Fetch expense details when the modal is open
  const { data: expense, isLoading: isLoadingExpense } = useQuery({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: open && expenseId > 0,
    staleTime: 0, // Always fetch fresh data from the server
  });

  // Fetch expense participants when the modal is open
  const { data: expenseParticipants = [], isLoading: isLoadingParticipants } = useQuery({
    queryKey: [`/api/expenses/${expenseId}/participants`],
    enabled: open && expenseId > 0 && expense !== undefined,
    staleTime: 0, // Always fetch fresh data from the server
  });

  // Fetch group members when the modal is open
  const { data: groupMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: open && groupId > 0,
    staleTime: 0, // Always fetch fresh data from the server
  });
  
  // Reset form when the expense ID changes or modal opens/closes
  useEffect(() => {
    // If the modal closes or the expense ID changes, reset the form
    form.reset({
      title: "",
      totalAmount: "",
      paidBy: user?.id?.toString() || "",
      date: formatISO(new Date(), { representation: "date" }),
      splitMethod: "equal",
      notes: "",
    });
    
    // Reset state
    setSelectedUserIds([]);
    setCustomAmounts({});
    setCustomPercentages({});
    setIsFormInitialized(false);
    
  }, [expenseId, open, user?.id]);
  
  // Populate form when expense and related data is available
  useEffect(() => {
    // Skip if data is not ready or if form is already initialized
    if (!open || 
        isLoadingExpense || 
        isLoadingMembers || 
        isLoadingParticipants || 
        !expense || 
        !groupMembers || 
        !expenseParticipants ||
        isFormInitialized) {
      return;
    }
    
    try {
      // Extract basic expense data
      const title = expense.title || '';
      const amount = String(expense.totalAmount || '0');
      const paidBy = String(expense.paidBy || user?.id || '');
      
      // Format date for the input field
      let dateStr = formatISO(new Date(), { representation: "date" });
      if (expense.date) {
        const dateObj = new Date(expense.date);
        dateStr = formatISO(dateObj, { representation: "date" });
      }
      
      const notes = expense.notes || '';
      
      // Extract participant IDs
      const participantIds = Array.isArray(expenseParticipants) 
        ? expenseParticipants.map((p: any) => p.userId)
        : [];
      
      // Determine split method based on participant data
      let splitMethod = "equal";
      
      if (expenseParticipants.length > 0) {
        const firstAmount = parseFloat(expenseParticipants[0]?.amountOwed || '0');
        const isEqualSplit = expenseParticipants.every((p: any) => 
          Math.abs(parseFloat(p.amountOwed || '0') - firstAmount) < 0.01);
        
        if (isEqualSplit) {
          splitMethod = "equal";
        } else {
          const totalOwed = expenseParticipants.reduce(
            (sum: number, p: any) => sum + parseFloat(p.amountOwed || '0'), 
            0
          );
          
          if (Math.abs(totalOwed - parseFloat(amount)) < 0.01) {
            splitMethod = "unequal";
          } else {
            splitMethod = "percentage";
          }
        }
      }
      
      // Set up custom amounts and percentages
      const amountsMap: Record<number, number> = {};
      const percentagesMap: Record<number, number> = {};
      
      if (participantIds.length > 0) {
        const totalAmount = parseFloat(amount || '0');
        
        expenseParticipants.forEach((p: any) => {
          const userId = p.userId;
          const amountOwed = parseFloat(p.amountOwed || '0');
          
          amountsMap[userId] = amountOwed;
          
          if (totalAmount > 0) {
            percentagesMap[userId] = (amountOwed / totalAmount) * 100;
          } else {
            percentagesMap[userId] = 100 / participantIds.length;
          }
        });
      }
      
      // Update form with all values at once
      form.reset({
        title,
        totalAmount: amount,
        paidBy,
        date: dateStr,
        splitMethod,
        notes,
      });
      
      // Update state in a single batch
      setSelectedUserIds(participantIds);
      setCustomAmounts(amountsMap);
      setCustomPercentages(percentagesMap);
      setIsFormInitialized(true);
      
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }, [
    expense, 
    expenseParticipants, 
    groupMembers, 
    isLoadingExpense, 
    isLoadingMembers, 
    isLoadingParticipants, 
    open, 
    isFormInitialized
  ]);
  
  // Function to calculate equal splits when amount or participants change
  const recalculateEqualSplit = () => {
    if (selectedUserIds.length === 0) return;
    
    const amount = parseFloat(form.getValues("totalAmount") || "0");
    const equalAmount = amount / selectedUserIds.length;
    const equalPercentage = 100 / selectedUserIds.length;
    
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
    onSuccess: async () => {
      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully.",
      });
      // Reset form and close modal
      form.reset();
      onOpenChange(false);
      
      // Invalidate all relevant queries
      await invalidateQueries();
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
    onSuccess: async () => {
      toast({
        title: "Expense deleted",
        description: "Your expense has been deleted successfully.",
      });
      // Reset the form and close modal
      form.reset();
      onOpenChange(false);
      
      // Invalidate all relevant queries
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

  // Helper to invalidate all relevant queries
  const invalidateQueries = async () => {
    // Explicit refetch of balances
    try {
      // First, explicitly refresh the balances via the balance refresh API endpoint
      await apiRequest('POST', `/api/groups/${groupId}/refresh-balances`);
      console.log('Explicitly refreshed group balances');
    } catch (error) {
      console.error('Failed to explicitly refresh balances:', error);
    }
    
    // Invalidate the specific expense queries
    queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}/participants`] });
    
    // Invalidate general balances and activity queries
    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity", "expenses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    
    // Group specific queries
    const groupIdStr = groupId.toString();
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
    
    // Force a complete cache reset for all queries
    queryClient.invalidateQueries();
    
    // After a short delay, force another refresh of the group balances
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    }, 300);
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

  // Always allow editing for now
  const canEdit = true;

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
      <DialogContent className="sm:max-w-[440px] p-4 rounded-lg max-h-[90vh] overflow-y-auto" autoFocus={false}>
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5 text-[#E3976E]" />
            Edit Expense
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enter the details of your expense to split it with your group.
        </p>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Groceries, Dinner" 
                          {...field} 
                          className="h-10"
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
                      <FormLabel className="text-sm">From</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select who paid" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={user?.id?.toString() || ""}>
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
             
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm">$</span>
                          <Input 
                            type="text"
                            placeholder="0.00" 
                            className="pl-8 h-10" 
                            autoFocus={false}
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Don't recalculate splits while typing to avoid jank
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              if (form.getValues("splitMethod") === "equal") {
                                recalculateEqualSplit();
                              }
                            }}
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
                      <FormLabel className="text-sm">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-10" autoFocus={false} />
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
                    <FormLabel className="text-sm">Split:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Recalculate equal splits when changing to equal
                          if (value === "equal") {
                            recalculateEqualSplit();
                          }
                        }}
                        defaultValue={field.value}
                        value={field.value}
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="equal" id="equal-split" />
                          <FormLabel htmlFor="equal-split" className="cursor-pointer">Equal</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unequal" id="unequal-split" />
                          <FormLabel htmlFor="unequal-split" className="cursor-pointer">Unequal</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage-split" />
                          <FormLabel htmlFor="percentage-split" className="cursor-pointer">Percentage</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              {/* Users to split with section */}
              <div>
                <FormLabel className="text-sm">Split with:</FormLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Get all potential participants, ensuring no duplicates */}
                  {Array.isArray(groupMembers) && groupMembers
                    .filter((member: any) => {
                      // Skip the person who paid
                      const isPayer = member?.userId === parseInt(form.getValues("paidBy"));
                      // Skip if this is the current user (we'll handle that separately)
                      const isCurrentUser = member?.userId === user?.id;
                      return !isPayer && !isCurrentUser;
                    })
                    .map((member: any) => (
                      <div 
                        key={member?.userId} 
                        className={`
                          px-3 py-2 rounded-md text-sm cursor-pointer flex items-center
                          ${selectedUserIds.includes(member?.userId || 0) 
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                          }
                        `}
                        onClick={() => {
                          const userId = member?.userId || 0;
                          if (selectedUserIds.includes(userId)) {
                            setSelectedUserIds(prev => prev.filter(id => id !== userId));
                            
                            // Remove custom amounts for this user
                            if (customAmounts[userId]) {
                              const newAmounts = { ...customAmounts };
                              delete newAmounts[userId];
                              setCustomAmounts(newAmounts);
                            }
                            
                            // Remove custom percentages for this user
                            if (customPercentages[userId]) {
                              const newPercentages = { ...customPercentages };
                              delete newPercentages[userId];
                              setCustomPercentages(newPercentages);
                            }
                          } else {
                            setSelectedUserIds(prev => [...prev, userId]);
                            // Will be initialized by recalculateEqualSplit
                          }
                        }}
                      >
                        {member?.user?.name || "Unknown User"}
                        {selectedUserIds.includes(member?.userId || 0) && (
                          <Check className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    ))
                  }
                  
                  {/* Include current user option if not the one who paid */}
                  {user?.id && parseInt(form.getValues("paidBy")) !== user.id && (
                    <div 
                      className={`
                        px-3 py-2 rounded-md text-sm cursor-pointer flex items-center
                        ${selectedUserIds.includes(user.id) 
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                        }
                      `}
                      onClick={() => {
                        if (selectedUserIds.includes(user.id)) {
                          setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                          
                          // Remove custom amounts for this user
                          if (customAmounts[user.id]) {
                            const newAmounts = { ...customAmounts };
                            delete newAmounts[user.id];
                            setCustomAmounts(newAmounts);
                          }
                          
                          // Remove custom percentages for this user
                          if (customPercentages[user.id]) {
                            const newPercentages = { ...customPercentages };
                            delete newPercentages[user.id];
                            setCustomPercentages(newPercentages);
                          }
                        } else {
                          setSelectedUserIds(prev => [...prev, user.id]);
                        }
                      }}
                    >
                      You
                      {selectedUserIds.includes(user.id) && (
                        <Check className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Show custom amount inputs for unequal split */}
                {form.getValues("splitMethod") === "unequal" && selectedUserIds.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-medium">Custom amounts:</h3>
                    {selectedUserIds.map(userId => {
                      const memberName = groupMembers?.find((m: any) => m.userId === userId)?.user?.name || 
                                         (userId === user?.id ? "You" : "Unknown User");
                      
                      return (
                        <div key={userId} className="flex items-center gap-2">
                          <label className="w-24 text-sm">{memberName}:</label>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-sm">$</span>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              className="pl-8 h-10"
                              value={customAmounts[userId] || ""}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue)) {
                                  setCustomAmounts(prev => ({
                                    ...prev,
                                    [userId]: newValue
                                  }));
                                } else {
                                  const newAmounts = { ...customAmounts };
                                  delete newAmounts[userId];
                                  setCustomAmounts(newAmounts);
                                }
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show total of custom amounts */}
                    <div className="text-sm mt-2">
                      <span>Total custom amount: </span>
                      <span className="font-medium">
                        ${Object.values(customAmounts).reduce((sum, amount) => sum + (amount || 0), 0).toFixed(2)}
                      </span>
                      {form.getValues("totalAmount") && (
                        <span className="ml-2">
                          (of ${parseFloat(form.getValues("totalAmount")).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show percentage inputs for percentage split */}
                {form.getValues("splitMethod") === "percentage" && selectedUserIds.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-medium">Custom percentages:</h3>
                    {selectedUserIds.map(userId => {
                      const memberName = groupMembers?.find((m: any) => m.userId === userId)?.user?.name || 
                                         (userId === user?.id ? "You" : "Unknown User");
                      
                      return (
                        <div key={userId} className="flex items-center gap-2">
                          <label className="w-24 text-sm">{memberName}:</label>
                          <div className="relative flex-1">
                            <Input 
                              type="number"
                              placeholder="0"
                              className="pr-8 h-10"
                              value={customPercentages[userId] || ""}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue)) {
                                  setCustomPercentages(prev => ({
                                    ...prev,
                                    [userId]: newValue
                                  }));
                                } else {
                                  const newPercentages = { ...customPercentages };
                                  delete newPercentages[userId];
                                  setCustomPercentages(newPercentages);
                                }
                              }}
                            />
                            <span className="absolute right-3 top-2.5 text-sm">%</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show total of percentages */}
                    <div className="text-sm mt-2">
                      <span>Total percentage: </span>
                      <span className={`font-medium ${
                        Math.abs(Object.values(customPercentages).reduce((sum, pct) => sum + (pct || 0), 0) - 100) < 0.01
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}>
                        {Object.values(customPercentages).reduce((sum, pct) => sum + (pct || 0), 0).toFixed(2)}%
                      </span>
                      <span className="ml-2">(should equal 100%)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!canEdit || updateExpenseMutation.isPending}
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
                  disabled={!canEdit || deleteExpenseMutation.isPending}
                >
                  <Trash className="h-4 w-4" />
                  Delete Expense
                </Button>
              }
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}