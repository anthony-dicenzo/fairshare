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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";

type GroupInviteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  members: any[];
};

// Schema for the invite form
const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function GroupInvite({ open, onOpenChange, groupId, members }: GroupInviteProps) {
  const { toast } = useToast();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/invite`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The user has been invited to the group",
      });
      
      form.reset();
      
      // Invalidate queries
      const groupIdStr = groupId ? groupId.toString() : "";
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to invite user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    inviteMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Members
          </DialogTitle>
          <DialogDescription>
            Invite people to join your group and share expenses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter email address" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit"
              disabled={inviteMutation.isPending}
              className="w-full"
            >
              {inviteMutation.isPending ? "Sending invite..." : "Send Invite"}
            </Button>
          </form>
        </Form>

        {Array.isArray(members) && members.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Current members</h3>
            <div className="space-y-2">
              {members.map((member) => {
                if (!member?.userId || !member?.user?.name) return null;
                
                const initials = member.user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                  
                return (
                  <div key={member.userId} className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarFallback className="text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email || "No email provided"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <DialogDescription className="text-xs">
            Users must register with the invited email to join the group.
          </DialogDescription>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
