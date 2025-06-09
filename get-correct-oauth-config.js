#!/usr/bin/env node

/**
 * Extract correct OAuth configuration from Firebase App ID
 */

import 'dotenv/config';

const appId = process.env.VITE_FIREBASE_APP_ID;
const currentClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

console.log('=== OAuth Configuration Analysis ===\n');

console.log('Current Configuration:');
console.log(`Firebase App ID: ${appId}`);
console.log(`Google Client ID: ${currentClientId}`);
console.log(`Project ID: ${projectId}`);

if (appId) {
  // Firebase App ID format: 1:PROJECT_NUMBER:web:APP_IDENTIFIER
  const parts = appId.split(':');
  if (parts.length >= 2) {
    const correctProjectNumber = parts[1];
    console.log(`\nFirebase App ID indicates project number: ${correctProjectNumber}`);
    
    if (currentClientId) {
      const currentProjectNumber = currentClientId.split('-')[0];
      console.log(`Current Google Client ID project number: ${currentProjectNumber}`);
      
      if (correctProjectNumber === currentProjectNumber) {
        console.log('✓ Project numbers match - OAuth should work');
      } else {
        console.log('✗ Project number mismatch found!');
        console.log('\nCorrect Google Client ID should start with:');
        console.log(`${correctProjectNumber}-...apps.googleusercontent.com`);
        
        console.log('\nTo fix this:');
        console.log('1. Go to Firebase Console > Authentication > Sign-in method > Google');
        console.log('2. Look for the correct "Web client ID"');
        console.log(`3. It should start with: ${correctProjectNumber}-`);
        console.log('4. Update VITE_GOOGLE_CLIENT_ID with the correct value');
      }
    }
  }
}

console.log('\n=== Expected Configuration ===');
if (appId) {
  const projectNumber = appId.split(':')[1];
  console.log(`Correct Google Client ID format: ${projectNumber}-[random].apps.googleusercontent.com`);
  console.log(`Firebase Project ID: ${projectId}`);
  console.log(`Firebase App ID: ${appId}`);
}

console.log('\nThis mismatch explains the auth/internal-error.');
console.log('Firebase cannot validate the Google OAuth token because the client IDs don\'t match.');