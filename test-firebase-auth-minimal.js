/**
 * Minimal Firebase Auth test to identify configuration issues
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('Testing Firebase Auth Configuration...');
console.log('Project:', config.projectId);
console.log('Auth Domain:', config.authDomain);

try {
  const app = initializeApp(config, 'test-auth');
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  
  console.log('✅ Firebase initialized successfully');
  console.log('Auth instance created:', !!auth);
  console.log('Provider created:', !!provider);
  
  // Test auth domain accessibility
  console.log('\nTesting auth domain accessibility...');
  fetch(`https://${config.authDomain}/__/auth/handler`)
    .then(response => {
      console.log('Auth domain response:', response.status);
      if (response.status === 200 || response.status === 404) {
        console.log('✅ Auth domain is accessible');
      } else {
        console.log('❌ Auth domain accessibility issue');
      }
    })
    .catch(error => {
      console.log('❌ Auth domain fetch error:', error.message);
    });

  // Try to get current user (should be null but shouldn't error)
  console.log('Current user:', auth.currentUser || 'None');
  
  console.log('\n🔧 Ready for authentication test');
  console.log('Run signInWithPopup(auth, provider) to test Google sign-in');
  
} catch (error) {
  console.error('❌ Firebase initialization error:', {
    message: error.message,
    code: error.code,
    name: error.name
  });
}