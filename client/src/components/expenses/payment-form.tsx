import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Payment schema
const paymentSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  groupId: z.string().min(1, "Group is required"),
  paidBy: z.string().min(1, "Payer is required"),
  paidTo: z.string().min(1, "Recipient is required"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedGroupId?: string;
}

export function PaymentForm({ 
  open, 
  onOpenChange, 
  preselectedGroupId 
}: PaymentFormProps) {
  const { toast } = useToast();
  
  // Query for groups
  const { data: groups } = useQuery({
    queryKey: ['/api/groups'],
    queryFn: async () => {
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      return response.json();
    },
    staleTime: 10000,
  });
  
  // State for selected group and members
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(preselectedGroupId || null);
  
  // Query for group members when a group is selected
  const { data: groupMembers } = useQuery({
    queryKey: ['/api/groups', selectedGroupId, 'members'],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      
      const response = await fetch(`/api/groups/${selectedGroupId}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch group members');
      }
      return response.json();
    },
    enabled: !!selectedGroupId,
    staleTime: 10000,
  });
  
  // Form setup
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: '',
      groupId: preselectedGroupId || '',
      paidBy: '',
      paidTo: '',
    }
  });
  
  // Handle group selection change
  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
    form.setValue('groupId', value);
    form.setValue('paidBy', '');
    form.setValue('paidTo', '');
  };
  
  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const paymentData = {
        ...values,
        amount: parseFloat(values.amount),
        description: "Payment",
        type: "payment"
      };
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record payment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Payment recorded",
        description: "The payment was recorded successfully.",
        variant: "default",
      });
      
      // Reset form
      form.reset();
      
      // Close the dialog
      onOpenChange(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      if (selectedGroupId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/groups', selectedGroupId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['/api/balances'] 
        });
      }
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Failed to record payment",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (values: PaymentFormValues) => {
    addPaymentMutation.mutate(values);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a Payment</DialogTitle>
          <DialogDescription>
            Record a payment made between group members.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Group selection */}
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleGroupChange(value)}
                    disabled={!!preselectedGroupId || addPaymentMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups?.map(group => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Payment amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0.01" 
                        placeholder="0.00" 
                        className="pl-8" 
                        {...field} 
                        disabled={addPaymentMutation.isPending}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Paid by selection */}
            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid by</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedGroupId || addPaymentMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Who paid?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groupMembers?.map(member => (
                        <SelectItem key={member.userId} value={String(member.userId)}>
                          {member.name || member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Paid to selection */}
            <FormField
              control={form.control}
              name="paidTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid to</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedGroupId || !form.getValues().paidBy || addPaymentMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Who received the payment?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groupMembers?.filter(member => String(member.userId) !== form.getValues().paidBy).map(member => (
                        <SelectItem key={member.userId} value={String(member.userId)}>
                          {member.name || member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-between mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={addPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={addPaymentMutation.isPending}
                className="relative"
              >
                {addPaymentMutation.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
                <span className={addPaymentMutation.isPending ? "invisible" : ""}>
                  Record Payment
                </span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}