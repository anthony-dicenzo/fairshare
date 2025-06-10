import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

// Firebase configuration
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';

console.log("Firebase configuration check:");
console.log("- API Key available:", apiKey ? "Yes" : "No");
console.log("- Project ID available:", projectId ? "Yes" : "No");
console.log("- App ID available:", appId ? "Yes" : "No");

const firebaseConfig = {
  apiKey,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  messagingSenderId: "",
  appId,
};

console.log("Firebase configuration:", {
  ...firebaseConfig,
  apiKey: apiKey ? "[API_KEY_SET]" : "[MISSING]",
  appId: appId ? "[APP_ID_SET]" : "[MISSING]"
});

// Initialize Firebase with singleton pattern
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  console.log("Initializing Firebase...");
  
  // Check if Firebase is already initialized
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize Auth
  auth = getAuth(app);
  auth.languageCode = 'en';
  
  // Initialize Google Auth Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log("Firebase initialized successfully");
  console.log("Firebase Auth available:", !!auth);
  console.log("Google Auth Provider initialized:", !!googleProvider);
  
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { auth, googleProvider };