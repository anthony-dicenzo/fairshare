# Firebase Authentication Fix Guide

## Current Issues Identified:
1. ❌ Missing `VITE_GOOGLE_CLIENT_ID` environment variable
2. ❌ Domain `workspace.adicenzo1.repl.co` not authorized in Firebase
3. ❌ Firebase Auth endpoint returning 404 (configuration issue)

## Required Actions:

### 1. Add Domain Authorization in Firebase Console
Go to [Firebase Console](https://console.firebase.google.com) → Select `fairshare-7f83a` project:

**Authentication → Settings → Authorized domains**
- Click "Add domain"
- Add: `workspace.adicenzo1.repl.co`
- Also ensure these are present:
  - `localhost`
  - `fairshare-7f83a.firebaseapp.com`

### 2. Get Google OAuth Client ID
**Authentication → Sign-in method → Google provider**
- Copy the "Web client ID" (ends with .apps.googleusercontent.com)
- This should be: `816167207113-klrvfs03k3ip2pbnv019kq1dcmankheq.apps.googleusercontent.com`

### 3. Verify Firebase Web App Configuration
**Project Settings → Your apps → Web app**
- Ensure the Firebase config values match what we're using
- Particularly verify the `apiKey` value

## Current Configuration Status:
- ✅ `VITE_FIREBASE_API_KEY`: Present (39 chars)
- ✅ `VITE_FIREBASE_PROJECT_ID`: fairshare-7f83a
- ✅ `VITE_FIREBASE_APP_ID`: Present (41 chars)
- ❌ `VITE_GOOGLE_CLIENT_ID`: Missing

## Expected Results After Fix:
- Google Sign-in popup should work without `auth/internal-error`
- Users should be able to authenticate and stay logged in
- No more `auth/network-request-failed` errors