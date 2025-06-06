import { Button } from "@/components/ui/button";
import { FC, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import FirebaseDomainErrorGuide from "@/components/auth/firebase-domain-error-guide";
import FirebaseOperationErrorGuide from "@/components/auth/firebase-operation-error-guide";

interface GoogleSignInButtonProps {
  className?: string;
}

export const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({ className = "" }) => {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDomainError, setShowDomainError] = useState(false);
  const [showOperationError, setShowOperationError] = useState(false);

  // Function to handle Google Sign-In button click
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      console.log("Google Sign-In button clicked");
      
      // Check if Firebase is properly initialized
      if (!auth || !googleProvider) {
        throw new Error("Google sign-in service is not available. Please try again later.");
      }
      
      toast({
        title: "Initiating Google Sign-In",
        description: "Opening Google authentication popup..."
      });
      
      // Use popup authentication directly
      console.log("Attempting signInWithPopup...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Popup sign-in successful!", result.user.email);
      
      // Process the successful popup result
      const idToken = await result.user.getIdToken();
      const response = await fetch("/api/google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: idToken,
          name: result.user.displayName,
          email: result.user.email
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to authenticate with the server after successful Google sign-in");
      }
      
      const userData = await response.json();
      console.log("Server authentication successful:", userData);
      
      // Save auth state to localStorage
      localStorage.setItem("fairshare_auth_state", JSON.stringify({
        userId: userData.id,
        username: userData.username,
        sessionId: userData.sessionId,
        loggedInAt: new Date().toISOString()
      }));
      
      // Reset UI state
      setIsSigningIn(false);
      
      toast({
        title: "Google Sign-In successful",
        description: `Welcome, ${userData.name || userData.username}!`
      });
      
      // Refresh the page to update the UI
      window.location.reload();
      
    } catch (error) {
      setIsSigningIn(false);
      console.error("Google sign-in error:", error);
      
      // Check for specific Firebase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };
        
        // Fire event and store error
        const errorEvent = new CustomEvent('firebase-auth-error', { 
          detail: { error: firebaseError } 
        });
        window.dispatchEvent(errorEvent);
        
        if (firebaseError.code === 'auth/unauthorized-domain') {
          setShowDomainError(true);
          localStorage.setItem('firebase_auth_error', firebaseError.code);
          
          toast({
            title: "Google Sign-In Failed",
            description: "Your domain needs to be registered in Firebase. See instructions below.",
            variant: "destructive"
          });
          return;
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
          setShowOperationError(true);
          localStorage.setItem('firebase_auth_error', firebaseError.code);
          
          toast({
            title: "Google Sign-In Not Enabled",
            description: "Google authentication needs to be enabled in your Firebase project settings.",
            variant: "destructive"
          });
          return;
        }
      }
      
      toast({
        title: "Google Sign-In Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Check for Firebase errors in localStorage on mount
  useEffect(() => {
    const checkForStoredErrors = () => {
      // Check localStorage for previously stored errors
      const storedError = localStorage.getItem('firebase_auth_error');
      
      if (storedError) {
        if (storedError.includes('auth/unauthorized-domain')) {
          setShowDomainError(true);
        } else if (storedError.includes('auth/operation-not-allowed')) {
          setShowOperationError(true);
        }
      }
    };
    
    checkForStoredErrors();
    
    // Listen for errors in the current session
    const handleAuthError = (event: CustomEvent) => {
      if (event.detail?.error?.code) {
        const errorCode = event.detail.error.code;
        
        // Store error in localStorage so we can persist across page loads
        localStorage.setItem('firebase_auth_error', errorCode);
        
        // Set specific error state based on the error type
        if (errorCode === 'auth/unauthorized-domain') {
          setShowDomainError(true);
        } else if (errorCode === 'auth/operation-not-allowed') {
          setShowOperationError(true);
        }
      }
    };
    
    // Add event listener for Firebase auth errors
    window.addEventListener('firebase-auth-error' as any, handleAuthError);
    
    return () => {
      window.removeEventListener('firebase-auth-error' as any, handleAuthError);
    };
  }, []);

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
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
      
      {/* Show domain error guide if we have an unauthorized domain error */}
      {showDomainError && (
        <div className="mt-4">
          <FirebaseDomainErrorGuide />
        </div>
      )}
      
      {/* Show operation not allowed error guide */}
      {showOperationError && (
        <div className="mt-4">
          <FirebaseOperationErrorGuide />
        </div>
      )}
    </div>
  );
};