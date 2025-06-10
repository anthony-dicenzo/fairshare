/**
 * Test Firebase Google Authentication Configuration
 */

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;

console.log('=== Firebase Google Authentication Test ===\n');

async function testGoogleProviderConfig() {
  console.log('1. Testing Firebase project configuration...');
  
  try {
    // Get project configuration from Firebase
    const configUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${API_KEY}`;
    const response = await fetch(configUrl);
    
    if (!response.ok) {
      console.log(`   ❌ Cannot access project config: ${response.status}`);
      return false;
    }
    
    const config = await response.json();
    console.log('   ✅ Project config accessible');
    
    // Check if Google provider is enabled
    const providers = config.signIn?.allowedProviders || [];
    const hasGoogleProvider = providers.includes('google.com');
    
    console.log(`   Google provider enabled: ${hasGoogleProvider ? '✅' : '❌'}`);
    
    if (!hasGoogleProvider) {
      console.log('   ❌ Google authentication is not enabled in Firebase');
      console.log('   Required: Enable Google provider in Firebase Console');
      return false;
    }
    
    // Check OAuth client configuration
    if (config.oauth) {
      console.log('   OAuth configuration found');
      const googleOAuth = config.oauth.find(o => o.provider === 'google.com');
      if (googleOAuth) {
        console.log('   ✅ Google OAuth configuration present');
        console.log(`   Client ID configured: ${googleOAuth.clientId ? '✅' : '❌'}`);
        
        if (googleOAuth.clientId !== CLIENT_ID) {
          console.log('   ⚠️ Client ID mismatch detected');
          console.log(`   Firebase: ${googleOAuth.clientId}`);
          console.log(`   Environment: ${CLIENT_ID}`);
        }
      } else {
        console.log('   ❌ Google OAuth not configured');
      }
    }
    
    return hasGoogleProvider;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testGoogleSignInFlow() {
  console.log('\n2. Testing Google sign-in flow...');
  
  try {
    // Test the createAuthUri endpoint that Google sign-in uses
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'test@example.com',
        providerId: 'google.com',
        continueUri: 'http://localhost:5000/auth',
        oauthScope: 'email profile'
      })
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Google sign-in flow endpoint working');
      console.log(`   Auth URI generated: ${data.authUri ? 'Yes' : 'No'}`);
      return true;
    } else {
      const errorData = await response.json();
      console.log(`   ❌ Error: ${errorData.error?.message || 'Unknown error'}`);
      
      if (errorData.error?.message === 'OPERATION_NOT_ALLOWED') {
        console.log('   This indicates Google provider is not properly enabled');
      }
      
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
    return false;
  }
}

async function runFullTest() {
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`API Key: ${API_KEY?.substring(0, 20)}...`);
  console.log(`Client ID: ${CLIENT_ID?.substring(0, 30)}...`);
  
  const configOk = await testGoogleProviderConfig();
  const signInOk = await testGoogleSignInFlow();
  
  console.log('\n=== Results ===');
  console.log(`Firebase config: ${configOk ? '✅' : '❌'}`);
  console.log(`Google sign-in: ${signInOk ? '✅' : '❌'}`);
  
  if (!configOk || !signInOk) {
    console.log('\n=== Required Actions ===');
    console.log('1. Firebase Console → Authentication → Sign-in method');
    console.log('2. Click "Google" provider');
    console.log('3. Ensure it is ENABLED (toggle should be ON)');
    console.log('4. Verify Web client ID matches your environment variable');
    console.log('5. Click "Save" if any changes made');
  } else {
    console.log('\n✅ Firebase Google authentication is properly configured');
    console.log('Browser auth/internal-error likely due to domain/CORS restrictions');
  }
}

runFullTest().catch(console.error);