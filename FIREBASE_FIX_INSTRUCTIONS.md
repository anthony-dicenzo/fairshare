# Firebase Authentication Fix - API Key Restrictions

## Root Cause Identified
The authentication fails due to **API key HTTP referrer restrictions** in Google Cloud Console, not just Firebase domain authorization.

**Status:**
- ✅ Firebase domains are properly configured (internal domain added)
- ❌ Google Cloud API key restricts the current domain
- ❌ Browser cannot access Firebase APIs (network errors)

## Critical Fix Required

### Step 1: Access Google Cloud Console
1. Go to https://console.cloud.google.com
2. Select project: **fairshare-7f83a**
3. Navigate to **APIs & Services** → **Credentials**

### Step 2: Find and Edit Firebase API Key
1. Look for API key starting with `AIzaSyDNsYRVOJ0...`
2. Click the **Edit** button (pencil icon)

### Step 3: Fix API Key Restrictions
**Current Problem:** The API key likely has "HTTP referrers" restriction that doesn't include the Replit domain.

**Solution Options:**
1. **Temporarily remove restrictions:** Change "Application restrictions" to "None" 
2. **Add specific domain:** Add `b00299a8-cf16-482d-a828-34e450b5e513-00-3su5zumoc8bsv.janeway.replit.dev/*` to HTTP referrer list

### Step 4: Save and Test
1. Click **Save**
2. Wait 5 minutes for changes to propagate
3. Test Google sign-in again

## Alternative Solution
Access your app at the external domain: **https://workspace.adicenzo1.repl.co**

This domain should already be properly configured in both Firebase and Google Cloud.

## Verification
If the fix works, you should see:
- No more `auth/internal-error`
- Firebase API test passes
- Google sign-in completes successfully