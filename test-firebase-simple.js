#!/usr/bin/env node

/**
 * Simple Firebase API test to verify the key works
 */

import 'dotenv/config';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log('=== Simple Firebase API Test ===\n');
console.log(`Project: ${projectId}`);
console.log(`API Key: ${apiKey?.substring(0, 20)}...`);

// Test the simplest Firebase Auth endpoint that should always work
const testUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signUp?key=${apiKey}`;

console.log('\nTesting Firebase Auth with minimal request...');

try {
  const response = await fetch(testUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123456',
      returnSecureToken: true
    })
  });

  const contentType = response.headers.get('content-type');
  console.log(`Status: ${response.status}`);
  console.log(`Content-Type: ${contentType}`);

  if (contentType?.includes('application/json')) {
    const data = await response.json();
    
    if (response.status === 400 && data.error?.message === 'EMAIL_EXISTS') {
      console.log('✓ Firebase API key is working! (Email exists error is expected)');
    } else if (response.status === 400 && data.error?.message?.includes('WEAK_PASSWORD')) {
      console.log('✓ Firebase API key is working! (Weak password error is expected)');
    } else if (response.status === 200) {
      console.log('✓ Firebase API key is working! (Signup succeeded)');
    } else {
      console.log(`Firebase responded with: ${data.error?.message || 'Unknown error'}`);
      
      if (data.error?.message?.includes('API key not valid')) {
        console.log('✗ API key is invalid');
      } else if (data.error?.message?.includes('API has not been used')) {
        console.log('✗ Identity Toolkit API not enabled');
      }
    }
  } else {
    console.log('✗ Got HTML instead of JSON - API key is likely wrong');
  }

} catch (error) {
  console.log(`✗ Request failed: ${error.message}`);
}

console.log('\nIf this test shows the API key is working, the issue is elsewhere.');
console.log('If it shows HTML/404, we need to verify the API key from Firebase Console.');