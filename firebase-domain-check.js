#!/usr/bin/env node

/**
 * Firebase Domain Authorization Checker
 * This script helps identify domain authorization issues for Firebase Auth
 */

import 'dotenv/config';

const currentDomain = process.env.REPL_SLUG ? 
  `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
  'localhost:5000';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log('=== Firebase Domain Authorization Check ===\n');

console.log('1. Current Domain Information:');
console.log(`   App Domain: ${currentDomain}`);
console.log(`   Project ID: ${projectId}`);
console.log(`   Expected Auth Domain: ${projectId}.firebaseapp.com`);

console.log('\n2. Domain Authorization Requirements:');
console.log('   Your Firebase project needs these domains authorized:');
console.log(`   ✓ ${currentDomain}`);
console.log(`   ✓ localhost (for local development)`);
console.log(`   ✓ ${projectId}.firebaseapp.com`);

console.log('\n3. Testing Firebase Configuration:');

// Test basic Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.appspot.com`,
  messagingSenderId: "",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('   Config validation:');
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`   ${key}: ${value ? '✓' : '✗'}`);
});

console.log('\n4. Common Auth Domain Issues:');
console.log('   • Unauthorized domain error = domain not added to Firebase Console');
console.log('   • Internal error = API key issue or network problem');
console.log('   • Network request failed = connectivity or CORS issue');

console.log('\n=== Action Required ===');
console.log('To fix Firebase Auth, add these domains in Firebase Console:');
console.log('1. Go to console.firebase.google.com');
console.log(`2. Select project: ${projectId}`);
console.log('3. Go to Authentication > Settings > Authorized domains');
console.log('4. Click "Add domain" and add:');
console.log(`   → ${currentDomain}`);

if (!process.env.VITE_GOOGLE_CLIENT_ID) {
  console.log('\n⚠️  CRITICAL: Missing VITE_GOOGLE_CLIENT_ID');
  console.log('   This must be set for Google OAuth to work');
  console.log('   Get it from Firebase Console > Authentication > Sign-in method > Google');
}

console.log('\n=== Testing Firebase Auth Endpoint ===');

// Test if we can reach Firebase Auth
const testAuthEndpoint = async () => {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}?key=${apiKey}`;
    const response = await fetch(url);
    
    if (response.status === 200) {
      console.log('✓ Firebase Auth endpoint reachable');
    } else if (response.status === 403) {
      console.log('✗ API key rejected - verify API key in Firebase Console');
    } else {
      console.log(`? Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.log('✗ Cannot reach Firebase Auth endpoint');
    console.log(`  Error: ${error.message}`);
  }
};

await testAuthEndpoint();