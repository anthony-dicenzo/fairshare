import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

export default function FirebaseAuthTestSimple() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [error, setError] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const testPopupAuth = async () => {
    setStatus('Testing popup authentication...');
    setError(null);
    
    try {
      console.log('Starting popup auth with:', {
        auth: !!auth,
        provider: !!googleProvider,
        authDomain: auth.config.authDomain,
        appId: auth.app.options.appId
      });

      const result = await signInWithPopup(auth, googleProvider);
      
      setStatus('Popup authentication successful!');
      setUser(result.user);
      console.log('Auth success:', result.user.email);
      
    } catch (error: any) {
      console.error('Popup auth error:', error);
      setStatus('Popup authentication failed');
      setError({
        code: error.code,
        message: error.message,
        details: error.customData || {}
      });
    }
  };

  const testRedirectAuth = async () => {
    setStatus('Initiating redirect authentication...');
    setError(null);
    
    try {
      console.log('Starting redirect auth...');
      await signInWithRedirect(auth, googleProvider);
      // Page will redirect, so we won't reach this line
    } catch (error: any) {
      console.error('Redirect auth error:', error);
      setStatus('Redirect authentication failed');
      setError({
        code: error.code,
        message: error.message,
        details: error.customData || {}
      });
    }
  };

  const checkRedirectResult = async () => {
    setStatus('Checking redirect result...');
    
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        setStatus('Redirect authentication successful!');
        setUser(result.user);
        console.log('Redirect auth success:', result.user.email);
      } else {
        setStatus('No redirect result found');
      }
    } catch (error: any) {
      console.error('Redirect result error:', error);
      setStatus('Redirect result check failed');
      setError({
        code: error.code,
        message: error.message,
        details: error.customData || {}
      });
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setStatus('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Firebase Authentication Test
        </h1>
        <p className="text-muted-foreground">
          Direct test of Firebase Google authentication
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{status}</p>
            
            {user && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-semibold text-green-800 mb-2">Signed In Successfully</h3>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.displayName}</p>
                <p><strong>UID:</strong> {user.uid}</p>
                <Button onClick={signOut} variant="outline" className="mt-2">
                  Sign Out
                </Button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                <p><strong>Code:</strong> {error.code}</p>
                <p><strong>Message:</strong> {error.message}</p>
                {error.details && Object.keys(error.details).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Additional Details</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={testPopupAuth} 
                className="w-full bg-primary hover:bg-primary/90"
              >
                Test Popup Authentication
              </Button>
              
              <Button 
                onClick={testRedirectAuth} 
                variant="outline" 
                className="w-full"
              >
                Test Redirect Authentication
              </Button>
              
              <Button 
                onClick={checkRedirectResult} 
                variant="secondary" 
                className="w-full"
              >
                Check Redirect Result
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firebase Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p><strong>App ID:</strong> {auth.app.options.appId}</p>
              <p><strong>Auth Domain:</strong> {auth.config.authDomain}</p>
              <p><strong>API Key:</strong> {auth.config.apiKey?.substring(0, 10)}...</p>
              <p><strong>Current User:</strong> {auth.currentUser?.email || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}