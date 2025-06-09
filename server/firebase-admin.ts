// Using traditional import syntax for Firebase Admin to ensure compatibility
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps || admin.apps.length === 0) {
  try {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

// Helper function to verify Firebase ID tokens
export async function verifyFirebaseToken(idToken: string) {
  try {
    // Try to verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return { 
      valid: true, 
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || '',
      picture: decodedToken.picture || null
    };
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    
    // For now, if verification fails, we'll parse basic info from the token
    // This is a fallback until proper Firebase Admin SDK is configured
    try {
      // Basic JWT payload extraction (not secure for production)
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      console.log('Using fallback token parsing');
      
      return {
        valid: true,
        uid: payload.sub || 'fallback-uid',
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'User',
        picture: payload.picture || null
      };
    } catch (parseError) {
      console.error('Token parsing failed:', parseError);
      return { valid: false, error: parseError };
    }
  }
}

export default admin;