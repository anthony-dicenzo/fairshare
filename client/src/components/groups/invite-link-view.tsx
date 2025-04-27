import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, Clipboard, Share } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface InviteLinkViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  inviteCode: string;
}

export function InviteLinkView({ open, onOpenChange, groupName, inviteCode }: InviteLinkViewProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
  
  // Copy the invite link to clipboard
  const copyLink = () => {
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
    if (navigator.share) {
      const shareText = `Hey friends! Join my group '${groupName}' on Splitwise: ${inviteLink}`;
      
      navigator.share({
        title: `Join my ${groupName} group`,
        text: shareText,
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
  
  const changeLink = () => {
    // This would generate a new link, but for now just close the dialog
    onOpenChange(false);
    
    // Add implementation later if needed
    toast({
      title: "Link change requested",
      description: "This feature is coming soon.",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[425px] border-none bg-background">
        <DialogHeader className="p-4 border-b flex items-center justify-between">
          <DialogTitle className="text-lg font-medium">Invite link</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Link className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <a 
            href={inviteLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-mono text-primary text-sm block text-center break-all hover:underline"
          >
            {inviteLink}
          </a>
          
          <p className="text-sm text-center mt-2">
            Anyone can follow this link to join "{groupName}". 
            Only share it with people you trust.
          </p>
          
          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={shareLink}
            >
              <Share className="h-4 w-4 mr-3" />
              Share link
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={copyLink}
            >
              <Clipboard className="h-4 w-4 mr-3" />
              Copy link
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-10 text-destructive hover:text-destructive"
              onClick={changeLink}
            >
              <Link className="h-4 w-4 mr-3" />
              Change link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}