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
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Group } from "@shared/schema";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatISO } from "date-fns";
import { useState, useEffect } from "react";

type PaymentFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: number;
};

// Schema for the payment form
const paymentFormSchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  paidBy: z.string().min(1, "Payer is required"),
  paidTo: z.string().min(1, "Recipient is required"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => {
      const amount = parseFloat(val);
      return !isNaN(amount) && amount > 0;
    },
    { message: "Amount must be a positive number" }
  ),
  date: z.string().optional(),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function PaymentForm({ open, onOpenChange, groupId }: PaymentFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

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

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      groupId: groupId?.toString() || "",
      paidBy: user?.id.toString() || "",
      paidTo: "",
      amount: "",
      date: formatISO(new Date(), { representation: "date" }),
      note: "",
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

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      groupId: number;
      paidBy: number;
      paidTo: number;
      amount: number;
      date: string;
      note?: string;
    }) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Your payment has been recorded successfully.",
      });
      onOpenChange(false);
      form.reset();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] }); // Invalidate the groups list to update balances
      
      // Make sure to properly invalidate all group-related queries
      if (selectedGroupId) {
        const groupIdStr = selectedGroupId;
        // Invalidate the specific group queries
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/payments`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}`] }); // Invalidate the specific group details
        
        // Also invalidate the more general query patterns used in group-page.tsx
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "balances"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to record payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    createPaymentMutation.mutate({
      groupId: parseInt(values.groupId),
      paidBy: parseInt(values.paidBy),
      paidTo: parseInt(values.paidTo),
      amount: parseFloat(values.amount),
      date: values.date || formatISO(new Date(), { representation: "date" }),
      note: values.note,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            Record a Payment
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enter the details of the payment to settle debts in your group.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Group</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 sm:h-10 text-sm">
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
                name="paidBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">From</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 sm:h-10 text-sm">
                          <SelectValue placeholder="Select payer" />
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

              <FormField
                control={form.control}
                name="paidTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 sm:h-10 text-sm">
                          <SelectValue placeholder="Select recipient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {field.value !== user?.id.toString() && (
                          <SelectItem value={user?.id.toString() || ""}>
                            You
                          </SelectItem>
                        )}
                        {Array.isArray(groupMembers) && groupMembers
                          .filter((member) => 
                            member?.userId !== user?.id && 
                            member?.userId?.toString() !== form.getValues("paidBy")
                          )
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

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 sm:top-2.5 text-sm">$</span>
                      <Input 
                        type="text"
                        placeholder="0.00" 
                        className="pl-8 h-8 sm:h-10 text-sm" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
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
                    <FormLabel className="text-xs sm:text-sm">Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-8 sm:h-10 text-sm" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Note (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Venmo, Cash"
                        className="h-8 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                size="sm"
                className="h-8 sm:h-9 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
