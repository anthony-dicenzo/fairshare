/**
 * Test updated Firebase configuration with Google Client ID
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "1033222457001",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('Testing Updated Firebase Configuration...');
console.log('Project:', config.projectId);
console.log('Google Client ID:', process.env.VITE_GOOGLE_CLIENT_ID);
console.log('');

try {
  const app = initializeApp(config, 'updated-test');
  const auth = getAuth(app);
  
  // Create provider with custom client ID
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    'client_id': process.env.VITE_GOOGLE_CLIENT_ID
  });
  
  console.log('✅ Firebase initialized with custom Google Client ID');
  console.log('Auth domain:', config.authDomain);
  console.log('Provider configured with client ID:', !!process.env.VITE_GOOGLE_CLIENT_ID);
  
  // Test provider configuration
  const customParams = provider.customParameters;
  console.log('Custom parameters set:', Object.keys(customParams).length > 0);
  
  console.log('\n🔧 Configuration appears correct');
  console.log('Test Google sign-in in the browser');
  
} catch (error) {
  console.error('❌ Configuration error:', {
    message: error.message,
    code: error.code
  });
}