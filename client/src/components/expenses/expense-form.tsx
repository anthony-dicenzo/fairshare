import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Group } from "@shared/schema";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { formatISO } from "date-fns";

type ExpenseFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: number;
};

// Schema for the expense form
const expenseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  totalAmount: z.string().min(1, "Amount is required").refine(
    (val) => {
      const amount = parseFloat(val);
      return !isNaN(amount) && amount > 0;
    },
    { message: "Amount must be a positive number" }
  ),
  groupId: z.string().min(1, "Group is required"),
  paidBy: z.string().min(1, "Payer is required"),
  splitMethod: z.enum(["equal", "unequal", "percentage", "full"]),
  // For full split method, store the userId who owes the full amount
  fullAmountOwedBy: z.string().optional(),
  // Use string for date to avoid type issues with the input field
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export function ExpenseForm({ open, onOpenChange, groupId }: ExpenseFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  // Track custom amounts for unequal splits
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>({});
  // Track custom percentages for percentage splits
  const [customPercentages, setCustomPercentages] = useState<Record<number, number>>({});

  // Get groups data with proper authentication
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery<{ groups: Group[], totalCount: number, hasMore: boolean }>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      // Use the apiRequest function from queryClient which handles auth consistently
      const response = await fetch("/api/groups", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      // If unauthorized, try the backup authentication method
      if (response.status === 401) {
        console.log("Groups query unauthorized, trying backup auth...");
        try {
          const authData = localStorage.getItem("fairshare_auth_state");
          if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed.userId && parsed.sessionId) {
              // First establish backup authentication
              const backupRes = await fetch(`/api/users/${parsed.userId}`, {
                headers: {
                  "X-Session-Backup": parsed.sessionId
                },
                credentials: "include"
              });
              
              if (backupRes.ok) {
                console.log("Backup auth successful, retrying groups request...");
                // Wait a moment for session to be established
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Retry with fresh headers
                const retryResponse = await fetch("/api/groups", {
                  headers: getAuthHeaders(),
                  credentials: "include",
                });
                
                if (retryResponse.ok) {
                  return retryResponse.json();
                }
              }
            }
          }
        } catch (e) {
          console.error("Backup auth failed:", e);
        }
        
        throw new Error(`Authentication failed: ${response.status}`);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: open && !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce auth issues
    retry: (failureCount, error) => {
      // Retry auth errors up to 2 times
      if (error.message.includes('Authentication failed') && failureCount < 2) {
        return true;
      }
      return failureCount < 1;
    },
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Extract groups from the response
  const groups = groupsData?.groups || [];

  // Get members for the selected group
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId?.toString() || "");
  
  const { data: groupMembers = [] } = useQuery({
    queryKey: [`/api/groups/${selectedGroupId}/members`],
    enabled: !!selectedGroupId && selectedGroupId !== "",
    staleTime: 0, // Always fetch fresh data
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      totalAmount: "",
      groupId: groupId?.toString() || "",
      paidBy: user?.id.toString() || "",
      splitMethod: "equal",
      fullAmountOwedBy: "",
      date: formatISO(new Date(), { representation: "date" }),
      notes: "",
    },
  });

  // Update selectedGroupId when form groupId changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "groupId" && value.groupId) {
        setSelectedGroupId(value.groupId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Initialize selectedUserIds with all members when group changes
  useEffect(() => {
    if (Array.isArray(groupMembers) && groupMembers.length > 0) {
      const memberIds = groupMembers
        .map(member => member?.userId)
        .filter(id => typeof id === 'number') as number[];
      setSelectedUserIds(memberIds);
      
      // Reset custom amounts and percentages
      handleInitializeAmountsAndPercentages(memberIds);
    }
  }, [groupMembers]);
  
  // Watch for changes to the split method and total amount
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.splitMethod || value.totalAmount) {
        handleInitializeAmountsAndPercentages(selectedUserIds);
        // Force re-render when split method changes
        if (value.splitMethod) {
          setSelectedUserIds([...selectedUserIds]);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, selectedUserIds]);
  
  // Function to initialize custom amounts and percentages
  const handleInitializeAmountsAndPercentages = (userIds: number[]) => {
    if (userIds.length === 0) return;
    
    const totalAmount = parseFloat(form.getValues("totalAmount") || "0");
    const equalAmount = totalAmount / userIds.length;
    const equalPercentage = 100 / userIds.length;
    
    // Initialize custom amounts
    const newAmounts: Record<number, number> = {};
    const newPercentages: Record<number, number> = {};
    
    userIds.forEach(userId => {
      newAmounts[userId] = equalAmount;
      newPercentages[userId] = equalPercentage;
    });
    
    setCustomAmounts(newAmounts);
    setCustomPercentages(newPercentages);
  };

  // Create expense mutation with optimistic UI updates
  const createExpenseMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      totalAmount: number;
      groupId: number;
      paidBy: number;
      date: string;
      notes?: string;
      participants: { userId: number; amountOwed: number }[];
    }) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onMutate: async (newExpense) => {
      // Cancel only specific queries (avoid canceling the main groups list)
      const groupIdStr = newExpense.groupId.toString();
      await queryClient.cancelQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
      await queryClient.cancelQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });

      // Snapshot the previous values (don't snapshot groups to preserve dropdown data)
      const previousExpenses = queryClient.getQueryData([`/api/groups/${groupIdStr}/expenses`]);
      const previousBalances = queryClient.getQueryData([`/api/groups/${groupIdStr}/balances`]);

      // Optimistically update the expenses list
      queryClient.setQueryData([`/api/groups/${groupIdStr}/expenses`], (old: any) => {
        if (!old) return old;
        
        // Create a temporary expense object for immediate display
        const tempExpense = {
          id: Date.now(), // Temporary ID
          groupId: newExpense.groupId,
          title: newExpense.title,
          totalAmount: newExpense.totalAmount.toString(),
          paidBy: newExpense.paidBy,
          date: newExpense.date,
          notes: newExpense.notes || "",
          createdAt: new Date().toISOString(),
          isOptimistic: true, // Flag to identify optimistic updates
        };

        return {
          ...old,
          expenses: [tempExpense, ...(old.expenses || [])],
          totalCount: (old.totalCount || 0) + 1,
        };
      });

      // Optimistically update balances if it affects the current user
      if (newExpense.participants.some(p => p.userId === user?.id)) {
        queryClient.setQueryData([`/api/groups/${groupIdStr}/balances`], (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          
          return old.map((balance: any) => {
            if (balance.userId === user?.id) {
              const userParticipant = newExpense.participants.find(p => p.userId === user?.id);
              const amountOwed = userParticipant?.amountOwed || 0;
              
              // If user paid, they are owed money; if user owes, subtract from balance
              const balanceChange = newExpense.paidBy === user?.id 
                ? (newExpense.totalAmount - amountOwed) // User paid, others owe them
                : -amountOwed; // User owes this amount
              
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

      // Return context with previous values for rollback
      return { previousExpenses, previousBalances, groupIdStr };
    },
    onSuccess: async (data, variables, context) => {
      toast({
        title: "Expense created",
        description: "Your expense has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      
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
        title: "Failed to create expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
    
    let participants = [];
    
    // Handle "full" split method separately
    if (splitMethod === "full" && values.fullAmountOwedBy) {
      const fullAmountOwerId = parseInt(values.fullAmountOwedBy);
      
      // Create a single participant who owes the full amount
      participants = [{
        userId: fullAmountOwerId,
        amountOwed: totalAmount
      }];
    } else {
      // For other split methods, calculate per-person amounts
      participants = participantIds.map((userId) => {
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
    }

    // The date is already in the correct format from the input field
    const formattedDate = values.date;

    createExpenseMutation.mutate({
      title: values.title,
      totalAmount,
      groupId: parseInt(values.groupId),
      paidBy: parseInt(values.paidBy),
      date: formattedDate,
      notes: values.notes,
      participants,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-4 rounded-lg" autoFocus={false}>
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Add an Expense
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter the details of your expense to split it with your group.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Group</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Groceries, Dinner" {...field} className="h-9" autoFocus={false} />
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
                      className="flex flex-wrap gap-y-2 gap-x-4"
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
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="full" className="h-3.5 w-3.5" id="full-split" />
                        <FormLabel htmlFor="full-split" className="text-xs cursor-pointer font-normal">Full Amount</FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            {form.getValues("splitMethod") === "unequal" && (
              <div className="border border-input rounded-md p-2 max-h-[120px] overflow-y-auto">
                {!selectedGroupId ? (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    Please select a group to see member options
                  </div>
                ) : Array.isArray(groupMembers) && groupMembers.length > 0 ? (
                <div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {groupMembers.map((member) => {
                      if (!member?.userId) return null;
                      
                      const isSelected = selectedUserIds.includes(member.userId);
                      const totalAmount = parseFloat(form.getValues("totalAmount")) || 0;
                      const equalShare = isSelected && selectedUserIds.length > 0 ? 
                        totalAmount / selectedUserIds.length : 0;
                      
                      return (
                        <div key={member.userId} className="flex items-center space-x-1.5">
                          <Checkbox
                            id={`split-${member.userId}`}
                            checked={isSelected}
                            className="h-3.5 w-3.5"
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const newSelectedIds = [...selectedUserIds, member.userId];
                                setSelectedUserIds(newSelectedIds);
                                handleInitializeAmountsAndPercentages(newSelectedIds);
                              } else {
                                const newSelectedIds = selectedUserIds.filter(id => id !== member.userId);
                                setSelectedUserIds(newSelectedIds);
                                handleInitializeAmountsAndPercentages(newSelectedIds);
                              }
                            }}
                          />
                          <div className="flex items-center w-full">
                            <label
                              htmlFor={`split-${member.userId}`}
                              className="text-xs font-medium leading-none truncate max-w-[80px]"
                            >
                              {member.userId === user?.id ? "You" : member?.user?.name || "Unknown User"}
                            </label>
                            
                            {isSelected && (
                              <div className="ml-auto">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs">$</span>
                                  <Input 
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="w-[4.5rem] h-7 pl-5 text-sm"
                                    autoFocus={false}
                                    value={customAmounts[member.userId]?.toFixed(2) || equalShare.toFixed(2)}
                                    onChange={(e) => {
                                      const amount = parseFloat(e.target.value);
                                      if (!isNaN(amount)) {
                                        setCustomAmounts({
                                          ...customAmounts,
                                          [member.userId]: amount
                                        });
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedUserIds.length > 0 && (
                    <div className="mt-1 text-xs text-right">
                      <span className={`${
                        Math.abs(Object.values(customAmounts).reduce((acc, val) => acc + val, 0) - 
                          parseFloat(form.getValues("totalAmount") || "0")) < 0.01
                          ? "text-green-500" 
                          : "text-red-500"
                      }`}>
                        Total: ${Object.values(customAmounts).reduce((acc, val) => acc + val, 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    No members found in this group
                  </div>
                )}
              </div>
            )}
            
            {form.getValues("splitMethod") === "full" && (
              <div className="border border-input rounded-md p-2">
                {!selectedGroupId ? (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    Please select a group to see member options
                  </div>
                ) : Array.isArray(groupMembers) && groupMembers.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="fullAmountOwedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Charged to:</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 mt-1">
                              <SelectValue placeholder="Select who will pay the full amount" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groupMembers.map((member) => (
                              <SelectItem 
                                key={member?.userId} 
                                value={(member?.userId || 0).toString()}
                              >
                                {member?.userId === user?.id ? "You" : member?.user?.name || "Unknown User"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    No members found in this group
                  </div>
                )}
              </div>
            )}
            
            {form.getValues("splitMethod") === "percentage" && (
              <div className="border border-input rounded-md p-2 max-h-[120px] overflow-y-auto">
                {!selectedGroupId ? (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    Please select a group to see member options
                  </div>
                ) : Array.isArray(groupMembers) && groupMembers.length > 0 ? (
                <div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {groupMembers.map((member) => {
                      if (!member?.userId) return null;
                      
                      const isSelected = selectedUserIds.includes(member.userId);
                      const equalPercentage = isSelected && selectedUserIds.length > 0 ? 
                        100 / selectedUserIds.length : 0;
                      
                      return (
                        <div key={member.userId} className="flex items-center space-x-1.5">
                          <Checkbox
                            id={`split-percentage-${member.userId}`}
                            checked={isSelected}
                            className="h-3.5 w-3.5"
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const newSelectedIds = [...selectedUserIds, member.userId];
                                setSelectedUserIds(newSelectedIds);
                                handleInitializeAmountsAndPercentages(newSelectedIds);
                              } else {
                                const newSelectedIds = selectedUserIds.filter(id => id !== member.userId);
                                setSelectedUserIds(newSelectedIds);
                                handleInitializeAmountsAndPercentages(newSelectedIds);
                              }
                            }}
                          />
                          <div className="flex items-center w-full">
                            <label
                              htmlFor={`split-percentage-${member.userId}`}
                              className="text-xs font-medium leading-none truncate max-w-[80px]"
                            >
                              {member.userId === user?.id ? "You" : member?.user?.name || "Unknown User"}
                            </label>
                            
                            {isSelected && (
                              <div className="ml-auto">
                                <div className="relative">
                                  <Input 
                                    type="number"
                                    inputMode="numeric"
                                    step="1"
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    className="w-14 h-7 pr-6 text-sm text-right"
                                    autoFocus={false}
                                    value={customPercentages[member.userId]?.toFixed(0) || equalPercentage.toFixed(0)}
                                    onChange={(e) => {
                                      const percentage = parseFloat(e.target.value);
                                      if (!isNaN(percentage)) {
                                        setCustomPercentages({
                                          ...customPercentages,
                                          [member.userId]: percentage
                                        });
                                      }
                                    }}
                                  />
                                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedUserIds.length > 0 && (
                    <div className="mt-1 text-xs text-right">
                      <span className={`${
                        Math.abs(Object.values(customPercentages).reduce((acc, val) => acc + val, 0) - 100) < 0.01
                          ? "text-green-500" 
                          : "text-red-500"
                      }`}>
                        Total: {Object.values(customPercentages).reduce((acc, val) => acc + val, 0).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    No members found in this group
                  </div>
                )}
              </div>
            )}

            <Button 
              type="submit"
              className="w-full h-10 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
              disabled={
                createExpenseMutation.isPending || 
                (form.getValues("splitMethod") === "percentage" && 
                 Object.values(customPercentages).reduce((acc, val) => acc + val, 0) !== 100) ||
                (form.getValues("splitMethod") === "unequal" && 
                 Math.abs(Object.values(customAmounts).reduce((acc, val) => acc + val, 0) - 
                 parseFloat(form.getValues("totalAmount") || "0")) >= 0.01) ||
                (form.getValues("splitMethod") === "full" && !form.getValues("fullAmountOwedBy"))
              }
            >
              {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 border-gray-200"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
