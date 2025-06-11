/**
 * Test Google OAuth configuration for Firebase project
 */

import https from 'https';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

console.log('🔍 Testing Google OAuth Configuration for Firebase');
console.log('Project:', projectId);
console.log('');

// Test Firebase project status
const firebaseConfigUrl = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps?key=${apiKey}`;

https.get(firebaseConfigUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Firebase Project Web Apps:');
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      try {
        const apps = JSON.parse(data);
        console.log('✅ Firebase project accessible');
        console.log('Web apps found:', apps.apps?.length || 0);
        
        if (apps.apps && apps.apps.length > 0) {
          const app = apps.apps[0];
          console.log('App ID:', app.appId);
          console.log('Display Name:', app.displayName);
        }
      } catch (e) {
        console.log('Response:', data.substring(0, 200));
      }
    } else {
      console.log('❌ Project not accessible');
      console.log('Response:', data.substring(0, 200));
    }
  });
}).on('error', err => console.log('Error:', err.message));

// Test Google OAuth endpoints
setTimeout(() => {
  console.log('\n🔍 Testing Google OAuth Endpoints...');
  
  // Test Google's OAuth discovery document
  https.get('https://accounts.google.com/.well-known/openid_configuration', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Google OAuth endpoints accessible');
        try {
          const config = JSON.parse(data);
          console.log('Authorization endpoint:', config.authorization_endpoint);
          console.log('Token endpoint:', config.token_endpoint);
        } catch (e) {
          console.log('OAuth config accessible but not parseable');
        }
      } else {
        console.log('❌ Google OAuth endpoints not accessible');
      }
    });
  }).on('error', err => console.log('OAuth endpoint error:', err.message));
}, 1000);

// Test Firebase Auth JavaScript SDK endpoint
setTimeout(() => {
  console.log('\n🔍 Testing Firebase Auth SDK Endpoints...');
  
  const authUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`;
  
  https.get(authUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Auth SDK Config Status:', res.statusCode);
      
      if (res.statusCode === 200) {
        try {
          const config = JSON.parse(data);
          console.log('✅ Firebase Auth SDK accessible');
          console.log('Auth domain:', config.authDomain);
          console.log('Authorized domains:', config.authorizedDomains?.length || 0);
          
          if (config.idpConfig) {
            const googleConfig = config.idpConfig.find(p => p.provider === 'google.com');
            if (googleConfig && googleConfig.enabled) {
              console.log('✅ Google provider enabled in config');
              console.log('Client ID present:', !!googleConfig.clientId);
            } else {
              console.log('❌ Google provider not found or disabled');
            }
          }
        } catch (e) {
          console.log('Config data:', data.substring(0, 200));
        }
      } else if (res.statusCode === 400) {
        console.log('❌ Invalid API key or project configuration');
      } else {
        console.log('❌ Auth SDK not accessible');
        console.log('Response:', data.substring(0, 200));
      }
    });
  }).on('error', err => console.log('Auth SDK error:', err.message));
}, 2000);