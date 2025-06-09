/**
 * Complete authentication flow test to verify all components work together
 */

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

console.log('=== Complete Authentication Flow Test ===\n');

async function testServerEndpoints() {
  console.log('1. Testing server endpoints...');
  
  try {
    // Test if server is responding
    const response = await fetch('http://localhost:5000/api/user');
    console.log(`   /api/user status: ${response.status} (expected 401)`);
    
    // Test if Google auth endpoint exists
    const googleAuthResponse = await fetch('http://localhost:5000/api/google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log(`   /api/google-auth status: ${googleAuthResponse.status} (expected 400 for validation error)`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Server not accessible: ${error.message}`);
    return false;
  }
}

async function testFirebaseAPIAccess() {
  console.log('\n2. Testing Firebase API access...');
  
  try {
    // Test basic Firebase Auth API
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass123',
        returnSecureToken: true
      })
    });
    
    console.log(`   Firebase API status: ${response.status}`);
    
    if (response.status === 400) {
      const data = await response.json();
      if (data.error?.message === 'EMAIL_EXISTS') {
        console.log('   ✅ Firebase API accessible (email exists error expected)');
        return true;
      } else {
        console.log(`   ✅ Firebase API accessible (${data.error?.message})`);
        return true;
      }
    } else if (response.status === 403) {
      console.log('   ❌ Firebase API key restricted');
      return false;
    } else {
      console.log('   ❓ Unexpected Firebase API response');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Cannot reach Firebase API: ${error.message}`);
    return false;
  }
}

async function testFirebaseConfig() {
  console.log('\n3. Testing Firebase project configuration...');
  
  try {
    const configUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${API_KEY}`;
    const response = await fetch(configUrl);
    
    if (response.ok) {
      const config = await response.json();
      console.log('   ✅ Firebase project config accessible');
      console.log(`   Authorized domains: ${config.authorizedDomains?.length || 0} domains`);
      
      // Check specific domains
      const domains = config.authorizedDomains || [];
      const hasWorkspace = domains.includes('workspace.adicenzo1.repl.co');
      const hasInternal = domains.some(d => d.includes('janeway.replit.dev'));
      
      console.log(`   - workspace.adicenzo1.repl.co: ${hasWorkspace ? '✅' : '❌'}`);
      console.log(`   - Internal Replit domain: ${hasInternal ? '✅' : '❌'}`);
      
      return { success: true, hasWorkspace, hasInternal };
    } else {
      console.log('   ❌ Cannot access Firebase project config');
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Config test error: ${error.message}`);
    return { success: false };
  }
}

async function runCompleteTest() {
  const serverOk = await testServerEndpoints();
  const firebaseAPIok = await testFirebaseAPIAccess();
  const configResult = await testFirebaseConfig();
  
  console.log('\n=== Test Summary ===');
  console.log(`Server endpoints: ${serverOk ? '✅' : '❌'}`);
  console.log(`Firebase API access: ${firebaseAPIok ? '✅' : '❌'}`);
  console.log(`Firebase config: ${configResult.success ? '✅' : '❌'}`);
  
  if (serverOk && firebaseAPIok && configResult.success) {
    console.log('\n✅ All backend components working - issue likely in browser/CORS/domain restrictions');
  } else {
    console.log('\n❌ Backend issues detected - fix these first');
  }
  
  console.log('\n=== Recommended Actions ===');
  
  if (!firebaseAPIok) {
    console.log('1. Fix Firebase API key restrictions in Google Cloud Console');
    console.log('   - Go to console.cloud.google.com');
    console.log('   - APIs & Services → Credentials');
    console.log('   - Edit the Firebase API key');
    console.log('   - Remove HTTP referrer restrictions or add current domains');
  }
  
  if (configResult.success && (!configResult.hasWorkspace || !configResult.hasInternal)) {
    console.log('2. Add missing domains to Firebase authorized domains');
    console.log('   - Go to console.firebase.google.com');
    console.log('   - Authentication → Settings → Authorized domains');
  }
  
  if (serverOk && firebaseAPIok && configResult.success) {
    console.log('3. Test authentication directly at: https://workspace.adicenzo1.repl.co');
    console.log('   This bypasses internal domain issues');
  }
}

runCompleteTest().catch(console.error);