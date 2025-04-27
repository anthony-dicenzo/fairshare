import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

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
import { UserMinus, Settings, AlertTriangle } from "lucide-react";

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

export function GroupSettings({ open, onOpenChange, groupId, groupName, members, createdBy }: GroupSettingsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // State for selected member and confirmation dialog
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  
  // Check if current user is the group creator/admin
  const isCreator = user?.id === createdBy;
  
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
          
          <Separator />
          
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