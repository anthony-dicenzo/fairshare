import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  connectAuthEmulator,
  onAuthStateChanged,
  User
} from 'firebase/auth';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function FirebaseDebugComprehensive() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (index: number, updates: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  // Test 1: Environment Variables
  const testEnvironmentVariables = () => {
    const test: TestResult = {
      name: 'Environment Variables',
      status: 'pending',
      message: 'Checking Firebase config...'
    };
    const index = results.length;
    addResult(test);

    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_PROJECT_ID + '.firebaseapp.com',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const missing = Object.entries(config)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      updateResult(index, {
        status: 'error',
        message: `Missing environment variables: ${missing.join(', ')}`,
        details: config
      });
    } else {
      updateResult(index, {
        status: 'success',
        message: 'All environment variables present',
        details: {
          ...config,
          apiKey: config.apiKey?.substring(0, 10) + '...'
        }
      });
    }
  };

  // Test 2: Firebase App Initialization
  const testFirebaseInitialization = async () => {
    const test: TestResult = {
      name: 'Firebase Initialization',
      status: 'pending',
      message: 'Initializing Firebase app...'
    };
    const index = results.length;
    addResult(test);

    return new Promise((resolve) => {
      // Set timeout for initialization
      const timeout = setTimeout(() => {
        updateResult(index, {
          status: 'error',
          message: 'Firebase initialization timeout (5s)',
          details: { error: 'Initialization took too long' }
        });
        resolve(null);
      }, 5000);

      try {
        const config = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
          messagingSenderId: "",
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        console.log('Firebase config check:', {
          hasApiKey: !!config.apiKey,
          hasProjectId: !!config.projectId,
          hasAppId: !!config.appId,
          authDomain: config.authDomain
        });

        // Check existing apps
        const existingApps = getApps();
        console.log('Existing Firebase apps:', existingApps.length);

        let app;
        
        // Use existing app if available, otherwise create new one
        if (existingApps.length > 0) {
          app = existingApps[0];
          console.log('Using existing Firebase app:', app.name);
        } else {
          console.log('Creating new Firebase app...');
          app = initializeApp(config, 'debug-app-' + Date.now());
          console.log('Firebase app created:', app.name);
        }
        
        clearTimeout(timeout);
        updateResult(index, {
          status: 'success',
          message: 'Firebase app initialized successfully',
          details: {
            appName: app.name,
            projectId: app.options.projectId,
            authDomain: app.options.authDomain,
            existingApps: existingApps.length,
            isNewApp: existingApps.length === 0
          }
        });

        resolve(app);
      } catch (error: any) {
        clearTimeout(timeout);
        console.error('Firebase initialization error:', error);
        updateResult(index, {
          status: 'error',
          message: `Firebase initialization failed: ${error.message}`,
          details: {
            error: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack?.substring(0, 300)
          }
        });
        resolve(null);
      }
    });
  };

  // Test 3: Auth Service Access
  const testAuthService = (app: any) => {
    const test: TestResult = {
      name: 'Auth Service',
      status: 'pending',
      message: 'Testing auth service access...'
    };
    const index = results.length;
    addResult(test);

    try {
      const auth = getAuth(app);
      
      updateResult(index, {
        status: 'success',
        message: 'Auth service accessible',
        details: {
          currentUser: auth.currentUser?.email || 'No user',
          authDomain: auth.config.authDomain,
          apiKey: auth.config.apiKey?.substring(0, 10) + '...'
        }
      });

      return auth;
    } catch (error: any) {
      updateResult(index, {
        status: 'error',
        message: `Auth service error: ${error.message}`,
        details: error
      });
      return null;
    }
  };

  // Test 4: Google Provider Setup
  const testGoogleProvider = () => {
    const test: TestResult = {
      name: 'Google Provider',
      status: 'pending',
      message: 'Setting up Google provider...'
    };
    const index = results.length;
    addResult(test);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      updateResult(index, {
        status: 'success',
        message: 'Google provider created successfully',
        details: {
          providerId: provider.providerId,
          scopes: ['email', 'profile']
        }
      });

      return provider;
    } catch (error: any) {
      updateResult(index, {
        status: 'error',
        message: `Google provider error: ${error.message}`,
        details: error
      });
      return null;
    }
  };

  // Test 5: Auth State Listener
  const testAuthStateListener = (auth: any) => {
    const test: TestResult = {
      name: 'Auth State Listener',
      status: 'pending',
      message: 'Setting up auth state listener...'
    };
    const index = results.length;
    addResult(test);

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        console.log('Auth state changed:', user?.email || 'No user');
      });

      updateResult(index, {
        status: 'success',
        message: 'Auth state listener active',
        details: {
          currentUser: auth.currentUser?.email || 'No user'
        }
      });

      return unsubscribe;
    } catch (error: any) {
      updateResult(index, {
        status: 'error',
        message: `Auth state listener error: ${error.message}`,
        details: error
      });
      return null;
    }
  };

  // Test 6: Popup Sign-In Attempt
  const testPopupSignIn = async (auth: any, provider: any) => {
    const test: TestResult = {
      name: 'Popup Sign-In',
      status: 'pending',
      message: 'Attempting popup sign-in...'
    };
    const index = results.length;
    addResult(test);

    try {
      const result = await signInWithPopup(auth, provider);
      
      updateResult(index, {
        status: 'success',
        message: 'Popup sign-in successful!',
        details: {
          user: result.user.email,
          uid: result.user.uid,
          providerId: result.providerId
        }
      });

      return result;
    } catch (error: any) {
      updateResult(index, {
        status: 'error',
        message: `Popup sign-in failed: ${error.code} - ${error.message}`,
        details: {
          code: error.code,
          message: error.message,
          customData: error.customData
        }
      });
      return null;
    }
  };

  // Test 7: Redirect Sign-In Attempt
  const testRedirectSignIn = async (auth: any, provider: any) => {
    const test: TestResult = {
      name: 'Redirect Sign-In',
      status: 'pending',
      message: 'Attempting redirect sign-in...'
    };
    const index = results.length;
    addResult(test);

    try {
      await signInWithRedirect(auth, provider);
      
      updateResult(index, {
        status: 'success',
        message: 'Redirect initiated (will redirect)',
        details: {
          note: 'Page will redirect to Google'
        }
      });
    } catch (error: any) {
      updateResult(index, {
        status: 'error',
        message: `Redirect sign-in failed: ${error.code} - ${error.message}`,
        details: {
          code: error.code,
          message: error.message,
          customData: error.customData
        }
      });
    }
  };

  // Check for redirect result on page load
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const config = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
          messagingSenderId: "",
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        const app = initializeApp(config, 'redirect-check-' + Date.now());
        const auth = getAuth(app);
        
        const result = await getRedirectResult(auth);
        if (result) {
          addResult({
            name: 'Redirect Result',
            status: 'success',
            message: 'Redirect authentication successful!',
            details: {
              user: result.user.email,
              providerId: result.providerId
            }
          });
        }
      } catch (error: any) {
        if (error.code !== 'auth/no-redirect-result') {
          addResult({
            name: 'Redirect Result',
            status: 'error',
            message: `Redirect result error: ${error.code} - ${error.message}`,
            details: error
          });
        }
      }
    };

    checkRedirectResult();
  }, []);

  const runFullTest = async () => {
    setLoading(true);
    setResults([]);

    // Step 1: Environment Variables
    testEnvironmentVariables();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Firebase Initialization (now async)
    const app = await testFirebaseInitialization();
    if (!app) {
      setLoading(false);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Auth Service
    const auth = testAuthService(app);
    if (!auth) {
      setLoading(false);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 4: Google Provider
    const provider = testGoogleProvider();
    if (!provider) {
      setLoading(false);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 5: Auth State Listener
    const unsubscribe = testAuthStateListener(auth);
    await new Promise(resolve => setTimeout(resolve, 500));

    setLoading(false);

    // Store references for manual testing
    (window as any).debugAuth = auth;
    (window as any).debugProvider = provider;
    (window as any).testPopup = () => testPopupSignIn(auth, provider);
    (window as any).testRedirect = () => testRedirectSignIn(auth, provider);
  };

  const manualPopupTest = async () => {
    const auth = (window as any).debugAuth;
    const provider = (window as any).debugProvider;
    if (auth && provider) {
      await testPopupSignIn(auth, provider);
    }
  };

  const manualRedirectTest = async () => {
    const auth = (window as any).debugAuth;
    const provider = (window as any).debugProvider;
    if (auth && provider) {
      await testRedirectSignIn(auth, provider);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Firebase Authentication Debug
        </h1>
        <p className="text-muted-foreground">
          Comprehensive testing of Firebase authentication setup
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          onClick={runFullTest} 
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? 'Running Tests...' : 'Run Full Test Suite'}
        </Button>
        
        <Button 
          onClick={manualPopupTest} 
          variant="outline"
          disabled={!(window as any).debugAuth}
        >
          Test Popup Sign-In
        </Button>
        
        <Button 
          onClick={manualRedirectTest} 
          variant="outline"
          disabled={!(window as any).debugAuth}
        >
          Test Redirect Sign-In
        </Button>
      </div>

      {currentUser && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Authentication Success</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              Signed in as: <strong>{currentUser.email}</strong>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {results.map((result, index) => (
          <Card key={index} className={
            result.status === 'success' ? 'border-green-200' :
            result.status === 'error' ? 'border-red-200' : 'border-yellow-200'
          }>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{result.name}</CardTitle>
                <Badge variant={
                  result.status === 'success' ? 'default' :
                  result.status === 'error' ? 'destructive' : 'secondary'
                }>
                  {result.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2">{result.message}</p>
              {result.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {results.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Click "Run Full Test Suite" to begin diagnostic testing
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}