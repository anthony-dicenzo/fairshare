#!/usr/bin/env node

/**
 * Debug the specific auth/internal-error by testing Firebase Auth in browser context
 */

import 'dotenv/config';

console.log('=== Firebase Auth Error Analysis ===\n');

// Check if we can access the Firebase Auth configuration endpoint that browsers use
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log(`Project: ${projectId}`);
console.log(`Using API key: ${apiKey?.substring(0, 15)}...`);

// Test the endpoint that browsers actually use for Firebase Auth
const authConfigUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`;

console.log('\nTesting Firebase Auth config endpoint (browser-style):');
console.log(`URL: ${authConfigUrl.replace(apiKey, 'API_KEY')}`);

try {
  const response = await fetch(authConfigUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': 'Chrome/JsCore/9.23.0/FirebaseCore-web'
    },
    body: JSON.stringify({
      clientType: 'CLIENT_TYPE_WEB'
    })
  });

  console.log(`Status: ${response.status}`);
  console.log(`Content-Type: ${response.headers.get('content-type')}`);

  if (response.status === 200) {
    const data = await response.json();
    console.log('✓ Firebase Auth is properly configured');
    console.log(`Project ID confirmed: ${data.projectId || 'Not found'}`);
    
    if (data.authorizedDomains) {
      console.log('Authorized domains:');
      data.authorizedDomains.forEach(domain => {
        console.log(`  - ${domain}`);
      });
    }
  } else {
    const text = await response.text();
    console.log(`Error response: ${text.substring(0, 200)}...`);
  }

} catch (error) {
  console.log(`Request failed: ${error.message}`);
}

// Check if Google OAuth endpoints are accessible
console.log('\nTesting Google OAuth discovery:');
try {
  const discoveryResponse = await fetch('https://accounts.google.com/.well-known/openid_configuration');
  console.log(`Google OAuth discovery: ${discoveryResponse.status}`);
  
  if (discoveryResponse.status === 200) {
    const discoveryData = await discoveryResponse.json();
    console.log(`✓ Google OAuth endpoints accessible`);
    console.log(`Authorization endpoint: ${discoveryData.authorization_endpoint}`);
  }
} catch (error) {
  console.log(`Google OAuth discovery failed: ${error.message}`);
}

console.log('\n=== Potential Causes of auth/internal-error ===');
console.log('1. API key restrictions blocking the specific domain');
console.log('2. Browser security policies (CORS, CSP)');
console.log('3. Network connectivity issues to Google services');
console.log('4. Temporary Google service outages');
console.log('5. Invalid OAuth client configuration in Google Cloud Console');

console.log('\nTo debug further:');
console.log('1. Check browser Network tab during sign-in attempt');
console.log('2. Verify API key restrictions in Google Cloud Console');
console.log('3. Test from a different browser or incognito mode');