import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, useRouter } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, UserPlus, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function InvitePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/invite/:inviteCode");
  const router = useRouter();
  const inviteCode = params?.inviteCode;
  
  // State to track if the user has joined successfully
  const [joined, setJoined] = useState(false);
  
  // Query to verify the invite code
  const { data: inviteInfo, isLoading, error, isError } = useQuery({
    queryKey: ['/api/invites', inviteCode, 'verify'],
    queryFn: async () => {
      if (!inviteCode) throw new Error("No invite code provided");
      
      const res = await apiRequest("GET", `/api/invites/${inviteCode}/verify`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Invalid invite link");
      }
      
      return res.json();
    },
    enabled: !!inviteCode,
    retry: false
  });
  
  // Mutation to join the group
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!inviteCode || !user) return null;
      
      try {
        const response = await fetch(`/api/groups/join/${inviteCode}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          credentials: "include"
        });
        
        // Clone the response so we can read it twice
        const clonedResponse = response.clone();
        
        // Read the response as text first
        const responseText = await response.text();
        
        // Check if response is OK
        if (!response.ok) {
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.error || "Failed to join group");
          } catch (jsonError) {
            // If not valid JSON, use text
            throw new Error(responseText || "Failed to join group");
          }
        }
        
        // Try to parse as JSON if we have content
        try {
          if (responseText) {
            return JSON.parse(responseText);
          }
          return { success: true };
        } catch (jsonError) {
          console.error("Error parsing success response:", jsonError);
          return { success: true };
        }
      } catch (error) {
        console.error("Error joining group:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setJoined(true);
      
      toast({
        title: "Successfully joined group",
        description: `You've been added to ${data?.group?.name || 'the group'}`,
      });
      
      // Redirect to the group page after a brief delay
      setTimeout(() => {
        // The correct group route is /group/id (singular), not /groups/id
        setLocation(`/group/${data?.group?.id}`);
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join group",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // If user is not logged in, redirect to auth page with return path
  useEffect(() => {
    if (!authLoading && !user && inviteCode) {
      // Store the invite URL to return after login
      localStorage.setItem('returnPath', `/invite/${inviteCode}`);
      setLocation('/auth');
    }
  }, [authLoading, user, inviteCode, setLocation]);
  
  // Check if we need to redirect back after login
  useEffect(() => {
    if (user && !authLoading) {
      const returnPath = localStorage.getItem('returnPath');
      if (returnPath) {
        localStorage.removeItem('returnPath');
      }
    }
  }, [user, authLoading]);
  
  // Handle join group button click
  const handleJoinGroup = () => {
    joinMutation.mutate();
  };
  
  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Verifying invite link...</CardTitle>
            <CardDescription>Please wait while we check this invite link</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state - invalid invite
  if (isError || !inviteInfo?.valid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "This invite link is no longer valid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => setLocation('/')}>
              Go to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Already joined successfully
  if (joined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Successfully Joined!</CardTitle>
            <CardDescription>
              You have successfully joined the group. Redirecting you now...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show group invite info and join button
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <Users className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle>Group Invite</CardTitle>
          <CardDescription>
            You've been invited to join a group on FairShare
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-lg mb-1">
                {inviteInfo?.group?.name || "Group"}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center">
                <Users className="h-3.5 w-3.5 mr-1 inline" />
                {inviteInfo?.group?.memberCount || 0} member{inviteInfo?.group?.memberCount !== 1 ? 's' : ''}
              </p>
              {inviteInfo?.invitedBy && (
                <p className="text-sm mt-3 text-muted-foreground">
                  Invited by {inviteInfo.invitedBy.name}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full" 
            onClick={handleJoinGroup}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Join Group
          </Button>
          
          <Button variant="outline" className="w-full" onClick={() => setLocation('/')}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}