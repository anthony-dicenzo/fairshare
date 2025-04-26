import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      <div className="w-full mt-1">
        <Label className="text-xs text-muted-foreground">Active Invites</Label>
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  if (!invites || invites.length === 0) {
    return (
      <div className="w-full mt-1">
        <Label className="text-xs text-muted-foreground">Active Invites</Label>
        <p className="text-xs text-muted-foreground">No active invite links</p>
      </div>
    );
  }
  
  return (
    <div className="w-full mt-1">
      <Label className="text-xs text-muted-foreground">Active Invites</Label>
      <div className="space-y-1 mt-1">
        {invites.map((invite) => (
          <div key={invite.id} className="border rounded-md text-xs p-1">
            <div className="font-mono text-xs truncate text-[10px] px-1 py-0.5">
              {`${window.location.origin}/invite/${invite.inviteCode}`}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center px-1">
              <Calendar className="h-2.5 w-2.5 mr-0.5" />
              <span className="truncate">
                {format(new Date(invite.createdAt), "MMM d")}
                {invite.expiresAt && ` · Exp: ${format(new Date(invite.expiresAt), "MMM d")}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 w-full mt-0.5 px-0.5">
              <Button 
                variant="outline" 
                onClick={() => copyLink(invite)}
                className="h-6 px-1 text-[10px]"
              >
                <Copy className="h-2.5 w-2.5 mr-0.5" />
                {copiedId === invite.id ? "Copied" : "Copy"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => deactivateMutation.mutate(invite.id)}
                disabled={deactivateMutation.isPending}
                className="h-6 px-1 text-[10px]"
              >
                {deactivateMutation.isPending ? (
                  <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                ) : (
                  <Link2Off className="h-2.5 w-2.5 mr-0.5" />
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