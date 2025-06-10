# Firebase Setup Checklist for fairshare-v3

## Current Status: Authentication Not Enabled

The 404 error indicates Firebase Authentication is not set up. Follow these steps:

## Step 1: Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/project/fairshare-v3)
2. Click "Authentication" in the left sidebar
3. Click "Get started" button
4. This will enable the Authentication service

## Step 2: Configure Google Provider
1. Go to "Sign-in method" tab
2. Click on "Google" provider
3. Toggle the "Enable" switch
4. Set support email to your email address
5. Click "Save"

## Step 3: Add Authorized Domains
1. Still in Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add: `replit.dev`
4. Add: `*.replit.dev` 
5. The current Replit domain should be added: `b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev`

## Step 4: Verify Web App Configuration
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Ensure the web app is properly registered
4. Copy the config values and verify they match what we have

## Expected Configuration
- Project ID: fairshare-v3
- Auth Domain: fairshare-v3.firebaseapp.com
- API Key: (should work after Authentication is enabled)

## After Setup
Once Authentication is enabled, the Google sign-in should work properly without the auth/internal-error.