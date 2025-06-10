import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface FirebaseStatusCheckerProps {
  onStatusChange?: (isReady: boolean) => void;
}

export const FirebaseStatusChecker = ({ onStatusChange }: FirebaseStatusCheckerProps) => {
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkFirebaseStatus = async () => {
    setChecking(true);
    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      
      // Test Firebase Auth API
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/config?key=${apiKey}`
      );
      
      const isEnabled = response.status === 200;
      setAuthEnabled(isEnabled);
      onStatusChange?.(isEnabled);
      
    } catch (error) {
      setAuthEnabled(false);
      onStatusChange?.(false);
    }
    setChecking(false);
  };

  useEffect(() => {
    checkFirebaseStatus();
  }, []);

  const getStatusIcon = () => {
    if (authEnabled === null || checking) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return authEnabled ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusText = () => {
    if (checking) return "Checking Firebase status...";
    if (authEnabled === null) return "Status unknown";
    return authEnabled ? "Firebase Authentication enabled" : "Firebase Authentication not enabled";
  };

  const getStatusColor = () => {
    if (authEnabled === null || checking) return "text-yellow-600";
    return authEnabled ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Firebase Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`mb-4 ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        
        {!authEnabled && authEnabled !== null && (
          <div className="space-y-2 text-sm text-gray-600">
            <p>To enable Google sign-in:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to Firebase Console</li>
              <li>Click "Authentication" → "Get started"</li>
              <li>Enable Google provider</li>
              <li>Add authorized domains</li>
            </ol>
          </div>
        )}
        
        <Button 
          onClick={checkFirebaseStatus} 
          disabled={checking}
          className="w-full mt-4"
          variant="outline"
        >
          {checking ? "Checking..." : "Recheck Status"}
        </Button>
      </CardContent>
    </Card>
  );
};