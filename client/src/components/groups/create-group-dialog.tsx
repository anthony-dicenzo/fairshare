import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTutorial } from '@/components/tutorial/tutorial-context';

// Create schema for group creation
const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50, "Group name cannot exceed 50 characters")
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

interface CreateGroupDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ 
  open, 
  onOpenChange = () => {} 
}) => {
  const [, navigate] = useLocation();
  const { nextStep, currentStep } = useTutorial();
  const { toast } = useToast();
  
  // Initialize the form
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: ''
    }
  });

  // API mutation to create a new group
  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormValues) => {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create group');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Clear form
      form.reset();
      
      // Close the dialog
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: "Group created!",
        description: "Your new group has been created successfully.",
        variant: "default",
      });
      
      // Invalidate groups query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      // Move to next tutorial step if in tutorial
      if (currentStep === 'create-group') {
        setTimeout(() => nextStep(), 500);
      }
      
      // Navigate to the newly created group
      navigate(`/group/${data.id}`);
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Failed to create group",
        description: "There was an error creating your group. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CreateGroupFormValues) => {
    createGroupMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-tutorial="create-group-dialog">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Start a new group to track expenses with friends, family, or roommates.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter a name for your group" 
                      {...field}
                      autoFocus
                      data-tutorial="group-name-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createGroupMutation.isPending}
                className="relative"
                data-tutorial="create-group-submit"
              >
                {createGroupMutation.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
                <span className={createGroupMutation.isPending ? "invisible" : ""}>
                  Create Group
                </span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;