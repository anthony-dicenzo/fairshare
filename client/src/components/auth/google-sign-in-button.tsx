import { Button } from "@/components/ui/button";
import { FC, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";

interface GoogleSignInButtonProps {
  className?: string;
}

export const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({ className = "" }) => {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signInWithGoogle = async () => {
    console.log('=== GOOGLE SIGN-IN DEBUG ===');
    console.log('Current URL:', window.location.href);
    console.log('Current origin:', window.location.origin);
    console.log('Current hostname:', window.location.hostname);
    console.log('Auth object:', auth);
    console.log('Auth config:', {
      apiKey: auth.config.apiKey?.substring(0, 10) + '...',
      authDomain: auth.config.authDomain,
      projectId: auth.app.options.projectId
    });
    console.log('Google provider:', googleProvider);
    console.log('Google provider configured:', !!googleProvider);
    
    try {
      setIsSigningIn(true);
      
      console.log('Attempting Google sign-in with signInWithPopup...');
      // Use Firebase's signInWithPopup method
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('✅ Sign-in successful!', user);
      console.log("Google sign-in successful:", user.email);
      
      // Get the ID token and send to server
      const idToken = await user.getIdToken();
      
      const response = await fetch("/api/google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: idToken,
          name: user.displayName,
          email: user.email
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Server authentication failed");
      }
      
      const userData = await response.json();
      
      // Save auth state
      localStorage.setItem("fairshare_auth_state", JSON.stringify({
        userId: userData.id,
        username: userData.username,
        sessionId: userData.sessionId,
        loggedInAt: new Date().toISOString()
      }));
      
      toast({
        title: "Sign-in successful",
        description: `Welcome, ${userData.name || userData.username}!`
      });
      
      // Refresh page to update UI
      window.location.reload();
      
    } catch (error: any) {
      console.error('❌ Sign-in error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error object:', error);
      
      // Log additional details based on error type
      if (error?.code === 'auth/unauthorized-domain') {
        console.error('Domain not authorized. Current domain:', window.location.hostname);
        console.error('Make sure this domain is added to Firebase authorized domains');
      } else if (error?.code === 'auth/internal-error') {
        console.error('Internal Firebase error - may indicate service configuration issue');
        console.error('Check: Firebase Authentication enabled, Google provider configured');
      } else if (error?.code === 'auth/operation-not-allowed') {
        console.error('Google sign-in not enabled in Firebase Console');
      }
      
      console.error("Sign-in error:", error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };
        
        switch (firebaseError.code) {
          case 'auth/popup-blocked':
            toast({
              title: "Popup blocked",
              description: "Please allow popups for this site and try again.",
              variant: "destructive"
            });
            break;
          case 'auth/popup-closed-by-user':
            toast({
              title: "Sign-in cancelled",
              description: "You closed the sign-in popup.",
              variant: "destructive"
            });
            break;
          case 'auth/unauthorized-domain':
            toast({
              title: "Domain not authorized",
              description: "This domain needs to be added to Firebase authorized domains.",
              variant: "destructive"
            });
            break;
          case 'auth/operation-not-allowed':
            toast({
              title: "Google sign-in not enabled",
              description: "Google authentication is not enabled in Firebase Console.",
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: "Sign-in failed",
              description: firebaseError.message || "An error occurred during sign-in.",
              variant: "destructive"
            });
        }
      } else {
        toast({
          title: "Sign-in failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={signInWithGoogle}
      disabled={isSigningIn}
      className={`w-full h-12 rounded-xl border-gray-300 flex items-center justify-center gap-2 ${className}`}
    >
      {/* Google Logo */}
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
      >
        <path
          fill="#FFC107"
          d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
        />
        <path
          fill="#FF3D00"
          d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
        />
        <path
          fill="#1976D2"
          d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
        />
      </svg>
      <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
    </Button>
  );
};