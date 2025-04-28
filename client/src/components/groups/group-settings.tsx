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
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
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
      if (error.message?.includes("outstanding") || error.message?.includes("balance") || error.message?.includes("settled")) {
        setRemoveError("This member has outstanding balances in the group. All balances must be settled to $0 before they can be removed.");
      } else if (error.message?.includes("creator")) {
        setRemoveError("The group creator cannot be removed from the group.");
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
      // Check if the error is related to outstanding balances
      if (error.message?.includes("outstanding") || error.message?.includes("balance") || error.message?.includes("settled")) {
        setDeleteGroupError("Cannot delete group. There are outstanding balances between members. All debts must be settled first.");
      } else {
        setDeleteGroupError("Failed to delete group. Please try again later.");
      }
      
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
        <DialogContent className="sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-4 sm:p-5">
          <DialogHeader className="p-0 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-4 w-4" />
              Group settings
            </DialogTitle>
            <DialogDescription className="text-xs leading-tight mt-1">
              Manage members and settings for {groupName}
            </DialogDescription>
          </DialogHeader>
          
          {/* Group name section */}
          {isCreator && (
            <div className="py-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium">Group name</h3>
                {!isEditingName ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    className="text-muted-foreground hover:text-foreground h-7 px-2"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={updateGroupForm.handleSubmit(onSubmitUpdateGroup)}
                      className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
                      disabled={updateGroupMutation.isPending}
                    >
                      {updateGroupMutation.isPending ? (
                        <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
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
                        <FormItem className="space-y-1">
                          <FormControl>
                            <Input 
                              placeholder="Group name" 
                              {...field} 
                              autoFocus 
                              className="text-sm h-8"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </div>
          )}
          
          <Separator className="my-2" />
          
          {/* Group members section */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Group members</h3>
              {isCreator && (
                <div className="text-[10px] text-muted-foreground italic">
                  Members can only be removed if they have $0 balance
                </div>
              )}
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarFallback className="text-xs">
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{member.user.email}</p>
                    </div>
                  </div>
                  
                  {/* Only show remove button if current user is creator and not for themselves */}
                  {isCreator && member.user.id !== user?.id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                      onClick={() => handleRemoveMember(member)}
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1" />
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
              <Separator className="my-2" />
              <div className="py-2">
                <h3 className="text-sm font-medium text-red-500 mb-2">Danger zone</h3>
                <Button 
                  variant="outline" 
                  className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 w-full justify-start h-8 text-xs"
                  onClick={() => setShowDeleteGroupConfirmation(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete group
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  This will permanently delete the group and all associated data. All balances must be settled first.
                </p>
              </div>
            </>
          )}
          
          <DialogFooter className="mt-2 pt-2 pb-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs w-full sm:w-auto">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation dialog for removing a member */}
      <AlertDialog open={showRemoveConfirmation} onOpenChange={setShowRemoveConfirmation}>
        <AlertDialogContent className="max-w-[350px] p-4">
          <AlertDialogHeader className="p-0 pb-2">
            <AlertDialogTitle className="text-base">Remove {selectedMember?.user.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              They will no longer have access to the group's expenses and history. Note that all balances
              must be settled (zero balance) before a member can be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-2 space-x-0">
            <AlertDialogCancel className="h-8 text-xs flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemove}
              className="bg-red-500 hover:bg-red-600 h-8 text-xs flex-1"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Error dialog for balance issues */}
      <AlertDialog open={!!removeError} onOpenChange={() => setRemoveError(null)}>
        <AlertDialogContent className="max-w-[350px] p-4">
          <AlertDialogHeader className="p-0 pb-2">
            <AlertDialogTitle className="flex items-center gap-1.5 text-red-500 text-base">
              <AlertTriangle className="h-4 w-4" />
              Cannot Remove Member
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-tight">
              {removeError || "This member has outstanding balances with others in the group. All balances must be settled to $0 before they can be removed."}
            </AlertDialogDescription>
            <div className="mt-2 bg-amber-50 p-2 rounded-sm border border-amber-200 text-[11px] text-amber-700">
              <p className="font-medium">How to settle balances:</p>
              <p>1. Record payments using the "Pay" button</p>
              <p>2. Make sure the member has $0 balance in the group</p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogAction className="h-8 text-xs w-full">OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirmation dialog for deleting the group */}
      <AlertDialog open={showDeleteGroupConfirmation} onOpenChange={setShowDeleteGroupConfirmation}>
        <AlertDialogContent className="max-w-[350px] p-4">
          <AlertDialogHeader className="p-0 pb-2">
            <AlertDialogTitle className="flex items-center gap-1.5 text-red-500 text-base">
              <AlertTriangle className="h-4 w-4" />
              Delete group?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-tight">
              This action cannot be undone, and all group data will be permanently removed.
              <p className="mt-1 font-semibold text-[11px]">Note: All balances must be settled first.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-2 space-x-0">
            <AlertDialogCancel className="h-8 text-xs flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteGroupMutation.mutate()}
              className="bg-red-500 hover:bg-red-600 h-8 text-xs flex-1"
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Error dialog for group deletion */}
      <AlertDialog open={!!deleteGroupError} onOpenChange={() => setDeleteGroupError(null)}>
        <AlertDialogContent className="max-w-[350px] p-4">
          <AlertDialogHeader className="p-0 pb-2">
            <AlertDialogTitle className="flex items-center gap-1.5 text-red-500 text-base">
              <AlertTriangle className="h-4 w-4" />
              Cannot Delete Group
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-tight">
              {deleteGroupError || "This group has outstanding balances between members. All balances must be settled to $0 before the group can be deleted."}
            </AlertDialogDescription>
            <div className="mt-2 bg-amber-50 p-2 rounded-sm border border-amber-200 text-[11px] text-amber-700">
              <p className="font-medium">How to settle balances:</p>
              <p>1. Record payments using the "Pay" button</p>
              <p>2. Make sure all members have $0 balance in the group</p>
              <p>3. View the balances tab to verify all debts are settled</p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogAction className="h-8 text-xs w-full">OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}