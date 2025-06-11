import { Button } from "@/components/ui/button";
import { FC, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithRedirect, getRedirectResult, onAuthStateChanged } from "firebase/auth";

interface GoogleSignInButtonProps {
  className?: string;
}

export const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({ className = "" }) => {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Handle redirect result when component mounts
  useEffect(() => {
    const handleRedirectResult = async () => {
      console.log('Checking for redirect result...');
      
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Redirect sign-in successful!', result.user);
          console.log('User email:', result.user.email);
          console.log('User display name:', result.user.displayName);
          
          toast({
            title: "Sign-in Successful!",
            description: `Welcome, ${result.user.displayName || result.user.email}!`,
          });
          
          // Refresh page to update UI
          window.location.reload();
        } else {
          console.log('No redirect result found');
        }
      } catch (error: any) {
        console.error('❌ Redirect result error:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        
        toast({
          variant: "destructive",
          title: "Sign-in Error",
          description: error?.message || "Authentication failed after redirect",
        });
      }
    };

    handleRedirectResult();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('✅ User is signed in:', user.email);
      } else {
        console.log('User is signed out');
      }
    });

    return () => unsubscribe();
  }, [toast]);

  // Test Firebase connectivity before attempting auth
  const testFirebaseConnectivity = async () => {
    console.log('=== FIREBASE CONNECTIVITY TEST ===');
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${import.meta.env.VITE_FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'test' })
      });
      console.log('✅ Firebase API reachable, status:', response.status);
      return true;
    } catch (error) {
      console.error('❌ Firebase API unreachable:', error);
      return false;
    }
  };

  const signInWithGoogle = async () => {
    console.log('=== COMPREHENSIVE FIREBASE DEBUG ===');
    console.log('Current URL:', window.location.href);
    console.log('Current origin:', window.location.origin);
    console.log('Current hostname:', window.location.hostname);
    
    // Test Firebase connectivity first
    const isFirebaseReachable = await testFirebaseConnectivity();
    console.log('Firebase connectivity test passed:', isFirebaseReachable);
    
    console.log('Auth object fields comparison:');
    console.log('- Auth object:', {
      apiKey: auth.config?.apiKey ? 'Present' : 'MISSING',
      authDomain: auth.config?.authDomain || 'MISSING',
      projectId: 'projectId' in auth.config ? auth.config.projectId : 'MISSING',
      appName: auth.app?.name || 'MISSING'
    });
    console.log('- Auth app options:', {
      apiKey: auth.app.options?.apiKey ? 'Present' : 'MISSING',
      authDomain: auth.app.options?.authDomain || 'MISSING',
      projectId: auth.app.options?.projectId || 'MISSING',
      storageBucket: auth.app.options?.storageBucket || 'MISSING',
      messagingSenderId: auth.app.options?.messagingSenderId || 'MISSING',
      appId: auth.app.options?.appId ? 'Present' : 'MISSING'
    });
    
    console.log('OAuth Configuration Analysis:');
    console.log('- Expected redirect URI: https://fairshare-v3.firebaseapp.com/__/auth/handler');
    console.log('- Current domain needs JS origin:', window.location.origin);
    console.log('- Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    
    console.log('Google provider:', googleProvider);
    console.log('Google provider configured:', !!googleProvider);
    
    try {
      setIsSigningIn(true);
      console.log('Starting redirect sign-in...');
      
      // Use signInWithRedirect instead of popup
      await signInWithRedirect(auth, googleProvider);
      // User will be redirected, so this code won't continue
      
    } catch (error: any) {
      console.error('❌ Redirect sign-in error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error object:', error);
      
      let errorMessage = "Sign-in failed. Please try again.";
      let errorDescription = "";
      
      if (error?.code === 'auth/unauthorized-domain') {
        console.error('Domain not authorized. Current domain:', window.location.hostname);
        errorMessage = "Domain not authorized";
        errorDescription = "This domain is not configured for Google sign-in";
      } else if (error?.code === 'auth/internal-error') {
        console.error('Internal Firebase error - may indicate service configuration issue');
        errorMessage = "Configuration error";
        errorDescription = "Google authentication is not properly configured";
      } else if (error?.code === 'auth/operation-not-allowed') {
        console.error('Google sign-in not enabled in Firebase Console');
        errorMessage = "Google sign-in not enabled";
        errorDescription = "Please contact support";
      } else {
        errorDescription = error?.message || "Unknown error occurred";
      }
      
      toast({
        variant: "destructive",
        title: errorMessage,
        description: errorDescription,
      });
      
      setIsSigningIn(false);
    }
  };

  return (
    <Button 
      onClick={signInWithGoogle}
      disabled={isSigningIn}
      variant="outline" 
      className={`w-full ${className}`}
    >
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {isSigningIn ? "Signing in..." : "Continue with Google"}
    </Button>
  );
};