# Firebase Domain Authorization Fix

## Problem
Firebase authentication fails because the browser uses the internal Replit domain instead of the external workspace domain.

**Current Issue:**
- Browser is on: `b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev`
- Firebase expects: `workspace.adicenzo1.repl.co`

## Solution
Add the internal Replit domain to Firebase's authorized domains.

### Step 1: Access Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project: **fairshare-7f83a**

### Step 2: Add Authorized Domain
1. Navigate to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Add: `b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev`

### Step 3: Test Authentication
After adding the domain, test the Google sign-in button again.

## Alternative: Access via External Domain
Instead of using the internal domain, access your app at:
**https://workspace.adicenzo1.repl.co**

This should work since that domain is already authorized in Firebase.

## Current Authorized Domains
Your Firebase project currently has these domains authorized:
- localhost
- fairshare-7f83a.firebaseapp.com
- fairshare-7f83a.web.app
- fairshare.my
- replit.com
- fair-split-buddy-backup-pre-pwa-changes-adicenzo1.replit.app
- workspace.adicenzo1.repl.co
- (Need to add) b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev