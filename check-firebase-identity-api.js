/**
 * Check if Firebase Identity Platform API is enabled
 * This API is required for Firebase Authentication to work
 */

import https from 'https';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log('🔍 Checking Firebase Identity Platform API Status');
console.log('Project:', projectId);
console.log('');

// Check if the Identity Toolkit API is enabled
const identityApiUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}?key=${apiKey}`;

https.get(identityApiUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Identity Toolkit API Response:');
    console.log('Status Code:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ Identity Toolkit API is enabled');
      try {
        const parsed = JSON.parse(data);
        console.log('Project configuration found');
      } catch (e) {
        console.log('Response data:', data.substring(0, 300));
      }
    } else if (res.statusCode === 403) {
      console.log('❌ Identity Toolkit API is disabled or restricted');
      console.log('');
      console.log('🔧 ACTION REQUIRED:');
      console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
      console.log('2. Select project:', projectId);
      console.log('3. Go to APIs & Services > Library');
      console.log('4. Search for "Identity Toolkit API"');
      console.log('5. Click "Enable"');
      console.log('');
      console.log('Alternative:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/' + projectId);
      console.log('2. Go to Authentication');
      console.log('3. Make sure Authentication is fully set up (not just enabled)');
    } else {
      console.log('❌ API check failed');
      console.log('Response:', data.substring(0, 300));
    }
  });
}).on('error', (error) => {
  console.log('❌ Network error:', error.message);
});

// Also check Firebase Auth REST API
const authApiUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/config?key=${apiKey}`;

setTimeout(() => {
  console.log('\n🔍 Checking Firebase Auth Configuration API...');
  
  https.get(authApiUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Auth Config API Response:');
      console.log('Status Code:', res.statusCode);
      
      if (res.statusCode === 200) {
        console.log('✅ Firebase Auth Configuration accessible');
        try {
          const config = JSON.parse(data);
          console.log('Available sign-in methods:', config.signIn?.methods?.length || 0);
          
          const googleMethod = config.signIn?.methods?.find(m => m.providerId === 'google.com');
          if (googleMethod && googleMethod.state === 'ENABLED') {
            console.log('✅ Google provider is properly enabled');
          } else {
            console.log('❌ Google provider not properly configured');
            console.log('Current methods:', config.signIn?.methods?.map(m => `${m.providerId}: ${m.state}`));
          }
        } catch (e) {
          console.log('Config data:', data.substring(0, 300));
        }
      } else {
        console.log('❌ Auth configuration not accessible');
        console.log('This indicates Firebase Authentication is not properly set up');
        console.log('Response:', data.substring(0, 300));
      }
    });
  }).on('error', (error) => {
    console.log('❌ Network error:', error.message);
  });
}, 1000);