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
  // Date must be in YYYY-MM-DD format for the backend
  date: z.string().transform(val => {
    // If the value is empty or already in the correct format, return as is
    if (!val) return formatISO(new Date(), { representation: 'date' });
    // Try to parse the date and format it correctly
    try {
      const date = new Date(val);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return formatISO(new Date(), { representation: 'date' });
      }
      return formatISO(date, { representation: 'date' });
    } catch (e) {
      // If parsing fails, return today's date
      return formatISO(new Date(), { representation: 'date' });
    }
  }),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export function ExpenseForm({ open, onOpenChange, groupId }: ExpenseFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Get groups data
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Get members for the selected group
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId?.toString() || "");
  
  const { data: groupMembers = [] } = useQuery({
    queryKey: ["/api/groups", selectedGroupId, "members"],
    enabled: !!selectedGroupId && selectedGroupId !== "",
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
    }
  }, [groupMembers]);

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
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "expenses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "balances"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "activity"] });
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
    const participants = selectedUserIds.map((userId) => {
      let amountOwed = 0;
      
      // Simple equal split for now
      if (values.splitMethod === "equal") {
        amountOwed = totalAmount / selectedUserIds.length;
      }
      
      return {
        userId,
        amountOwed,
      };
    });

    // Ensure we have a valid date in the correct format
    let formattedDate;
    try {
      // Try to use the date from the form, properly formatted
      formattedDate = formatISO(new Date(values.date), { representation: 'date' });
      // Validate the date format (yyyy-MM-dd)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        // If invalid format, use today's date
        formattedDate = formatISO(new Date(), { representation: 'date' });
      }
    } catch (e) {
      // If any error occurs, use today's date
      formattedDate = formatISO(new Date(), { representation: 'date' });
    }

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
                  
                  return (
                    <div key={member.userId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`split-${member.userId}`}
                        checked={selectedUserIds.includes(member.userId)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUserIds(prev => [...prev, member.userId]);
                          } else {
                            setSelectedUserIds(prev => 
                              prev.filter(id => id !== member.userId)
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`split-${member.userId}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {member.userId === user?.id ? "You" : member?.user?.name || "Unknown User"}
                      </label>
                    </div>
                  );
                })}
              </div>
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
                disabled={createExpenseMutation.isPending}
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
