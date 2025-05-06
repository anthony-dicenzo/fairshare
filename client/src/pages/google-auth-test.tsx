import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider 
} from "firebase/auth";

// A standalone test page for Google Authentication
export function GoogleAuthTestPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)} - ${message}`]);
  };

  // Check for redirect result on page load
  useEffect(() => {
    const checkForRedirectResult = async () => {
      addLog("Checking for redirect result...");
      
      if (!auth) {
        addLog("❌ Firebase auth is not initialized");
        return;
      }
      
      try {
        addLog("Calling getRedirectResult...");
        const result = await getRedirectResult(auth);
        
        if (result) {
          addLog(`✅ Received redirect result for: ${result.user.email}`);
          setAuthResult({
            email: result.user.email,
            name: result.user.displayName,
            uid: result.user.uid
          });
        } else {
          addLog("No redirect result found");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addLog(`❌ Error checking redirect result: ${errorMessage}`);
        setError(errorMessage);
      }
    };
    
    checkForRedirectResult();
  }, []);

  const handlePopupSignIn = async () => {
    setIsLoading(true);
    setError(null);
    addLog("Starting popup sign-in attempt...");
    
    try {
      if (!auth || !googleProvider) {
        throw new Error("Firebase auth or Google provider not initialized");
      }
      
      addLog("Calling signInWithPopup...");
      const result = await signInWithPopup(auth, googleProvider);
      
      addLog(`✅ Popup sign-in successful for: ${result.user.email}`);
      setAuthResult({
        email: result.user.email,
        name: result.user.displayName,
        uid: result.user.uid
      });
      
      toast({
        title: "Google Sign-In Successful",
        description: `Signed in as ${result.user.email}`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`❌ Popup sign-in error: ${errorMessage}`);
      setError(errorMessage);
      
      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirectSignIn = async () => {
    setIsLoading(true);
    setError(null);
    addLog("Starting redirect sign-in attempt...");
    
    try {
      if (!auth || !googleProvider) {
        throw new Error("Firebase auth or Google provider not initialized");
      }
      
      addLog("Calling signInWithRedirect...");
      await signInWithRedirect(auth, googleProvider);
      
      // This code won't execute due to the redirect
      addLog("If you see this, the redirect didn't work");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`❌ Redirect sign-in error: ${errorMessage}`);
      setError(errorMessage);
      
      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">Google Authentication Test</h1>
      
      <div className="space-y-4 mb-6">
        <Button 
          onClick={handlePopupSignIn} 
          disabled={isLoading}
          className="w-full"
        >
          Sign In with Google (Popup)
        </Button>
        
        <Button 
          onClick={handleRedirectSignIn} 
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          Sign In with Google (Redirect)
        </Button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
          <h3 className="font-bold">Error:</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {authResult && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md mb-4">
          <h3 className="font-bold">Authentication Success:</h3>
          <div className="text-sm">
            <p><strong>Email:</strong> {authResult.email}</p>
            <p><strong>Name:</strong> {authResult.name}</p>
            <p><strong>User ID:</strong> {authResult.uid}</p>
          </div>
        </div>
      )}
      
      <div className="border rounded-md">
        <h3 className="font-bold p-2 border-b">Debug Logs:</h3>
        <div className="bg-gray-50 p-2 h-60 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">No logs yet...</p>
          ) : (
            <ul className="text-xs font-mono">
              {logs.map((log, i) => (
                <li key={i} className="pb-1">{log}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoogleAuthTestPage;