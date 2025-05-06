import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

// Log Firebase configuration details (without exposing the full API key)
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';

console.log("Firebase configuration check:");
console.log("- API Key available:", apiKey ? "Yes" : "No");
console.log("- Project ID available:", projectId ? "Yes" : "No");
console.log("- App ID available:", appId ? "Yes" : "No");

if (!apiKey || !projectId || !appId) {
  console.error("Firebase configuration is incomplete. Some values are missing.");
}

const firebaseConfig = {
  apiKey,
  authDomain: projectId ? `${projectId}.firebaseapp.com` : '',
  projectId,
  storageBucket: projectId ? `${projectId}.appspot.com` : '',
  messagingSenderId: "", // Optional
  appId,
};

// Declare variables for export with proper types
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase
try {
  console.log("Initializing Firebase...");
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  
  // Add login hint and select account prompt
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  console.error("Ensure you've provided the correct Firebase credentials in the environment variables.");
}

export { auth, googleProvider };