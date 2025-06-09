/**
 * Test Firebase API key validity and restrictions
 */

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('Missing Firebase environment variables');
  process.exit(1);
}

async function testFirebaseAPIKey() {
  console.log('=== Firebase API Key Test ===');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  
  // Test 1: Firebase Identity Toolkit API (used for authentication)
  console.log('\n1. Testing Identity Toolkit API...');
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        returnSecureToken: true
      })
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.text();
    console.log(`Response: ${data.substring(0, 200)}...`);
    
    if (response.status === 400) {
      console.log('✅ API key is valid (expected 400 for incomplete request)');
    } else if (response.status === 403) {
      console.log('❌ API key is restricted or invalid');
    } else {
      console.log(`❓ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Test 2: Test with a referrer header (simulating browser request)
  console.log('\n2. Testing with workspace domain referrer...');
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://workspace.adicenzo1.repl.co/',
        'Origin': 'https://workspace.adicenzo1.repl.co'
      },
      body: JSON.stringify({
        returnSecureToken: true
      })
    });
    
    console.log(`Status with referrer: ${response.status}`);
    if (response.status === 403) {
      console.log('❌ Domain not authorized in API key restrictions');
      console.log('💡 Add workspace.adicenzo1.repl.co/* to API key HTTP referrer restrictions');
    }
  } catch (error) {
    console.log(`❌ Network error with referrer: ${error.message}`);
  }
  
  // Test 3: Firebase config validation
  console.log('\n3. Testing Firebase config endpoint...');
  try {
    const configUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${API_KEY}`;
    const response = await fetch(configUrl);
    
    console.log(`Config status: ${response.status}`);
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Firebase project config accessible');
      console.log(`Authorized domains: ${config.authorizedDomains?.join(', ') || 'None'}`);
    } else {
      console.log('❌ Cannot access Firebase project config');
    }
  } catch (error) {
    console.log(`❌ Config test error: ${error.message}`);
  }
}

testFirebaseAPIKey().catch(console.error);