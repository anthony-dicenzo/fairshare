# Security Setup Guide

## Important: Your credentials have been secured

All hardcoded secrets have been removed from the codebase for security. You now need to set up environment variables in secure storage.

## Step 1: Reset Your Credentials (CRITICAL)

Since your credentials were exposed on GitHub, reset them immediately:

1. **Supabase Dashboard**: Reset database password and regenerate API keys
2. **Firebase Console**: Regenerate API keys if needed

## Step 2: Set Up Environment Variables

### For Replit Development:
1. Open Replit Secrets (key icon in sidebar)
2. Add these variables with your NEW credentials:

```
DATABASE_URL=postgresql://postgres.[project]:[NEW_PASSWORD]@[host]:6543/postgres
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=[your-new-anon-key]
SESSION_SECRET=[generate-strong-random-string]
VITE_FIREBASE_API_KEY=[your-firebase-key]
VITE_FIREBASE_PROJECT_ID=[your-project-id]
VITE_FIREBASE_APP_ID=[your-app-id]
```

### For Local Development (Cursor/Xcode):
1. Copy `.env.example` to `.env.local`
2. Fill in your actual credentials
3. Never commit `.env.local` to version control

## Step 3: Verify Setup

1. Restart your Replit application
2. Check that the app connects to the database
3. Confirm all features work as expected

## Security Features Implemented:

✅ Removed all hardcoded credentials
✅ Centralized environment configuration
✅ Input validation for required variables
✅ Secure error handling
✅ Template file for required variables
✅ Updated .gitignore protection

## Next Steps:

1. Reset your Supabase credentials
2. Set environment variables in Replit Secrets
3. Test the application
4. Your app is now secure for App Store submission