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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  splitMethod: z.enum(["equal", "unequal", "percentage"]),
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

  // Get groups data
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

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

  // Create expense mutation
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
    onSuccess: () => {
      toast({
        title: "Expense created",
        description: "Your expense has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      
      // Make sure to properly invalidate all group-related queries
      if (selectedGroupId) {
        const groupIdStr = selectedGroupId;
        // Invalidate the specific group queries
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/expenses`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
        
        // Also invalidate the more general query patterns used in group-page.tsx
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "expenses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "balances"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
      }
    },
    onError: (error) => {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Add an Expense
          </DialogTitle>
          <DialogDescription>
            Enter the details of your expense to split it with your group.
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
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
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
              name="splitMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Split Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="equal" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Equally
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="unequal" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Unequally
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="percentage" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          By percentage
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Split between</FormLabel>
              <div className="mt-2 space-y-2">
                {Array.isArray(groupMembers) && groupMembers.map((member) => {
                  // Skip if userId is not defined
                  if (!member?.userId) return null;
                  
                  const isEqual = form.getValues("splitMethod") === "equal";
                  const isUnequal = form.getValues("splitMethod") === "unequal";
                  const isPercentage = form.getValues("splitMethod") === "percentage";
                  const isSelected = selectedUserIds.includes(member.userId);
                  
                  const totalAmount = parseFloat(form.getValues("totalAmount")) || 0;
                  const equalShare = isSelected && selectedUserIds.length > 0 ? 
                    totalAmount / selectedUserIds.length : 0;
                    
                  // Calculate even percentage for each selected member
                  const equalPercentage = isSelected && selectedUserIds.length > 0 ? 
                    100 / selectedUserIds.length : 0;
                  
                  return (
                    <div key={member.userId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`split-${member.userId}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelectedIds = [...selectedUserIds, member.userId];
                            setSelectedUserIds(newSelectedIds);
                            // Recalculate splits with new member included
                            handleInitializeAmountsAndPercentages(newSelectedIds);
                          } else {
                            const newSelectedIds = selectedUserIds.filter(id => id !== member.userId);
                            setSelectedUserIds(newSelectedIds);
                            // Recalculate splits with this member removed
                            handleInitializeAmountsAndPercentages(newSelectedIds);
                          }
                        }}
                      />
                      <div className="flex items-center space-x-2 w-full">
                        <label
                          htmlFor={`split-${member.userId}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.userId === user?.id ? "You" : member?.user?.name || "Unknown User"}
                        </label>
                        
                        {/* Show amount for equal split (informational) */}
                        {isEqual && isSelected && (
                          <div className="ml-auto text-sm text-muted-foreground">
                            ${equalShare.toFixed(2)}
                          </div>
                        )}
                        
                        {/* Input field for unequal split */}
                        {isUnequal && isSelected && (
                          <div className="ml-auto">
                            <div className="relative">
                              <span className="absolute left-2 top-2 text-xs">$</span>
                              <Input 
                                type="text"
                                placeholder="0.00"
                                className="w-24 h-8 pl-6 text-xs"
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
                        
                        {/* Input field for percentage split */}
                        {isPercentage && isSelected && (
                          <div className="ml-auto">
                            <div className="relative">
                              <Input 
                                type="text"
                                placeholder="0"
                                className="w-24 h-8 pr-6 text-xs text-right"
                                value={customPercentages[member.userId]?.toString() || equalPercentage.toFixed(0)}
                                onChange={(e) => {
                                  const percentage = parseInt(e.target.value);
                                  if (!isNaN(percentage)) {
                                    setCustomPercentages({
                                      ...customPercentages,
                                      [member.userId]: percentage
                                    });
                                  }
                                }}
                              />
                              <span className="absolute right-2 top-2 text-xs">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Show total percentage when using percentage split */}
              {form.getValues("splitMethod") === "percentage" && selectedUserIds.length > 0 && (
                <div className="mt-2 text-xs text-right">
                  <span className={`${
                    // Calculate total percentage
                    Object.values(customPercentages).reduce((acc, val) => acc + val, 0) === 100 
                      ? "text-green-500" 
                      : "text-red-500"
                  }`}>
                    Total: {Object.values(customPercentages).reduce((acc, val) => acc + val, 0)}%
                    {Object.values(customPercentages).reduce((acc, val) => acc + val, 0) !== 100 && 
                      " (should be 100%)"}
                  </span>
                </div>
              )}
              
              {/* Show total amount for unequal split */}
              {form.getValues("splitMethod") === "unequal" && selectedUserIds.length > 0 && (
                <div className="mt-2 text-xs text-right">
                  <span className={`${
                    // Calculate total amount
                    Math.abs(Object.values(customAmounts).reduce((acc, val) => acc + val, 0) - 
                      parseFloat(form.getValues("totalAmount") || "0")) < 0.01
                      ? "text-green-500" 
                      : "text-red-500"
                  }`}>
                    Total: ${Object.values(customAmounts).reduce((acc, val) => acc + val, 0).toFixed(2)}
                    {Math.abs(Object.values(customAmounts).reduce((acc, val) => acc + val, 0) - 
                      parseFloat(form.getValues("totalAmount") || "0")) >= 0.01 && 
                      ` (should be $${parseFloat(form.getValues("totalAmount") || "0").toFixed(2)})`}
                  </span>
                </div>
              )}
            </div>

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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={
                  createExpenseMutation.isPending || 
                  (form.getValues("splitMethod") === "percentage" && 
                   Object.values(customPercentages).reduce((acc, val) => acc + val, 0) !== 100) ||
                  (form.getValues("splitMethod") === "unequal" && 
                   Math.abs(Object.values(customAmounts).reduce((acc, val) => acc + val, 0) - 
                   parseFloat(form.getValues("totalAmount") || "0")) >= 0.01)
                }
                title={
                  form.getValues("splitMethod") === "percentage" && 
                  Object.values(customPercentages).reduce((acc, val) => acc + val, 0) !== 100 
                    ? "Percentages must sum to 100%" 
                    : form.getValues("splitMethod") === "unequal" && 
                      Math.abs(Object.values(customAmounts).reduce((acc, val) => acc + val, 0) - 
                      parseFloat(form.getValues("totalAmount") || "0")) >= 0.01
                      ? "Amounts must sum to the total" 
                      : ""
                }
              >
                {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
