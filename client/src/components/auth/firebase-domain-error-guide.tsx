import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FirebaseDomainErrorGuideProps {
  currentDomain?: string;
}

export const FirebaseDomainErrorGuide: React.FC<FirebaseDomainErrorGuideProps> = ({ 
  currentDomain = window.location.hostname 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 my-6">
      <Alert variant="destructive">
        <AlertTitle className="font-bold">Firebase Domain Authorization Error</AlertTitle>
        <AlertDescription>
          Your current domain <span className="font-mono font-bold">{currentDomain}</span> is not authorized in Firebase.
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
          <li>Navigate to <span className="font-semibold">Authentication &gt; Settings</span></li>
          <li>Scroll to <span className="font-semibold">Authorized domains</span> section</li>
          <li>Click <span className="font-semibold">Add domain</span> button</li>
          <li>Add the domain below:</li>
        </ol>

        <div className="flex gap-2 mb-4">
          <Input 
            type="text" 
            value={currentDomain} 
            readOnly 
            className="font-mono bg-white"
          />
          <Button 
            onClick={handleCopyDomain}
            className="min-w-[100px]"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <p className="text-sm text-slate-600">
          <strong>Note:</strong> After deployment, you'll also need to add your replit.app and/or 
          custom domain to the authorized domains list.
        </p>
      </div>
    </div>
  );
};

export default FirebaseDomainErrorGuide;