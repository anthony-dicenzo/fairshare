import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
        description: "You can now share this link with others to invite them to the group.",
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Invite People</CardTitle>
        <CardDescription>Generate a shareable link to invite others to this group</CardDescription>
      </CardHeader>
      <CardContent>
        {inviteCode ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md break-all font-mono text-sm flex items-center gap-2">
              <Link className="h-4 w-4 shrink-0" />
              <span className="truncate">{`${window.location.origin}/invite/${inviteCode}`}</span>
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="expiration"
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                  disabled={loading}
                />
                <Label htmlFor="expiration">Expires after 7 days</Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <p className="text-muted-foreground text-center">
              Generate a link that you can share with others to invite them to this group
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t p-4">
        {!inviteCode ? (
          <Button onClick={generateLink} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link className="h-4 w-4 mr-2" />}
            Generate Link
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button onClick={generateLink} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link className="h-4 w-4 mr-2" />}
              New Link
            </Button>
            <Button onClick={copyLink} variant="outline" disabled={loading}>
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button onClick={shareLink} disabled={loading} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}