/**
 * Validate Firebase Configuration and Extract Missing Values
 */

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const APP_ID = process.env.VITE_FIREBASE_APP_ID;
const AUTH_DOMAIN = process.env.VITE_FIREBASE_AUTH_DOMAIN;

console.log('=== Firebase Configuration Validation ===\n');

console.log('Current Configuration:');
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`Project ID: ${PROJECT_ID || 'MISSING'}`);
console.log(`App ID: ${APP_ID || 'MISSING'}`);
console.log(`Auth Domain: ${AUTH_DOMAIN || 'MISSING ❌'}`);

// Extract expected auth domain from project ID
const expectedAuthDomain = `${PROJECT_ID}.firebaseapp.com`;
console.log(`Expected Auth Domain: ${expectedAuthDomain}`);

async function testFirebaseConfig() {
  console.log('\n=== Testing Configuration ===');
  
  try {
    // Test with current (incomplete) config
    console.log('1. Testing with current configuration...');
    const response1 = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        providerId: 'google.com',
        continueUri: 'http://localhost:5000/auth'
      })
    });
    
    console.log(`   Status: ${response1.status}`);
    if (!response1.ok) {
      const error1 = await response1.json();
      console.log(`   Error: ${error1.error?.message || 'Unknown'}`);
    } else {
      console.log('   ✅ API key works');
    }
    
    // Test project configuration endpoint
    console.log('\n2. Testing project configuration access...');
    const configResponse = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${API_KEY}`);
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('   ✅ Project config accessible');
      
      // Extract auth domain from config
      if (config.authorizedDomains) {
        console.log(`   Authorized domains: ${config.authorizedDomains.length}`);
        const firebaseAppDomain = config.authorizedDomains.find(d => d.endsWith('.firebaseapp.com'));
        if (firebaseAppDomain) {
          console.log(`   Firebase app domain: ${firebaseAppDomain}`);
          
          if (firebaseAppDomain === expectedAuthDomain) {
            console.log('   ✅ Auth domain matches project ID');
          } else {
            console.log('   ⚠️ Auth domain mismatch');
          }
        }
      }
      
      // Check Google provider status
      const providers = config.signIn?.allowedProviders || [];
      const hasGoogle = providers.includes('google.com');
      console.log(`   Google provider enabled: ${hasGoogle ? '✅' : '❌'}`);
      
      if (!hasGoogle) {
        console.log('   ❌ This confirms Google provider is not enabled');
      }
      
    } else {
      console.log(`   ❌ Cannot access project config: ${configResponse.status}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
}

console.log('\n=== Required Environment Variables ===');
const missing = [];
if (!API_KEY) missing.push('VITE_FIREBASE_API_KEY');
if (!PROJECT_ID) missing.push('VITE_FIREBASE_PROJECT_ID'); 
if (!APP_ID) missing.push('VITE_FIREBASE_APP_ID');
if (!AUTH_DOMAIN) missing.push('VITE_FIREBASE_AUTH_DOMAIN');

if (missing.length === 0) {
  console.log('✅ All required variables present');
} else {
  console.log('❌ Missing variables:');
  missing.forEach(v => console.log(`   - ${v}`));
}

if (!AUTH_DOMAIN) {
  console.log('\n=== Fix Required ===');
  console.log('Add to your .env file:');
  console.log(`VITE_FIREBASE_AUTH_DOMAIN=${expectedAuthDomain}`);
  console.log('\nThis auth domain is essential for Firebase Authentication to work.');
}

testFirebaseConfig().catch(console.error);