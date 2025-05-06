import { Button } from "@/components/ui/button";
import { FC, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithRedirect, signInWithPopup, getRedirectResult } from "firebase/auth";
import FirebaseDomainErrorGuide from "@/components/auth/firebase-domain-error-guide";

interface GoogleSignInButtonProps {
  className?: string;
}

export const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({ className = "" }) => {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Check for redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      if (!auth) return;
      
      try {
        console.log("Checking for Google auth redirect result...");
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log("Google redirect result received:", result.user.email);
          
          // Process the result by getting the ID token and sending to our backend
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
            throw new Error("Failed to authenticate with the server");
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
          
          toast({
            title: "Google Sign-In successful",
            description: `Welcome, ${userData.name || userData.username}!`
          });
          
          // Refresh the page to update the UI
          window.location.reload();
        }
      } catch (error) {
        console.error("Error processing Google redirect result:", error);
        
        // Check for specific Firebase errors
        if (error && typeof error === 'object' && 'code' in error) {
          const firebaseError = error as { code: string; message?: string };
          
          if (firebaseError.code === 'auth/configuration-not-found') {
            toast({
              title: "Google Sign-In Failed",
              description: "Firebase configuration issue detected. Make sure your app domain is registered in the Firebase console's authorized domains list.",
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
    
    checkRedirectResult();
  }, [toast]);

  // Function to handle Google Sign-In button click
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      console.log("Google Sign-In button clicked");
      
      // Check if Firebase is properly initialized
      if (!auth || !googleProvider) {
        throw new Error("Google sign-in service is not available. Please try again later.");
      }
      
      console.log("Firebase auth and Google provider are available:", {
        auth: !!auth,
        googleProvider: !!googleProvider
      });
      
      toast({
        title: "Initiating Google Sign-In",
        description: "Redirecting to Google authentication..."
      });
      
      console.log("About to call signInWithRedirect...");
      
      // Add a small timeout to make sure the toast message is displayed
      setTimeout(async () => {
        try {
          // Redirect to Google sign-in - this will navigate away from our page
          console.log("Calling signInWithRedirect now...");
          
          // Make sure auth and googleProvider are non-null
          if (auth && googleProvider) {
            try {
              // Try redirect first
              console.log("Attempting signInWithRedirect...");
              await signInWithRedirect(auth as any, googleProvider as any);
              console.log("If you see this message, the redirect did NOT happen");
            } catch (redirectFailedError) {
              // If redirect fails, try popup as fallback
              console.log("Redirect failed, trying popup as fallback...", redirectFailedError);
              
              // Check if this is an unauthorized domain error
              if (redirectFailedError && typeof redirectFailedError === 'object' && 'code' in redirectFailedError) {
                const firebaseError = redirectFailedError as { code: string; message?: string };
                
                if (firebaseError.code === 'auth/unauthorized-domain') {
                  setShowDomainError(true);
                  localStorage.setItem('firebase_auth_error', firebaseError.code);
                  
                  // Dispatch custom event to notify other components
                  const errorEvent = new CustomEvent('firebase-auth-error', { 
                    detail: { error: firebaseError } 
                  });
                  window.dispatchEvent(errorEvent);
                  
                  toast({
                    title: "Domain Not Authorized in Firebase",
                    description: "Please add this domain to your Firebase authorized domains list.",
                    variant: "destructive"
                  });
                  
                  // Don't try popup if domain isn't authorized - it will fail too
                  throw firebaseError;
                }
              }
              
              toast({
                title: "Switching to popup authentication",
                description: "Redirect didn't work, opening a popup window instead..."
              });
              
              // Try popup authentication instead
              const result = await signInWithPopup(auth as any, googleProvider as any);
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
                throw new Error("Failed to authenticate with the server after successful popup");
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
            }
          } else {
            throw new Error("Firebase auth or Google provider became unavailable");
          }
        } catch (redirectError) {
          console.error("Error during redirect (from setTimeout):", redirectError);
          setIsSigningIn(false);
          toast({
            title: "Google Sign-In Failed",
            description: "Error during redirect: " + (redirectError instanceof Error ? redirectError.message : "Unknown error"),
            variant: "destructive"
          });
        }
      }, 500);
      
      // Code below will still execute because we're using setTimeout for the redirect
      console.log("Sign-in process initiated with timeout");
    } catch (error) {
      setIsSigningIn(false);
      console.error("Google sign-in redirect error:", error);
      
      // Check for specific Firebase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };
        
        if (firebaseError.code === 'auth/configuration-not-found' || firebaseError.code === 'auth/unauthorized-domain') {
          setShowDomainError(true);
          localStorage.setItem('firebase_auth_error', firebaseError.code);
          
          // Dispatch custom event to notify other components
          const errorEvent = new CustomEvent('firebase-auth-error', { 
            detail: { error: firebaseError } 
          });
          window.dispatchEvent(errorEvent);
          
          toast({
            title: "Google Sign-In Failed",
            description: "Your domain needs to be registered in Firebase. See instructions below.",
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

  // State to track if we've seen the unauthorized domain error
  const [showDomainError, setShowDomainError] = useState<boolean>(false);
  
  // Check for unauthorized domain error in caught errors
  useEffect(() => {
    const checkForUnauthorizedDomainError = () => {
      // Check localStorage for previously stored error
      const storedError = localStorage.getItem('firebase_auth_error');
      if (storedError && storedError.includes('auth/unauthorized-domain')) {
        setShowDomainError(true);
      }
    };
    
    checkForUnauthorizedDomainError();
  }, []);
  
  // Listen for errors in the current session
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      if (event.detail?.error?.code === 'auth/unauthorized-domain') {
        setShowDomainError(true);
        // Store error in localStorage so we can persist across page loads
        localStorage.setItem('firebase_auth_error', event.detail.error.code);
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
    </div>
  );
};