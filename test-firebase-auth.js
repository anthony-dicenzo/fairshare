import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Test Firebase configuration with current environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('=== Firebase Auth Debug Test ===');
console.log('Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '[PRESENT]' : '[MISSING]',
  appId: firebaseConfig.appId ? '[PRESENT]' : '[MISSING]'
});

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log('✓ Firebase app initialized');
  console.log('✓ Auth instance created');
  console.log('✓ Google provider configured');
  
  // Test if we can at least create the auth objects
  console.log('Auth config:', {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId
  });
  
  console.log('\n=== Possible Issues ===');
  console.log('1. OAuth client ID mismatch in Firebase console');
  console.log('2. Domain not authorized in Firebase/Google Cloud');
  console.log('3. Google sign-in method not properly enabled');
  console.log('4. API key restrictions in Google Cloud Console');
  
} catch (error) {
  console.error('✗ Firebase initialization failed:', error);
}