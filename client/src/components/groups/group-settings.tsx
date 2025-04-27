import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  UserMinus, 
  Settings, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  RotateCcw 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type Member = {
  userId: number;
  user: {
    id: number;
    name: string;
    email?: string;
  };
};

type GroupSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  groupName: string;
  members: Member[];
  createdBy?: number;
};

// Form schema for updating group name
const updateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50, "Group name is too long"),
});

type UpdateGroupFormValues = z.infer<typeof updateGroupSchema>;

export function GroupSettings({ open, onOpenChange, groupId, groupName, members, createdBy }: GroupSettingsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // State for selected member and confirmation dialog
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [showDeleteGroupConfirmation, setShowDeleteGroupConfirmation] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Check if current user is the group creator/admin
  const isCreator = user?.id === createdBy;
  
  // Form for updating group name
  const updateGroupForm = useForm<UpdateGroupFormValues>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      name: groupName,
    },
  });
  
  // Mutation for removing a member from the group
  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      return await apiRequest('DELETE', `/api/groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      // Reset state
      setSelectedMember(null);
      setShowRemoveConfirmation(false);
      setRemoveError(null);
      
      // Show success toast
      toast({
        title: "Member removed",
        description: `${selectedMember?.user.name} has been removed from the group.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/activity`] });
      
      // Close the dialog
      onOpenChange(false);
    },
    onError: (error: any) => {
      // Check if the error is due to outstanding balances
      if (error.message?.includes("outstanding") || error.message?.includes("balance")) {
        setRemoveError(error.message);
      } else {
        setRemoveError("Could not remove member. Please try again later.");
      }
      setShowRemoveConfirmation(false);
    }
  });
  
  // Mutation for updating group name
  const updateGroupMutation = useMutation({
    mutationFn: async (values: UpdateGroupFormValues) => {
      return await apiRequest('PATCH', `/api/groups/${groupId}`, values);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Group updated",
        description: "Group name has been updated successfully.",
      });
      
      // Exit edit mode
      setIsEditingName(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/activity`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update group name. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for deleting the group
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/groups/${groupId}`);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Group deleted",
        description: "The group has been deleted successfully.",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [`/api/groups`] });
      queryClient.invalidateQueries({ queryKey: [`/api/activity`] });
      queryClient.invalidateQueries({ queryKey: [`/api/balances`] });
      
      // Close the dialog and redirect to home
      onOpenChange(false);
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group. Please ensure all balances are settled.",
        variant: "destructive"
      });
      
      setShowDeleteGroupConfirmation(false);
    }
  });
  
  // Handle updating group name
  const onSubmitUpdateGroup = (values: UpdateGroupFormValues) => {
    updateGroupMutation.mutate(values);
  };
  
  // Handle remove member button click
  const handleRemoveMember = (member: Member) => {
    setSelectedMember(member);
    setShowRemoveConfirmation(true);
  };
  
  // Handle confirm remove
  const handleConfirmRemove = () => {
    if (selectedMember) {
      removeMemberMutation.mutate({ groupId, userId: selectedMember.userId });
    }
  };
  
  // Handle cancel editing group name
  const handleCancelEdit = () => {
    updateGroupForm.reset({ name: groupName });
    setIsEditingName(false);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group settings
            </DialogTitle>
            <DialogDescription>
              Manage members and settings for {groupName}
            </DialogDescription>
          </DialogHeader>
          
          {/* Group name section */}
          {isCreator && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Group name</h3>
                {!isEditingName ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={updateGroupForm.handleSubmit(onSubmitUpdateGroup)}
                      className="text-green-600 hover:text-green-700"
                      disabled={updateGroupMutation.isPending}
                    >
                      {updateGroupMutation.isPending ? (
                        <RotateCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {!isEditingName ? (
                <p className="text-sm">{groupName}</p>
              ) : (
                <Form {...updateGroupForm}>
                  <form onSubmit={updateGroupForm.handleSubmit(onSubmitUpdateGroup)}>
                    <FormField
                      control={updateGroupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Group name" 
                              {...field} 
                              autoFocus 
                              className="text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </div>
          )}
          
          <Separator />
          
          {/* Group members section */}
          <div className="py-4">
            <h3 className="text-sm font-medium mb-3">Group members</h3>
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-9 w-9 mr-3">
                      <AvatarFallback>
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  
                  {/* Only show remove button if current user is creator and not for themselves */}
                  {isCreator && member.user.id !== user?.id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveMember(member)}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Delete group section */}
          {isCreator && (
            <>
              <Separator />
              <div className="py-4">
                <h3 className="text-sm font-medium text-red-500 mb-3">Danger zone</h3>
                <Button 
                  variant="outline" 
                  className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 w-full justify-start"
                  onClick={() => setShowDeleteGroupConfirmation(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete group
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will permanently delete the group and all associated data. All balances must be settled first.
                </p>
              </div>
            </>
          )}
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation dialog for removing a member */}
      <AlertDialog open={showRemoveConfirmation} onOpenChange={setShowRemoveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedMember?.user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? 
              They will no longer have access to the group's expenses and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemove}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Error dialog for balance issues */}
      <AlertDialog open={!!removeError} onOpenChange={() => setRemoveError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Cannot Remove Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeError || "This member has outstanding balances with others in the group. All balances must be settled before they can be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}