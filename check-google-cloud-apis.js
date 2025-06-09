#!/usr/bin/env node

/**
 * Check Google Cloud APIs status for Firebase Authentication
 */

import 'dotenv/config';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log('=== Google Cloud APIs Check ===\n');

console.log(`Project: ${projectId}`);
console.log(`API Key: ${apiKey?.substring(0, 15)}...`);

// Required APIs for Firebase Authentication
const requiredApis = [
  {
    name: 'Identity and Access Management (IAM) API',
    endpoint: `https://iam.googleapis.com/v1/projects/${projectId}?key=${apiKey}`,
    required: true
  },
  {
    name: 'Identity Toolkit API',
    endpoint: `https://identitytoolkit.googleapis.com/v1/projects/${projectId}?key=${apiKey}`,
    required: true
  },
  {
    name: 'Firebase Management API',
    endpoint: `https://firebase.googleapis.com/v1beta1/projects/${projectId}?key=${apiKey}`,
    required: true
  },
  {
    name: 'Google Cloud Resource Manager API',
    endpoint: `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}?key=${apiKey}`,
    required: false
  }
];

console.log('\nTesting required Google Cloud APIs:\n');

for (const api of requiredApis) {
  try {
    console.log(`Testing: ${api.name}`);
    
    const response = await fetch(api.endpoint);
    const contentType = response.headers.get('content-type');
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Content-Type: ${contentType}`);
    
    if (response.status === 200) {
      console.log(`  ✓ ${api.name} is enabled and accessible`);
    } else if (response.status === 403) {
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        console.log(`  ✗ ${api.name} access denied: ${data.error?.message || 'Forbidden'}`);
        if (data.error?.message?.includes('API has not been used')) {
          console.log(`  → Enable this API in Google Cloud Console`);
        }
      } else {
        console.log(`  ✗ ${api.name} access denied (HTML response)`);
      }
    } else if (response.status === 404) {
      if (contentType?.includes('text/html')) {
        console.log(`  ✗ ${api.name} not found (likely not enabled)`);
      } else {
        console.log(`  ✗ ${api.name} endpoint not found`);
      }
    } else {
      console.log(`  ? ${api.name} returned unexpected status: ${response.status}`);
    }
    
    console.log('');
  } catch (error) {
    console.log(`  ✗ ${api.name} network error: ${error.message}\n`);
  }
}

// Test simpler endpoints that should always work
console.log('Testing basic Google endpoints (no API key):');

const basicEndpoints = [
  'https://www.googleapis.com/oauth2/v1/tokeninfo',
  'https://accounts.google.com/.well-known/openid_configuration'
];

for (const endpoint of basicEndpoints) {
  try {
    const response = await fetch(endpoint);
    console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`  ${endpoint}: Error - ${error.message}`);
  }
}

console.log('\n=== Diagnosis ===');
console.log('If all APIs return 404 with HTML:');
console.log('1. API key is completely invalid or from wrong project');
console.log('2. API key has severe restrictions blocking all access');
console.log('3. Required APIs are not enabled in Google Cloud Console');
console.log('\nTo fix:');
console.log('1. Go to console.cloud.google.com');
console.log(`2. Select project: ${projectId}`);
console.log('3. Go to APIs & Services > Enabled APIs');
console.log('4. Enable: Identity Toolkit API, Firebase Management API');
console.log('5. Check API key restrictions in Credentials section');