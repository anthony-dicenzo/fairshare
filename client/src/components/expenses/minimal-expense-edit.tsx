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
  const [splitMethod, setSplitMethod] = useState<"equal" | "unequal" | "percentage">("equal");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<number, number>>({});
  
  // Fetch expense details when the modal is open
  const { data: expense, isLoading: isLoadingExpense } = useQuery<ExpenseData>({
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
      
      // Determine split method based on participant data
      if (expenseParticipants.length > 1) {
        const firstAmount = parseFloat(String(expenseParticipants[0]?.amountOwed) || '0');
        const totalExpenseAmount = parseFloat(amount || '0');
        
        // Check if all amounts are equal
        const isEqualSplit = expenseParticipants.every((p: ExpenseParticipantData) => 
          Math.abs(parseFloat(String(p.amountOwed) || '0') - firstAmount) < 0.01);
        
        if (isEqualSplit) {
          setSplitMethod("equal");
        } else {
          // Check if amounts might be percentage-based
          const totalOwed = expenseParticipants.reduce(
            (sum: number, p: ExpenseParticipantData) => sum + parseFloat(String(p.amountOwed) || '0'), 
            0
          );
          
          if (Math.abs(totalOwed - totalExpenseAmount) < 0.01) {
            setSplitMethod("unequal");
          } else {
            setSplitMethod("percentage");
          }
        }
      }
      
      // Set up custom amounts and percentages
      const newAmounts: Record<number, number> = {};
      const newPercentages: Record<number, number> = {};
      const totalAmount = parseFloat(amount || '0');
      
      expenseParticipants.forEach((p: ExpenseParticipantData) => {
        const userId = p.userId;
        const amountOwed = parseFloat(String(p.amountOwed) || '0');
        
        newAmounts[userId] = amountOwed;
        
        if (totalAmount > 0) {
          newPercentages[userId] = (amountOwed / totalAmount) * 100;
        } else {
          newPercentages[userId] = 100 / expenseParticipants.length;
        }
      });
      
      setCustomAmounts(newAmounts);
      setCustomPercentages(newPercentages);
    }
  }, [expenseParticipants, amount]);

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
  
  // Handler to recalculate amounts based on split method
  const recalculateAmounts = () => {
    if (selectedUserIds.length === 0) return;
    
    const totalAmountVal = parseFloat(amount || "0");
    if (isNaN(totalAmountVal) || totalAmountVal <= 0) return;
    
    if (splitMethod === "equal") {
      // Equal split
      const equalAmount = totalAmountVal / selectedUserIds.length;
      const equalPercentage = 100 / selectedUserIds.length;
      
      const newAmounts: Record<number, number> = {};
      const newPercentages: Record<number, number> = {};
      
      selectedUserIds.forEach(userId => {
        newAmounts[userId] = equalAmount;
        newPercentages[userId] = equalPercentage;
      });
      
      setCustomAmounts(newAmounts);
      setCustomPercentages(newPercentages);
    } else if (splitMethod === "percentage") {
      // Percentage split - update amounts based on percentages
      const newAmounts: Record<number, number> = {};
      
      selectedUserIds.forEach(userId => {
        const percentage = customPercentages[userId] || 100 / selectedUserIds.length;
        newAmounts[userId] = (totalAmountVal * percentage) / 100;
      });
      
      setCustomAmounts(newAmounts);
    }
  };
  
  // Effect to recalculate amounts when split method or amount changes
  useEffect(() => {
    if (open && selectedUserIds.length > 0) {
      recalculateAmounts();
    }
  }, [splitMethod, amount, selectedUserIds]);
  
  // Handler for updating a user's custom amount
  const handleAmountChange = (userId: number, newAmount: string) => {
    const parsed = parseFloat(newAmount);
    if (!isNaN(parsed)) {
      setCustomAmounts({
        ...customAmounts,
        [userId]: parsed
      });
      
      // Also update percentage if total amount is valid
      const totalAmountVal = parseFloat(amount || "0");
      if (totalAmountVal > 0) {
        setCustomPercentages({
          ...customPercentages,
          [userId]: (parsed / totalAmountVal) * 100
        });
      }
    }
  };
  
  // Handler for updating a user's custom percentage
  const handlePercentageChange = (userId: number, newPercentage: string) => {
    const parsed = parseFloat(newPercentage);
    if (!isNaN(parsed)) {
      setCustomPercentages({
        ...customPercentages,
        [userId]: parsed
      });
      
      // Also update amount based on percentage
      const totalAmountVal = parseFloat(amount || "0");
      if (totalAmountVal > 0) {
        setCustomAmounts({
          ...customAmounts,
          [userId]: (parsed * totalAmountVal) / 100
        });
      }
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
    const participants = selectedUserIds.map(userId => {
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
              
              {/* Split Method Selection */}
              <div>
                <Label className="text-sm font-medium">Split:</Label>
                <RadioGroup 
                  value={splitMethod} 
                  onValueChange={(val) => setSplitMethod(val as "equal" | "unequal" | "percentage")}
                  className="flex items-center space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="equal" id="equal" />
                    <Label htmlFor="equal" className="text-sm font-normal">Equal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unequal" id="unequal" />
                    <Label htmlFor="unequal" className="text-sm font-normal">Unequal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="text-sm font-normal">Percentage</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* User selection for paid by */}
              <div>
                <label htmlFor="paidBy" className="text-sm font-medium">From</label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger className="h-10 mt-1">
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
              
              {/* Participants Section */}
              {splitMethod !== "equal" && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Split Details:</h3>
                  <div className="border rounded-md p-3 space-y-3">
                    {Array.isArray(groupMembers) && groupMembers.map((member: any) => {
                      const userId = member.user.id;
                      const isSelected = selectedUserIds.includes(userId);
                      
                      return (
                        <div key={userId} className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
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
                              />
                              <label htmlFor={`user-${userId}`} className="ml-2 text-sm">
                                {member.user.name}
                              </label>
                            </div>
                            
                            {isSelected && (
                              <div className="flex items-center space-x-2">
                                {splitMethod === "unequal" && (
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs">$</span>
                                    <Input
                                      type="text"
                                      value={customAmounts[userId]?.toFixed(2) || "0.00"}
                                      onChange={(e) => handleAmountChange(userId, e.target.value)}
                                      className="w-20 h-8 pl-6 text-xs"
                                    />
                                  </div>
                                )}
                                
                                {splitMethod === "percentage" && (
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      value={customPercentages[userId]?.toFixed(1) || "0.0"}
                                      onChange={(e) => handlePercentageChange(userId, e.target.value)}
                                      className="w-16 h-8 pr-6 text-xs text-right"
                                    />
                                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">%</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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