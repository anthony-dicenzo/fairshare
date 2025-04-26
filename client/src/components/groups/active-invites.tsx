import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link2Off, Copy, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface GroupInvite {
  id: number;
  groupId: number;
  inviteCode: string;
  createdBy: number;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface ActiveInvitesProps {
  groupId: number;
}

export function ActiveInvites({ groupId }: ActiveInvitesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Query to fetch active invites
  const { data: invites, isLoading } = useQuery({
    queryKey: ['/api/groups', groupId, 'invites'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}/invites`);
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json() as Promise<GroupInvite[]>;
    }
  });
  
  // Mutation to deactivate an invite
  const deactivateMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const res = await apiRequest("POST", `/api/groups/invites/${inviteId}/deactivate`);
      if (!res.ok) throw new Error("Failed to deactivate invite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/groups', groupId, 'invites']});
      toast({
        title: "Invite deactivated",
        description: "The invite link has been deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error deactivating invite",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Copy an invite link to clipboard
  const copyLink = (invite: GroupInvite) => {
    const inviteLink = `${window.location.origin}/invite/${invite.inviteCode}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedId(invite.id);
      toast({
        title: "Link copied",
        description: "The invite link has been copied to your clipboard.",
      });
      
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Active Invites</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (!invites || invites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Active Invites</CardTitle>
          <CardDescription>No active invite links found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-muted-foreground">
            <p>Generate a new invite link to share with your friends</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Active Invites</CardTitle>
        <CardDescription>Manage your active invite links</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="overflow-hidden">
                <div className="font-medium truncate">
                  {`${window.location.origin}/invite/${invite.inviteCode}`}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {format(new Date(invite.createdAt), "MMM d, yyyy")}
                  {invite.expiresAt && (
                    <span> · Expires: {format(new Date(invite.expiresAt), "MMM d, yyyy")}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyLink(invite)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copiedId === invite.id ? "Copied!" : "Copy"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => deactivateMutation.mutate(invite.id)}
                  disabled={deactivateMutation.isPending}
                >
                  {deactivateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <LinkOff className="h-4 w-4 mr-1" />
                  )}
                  Deactivate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}