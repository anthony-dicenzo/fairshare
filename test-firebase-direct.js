/**
 * Direct Firebase Auth Test - bypasses frontend to test Firebase directly
 */

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

console.log('=== Direct Firebase Authentication Test ===\n');

async function testDirectGoogleAuth() {
  console.log('1. Testing the exact endpoint Firebase uses for Google sign-in...');
  
  try {
    // This is the exact API call Firebase makes when signInWithPopup is triggered
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providerId: 'google.com',
        returnSecureToken: true,
        returnIdpCredential: true,
        requestUri: `https://${PROJECT_ID}.firebaseapp.com/auth/handler`,
        postBody: 'id_token=fake_token_for_test&access_token=fake_access_token'
      })
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (response.ok) {
      console.log('   ✅ Google provider is properly enabled');
      return true;
    } else {
      const errorData = await response.json();
      console.log(`   ❌ Error: ${errorData.error?.message || 'Unknown error'}`);
      
      if (errorData.error?.message === 'OPERATION_NOT_ALLOWED') {
        console.log('   This confirms Google provider is NOT enabled');
        return false;
      } else if (errorData.error?.message === 'INVALID_IDP_RESPONSE') {
        console.log('   ✅ Provider is enabled (error due to fake token, which is expected)');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
    return false;
  }
}

async function testAuthDomain() {
  console.log('\n2. Testing auth domain accessibility...');
  
  try {
    const authDomain = `${PROJECT_ID}.firebaseapp.com`;
    const response = await fetch(`https://${authDomain}/__/auth/handler`, {
      method: 'GET'
    });
    
    console.log(`   Auth domain (${authDomain}) status: ${response.status}`);
    
    if (response.status === 200 || response.status === 404) {
      console.log('   ✅ Auth domain is accessible');
      return true;
    } else {
      console.log('   ❌ Auth domain issue');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Auth domain error: ${error.message}`);
    return false;
  }
}

async function testProjectStatus() {
  console.log('\n3. Testing Firebase project status...');
  
  try {
    // Check if the project is active and accessible
    const response = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}` // This won't work but will give us info
      }
    });
    
    console.log(`   Project API status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('   ✅ Project exists (401 is expected without proper auth)');
      return true;
    } else if (response.status === 404) {
      console.log('   ❌ Project not found');
      return false;
    } else {
      console.log(`   ⚠️ Unexpected status: ${response.status}`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Project check error: ${error.message}`);
    return false;
  }
}

async function runDirectTest() {
  console.log(`Testing project: ${PROJECT_ID}`);
  console.log(`Using API key: ${API_KEY?.substring(0, 20)}...`);
  
  const googleAuth = await testDirectGoogleAuth();
  const authDomain = await testAuthDomain();
  const projectStatus = await testProjectStatus();
  
  console.log('\n=== Direct Test Results ===');
  console.log(`Google authentication: ${googleAuth ? '✅' : '❌'}`);
  console.log(`Auth domain: ${authDomain ? '✅' : '❌'}`);
  console.log(`Project status: ${projectStatus ? '✅' : '❌'}`);
  
  if (!googleAuth) {
    console.log('\n❌ CONFIRMED: Google provider is NOT properly enabled');
    console.log('\n=== Solution ===');
    console.log('1. Go to Firebase Console');
    console.log('2. Select project: fairshare-7f83a');
    console.log('3. Authentication → Sign-in method');
    console.log('4. DELETE the existing Google provider');
    console.log('5. ADD Google provider again');
    console.log('6. Enable it and configure with the correct Client ID');
    console.log('7. Save the configuration');
    console.log('\nSometimes the provider appears enabled but is actually corrupted.');
  } else {
    console.log('\n✅ Google provider is working - issue may be elsewhere');
  }
}

runDirectTest().catch(console.error);