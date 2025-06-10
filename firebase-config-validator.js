#!/usr/bin/env node

/**
 * Firebase Configuration Validator
 * This script validates Firebase environment variables and tests API key validity
 */

import 'dotenv/config';

const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID', 
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_CLIENT_ID'
];

console.log('=== Firebase Configuration Validator ===\n');

// Check environment variables
console.log('1. Environment Variables Check:');
const envStatus = {};
requiredVars.forEach(varName => {
  const value = process.env[varName];
  envStatus[varName] = !!value;
  
  if (value) {
    console.log(`✓ ${varName}: Present (${value.length} chars)`);
    
    // Show first/last chars for verification without exposing full key
    if (varName === 'VITE_FIREBASE_API_KEY') {
      console.log(`  Format: ${value.substring(0, 6)}...${value.substring(value.length - 6)}`);
    } else if (varName === 'VITE_FIREBASE_PROJECT_ID') {
      console.log(`  Project: ${value}`);
    }
  } else {
    console.log(`✗ ${varName}: Missing`);
  }
});

console.log('\n2. Firebase API Key Validation:');
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!apiKey) {
  console.log('✗ Cannot validate - API key missing');
} else {
  // Basic format validation
  const isValidFormat = apiKey.length >= 35 && apiKey.length <= 45;
  console.log(`Format check: ${isValidFormat ? '✓' : '✗'} (${apiKey.length} chars)`);
  
  // Test Firebase REST API to validate key
  console.log('\n3. Testing API Key with Firebase REST API:');
  
  try {
    const testUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signUp?key=${apiKey}`;
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        returnSecureToken: true
      })
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error?.message?.includes('EMAIL_EXISTS')) {
      console.log('✓ API Key is valid (got expected EMAIL_EXISTS error)');
    } else if (response.status === 400 && data.error?.message?.includes('WEAK_PASSWORD')) {
      console.log('✓ API Key is valid (got expected WEAK_PASSWORD error)');
    } else if (response.status === 403) {
      console.log('✗ API Key is invalid or restricted');
      console.log(`  Error: ${data.error?.message || 'Forbidden'}`);
    } else if (response.status === 400 && data.error?.message) {
      console.log('✓ API Key works (got Firebase validation error)');
      console.log(`  Firebase response: ${data.error.message}`);
    } else {
      console.log(`? Unexpected response: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
    }
    
  } catch (error) {
    console.log('✗ Network error testing API key');
    console.log(`  Error: ${error.message}`);
  }
}

console.log('\n4. Google OAuth Client ID Check:');
const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
if (!clientId) {
  console.log('✗ Google Client ID missing - this will cause OAuth failures');
  console.log('  You need to add VITE_GOOGLE_CLIENT_ID to your environment variables');
} else {
  const isValidClientIdFormat = clientId.includes('.apps.googleusercontent.com');
  console.log(`Format check: ${isValidClientIdFormat ? '✓' : '✗'}`);
  if (isValidClientIdFormat) {
    console.log(`  Client ID domain: ${clientId.split('-')[1]?.split('.')[0] || 'unknown'}`);
  }
}

console.log('\n=== Summary ===');
const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length === 0) {
  console.log('✓ All required environment variables are present');
} else {
  console.log('✗ Missing environment variables:');
  missingVars.forEach(varName => console.log(`  - ${varName}`));
}

console.log('\n=== Recommendations ===');
if (!process.env.VITE_GOOGLE_CLIENT_ID) {
  console.log('1. Add Google OAuth Client ID to fix authentication');
}
if (apiKey && apiKey.length < 35) {
  console.log('2. Firebase API key appears too short - verify it\'s correct');
}
console.log('3. If issues persist after adding missing variables, restart your application');
console.log('4. Check Firebase Console > Project Settings > Web apps for correct values');