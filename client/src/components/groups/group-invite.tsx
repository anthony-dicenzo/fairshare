import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, Mail, UserPlus, Loader2 } from "lucide-react";
import { InviteLinkView } from "./invite-link-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GroupInviteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  members?: any[];
}

interface GroupInfo {
  id: number;
  name: string;
}

interface GroupInvite {
  id: number;
  groupId: number;
  inviteCode: string;
  isActive: boolean;
  expiresAt?: string;
  createdBy: number;
  createdAt: string;
}

// Validation schema for the invite form
const inviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function GroupInvite({ open, onOpenChange, groupId, members = [] }: GroupInviteProps) {
  // State for managing tabs, loading, and invite code
  const [activeTab, setActiveTab] = useState("link"); // 'link' or 'email'
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Fetch group info
  const { data: group } = useQuery<GroupInfo>({
    queryKey: ['/api/groups', groupId],
    enabled: !!groupId && open,
    queryFn: async () => {
      const res = await apiRequest<GroupInfo>(`/api/groups/${groupId}`);
      return res;
    }
  });

  // Fetch or create invite link
  const fetchOrCreateInviteLink = async () => {
    if (!groupId) return;
    
    setIsLoading(true);
    try {
      // Implement a direct call to create the invite that will either:
      // 1. Return an existing active invite, or
      // 2. Create a new one if none exists
      
      console.log(`Directly creating invite for group ${groupId}`);
      
      // Simplified approach with a single API call
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Invite response:", data);
      
      if (data && data.inviteCode) {
        setInviteCode(data.inviteCode);
      } else {
        console.error("Invalid invite response format:", data);
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to get invite link:", error);
      toast({
        title: "Failed to generate invite link",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email invite form
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
      if (groupId) {
        // Invalidate both query key patterns
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId.toString(), "members"] });
        
        // Invalidate related activity queries
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/activity`] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId.toString(), "activity"] });
        
        // Also invalidate group list to update member counts
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to invite user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // When the dialog opens, get the invite link
  useEffect(() => {
    if (open && groupId) {
      fetchOrCreateInviteLink();
    } else {
      // Reset state when dialog closes
      setInviteCode(null);
    }
  }, [open, groupId]);

  const onSubmit = form.handleSubmit((data) => {
    inviteMutation.mutate(data);
  });

  // Show the link view if we have a link to share
  if (inviteCode) {
    console.log("Showing invite link view with code:", inviteCode);
    return (
      <InviteLinkView
        open={open}
        onOpenChange={onOpenChange}
        groupName={group?.name || "Group"} // Fallback name if group object is not available
        inviteCode={inviteCode}
      />
    );
  }

  // Show loading state or the email tab
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Generating invite link...</p>
          </div>
        ) : (
          <Tabs defaultValue="email" value={activeTab} onValueChange={setActiveTab} className="mt-0">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="link" className="flex items-center gap-1 text-xs py-1 h-8" onClick={fetchOrCreateInviteLink}>
                <LinkIcon className="h-3 w-3" />
                Invite Link
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-1 text-xs py-1 h-8">
                <Mail className="h-3 w-3" />
                Email Invite
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="py-2 mt-2">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
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

        {Array.isArray(members) && members.length > 0 && members.length < 5 && !isLoading && (
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
