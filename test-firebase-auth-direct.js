/**
 * Direct Firebase Auth Test - Test Google authentication directly
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('Testing Firebase Authentication...');
console.log('Project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
console.log('Auth Domain:', firebaseConfig.authDomain);

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  
  console.log('Firebase initialized successfully');
  console.log('Auth object created:', !!auth);
  console.log('Google provider created:', !!provider);
  
  // Test auth state
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User signed in:', user.email);
    } else {
      console.log('No user signed in');
    }
  });
  
  console.log('Firebase Authentication setup appears correct');
  
} catch (error) {
  console.error('Firebase initialization error:', error);
}