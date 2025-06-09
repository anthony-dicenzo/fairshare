#!/usr/bin/env node

/**
 * Check if Google services are accessible from this environment
 */

console.log('=== Google Services Connectivity Test ===\n');

const testEndpoints = [
  'https://google.com',
  'https://accounts.google.com',
  'https://firebase.google.com',
  'https://www.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://oauth2.googleapis.com/token'
];

for (const endpoint of testEndpoints) {
  try {
    console.log(`Testing: ${endpoint}`);
    const response = await fetch(endpoint, { 
      method: 'GET',
      timeout: 5000 
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200) {
      console.log('  ✓ Accessible');
    } else if (response.status === 404) {
      console.log('  ✗ Not Found');
    } else if (response.status === 403) {
      console.log('  ✗ Forbidden');
    } else {
      console.log(`  ? Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
  }
  console.log('');
}

console.log('=== Analysis ===');
console.log('If all Google services return errors, there may be:');
console.log('1. Network restrictions in the Replit environment');
console.log('2. DNS resolution issues');
console.log('3. Firewall blocking Google services');
console.log('4. Temporary connectivity issues');