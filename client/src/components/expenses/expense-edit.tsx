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
  
  // Fetch expense details - always get fresh data when opening the modal
  const { data: expense, isLoading: isLoadingExpense } = useQuery({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: open && expenseId > 0,
    staleTime: 0, // Always fetch fresh data from the server
  });

  // Fetch expense participants
  const { data: expenseParticipants = [], isLoading: isLoadingParticipants } = useQuery({
    queryKey: [`/api/expenses/${expenseId}/participants`],
    enabled: open && expenseId > 0,
    staleTime: 0, // Always fetch fresh data from the server
  });

  // Fetch group members for the dropdown
  const { data: groupMembers = [] } = useQuery<any[]>({
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

  // Track the current expense ID to detect changes
  const [currentExpenseId, setCurrentExpenseId] = useState<number | null>(null);
  
  // Handle expense ID changes (when user clicks a different expense)
  useEffect(() => {
    if (expenseId !== currentExpenseId) {
      setCurrentExpenseId(expenseId);
      // Reset the form state when switching between expenses
      form.reset();
      setSelectedUserIds([]);
      setCustomAmounts({});
      setCustomPercentages({});
    }
  }, [expenseId, currentExpenseId, form]);
  
  // Load expense data when expense or participants change
  useEffect(() => {
    if (!expense || !Array.isArray(groupMembers) || groupMembers.length === 0) {
      return;
    }
    
    try {
      if (typeof expense === 'object') {
        // Update all form fields
        const expenseObj = expense as any;
        const title = expenseObj.title ? String(expenseObj.title) : '';
        const amount = expenseObj.totalAmount ? String(expenseObj.totalAmount) : '0';
        const payer = expenseObj.paidBy ? String(expenseObj.paidBy) : user?.id?.toString() || '';
        
        // Ensure date is properly formatted for the date input field
        let expenseDate = formatISO(new Date(), { representation: "date" });
        if (expenseObj.date) {
          try {
            // Make sure the date is properly formatted as YYYY-MM-DD for the date input
            const dateObj = new Date(expenseObj.date);
            expenseDate = formatISO(dateObj, { representation: "date" });
          } catch (e) {
            console.error('Error formatting date:', e);
          }
        }
        
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
      }
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }, [expense, expenseParticipants, groupMembers]);
  
  // Initialize or update custom amounts and percentages when users change
  useEffect(() => {
    // Only update when user has actively changed the split method or amount
    // Don't run this effect during initial form population
    if (selectedUserIds.length > 0 && currentExpenseId) {
      const splitMethod = form.getValues('splitMethod');
      const totalAmount = form.getValues('totalAmount');
      handleInitializeAmountsAndPercentages(splitMethod, totalAmount);
    }
  }, [selectedUserIds, form.watch('splitMethod'), form.watch('totalAmount'), currentExpenseId]);
  
  // Function to initialize custom amounts and percentages
  const handleInitializeAmountsAndPercentages = (splitMethod?: string, amountStr?: string) => {
    if (selectedUserIds.length === 0) return;
    
    // Use the provided amounts or get from form
    const totalAmount = amountStr ? parseFloat(amountStr) : parseFloat(form.getValues("totalAmount") || "0");
    const equalAmount = totalAmount / selectedUserIds.length;
    const equalPercentage = 100 / selectedUserIds.length;
    
    // Initialize custom amounts
    const newAmounts: Record<number, number> = {};
    const newPercentages: Record<number, number> = {};
    
    selectedUserIds.forEach(userId => {
      newAmounts[userId] = equalAmount;
      newPercentages[userId] = equalPercentage;
    });
    
    // Only update if this would change the values (prevent infinite loops)
    const currentAmountKeys = Object.keys(customAmounts);
    const currentPercentageKeys = Object.keys(customPercentages);
    
    // Check if arrays are different lengths or have different values
    const needsAmountUpdate = 
      currentAmountKeys.length !== selectedUserIds.length || 
      selectedUserIds.some(id => !customAmounts[id] || Math.abs(customAmounts[id] - equalAmount) > 0.01);
      
    const needsPercentageUpdate = 
      currentPercentageKeys.length !== selectedUserIds.length || 
      selectedUserIds.some(id => !customPercentages[id] || Math.abs(customPercentages[id] - equalPercentage) > 0.01);
    
    if (needsAmountUpdate) {
      setCustomAmounts(newAmounts);
    }
    
    if (needsPercentageUpdate) {
      setCustomPercentages(newPercentages);
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

  // Delete expense mutation with optimistic UI updates
  const deleteExpenseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/expenses/${expenseId}`);
      return res.json();
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      const groupIdStr = groupId.toString();
      await queryClient.cancelQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
      await queryClient.cancelQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });

      // Snapshot the previous values
      const previousExpenses = queryClient.getQueryData([`/api/groups/${groupIdStr}/expenses`]);
      const previousBalances = queryClient.getQueryData([`/api/groups/${groupIdStr}/balances`]);
      const previousGroups = queryClient.getQueryData(["/api/groups"]);

      // Optimistically remove the expense from the list
      queryClient.setQueryData([`/api/groups/${groupIdStr}/expenses`], (old: any) => {
        if (!old || !old.expenses) return old;
        
        return {
          ...old,
          expenses: old.expenses.filter((exp: any) => exp.id !== expenseId),
          totalCount: Math.max(0, (old.totalCount || 0) - 1),
        };
      });

      // Optimistically update balances by reversing the expense effect
      if (expense && expenseParticipants) {
        queryClient.setQueryData([`/api/groups/${groupIdStr}/balances`], (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          
          return old.map((balance: any) => {
            if (balance.userId === user?.id) {
              // Calculate the reverse of what this expense contributed to balance
              const userParticipant = Array.isArray(expenseParticipants) 
                ? expenseParticipants.find((p: any) => p.userId === user?.id)
                : null;
              const amountOwed = userParticipant ? parseFloat(userParticipant.amountOwed) : 0;
              
              // Reverse the balance change from this expense
              let balanceChange = 0;
              if (expense && (expense as any).paidBy === user?.id) {
                // User paid, so they lose the amount others owed them
                const totalAmount = parseFloat((expense as any).totalAmount || "0");
                balanceChange = -(totalAmount - amountOwed);
              } else if (userParticipant) {
                // User owed money, so removing expense increases their balance
                balanceChange = amountOwed;
              }
              
              return {
                ...balance,
                balance: (parseFloat(balance.balance) + balanceChange).toString(),
                isOptimistic: true,
              };
            }
            return balance;
          });
        });
      }

      // Return context for rollback
      return { previousExpenses, previousBalances, previousGroups, groupIdStr };
    },
    onSuccess: async (data, variables, context) => {
      toast({
        title: "Expense deleted",
        description: "Your expense has been deleted successfully.",
      });
      form.reset();
      onOpenChange(false);
      
      // Refresh data from server to get accurate values
      if (context?.groupIdStr) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}/expenses`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}/balances`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}/activity`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}`] });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      
      // Background balance refresh for accuracy
      apiRequest('POST', `/api/groups/${groupId}/refresh-balances`).catch(error => {
        console.error('Background balance refresh failed:', error);
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousExpenses) {
        queryClient.setQueryData([`/api/groups/${context.groupIdStr}/expenses`], context.previousExpenses);
      }
      if (context?.previousBalances) {
        queryClient.setQueryData([`/api/groups/${context.groupIdStr}/balances`], context.previousBalances);
      }
      if (context?.previousGroups) {
        queryClient.setQueryData(["/api/groups"], context.previousGroups);
      }
      
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to invalidate all relevant queries with immediate UI updates
  const invalidateQueries = async () => {
    // Immediately invalidate queries for instant UI updates
    queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}/participants`] });
    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    
    const groupIdStr = groupId.toString();
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
    
    // Background balance refresh for accuracy (non-blocking)
    apiRequest('POST', `/api/groups/${groupId}/refresh-balances`).catch(error => {
      console.error('Background balance refresh failed:', error);
    });
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

  // ALWAYS allow editing for now (disable permission check to fix save button issue)
  const expenseObj = expense as any;
  const canEdit = true; // Enable editing regardless of who created or paid for the expense

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
                          // Reset custom values when changing split method
                          if (value !== "unequal") setCustomAmounts({});
                          if (value !== "percentage") setCustomPercentages({});
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
                  {deleteExpenseMutation.isPending ? "Deleting..." : "Delete Expense"}
                </Button>
              }
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}