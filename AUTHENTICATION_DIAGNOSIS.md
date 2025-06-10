# Authentication Issue Root Cause Analysis

## Current Status
- ✅ Server endpoints working correctly (`/api/google-auth` responds properly)
- ✅ Firebase API key is valid and accessible
- ❌ Firebase returns "OPERATION_NOT_ALLOWED" error
- ❌ Browser gets `auth/internal-error` during Google sign-in

## Root Cause: Google Sign-In Provider Not Enabled

The `OPERATION_NOT_ALLOWED` error from Firebase indicates that Google authentication provider is not enabled in Firebase Console.

## Required Fix

### Firebase Console Configuration
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: **fairshare-7f83a**
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Google** provider in the list
5. Click **Google** to configure it
6. Toggle **Enable** to turn it on
7. **Save** the configuration

### Why This Causes auth/internal-error
When Google provider is disabled in Firebase:
- Firebase SDK initializes successfully
- `signInWithPopup()` gets called
- Firebase attempts to contact Google OAuth servers
- Google OAuth service rejects the request because the provider isn't enabled
- This returns as an "internal error" to the browser

## Verification
After enabling Google provider:
- The `auth/internal-error` should disappear
- Google sign-in popup should work normally  
- Authentication flow should complete successfully

## Note on Domains
The domain configuration is already working correctly. Firebase uses relative paths and environment variables properly. The issue is purely the missing Google provider configuration.