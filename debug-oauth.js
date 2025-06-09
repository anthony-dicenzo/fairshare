import { OAuth2Client } from 'google-auth-library';

async function debugOAuthConfig() {
  console.log('=== OAuth Configuration Debug ===');
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  
  console.log('Project ID:', projectId);
  console.log('Client ID (first 20 chars):', clientId ? clientId.substring(0, 20) + '...' : 'MISSING');
  console.log('Client ID domain:', clientId ? clientId.split('-')[1]?.split('.')[0] : 'N/A');
  
  // Check if client ID format is correct
  if (clientId && clientId.includes('.apps.googleusercontent.com')) {
    console.log('✓ Client ID format appears correct');
    
    // Extract project number from client ID
    const projectNumber = clientId.split('-')[0];
    console.log('Project number from Client ID:', projectNumber);
    
    // Test OAuth client
    try {
      const client = new OAuth2Client(clientId);
      console.log('✓ OAuth2Client initialized successfully');
    } catch (error) {
      console.log('✗ OAuth2Client initialization failed:', error.message);
    }
  } else {
    console.log('✗ Client ID format is incorrect or missing');
  }
  
  console.log('\n=== Next Steps ===');
  console.log('1. Go to console.firebase.google.com');
  console.log('2. Select project:', projectId);
  console.log('3. Go to Authentication > Sign-in method');
  console.log('4. Click on Google provider');
  console.log('5. Ensure the OAuth client ID matches:', clientId ? clientId.substring(0, 30) + '...' : 'YOUR_CLIENT_ID');
  console.log('6. Check that your Replit domain is in authorized domains');
}

debugOAuthConfig().catch(console.error);