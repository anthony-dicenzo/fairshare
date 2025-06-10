#!/usr/bin/env node

/**
 * Comprehensive Firebase Setup Verification
 * This script helps diagnose Firebase Authentication setup issues
 */

import https from 'https';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const appId = process.env.VITE_FIREBASE_APP_ID;

console.log('🔥 Firebase Setup Verification Tool\n');
console.log('Project:', projectId);
console.log('Current Domain:', 'b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev\n');

async function makeRequest(url, description) {
  return new Promise((resolve) => {
    console.log(`Testing: ${description}`);
    
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('✅ Success');
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, data: parsed });
          } catch (e) {
            resolve({ success: true, data: data });
          }
        } else {
          console.log('❌ Failed');
          console.log('Response:', data.substring(0, 200));
          resolve({ success: false, status: res.statusCode, data });
        }
        console.log('');
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Network Error:', error.message);
      console.log('');
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.log('❌ Timeout');
      console.log('');
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function checkFirebaseSetup() {
  console.log('1️⃣ Checking Firebase API Key validity...');
  const configTest = await makeRequest(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}?key=${apiKey}`,
    'Basic Firebase API access'
  );

  console.log('2️⃣ Checking Authentication service...');
  const authTest = await makeRequest(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/config?key=${apiKey}`,
    'Firebase Authentication configuration'
  );

  console.log('3️⃣ Checking project configuration...');
  const projectTest = await makeRequest(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}:getProjectConfig?key=${apiKey}`,
    'Project authentication config'
  );

  console.log('📋 SUMMARY:');
  console.log('==================');
  
  if (configTest.success) {
    console.log('✅ Firebase project exists and API key is valid');
  } else {
    console.log('❌ Firebase project or API key issue');
    console.log('   Check: Project ID and API key in Firebase Console');
  }

  if (authTest.success) {
    console.log('✅ Firebase Authentication is enabled');
    
    if (authTest.data && authTest.data.signIn) {
      const methods = authTest.data.signIn.methods || [];
      const googleEnabled = methods.some(m => m.providerId === 'google.com' && m.state === 'ENABLED');
      
      if (googleEnabled) {
        console.log('✅ Google provider is enabled');
      } else {
        console.log('❌ Google provider is not enabled');
        console.log('   Action: Enable Google in Authentication > Sign-in method');
      }
    }
  } else {
    console.log('❌ Firebase Authentication is NOT enabled');
    console.log('   Action: Go to Firebase Console > Authentication > Get started');
  }

  if (projectTest.success) {
    console.log('✅ Project configuration accessible');
  } else {
    console.log('❌ Project configuration not accessible');
  }

  console.log('\n🔧 REQUIRED ACTIONS:');
  console.log('==================');
  
  if (!authTest.success) {
    console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/' + projectId);
    console.log('2. Click "Authentication" in sidebar');
    console.log('3. Click "Get started" button');
    console.log('4. Go to "Sign-in method" tab');
    console.log('5. Enable "Google" provider');
    console.log('6. Add authorized domain: *.replit.dev');
    console.log('7. Add current domain: b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev');
  } else if (authTest.success && authTest.data) {
    const methods = authTest.data.signIn?.methods || [];
    const googleEnabled = methods.some(m => m.providerId === 'google.com' && m.state === 'ENABLED');
    
    if (!googleEnabled) {
      console.log('1. Enable Google provider in Firebase Console');
      console.log('2. Ensure authorized domains are configured');
    } else {
      console.log('Configuration looks correct. Check browser popup blockers.');
    }
  }
}

checkFirebaseSetup().catch(console.error);