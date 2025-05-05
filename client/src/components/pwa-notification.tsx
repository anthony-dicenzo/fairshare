import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

// This component shows a notification when the app is installed as PWA
// or when the service worker is installed
export function PWANotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [message, setMessage] = useState("");
  
  useEffect(() => {
    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PWA_EVENT') {
        setMessage(event.data.message);
        setShowNotification(true);
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      }
    };
    
    // Check if app is running in standalone mode (installed as PWA)
    const isInstalledPWA = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    if (isInstalledPWA) {
      setMessage("FairShare is running as an installed app");
      setShowNotification(true);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }
    
    // Add message listener
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    // Cleanup
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);
  
  if (!showNotification) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className="bg-fairshare-primary bg-opacity-20 border-fairshare-primary">
        <Info className="h-4 w-4 text-fairshare-primary" />
        <AlertDescription className="text-fairshare-dark">
          {message}
        </AlertDescription>
      </Alert>
    </div>
  );
}