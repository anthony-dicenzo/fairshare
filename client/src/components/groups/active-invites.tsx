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
      <div className="w-full">
        <h3 className="text-base font-medium">Active Invites</h3>
        <div className="flex justify-center py-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  if (!invites || invites.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-base font-medium">Active Invites</h3>
        <p className="text-xs text-muted-foreground">No active invite links found</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <h3 className="text-base font-medium">Active Invites</h3>
      <p className="text-xs text-muted-foreground mb-2">Manage your active invite links</p>
      <div className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="flex flex-col p-2 border rounded-md text-xs">
            <div className="font-mono truncate text-xs">
              {`${window.location.origin}/invite/${invite.inviteCode}`}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3" />
              <span>
                Created: {format(new Date(invite.createdAt), "MMM d")}
                {invite.expiresAt && ` · Expires: ${format(new Date(invite.expiresAt), "MMM d")}`}
              </span>
            </div>
            <div className="flex gap-1 w-full">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyLink(invite)}
                className="h-7 px-2 text-xs flex-1"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copiedId === invite.id ? "Copied" : "Copy"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => deactivateMutation.mutate(invite.id)}
                disabled={deactivateMutation.isPending}
                className="h-7 px-2 text-xs flex-1"
              >
                {deactivateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Link2Off className="h-3 w-3 mr-1" />
                )}
                Deactivate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}