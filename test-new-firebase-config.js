/**
 * Firebase Configuration Test for New Project
 * Run this after setting up the new Firebase project to verify everything works
 */

import https from 'https';

async function testFirebaseConfig() {
  console.log('🔥 Testing New Firebase Configuration...\n');

  // Get environment variables
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const appId = process.env.VITE_FIREBASE_APP_ID;

  console.log('📋 Configuration Check:');
  console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Project ID: ${projectId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   App ID: ${appId ? '✅ Set' : '❌ Missing'}\n`);

  if (!apiKey || !projectId || !appId) {
    console.log('❌ Missing required environment variables. Please set:');
    console.log('   - VITE_FIREBASE_API_KEY');
    console.log('   - VITE_FIREBASE_PROJECT_ID');
    console.log('   - VITE_FIREBASE_APP_ID');
    return;
  }

  // Test 1: Firebase API Key validity
  console.log('🔍 Test 1: API Key Validity...');
  try {
    const testUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/config?key=${apiKey}`;
    
    const response = await new Promise((resolve, reject) => {
      const req = https.get(testUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));
    });

    if (response.status === 200) {
      console.log('   ✅ API Key is valid and accessible');
      
      const config = JSON.parse(response.data);
      console.log('   📋 Project Configuration:');
      console.log(`      - Project ID: ${config.projectId || 'Not found'}`);
      console.log(`      - Auth Domain: ${config.authDomain || 'Not found'}`);
      
      if (config.signIn && config.signIn.allowPasswordSignup !== undefined) {
        console.log(`      - Email/Password: ${config.signIn.allowPasswordSignup ? 'Enabled' : 'Disabled'}`);
      }
    } else {
      console.log(`   ❌ API Key test failed (Status: ${response.status})`);
      console.log(`      Response: ${response.data}`);
    }
  } catch (error) {
    console.log(`   ❌ API Key test failed: ${error.message}`);
  }

  console.log();

  // Test 2: Google Provider Configuration
  console.log('🔍 Test 2: Google Provider Configuration...');
  try {
    const providersUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/config?key=${apiKey}`;
    
    const response = await new Promise((resolve, reject) => {
      const req = https.get(providersUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));
    });

    if (response.status === 200) {
      const config = JSON.parse(response.data);
      
      if (config.signIn && config.signIn.methods) {
        const googleEnabled = config.signIn.methods.some(method => 
          method.providerId === 'google.com' && method.state === 'ENABLED'
        );
        
        console.log(`   ${googleEnabled ? '✅' : '❌'} Google Provider: ${googleEnabled ? 'Enabled' : 'Disabled'}`);
        
        if (googleEnabled) {
          console.log('      Google authentication is properly configured');
        } else {
          console.log('      ⚠️  Google provider needs to be enabled in Firebase Console');
          console.log('         Go to Authentication > Sign-in method > Google');
        }
      } else {
        console.log('   ⚠️  Could not determine provider configuration');
      }
    }
  } catch (error) {
    console.log(`   ❌ Provider test failed: ${error.message}`);
  }

  console.log();

  // Test 3: Domain Configuration
  console.log('🔍 Test 3: Authorized Domains...');
  const authDomain = `${projectId}.firebaseapp.com`;
  console.log(`   Expected Auth Domain: ${authDomain}`);
  console.log('   Make sure to add these domains in Firebase Console:');
  console.log('   - *.replit.dev (for Replit hosting)');
  console.log('   - localhost (for local testing)');

  console.log('\n🎉 Configuration test complete!');
  console.log('\nNext steps:');
  console.log('1. Ensure Google provider is enabled in Firebase Console');
  console.log('2. Add authorized domains (*.replit.dev)');
  console.log('3. Test Google sign-in in the application');
}

// Run the test
testFirebaseConfig().catch(console.error);