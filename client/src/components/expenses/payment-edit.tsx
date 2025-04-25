import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreditCard, Trash } from "lucide-react";
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

// Define a schema for payment editing
const paymentEditSchema = z.object({
  amount: z
    .string()
    .min(1, { message: "Amount is required" })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  paidBy: z
    .string()
    .min(1, { message: "Payer is required" }),
  paidTo: z
    .string()
    .min(1, { message: "Recipient is required" }),
  date: z.string().min(1, { message: "Date is required" }),
  note: z.string().optional(),
});

type PaymentEditValues = z.infer<typeof paymentEditSchema>;

type PaymentEditProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: number;
  groupId: number;
};

export function PaymentEdit({ open, onOpenChange, paymentId, groupId }: PaymentEditProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch payment details
  const { data: payment, isLoading: isLoadingPayment } = useQuery({
    queryKey: [`/api/payments/${paymentId}`],
    enabled: open && paymentId > 0,
  });

  // Fetch group members for the dropdown
  const { data: groupMembers = [] } = useQuery({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: !!groupId && open,
    staleTime: 0, // Always fetch fresh data
  });

  const form = useForm<PaymentEditValues>({
    resolver: zodResolver(paymentEditSchema),
    defaultValues: {
      amount: "",
      paidBy: user?.id.toString() || "",
      paidTo: "",
      date: formatISO(new Date(), { representation: "date" }),
      note: "",
    },
  });

  // Auto-populate form when payment data is loaded
  const [formPopulated, setFormPopulated] = useState(false);
  
  // This runs when payment data changes
  if (payment && !formPopulated && form) {
    try {
      if (typeof payment === 'object') {
        // Update all form fields
        const amount = payment.amount ? String(payment.amount) : '0';
        const paidBy = payment.paidBy ? String(payment.paidBy) : user?.id?.toString() || '';
        const paidTo = payment.paidTo ? String(payment.paidTo) : '';
        const paymentDate = payment.date ? String(payment.date) : formatISO(new Date(), { representation: "date" });
        const note = payment.note ? String(payment.note) : '';
        
        // Update the form
        setTimeout(() => {
          form.setValue('amount', amount);
          form.setValue('paidBy', paidBy);
          form.setValue('paidTo', paidTo);
          form.setValue('date', paymentDate);
          form.setValue('note', note);
          setFormPopulated(true);
        }, 0);
      }
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      paidBy: number;
      paidTo: number;
      date: string;
      note?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/payments/${paymentId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment updated",
        description: "Your payment has been updated successfully.",
      });
      onOpenChange(false);
      form.reset();
      
      // Invalidate all relevant queries
      invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Failed to update payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/payments/${paymentId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment deleted",
        description: "Your payment has been deleted successfully.",
      });
      onOpenChange(false);
      
      // Invalidate all relevant queries
      invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to invalidate all relevant queries
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity", "payments"] });
    
    // Group specific queries
    const groupIdStr = groupId.toString();
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/payments`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/balances`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
    
    // Also invalidate the more general query patterns
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
  };

  const handleSubmit = form.handleSubmit((values) => {
    updatePaymentMutation.mutate({
      amount: parseFloat(values.amount),
      paidBy: parseInt(values.paidBy),
      paidTo: parseInt(values.paidTo),
      date: values.date,
      note: values.note,
    });
  });

  // Check if the current user is the one who paid or created the payment
  const canEdit = payment && user && (payment.paidBy === user.id || payment.paidTo === user.id);

  if (isLoadingPayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading payment...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            Edit Payment
          </DialogTitle>
          <DialogDescription>
            Update the details of your payment or delete it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paidBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Venmo payment, Cash, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <ConfirmDialog
                title="Delete Payment"
                description="Are you sure you want to delete this payment? This action cannot be undone."
                onConfirm={() => deletePaymentMutation.mutate()}
                variant="destructive"
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex items-center gap-1"
                    disabled={!canEdit || deletePaymentMutation.isPending}
                  >
                    <Trash className="h-4 w-4" />
                    Delete Payment
                  </Button>
                }
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!canEdit || updatePaymentMutation.isPending}
                >
                  {updatePaymentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}