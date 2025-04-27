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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Link as LinkIcon, Mail, Loader2 } from "lucide-react";

import { InviteLinkView } from "./invite-link-view";
import { InviteLinkGenerator } from "./invite-link-generator";
import { ActiveInvites } from "./active-invites";

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

interface GroupInfo {
  id: number;
  name: string;
}

export function GroupInvite({ open, onOpenChange, groupId, members }: GroupInviteProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("link");
  const [inviteGenerated, setInviteGenerated] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteLinkView, setShowInviteLinkView] = useState(false);
  const [isGeneratingInitialLink, setIsGeneratingInitialLink] = useState(false);

  // Fetch group info
  const { data: group } = useQuery<GroupInfo>({
    queryKey: ['/api/groups', groupId],
    enabled: !!groupId && open,
    queryFn: async () => {
      const res = await apiRequest<GroupInfo>(`/api/groups/${groupId}`);
      return res;
    }
  });

  // Fetch existing invites when the modal opens
  const { data: invites, isLoading: isLoadingInvites } = useQuery<any[]>({
    queryKey: ['/api/groups', groupId, 'invites'],
    queryFn: async () => {
      const res = await apiRequest<any[]>(`/api/groups/${groupId}/invites`);
      return res;
    },
    enabled: !!groupId && open,
  });

  // Generate link mutation (only used if no active invites exist)
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest<{ inviteCode: string }>("POST", `/api/groups/${groupId}/invite`, {});
      return res;
    },
    onSuccess: (data) => {
      setInviteCode(data.inviteCode);
      setInviteGenerated(true);
      setShowInviteLinkView(true);
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'invites'] });
    },
    onError: () => {
      toast({
        title: "Failed to generate invite link",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingInitialLink(false);
    }
  });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest<{ message?: string }>("POST", `/api/groups/${groupId}/invite`, data);
      return res;
    },
    onSuccess: (data) => {
      // Check if the response is a notification about user not existing yet
      if (data.message) {
        toast({
          title: "Email invited",
          description: data.message,
        });
      } else {
        toast({
          title: "User added",
          description: "The user has been added to the group",
        });
      }
      
      form.reset();
      
      // Invalidate queries
      const groupIdStr = groupId ? groupId.toString() : "";
      
      // Invalidate both query key patterns
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "members"] });
      
      // Invalidate related activity queries
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupIdStr}/activity`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupIdStr, "activity"] });
      
      // Also invalidate group list to update member counts
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to invite user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // When the dialog opens, check for existing invites or generate a new one
  useEffect(() => {
    if (open && groupId) {
      // If we already have loaded invites, check if there's an active one
      if (invites && invites.length > 0) {
        // Find the most recent active invite
        const activeInvite = invites.find(invite => invite.isActive);
        if (activeInvite) {
          setInviteCode(activeInvite.inviteCode);
          setInviteGenerated(true);
          // Automatically show the invite link view
          setShowInviteLinkView(true);
          return;
        }
      }
      
      // If no active invites or still loading, generate a new one
      if (!isLoadingInvites && !isGeneratingInitialLink && !inviteCode) {
        setIsGeneratingInitialLink(true);
        generateLinkMutation.mutate();
      }
    } else {
      // Reset states when dialog closes
      setShowInviteLinkView(false);
    }
  }, [open, groupId, invites, isLoadingInvites, inviteCode, isGeneratingInitialLink]);

  const onSubmit = form.handleSubmit((data) => {
    inviteMutation.mutate(data);
  });

  const handleInviteGenerated = (code: string) => {
    setInviteCode(code);
    setInviteGenerated(true);
    setShowInviteLinkView(true);
    
    // Invalidate queries to refresh the invites list
    queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'invites'] });
  };

  // Show the invite link view if we have a link to share
  if (showInviteLinkView && inviteCode && group?.name) {
    return (
      <InviteLinkView
        open={open}
        onOpenChange={onOpenChange}
        groupName={group.name}
        inviteCode={inviteCode}
      />
    );
  }

  // Show the traditional dialog otherwise (loading or email tab)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-4 pt-10">
        <DialogHeader className="mb-2 p-0">
          <DialogTitle className="flex items-center gap-1 text-lg">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite Members
          </DialogTitle>
          <DialogDescription className="text-xs">
            Invite people to join your group and share expenses.
          </DialogDescription>
        </DialogHeader>

        {isGeneratingInitialLink ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Generating invite link...</p>
          </div>
        ) : (
          <Tabs defaultValue="link" value={activeTab} onValueChange={setActiveTab} className="mt-0">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="link" className="flex items-center gap-1 text-xs py-1 h-8">
                <LinkIcon className="h-3 w-3" />
                Invite Link
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-1 text-xs py-1 h-8">
                <Mail className="h-3 w-3" />
                Email Invite
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="py-2 mt-2">
              <div className="space-y-3">
                <InviteLinkGenerator 
                  groupId={groupId} 
                  onLinkGenerated={handleInviteGenerated}
                />
                
                {inviteGenerated && (
                  <div className="pt-2">
                    <Separator className="my-2" />
                    <ActiveInvites groupId={groupId} />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="email" className="py-2 mt-2">
              <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter email address" 
                            {...field}
                            className="h-8 text-sm" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="w-full h-8 text-xs mt-2"
                    size="sm"
                  >
                    {inviteMutation.isPending ? "Sending invite..." : "Send Invite"}
                  </Button>
                </form>
              </Form>
              
              <div className="text-xs text-muted-foreground mt-2">
                Users must register with the invited email to join.
              </div>
            </TabsContent>
          </Tabs>
        )}

        {Array.isArray(members) && members.length > 0 && members.length < 5 && !isGeneratingInitialLink && (
          <div className="mt-2">
            <Separator className="my-2" />
            <h3 className="text-xs font-medium mb-1">Current members</h3>
            <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
              {members.map((member) => {
                if (!member?.userId || !member?.user?.name) return null;
                
                const initials = member.user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                  
                return (
                  <div key={member.userId} className="flex items-center">
                    <Avatar className="h-5 w-5 mr-1">
                      <AvatarFallback className="text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{member.user.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
