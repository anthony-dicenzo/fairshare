import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, Clipboard, Share, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
      try {
        const shareText = `Hey friends! Join my group '${groupName}' on FairShare: ${inviteLink}`;
        
        navigator.share({
          title: `Join my ${groupName} group on FairShare`,
          text: shareText,
          url: inviteLink
        })
        .catch((error) => {
          console.log('Error sharing:', error);
          // Don't show error if user cancelled
          if (error.name !== 'AbortError') {
            // Fallback to copying to clipboard
            copyLink();
            toast({
              title: "Sharing cancelled",
              description: "Link copied to clipboard instead",
            });
          }
        });
      } catch (error) {
        console.error('Share API error:', error);
        // Fallback to copying to clipboard
        copyLink();
      }
    } else {
      // Fallback to copying to clipboard
      copyLink();
      toast({
        title: "Sharing not supported",
        description: "Link copied to clipboard instead",
      });
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
      <DialogContent className="p-0 sm:max-w-[425px] border-none bg-background max-h-screen overflow-auto">
        <DialogTitle className="sr-only">Invite Link for {groupName}</DialogTitle>
        <DialogDescription className="sr-only">Share this invite link with others to join your group</DialogDescription>
        
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 mr-2" 
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-medium flex-1 text-center">Invite link</h2>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
        
        <div className="p-6 space-y-6">
          {/* Icon and link */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Link className="h-8 w-8 text-green-500" />
            </div>
            
            <a 
              href={inviteLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-mono text-primary text-sm block text-center break-all hover:underline"
            >
              {inviteLink}
            </a>
          </div>
          
          {/* Description text */}
          <p className="text-sm text-center">
            Anyone can follow this link to join "{groupName}". 
            Only share it with people you trust.
          </p>
          
          {/* Action buttons */}
          <div className="space-y-3 pt-3">
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={shareLink}
            >
              <Share className="h-5 w-5 mr-3 text-gray-500" />
              Share link
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={copyLink}
            >
              <Clipboard className="h-5 w-5 mr-3 text-gray-500" />
              Copy link
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base text-red-500"
              onClick={changeLink}
            >
              <Link className="h-5 w-5 mr-3 text-red-500" />
              Change link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}