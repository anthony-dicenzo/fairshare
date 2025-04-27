import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Define the form schema using zod
const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.confirmNewPassword) {
    return false;
  }
  if (!data.newPassword && data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: "Both password fields must be filled or empty",
  path: ["confirmNewPassword"]
}).refine(data => {
  if (data.newPassword && data.confirmNewPassword && data.newPassword !== data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"]
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileEditFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditForm({ isOpen, onClose }: ProfileEditFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form with current user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest('PUT', '/api/user', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      return response.json();
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: (data) => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      
      // Update the user data in the cache
      queryClient.setQueryData(['/api/user'], data);
      
      // Close the dialog and reset form
      onClose();
      form.reset({
        name: data.name,
        email: data.email,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  function onSubmit(values: ProfileFormValues) {
    updateProfileMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Your current password is required to make changes.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Current password" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="New password" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirm new password" 
                      {...field} 
                      value={field.value || ''}
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}