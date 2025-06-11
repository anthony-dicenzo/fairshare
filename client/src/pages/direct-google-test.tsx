import { useEffect } from "react";

export default function DirectGoogleTest() {
  useEffect(() => {
    // Load Google Identity Services library
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleAuth;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeGoogleAuth = () => {
    console.log('=== DIRECT GOOGLE AUTH TEST ===');
    console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('Current domain:', window.location.origin);
    
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
      });
      
      google.accounts.id.renderButton(
        document.getElementById("direct-google-signin"),
        { theme: "outline", size: "large", text: "continue_with" }
      );
      
      console.log('✅ Direct Google OAuth initialized successfully');
    } else {
      console.error('❌ Google Identity Services not loaded');
    }
  };

  const handleCredentialResponse = (response: any) => {
    console.log('=== DIRECT GOOGLE AUTH SUCCESS ===');
    console.log('Direct Google auth successful:', response);
    console.log('Credential token received:', !!response.credential);
    
    if (response.credential) {
      // Decode JWT to see user info
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        console.log('User info from direct OAuth:', {
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        });
      } catch (error) {
        console.error('Error decoding JWT:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#EDE9DE] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#2B3A55] mb-2">
            Direct Google OAuth Test
          </h1>
          <p className="text-gray-600 mb-6">
            Testing Google authentication without Firebase
          </p>
        </div>

        <div className="space-y-4">
          <div id="direct-google-signin" className="w-full flex justify-center"></div>
          
          <div className="text-sm text-gray-500 space-y-2">
            <p><strong>Purpose:</strong> Test if Google OAuth works independently</p>
            <p><strong>Client ID:</strong> {import.meta.env.VITE_GOOGLE_CLIENT_ID?.substring(0, 20)}...</p>
            <p><strong>Domain:</strong> {window.location.origin}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">
            Check browser console for detailed debug output comparing direct Google OAuth vs Firebase results.
          </p>
        </div>
      </div>
    </div>
  );
}

// Type declaration for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}