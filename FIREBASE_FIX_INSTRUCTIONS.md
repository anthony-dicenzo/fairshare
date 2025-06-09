# Firebase Authentication Fix - Required Actions

## Root Cause Identified
The **Identity Toolkit API** is not enabled in Google Cloud Console, causing all authentication requests to fail with `auth/internal-error`.

## Immediate Action Required

### 1. Enable Identity Toolkit API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `fairshare-7f83a`
3. Navigate to **APIs & Services** → **Library**
4. Search for "Identity Toolkit API"
5. Click **ENABLE**

### 2. Enable Additional Required APIs
Also enable these APIs in the same way:
- **Firebase Management API**
- **Identity and Access Management (IAM) API**

### 3. Verify API Key Restrictions
1. Go to **APIs & Services** → **Credentials**
2. Find your API key (`AIzaSyDNsYRVOJ0...`)
3. Click **Edit**
4. Under **Application restrictions**, ensure:
   - **HTTP referrers** includes: `workspace.adicenzo1.repl.co/*`
   - **API restrictions** includes: Identity Toolkit API

## Current Status
- ✅ Firebase API Key: Valid format
- ✅ Google Client ID: Correct project number (816167207113)
- ✅ Domain Authorization: workspace.adicenzo1.repl.co added
- ❌ **Identity Toolkit API: NOT ENABLED** ← This is the blocker

## Expected Result
Once Identity Toolkit API is enabled:
- Google Sign-in popup will work without errors
- Users will be able to authenticate successfully
- No more `auth/internal-error` or `auth/network-request-failed`

## Testing
After enabling the APIs, test authentication at: `/google-auth-test`