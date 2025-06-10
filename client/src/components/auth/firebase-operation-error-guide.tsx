import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const FirebaseOperationErrorGuide: React.FC = () => {
  return (
    <div className="space-y-4 my-6">
      <Alert variant="destructive">
        <AlertTitle className="font-bold">Google Sign-In Not Enabled</AlertTitle>
        <AlertDescription>
          Firebase Error: <span className="font-mono">(auth/operation-not-allowed)</span>
        </AlertDescription>
      </Alert>

      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 className="font-bold mb-3">How to fix this:</h3>
        
        <ol className="list-decimal list-inside space-y-2 mb-4 text-sm">
          <li>Go to the <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Firebase Console
            </a>
          </li>
          <li>Select your project</li>
          <li>Click on <span className="font-semibold">Authentication</span> in the left sidebar</li>
          <li>Navigate to the <span className="font-semibold">Sign-in method</span> tab</li>
          <li>Find <span className="font-semibold">Google</span> in the list of providers</li>
          <li>Click on it and toggle the switch to <span className="font-semibold">Enable</span> it</li>
          <li>Enter your Project support email (usually your account email)</li>
          <li>Click <span className="font-semibold">Save</span></li>
        </ol>

        <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
          <p className="font-semibold text-yellow-800">Important:</p>
          <p className="text-yellow-700">
            This error occurs when Google Sign-In is not enabled in your Firebase project's authentication settings.
            You need to explicitly enable each authentication provider you want to use.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirebaseOperationErrorGuide;