#!/usr/bin/env node

/**
 * Direct Firebase Auth Test - bypasses frontend to test Firebase directly
 */

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('=== Direct Firebase Auth Test ===\n');

console.log('1. Configuration:');
console.log(`   Project ID: ${firebaseConfig.projectId}`);
console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`   API Key: ${firebaseConfig.apiKey?.substring(0, 10)}...`);
console.log(`   App ID: ${firebaseConfig.appId?.substring(0, 20)}...`);

try {
  console.log('\n2. Initializing Firebase App...');
  const app = initializeApp(firebaseConfig);
  console.log('✓ Firebase app initialized');

  console.log('\n3. Getting Auth instance...');
  const auth = getAuth(app);
  console.log('✓ Auth instance created');
  console.log(`   Auth domain: ${auth.app.options.authDomain}`);
  console.log(`   Auth project: ${auth.app.options.projectId}`);

  console.log('\n4. Creating Google Provider...');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
    client_id: process.env.VITE_GOOGLE_CLIENT_ID
  });
  provider.addScope('email');
  provider.addScope('profile');
  console.log('✓ Google provider configured');

  console.log('\n5. Testing Firebase Auth REST API directly...');
  
  // Test with a simple Auth REST API call
  const testUrl = `https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/accounts:signUp?key=${firebaseConfig.apiKey}`;
  
  const response = await fetch(testUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test-nonexistent@example.com',
      password: 'testpass123',
      returnSecureToken: true
    })
  });

  const data = await response.json();
  
  console.log(`   Response status: ${response.status}`);
  
  if (response.status === 400) {
    if (data.error?.message === 'EMAIL_EXISTS') {
      console.log('✓ Firebase Auth API is working (email exists error expected)');
    } else if (data.error?.message === 'WEAK_PASSWORD') {
      console.log('✓ Firebase Auth API is working (weak password error expected)');
    } else if (data.error?.message?.includes('INVALID_EMAIL')) {
      console.log('✓ Firebase Auth API is working (invalid email error expected)');
    } else {
      console.log(`✓ Firebase Auth API responded: ${data.error?.message}`);
    }
  } else if (response.status === 403) {
    console.log('✗ API key is restricted or invalid');
    console.log(`   Error: ${data.error?.message}`);
  } else if (response.status === 404) {
    console.log('✗ Project not found or API key invalid');
    console.log(`   Error: ${data.error?.message}`);
  } else {
    console.log(`? Unexpected response: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
  }

  console.log('\n6. Testing OAuth endpoints...');
  
  // Test if we can reach the OAuth issuer
  const oauthIssuer = `https://securetoken.google.com/${firebaseConfig.projectId}`;
  console.log(`   Testing: ${oauthIssuer}`);
  
  try {
    const oauthResponse = await fetch(oauthIssuer);
    console.log(`   OAuth issuer status: ${oauthResponse.status}`);
    
    if (oauthResponse.status === 200) {
      console.log('✓ OAuth issuer reachable');
    } else {
      console.log('? OAuth issuer returned unexpected status');
    }
  } catch (oauthError) {
    console.log(`✗ Cannot reach OAuth issuer: ${oauthError.message}`);
  }

} catch (error) {
  console.log('✗ Firebase initialization failed');
  console.log(`   Error: ${error.message}`);
  console.log(`   Stack: ${error.stack}`);
}

console.log('\n=== Diagnosis ===');
console.log('If you see auth/internal-error, it usually means:');
console.log('1. Firebase project configuration mismatch');
console.log('2. API key doesn\'t match the project ID');
console.log('3. Google Cloud APIs not enabled');
console.log('4. Network/CORS issues');
console.log('5. Firebase project billing issues');