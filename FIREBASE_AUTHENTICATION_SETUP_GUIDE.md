# Firebase Authentication Setup Guide

## Problem Diagnosis
The `auth/internal-error` and `auth/network-request-failed` errors are occurring because Firebase Authentication's underlying Identity Toolkit API is not properly enabled, even though the Authentication section appears in the Firebase Console.

## Required Actions

### Option 1: Enable Identity Toolkit API (Recommended)
1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select your project: `fairshare-v3`
3. Navigate to **APIs & Services** > **Library**
4. Search for **"Identity Toolkit API"**
5. Click **Enable**

### Option 2: Complete Firebase Authentication Setup
1. Go to **Firebase Console**: https://console.firebase.google.com/project/fairshare-v3
2. Click **Authentication** in the sidebar
3. If you see a "Get started" button, click it
4. If Authentication is already showing as enabled, try:
   - Disable and re-enable the Google provider
   - Save the configuration
   - Wait 2-3 minutes for propagation

### Option 3: Create New Firebase Project (If Above Fails)
Sometimes Firebase projects can get into an inconsistent state. If the above steps don't work:

1. Create a new Firebase project
2. Enable Authentication and Google provider
3. Update your environment variables with the new project credentials

## Verification
After completing the setup, run this command to verify:
```bash
node check-firebase-identity-api.js
```

You should see:
- ✅ Identity Toolkit API is enabled
- ✅ Firebase Auth Configuration accessible
- ✅ Google provider is properly enabled

## Expected Results
Once properly configured, the Google sign-in should work without the `auth/internal-error`.