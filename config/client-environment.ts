// Client-side environment configuration
// This file handles environment variables that are safe for the frontend

export const clientConfig = {
  firebase: {
    apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
    projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
    appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
  },
  // Add other client-safe configuration here
};

// Validate required client environment variables
function validateClientEnvironment() {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID', 
    'VITE_FIREBASE_APP_ID'
  ];

  const missing = required.filter(key => !(import.meta as any).env?.[key]);
  
  if (missing.length > 0) {
    console.warn('Missing optional client environment variables:', missing.join(', '));
    console.warn('Some features may not work properly without these variables');
  }
}

// Validate on module load
validateClientEnvironment();