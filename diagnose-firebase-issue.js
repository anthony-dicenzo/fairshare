#!/usr/bin/env node

/**
 * Firebase Issue Diagnosis - Check project status and API restrictions
 */

import 'dotenv/config';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log('=== Firebase Project Diagnosis ===\n');

console.log('1. Basic Configuration:');
console.log(`   Project ID: ${projectId}`);
console.log(`   API Key (prefix): ${apiKey?.substring(0, 15)}...`);

// Test 1: Check if project exists publicly
console.log('\n2. Testing project accessibility...');
try {
  const projectUrl = `https://${projectId}.firebaseapp.com`;
  console.log(`   Testing: ${projectUrl}`);
  
  const projectResponse = await fetch(projectUrl);
  console.log(`   Status: ${projectResponse.status}`);
  
  if (projectResponse.status === 200) {
    console.log('✓ Project domain is accessible');
  } else if (projectResponse.status === 404) {
    console.log('⚠ Project domain not found (may be normal for new projects)');
  }
} catch (error) {
  console.log(`✗ Cannot reach project domain: ${error.message}`);
}

// Test 2: Try different Firebase Auth endpoints
console.log('\n3. Testing Firebase Auth endpoints...');

const endpoints = [
  {
    name: 'Identity Toolkit v1',
    url: `https://identitytoolkit.googleapis.com/v1/projects/${projectId}?key=${apiKey}`,
    method: 'GET'
  },
  {
    name: 'Firebase Auth Config',
    url: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`,
    method: 'POST',
    body: JSON.stringify({ clientType: 'CLIENT_TYPE_WEB' })
  },
  {
    name: 'Google Identity Service',
    url: `https://accounts.google.com/.well-known/openid_configuration`,
    method: 'GET',
    noKey: true
  }
];

for (const endpoint of endpoints) {
  try {
    console.log(`\n   Testing ${endpoint.name}:`);
    console.log(`   URL: ${endpoint.url.replace(apiKey, 'API_KEY')}`);
    
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (endpoint.body) {
      options.body = endpoint.body;
    }
    
    const response = await fetch(endpoint.url, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${contentType}`);
    
    if (contentType?.includes('application/json')) {
      try {
        const data = await response.json();
        if (response.status === 200) {
          console.log('   ✓ Valid JSON response received');
          if (endpoint.name === 'Firebase Auth Config' && data.projectId) {
            console.log(`   ✓ Project confirmed: ${data.projectId}`);
          }
        } else {
          console.log(`   ✗ Error response: ${data.error?.message || 'Unknown error'}`);
          if (data.error?.code === 403) {
            console.log('   → API key may be restricted');
          }
        }
      } catch (jsonError) {
        console.log(`   ✗ Invalid JSON: ${jsonError.message}`);
      }
    } else if (contentType?.includes('text/html')) {
      console.log('   ✗ Received HTML instead of JSON (API key likely invalid)');
    } else {
      console.log(`   ? Unexpected content type: ${contentType}`);
    }
  } catch (fetchError) {
    console.log(`   ✗ Network error: ${fetchError.message}`);
  }
}

// Test 3: Check Google OAuth configuration
console.log('\n4. Testing Google OAuth configuration...');
const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
if (clientId) {
  console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
  
  // Validate client ID format
  if (clientId.includes('.apps.googleusercontent.com')) {
    console.log('   ✓ Client ID format is valid');
    
    const projectNumber = clientId.split('-')[0];
    console.log(`   Project Number: ${projectNumber}`);
    
    // Check if project number matches
    if (process.env.VITE_FIREBASE_APP_ID?.includes(projectNumber)) {
      console.log('   ✓ Project number matches Firebase App ID');
    } else {
      console.log('   ⚠ Project number mismatch with Firebase App ID');
    }
  } else {
    console.log('   ✗ Invalid client ID format');
  }
} else {
  console.log('   ✗ Google Client ID missing');
}

console.log('\n=== Recommendations ===');
console.log('Based on the "HTML instead of JSON" error:');
console.log('1. Verify the API key is correct in Firebase Console > Project Settings');
console.log('2. Check if the API key has proper restrictions (HTTP referrers)');
console.log('3. Ensure Identity Toolkit API is enabled in Google Cloud Console');
console.log('4. Verify the project ID matches exactly');
console.log('5. Check if the Firebase project has billing enabled (required for some APIs)');