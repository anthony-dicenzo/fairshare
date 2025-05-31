import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Link, Share2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

interface InviteLinkGeneratorProps {
  groupId: number;
  onLinkGenerated?: (inviteCode: string) => void;
}

export function InviteLinkGenerator({ groupId, onLinkGenerated }: InviteLinkGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  
  // Calculate date 7 days from now
  const defaultExpirationDate = new Date();
  defaultExpirationDate.setDate(defaultExpirationDate.getDate() + 7);
  
  // Generate an invite link
  const generateLink = async () => {
    setLoading(true);
    try {
      // Request body includes expiration date if enabled
      const body = hasExpiration ? {
        expiresAt: defaultExpirationDate.toISOString()
      } : {};
      
      const res = await apiRequest("POST", `/api/groups/${groupId}/invite`, body);
      const data = await res.json();
      setInviteCode(data.inviteCode);
      
      if (onLinkGenerated) {
        onLinkGenerated(data.inviteCode);
      }
      
      toast({
        title: "Invite link generated",
        description: "You can now share this link with others.",
      });
    } catch (error) {
      toast({
        title: "Error generating invite link",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Copy the invite link to clipboard
  const copyLink = () => {
    if (!inviteCode) return;
    
    const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      toast({
        title: "Link copied",
        description: "The invite link has been copied to your clipboard.",
      });
      
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Share invite link using Web Share API if available
  const shareLink = () => {
    if (!inviteCode) return;
    
    const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join my FairShare group',
        text: 'Join my expense sharing group on FairShare',
        url: inviteLink
      })
      .catch((error) => {
        console.log('Error sharing:', error);
        // Fallback to copying to clipboard
        copyLink();
      });
    } else {
      // Fallback to copying to clipboard
      copyLink();
    }
  };
  
  return (
    <div className="w-full">
      {inviteCode ? (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <div className="col-span-2 mb-1">
              <Label className="text-xs text-muted-foreground">Invite link</Label>
              <div className="bg-muted rounded-md p-1.5 text-xs font-mono flex items-center h-7 truncate">
                <Link className="h-3 w-3 shrink-0 mr-1" />
                <span className="truncate">{`${window.location.origin}/invite/${inviteCode}`}</span>
              </div>
            </div>
            <div className="col-span-2 flex items-center py-1 mt-0">
              <Switch
                id="expiration"
                checked={hasExpiration}
                onCheckedChange={setHasExpiration}
                disabled={loading}
                className="scale-75"
              />
              <Label htmlFor="expiration" className="text-xs ml-2">Expires after 7 days</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 mt-1">
            <Button onClick={generateLink} variant="outline" disabled={loading} className="h-7 px-2 text-xs">
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link className="h-3 w-3 mr-1" />}
              New
            </Button>
            <Button onClick={copyLink} variant="outline" disabled={loading} className="h-7 px-2 text-xs">
              <Copy className="h-3 w-3 mr-1" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={shareLink} disabled={loading} className="h-7 text-xs">
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">No active invite link</Label>
          <Button 
            onClick={generateLink} 
            disabled={loading} 
            className="w-full h-7 text-xs flex items-center"
          >
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link className="h-3 w-3 mr-1" />}
            Generate Invite Link
          </Button>
          <div className="flex items-center py-1">
            <Switch
              id="expiration"
              checked={hasExpiration}
              onCheckedChange={setHasExpiration}
              disabled={loading}
              className="scale-75"
            />
            <Label htmlFor="expiration" className="text-xs ml-2">Expires after 7 days</Label>
          </div>
        </div>
      )}
    </div>
  );
}