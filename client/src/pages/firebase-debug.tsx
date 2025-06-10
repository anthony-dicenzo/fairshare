import React, { useEffect, useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';

// This is a debugging page to verify Firebase configuration
export function FirebaseDebugPage() {
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Checking Firebase configuration...');
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('Checking API Key...');
  const [projectIdStatus, setProjectIdStatus] = useState<string>('Checking Project ID...');
  const [appIdStatus, setAppIdStatus] = useState<string>('Checking App ID...');
  const [authStatus, setAuthStatus] = useState<string>('Checking Auth initialization...');
  const [providerStatus, setProviderStatus] = useState<string>('Checking Google Provider...');

  useEffect(() => {
    // Check if environment variables are available
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;

    setApiKeyStatus(apiKey ? 'API Key is available' : 'API Key is missing');
    setProjectIdStatus(projectId ? 'Project ID is available' : 'Project ID is missing');
    setAppIdStatus(appId ? 'App ID is available' : 'App ID is missing');

    // Check if Firebase Auth is initialized
    setAuthStatus(auth ? 'Firebase Auth is initialized' : 'Firebase Auth is NOT initialized');
    setProviderStatus(googleProvider ? 'Google Provider is initialized' : 'Google Provider is NOT initialized');

    // Overall Firebase status
    if (apiKey && projectId && appId && auth && googleProvider) {
      setFirebaseStatus('Firebase appears to be properly configured');
    } else {
      setFirebaseStatus('Firebase configuration has issues');
    }
  }, []);

  return (
    <div className="p-8 max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <h1 className="text-xl font-bold mb-4">Firebase Configuration Debug</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-bold text-lg">Overall Status</h2>
          <p className={firebaseStatus.includes('properly') ? 'text-green-600' : 'text-red-600'}>
            {firebaseStatus}
          </p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-bold">Environment Variables</h2>
          <ul className="space-y-2 mt-2">
            <li className={apiKeyStatus.includes('available') ? 'text-green-600' : 'text-red-600'}>
              {apiKeyStatus}
            </li>
            <li className={projectIdStatus.includes('available') ? 'text-green-600' : 'text-red-600'}>
              {projectIdStatus}
            </li>
            <li className={appIdStatus.includes('available') ? 'text-green-600' : 'text-red-600'}>
              {appIdStatus}
            </li>
          </ul>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-bold">Firebase Initialization</h2>
          <ul className="space-y-2 mt-2">
            <li className={authStatus.includes('is initialized') ? 'text-green-600' : 'text-red-600'}>
              {authStatus}
            </li>
            <li className={providerStatus.includes('is initialized') ? 'text-green-600' : 'text-red-600'}>
              {providerStatus}
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>This is a debug page to verify Firebase configuration. Please make sure all checks above are green before using Firebase authentication.</p>
      </div>
    </div>
  );
}

export default FirebaseDebugPage;