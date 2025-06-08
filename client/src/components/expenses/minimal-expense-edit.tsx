import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingBag, Trash, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ExpenseData {
  id: number;
  groupId: number;
  paidBy: number;
  title: string;
  totalAmount: number;
  date: string;
  notes?: string;
}

interface ExpenseParticipantData {
  userId: number;
  expenseId: number;
  amountOwed: number;
}

interface GroupMemberData {
  id: number;
  groupId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
  };
}

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
  
  // Split method state
  const [splitMethod, setSplitMethod] = useState<"equal" | "unequal" | "percentage" | "full">("equal");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<number, number>>({});
  const [fullAmountOwedBy, setFullAmountOwedBy] = useState<number | null>(null);
  
  // Fetch expense details when the modal is open
  const { data: expense, isLoading: isLoadingExpense } = useQuery<ExpenseData>({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: open && expenseId > 0,
    staleTime: 0
  });
  
  // Use an effect to populate form fields when data changes
  useEffect(() => {
    if (expense) {
      // Set all the basic form values from the expense data
      setTitle(expense.title || "");
      setAmount(expense.totalAmount?.toString() || "");
      setPaidBy(expense.paidBy?.toString() || "");
      
      // Format and handle the date properly
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
  const { data: expenseParticipants = [] } = useQuery<ExpenseParticipantData[]>({
    queryKey: [`/api/expenses/${expenseId}/participants`],
    enabled: open && expenseId > 0,
    staleTime: 0,
  });
  
  // Fetch group members
  const { data: groupMembers = [] } = useQuery<GroupMemberData[]>({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: open && groupId > 0,
    staleTime: 0,
  });
  
  // Determine split method and populate participant data when expense participants are loaded
  useEffect(() => {
    if (Array.isArray(expenseParticipants) && expenseParticipants.length > 0 && expenseParticipants[0]?.userId) {
      // Extract participant user IDs
      const participantIds = expenseParticipants.map((p: ExpenseParticipantData) => p.userId);
      setSelectedUserIds(participantIds);
      
      // Set up custom amounts and percentages
      const newAmounts: Record<number, number> = {};
      const newPercentages: Record<number, number> = {};
      const totalAmount = parseFloat(amount || '0');
      const equalAmount = totalAmount / participantIds.length;
      const equalPercentage = 100 / participantIds.length;
      
      // Determine split method based on participant data
      if (expenseParticipants.length === 1) {
        // If there's only one participant, it's a full amount split
        setSplitMethod("full");
        setFullAmountOwedBy(expenseParticipants[0].userId);
        console.log("Detected full amount split for user:", expenseParticipants[0].userId);
      } else if (expenseParticipants.length > 1) {
        const firstAmount = parseFloat(String(expenseParticipants[0]?.amountOwed || '0'));
        
        // Check if all amounts are equal
        const isEqualSplit = expenseParticipants.every((p: ExpenseParticipantData) => 
          Math.abs(parseFloat(String(p.amountOwed || '0')) - firstAmount) < 0.01);
        
        if (isEqualSplit) {
          setSplitMethod("equal");
        } else {
          // Check if amounts might be percentage-based
          const totalOwed = expenseParticipants.reduce(
            (sum: number, p: ExpenseParticipantData) => sum + parseFloat(String(p.amountOwed || '0')), 
            0
          );
          
          if (Math.abs(totalOwed - totalAmount) < 0.01) {
            setSplitMethod("unequal");
          } else {
            setSplitMethod("percentage");
          }
        }
      }
      
      // Populate amounts and percentages from expense participants
      if (expenseParticipants.length > 0) {
        expenseParticipants.forEach((p: ExpenseParticipantData) => {
          const userId = p.userId;
          const amountOwed = parseFloat(String(p.amountOwed || '0'));
          
          newAmounts[userId] = amountOwed;
          
          if (totalAmount > 0) {
            newPercentages[userId] = (amountOwed / totalAmount) * 100;
          } else {
            newPercentages[userId] = equalPercentage;
          }
        });
      }
      
      // Make sure all selected users have values
      participantIds.forEach(userId => {
        if (newAmounts[userId] === undefined) {
          newAmounts[userId] = equalAmount;
        }
        if (newPercentages[userId] === undefined || newPercentages[userId] === 0) {
          newPercentages[userId] = equalPercentage;
        }
      });
      
      setCustomAmounts(newAmounts);
      setCustomPercentages(newPercentages);
    }
    // Only depend on expenseParticipants, not amount - this prevents a circular dependency
  }, [expenseParticipants]);

  // Helper to invalidate queries after updates
  const invalidateQueries = async () => {
    try {
      // First, explicitly refresh the balances
      await apiRequest('POST', `/api/groups/${groupId}/refresh-balances`);
      
      // Invalidate the specific expense queries
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}/participants`] });
      
      // Invalidate general queries
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      
      // For group-specific queries, ensure proper invalidation
      const groupIdStr = groupId.toString();
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] });
      
      // For expense deletion specifically, we need to update the group expenses cache
      // This is important for immediate UI updates
      if (deleteExpenseMutation.isPending || deleteExpenseMutation.isSuccess) {
        // When deleting an expense, we need to update the cache directly
        // Get the current expenses data from the cache
        const expensesQueryKey = [`/api/groups/${groupIdStr}/expenses`];
        const previousData = queryClient.getQueryData(expensesQueryKey);
        
        if (previousData) {
          // For infinite queries, we need to update the pages
          queryClient.setQueryData(expensesQueryKey, (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;
            
            // Filter out the deleted expense from each page
            const updatedPages = oldData.pages.map((page: any) => ({
              ...page,
              expenses: page.expenses.filter((expense: any) => expense.id !== expenseId)
            }));
            
            return {
              ...oldData,
              pages: updatedPages
            };
          });
        }
      }
      
      // Always invalidate the expenses query to ensure data consistency
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
      
      // Force a refetch of all queries for data consistency
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

  // Delete expense mutation with optimistic updates
  const deleteExpenseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/expenses/${expenseId}`);
      return res.json();
    },
    onMutate: async () => {
      // Cancel queries to prevent race conditions
      const groupIdStr = groupId.toString();
      await queryClient.cancelQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
      await queryClient.cancelQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });

      // Snapshot previous values for rollback
      const previousExpenses = queryClient.getQueryData([`/api/groups/${groupIdStr}/expenses`]);
      const previousBalances = queryClient.getQueryData([`/api/groups/${groupIdStr}/balances`]);

      // Optimistically remove expense from list
      queryClient.setQueryData([`/api/groups/${groupIdStr}/expenses`], (old: any) => {
        if (!old || !old.expenses) return old;
        return {
          ...old,
          expenses: old.expenses.filter((exp: any) => exp.id !== expenseId),
          totalCount: Math.max(0, (old.totalCount || 0) - 1),
        };
      });

      return { previousExpenses, previousBalances, groupIdStr };
    },
    onSuccess: async (data, variables, context) => {
      toast({
        title: "Expense deleted",
        description: "Your expense has been deleted successfully.",
      });
      
      onOpenChange(false);
      
      // Immediately refresh all related data for instant UI updates
      if (context?.groupIdStr) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}/expenses`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}/balances`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}/activity`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/groups/${context.groupIdStr}`] })
        ]);
        
        // Force immediate refetch of balances
        await queryClient.refetchQueries({ queryKey: [`/api/groups/${context.groupIdStr}/balances`] });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousExpenses) {
        queryClient.setQueryData([`/api/groups/${context.groupIdStr}/expenses`], context.previousExpenses);
      }
      if (context?.previousBalances) {
        queryClient.setQueryData([`/api/groups/${context.groupIdStr}/balances`], context.previousBalances);
      }
      
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handler to recalculate amounts based on split method
  const recalculateAmounts = () => {
    // Full amount split is handled separately - it doesn't depend on selectedUserIds
    if (splitMethod === "full") {
      // Just ensure we have a valid selected user for the full amount
      if (paidBy && groupMembers && Array.isArray(groupMembers) && groupMembers.length > 0) {
        // If no user is currently selected to owe the full amount, select the first non-payer
        if (!fullAmountOwedBy) {
          const nonPayers = groupMembers
            .filter((member: any) => member.user.id.toString() !== paidBy)
            .map((member: any) => member.user.id);
            
          if (nonPayers.length > 0) {
            setFullAmountOwedBy(nonPayers[0]);
          }
        }
      }
      return; // Exit early since full amount doesn't need further calculation
    }
    
    // For other split methods, proceed with existing logic
    if (selectedUserIds.length === 0) return;
    
    const totalAmountVal = parseFloat(amount || "0");
    if (isNaN(totalAmountVal) || totalAmountVal <= 0) return;
    
    // Calculate default equal values
    const equalAmount = totalAmountVal / selectedUserIds.length;
    const equalPercentage = 100 / selectedUserIds.length;
    
    const newAmounts: Record<number, number> = {};
    const newPercentages: Record<number, number> = {};
    
    if (splitMethod === "equal") {
      // Equal split - set everything evenly
      selectedUserIds.forEach(userId => {
        newAmounts[userId] = equalAmount;
        newPercentages[userId] = equalPercentage;
      });
      
      setCustomAmounts(newAmounts);
      setCustomPercentages(newPercentages);
    } 
    else if (splitMethod === "percentage") {
      // Initialize everything to equal percentages first if no percentages exist or they're zero
      let needsInitialization = false;
      
      // Check if we need to initialize the percentages
      selectedUserIds.forEach(userId => {
        if (customPercentages[userId] === undefined || customPercentages[userId] === 0) {
          needsInitialization = true;
        }
      });
      
      // If any user is missing a percentage or has zero, initialize all to equal
      if (needsInitialization) {
        selectedUserIds.forEach(userId => {
          newPercentages[userId] = equalPercentage;
          newAmounts[userId] = (totalAmountVal * equalPercentage) / 100;
        });
        
        setCustomPercentages(newPercentages);
        setCustomAmounts(newAmounts);
      } 
      else {
        // Otherwise update amounts based on existing percentages
        selectedUserIds.forEach(userId => {
          const percentage = customPercentages[userId];
          newAmounts[userId] = (totalAmountVal * percentage) / 100;
        });
        
        setCustomAmounts(newAmounts);
      }
    } 
    else if (splitMethod === "unequal") {
      // Initialize to equal amounts if needed
      let needsInitialization = false;
      
      // Check if we need to initialize the amounts
      selectedUserIds.forEach(userId => {
        if (customAmounts[userId] === undefined || customAmounts[userId] === 0) {
          needsInitialization = true;
        }
      });
      
      // If any user is missing an amount or has zero, initialize all to equal
      if (needsInitialization) {
        selectedUserIds.forEach(userId => {
          newAmounts[userId] = equalAmount;
          newPercentages[userId] = equalPercentage;
        });
        
        setCustomAmounts(newAmounts);
        setCustomPercentages(newPercentages);
      }
    }
  };
  
  // Effect to recalculate amounts when split method changes
  useEffect(() => {
    if (open) {
      // For full split method, we don't need selectedUserIds to be populated
      if (splitMethod === "full" || (splitMethod !== "full" && selectedUserIds.length > 0)) {
        recalculateAmounts();
      }
    }
  // We intentionally leave out dependent variables that would cause infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitMethod, selectedUserIds, open, paidBy]);
  
  // Handler for updating a user's custom amount with direct number handling
  const handleAmountChange = (userId: number, newAmount: string) => {
    console.log("Amount change:", userId, newAmount);
    // For a number input, the value comes as a string but we can parse it directly
    const parsed = newAmount === "" ? 0 : Number(newAmount);
    
    // Create a new object to avoid mutating the existing state
    const updatedAmounts = {...customAmounts};
    updatedAmounts[userId] = parsed;
    setCustomAmounts(updatedAmounts);
    
    // Update the percentage based on the new amount
    const totalAmountVal = parseFloat(amount || "0");
    if (totalAmountVal > 0) {
      const percentage = (parsed / totalAmountVal) * 100;
      
      // Create a new object to avoid mutating the existing state
      const updatedPercentages = {...customPercentages};
      updatedPercentages[userId] = percentage;
      setCustomPercentages(updatedPercentages);
    }
  };
  
  // Handler for updating a user's custom percentage with direct number handling
  const handlePercentageChange = (userId: number, newPercentage: string) => {
    console.log("Percentage change:", userId, newPercentage);
    // For a number input, the value comes as a string but we can parse it directly
    const parsed = newPercentage === "" ? 0 : Number(newPercentage);
    
    // Create a new object to avoid mutating the existing state
    const updatedPercentages = {...customPercentages};
    updatedPercentages[userId] = parsed;
    setCustomPercentages(updatedPercentages);
    
    // Update the amount based on the new percentage
    const totalAmountVal = parseFloat(amount || "0");
    if (totalAmountVal > 0) {
      const calculatedAmount = (parsed * totalAmountVal) / 100;
      
      // Create a new object to avoid mutating the existing state
      const updatedAmounts = {...customAmounts};
      updatedAmounts[userId] = calculatedAmount;
      setCustomAmounts(updatedAmounts);
    }
  };
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalAmountVal = parseFloat(amount);
    if (isNaN(totalAmountVal) || totalAmountVal <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate final participant amounts based on split method
    let participants: { userId: number; amountOwed: number }[] = [];
    
    // Handle full amount case differently
    if (splitMethod === "full") {
      // Verify that someone is selected to owe the full amount
      if (!fullAmountOwedBy) {
        toast({
          title: "Missing selection",
          description: "Please select who owes the full amount.",
          variant: "destructive",
        });
        return;
      }
      
      // Add the single participant who owes the full amount
      participants = [{
        userId: fullAmountOwedBy,
        amountOwed: totalAmountVal,
      }];
      
      console.log("Full amount split:", participants);
    } else {
      // For other split methods, use the existing logic
      participants = selectedUserIds.map(userId => {
        let amountOwed = 0;
        
        if (splitMethod === "equal") {
          amountOwed = totalAmountVal / selectedUserIds.length;
        } 
        else if (splitMethod === "unequal") {
          amountOwed = customAmounts[userId] || totalAmountVal / selectedUserIds.length;
        } 
        else if (splitMethod === "percentage") {
          const percentage = customPercentages[userId] || 100 / selectedUserIds.length;
          amountOwed = (totalAmountVal * percentage) / 100;
        }
        
        return {
          userId,
          amountOwed,
        };
      });
    }
    
    // If no participants (shouldn't happen), add the current user
    if (participants.length === 0 && user?.id) {
      participants.push({
        userId: user.id,
        amountOwed: totalAmountVal,
      });
    }
    
    // Update the expense
    updateExpenseMutation.mutate({
      title,
      totalAmount: totalAmountVal,
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
      <DialogContent className="sm:max-w-[400px] p-3 rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <DialogTitle className="flex items-center gap-1 text-sm">
            <ShoppingBag className="h-4 w-4 text-[#E3976E]" />
            Edit Expense
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Title and Amount Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="title" className="text-xs font-medium">Title</label>
              <Input 
                id="title"
                placeholder="e.g. Groceries" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 mt-1 text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="amount" className="text-xs font-medium">Amount</label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-2 text-xs">$</span>
                <Input 
                  id="amount"
                  type="text"
                  placeholder="0.00" 
                  className="pl-6 h-8 text-sm" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Date, Notes Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="date" className="text-xs font-medium">Date</label>
              <Input 
                id="date"
                type="date" 
                className="h-8 mt-1 text-sm" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="notes" className="text-xs font-medium">Notes (Optional)</label>
              <Input 
                id="notes"
                placeholder="Add notes" 
                className="h-8 mt-1 text-sm" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          {/* Split and From Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium">Split:</Label>
              <RadioGroup 
                value={splitMethod} 
                onValueChange={(val) => setSplitMethod(val as "equal" | "unequal" | "percentage" | "full")}
                className="flex flex-wrap items-center gap-2 mt-1"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="equal" id="equal" className="h-3 w-3" />
                  <Label htmlFor="equal" className="text-xs font-normal">Equal</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="unequal" id="unequal" className="h-3 w-3" />
                  <Label htmlFor="unequal" className="text-xs font-normal">Unequal</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="percentage" id="percentage" className="h-3 w-3" />
                  <Label htmlFor="percentage" className="text-xs font-normal">%</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="full" id="full" className="h-3 w-3" />
                  <Label htmlFor="full" className="text-xs font-normal">Full Amount</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <label htmlFor="paidBy" className="text-xs font-medium">From</label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger className="h-8 mt-1 text-sm">
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(groupMembers) && groupMembers.map((member: any) => (
                    <SelectItem key={member.user.id} value={member.user.id.toString()}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Full Amount Split Section */}
          {splitMethod === "full" && (
            <div className="mt-1">
              <h3 className="text-xs font-medium mb-1">Who owes the full amount?</h3>
              <div className="border rounded-md p-2">
                <div className="grid grid-cols-1 gap-1">
                  <RadioGroup 
                    value={fullAmountOwedBy?.toString() || ""}
                    onValueChange={(val) => setFullAmountOwedBy(val ? parseInt(val) : null)}
                    className="space-y-1"
                  >
                    {Array.isArray(groupMembers) && 
                      groupMembers
                        .filter((member: any) => member.user.id.toString() !== paidBy) // Exclude the payer
                        .map((member: any) => (
                          <div key={member.user.id} className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={member.user.id.toString()} 
                              id={`full-amount-${member.user.id}`}
                              className="h-3 w-3" 
                            />
                            <Label htmlFor={`full-amount-${member.user.id}`} className="text-xs font-normal">
                              {member.user.name}
                            </Label>
                          </div>
                        ))
                    }
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* Participants Section for unequal or percentage splits */}
          {(splitMethod === "unequal" || splitMethod === "percentage") && (
            <div className="mt-1">
              <h3 className="text-xs font-medium mb-1">Split Details:</h3>
              <div className="border rounded-md p-2 space-y-1">
                {Array.isArray(groupMembers) && groupMembers.map((member: any) => {
                  const userId = member.user.id;
                  const isSelected = selectedUserIds.includes(userId);
                  
                  return (
                    <div key={userId} className="flex justify-between items-center">
                      <div className="flex items-center">
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
                          className="h-3 w-3"
                        />
                        <label htmlFor={`user-${userId}`} className="ml-1 text-xs">
                          {member.user.name}
                        </label>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center">
                          {splitMethod === "unequal" && (
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={customAmounts[userId] || 0}
                                onChange={(e) => handleAmountChange(userId, e.target.value)}
                                className="w-16 h-6 pl-5 text-xs rounded-md border border-input"
                              />
                            </div>
                          )}
                          
                          {splitMethod === "percentage" && (
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                value={customPercentages[userId] || 0}
                                onChange={(e) => handlePercentageChange(userId, e.target.value)}
                                className="w-14 h-6 pr-5 text-xs text-right rounded-md border border-input"
                              />
                              <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs">%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="h-8 text-xs" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            
            <ConfirmDialog
              title="Delete Expense"
              description="Are you sure you want to delete this expense? This action cannot be undone."
              onConfirm={() => deleteExpenseMutation.mutate()}
              trigger={
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="h-8 text-xs"
                  disabled={deleteExpenseMutation.isPending}
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              }
            />
            
            <Button 
              type="submit" 
              className="h-8 text-xs bg-[#E3976E] hover:bg-[#d8875d]" 
              disabled={updateExpenseMutation.isPending}
            >
              {updateExpenseMutation.isPending ? (
                <>Saving</>
              ) : (
                <>Save</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}