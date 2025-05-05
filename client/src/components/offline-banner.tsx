import { useState, useEffect } from "react";
import { isOffline, addNetworkStatusListeners } from "@/lib/serviceWorkerRegistration";

export function OfflineBanner() {
  const [offline, setOffline] = useState(isOffline());

  useEffect(() => {
    // Set up event listeners for online/offline status
    const cleanup = addNetworkStatusListeners(
      () => setOffline(false),
      () => setOffline(true)
    );
    
    // Clean up event listeners on component unmount
    return cleanup;
  }, []);
  
  if (!offline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2 text-center bg-yellow-500 text-yellow-900 font-medium shadow-md">
      You're offline. Viewing previously loaded data.
    </div>
  );
}