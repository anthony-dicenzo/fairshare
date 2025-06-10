# Firebase New Project Setup Guide

Follow these steps to create a new Firebase project and configure Google Authentication:

## Step 1: Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `fairshare-new` (or your preferred name)
4. Disable Google Analytics (not needed for authentication)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click on "Google" provider
5. Toggle "Enable"
6. Enter support email (your email)
7. Click "Save"

## Step 3: Configure Web App

1. Go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Enter app nickname: `fairshare-web`
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"

## Step 4: Get Configuration

After registering, you'll see the Firebase config object. Copy these values:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 5: Add Authorized Domains

1. In Authentication > Settings > Authorized domains
2. Add your Replit domain: `*.replit.dev`
3. Add localhost for testing: `localhost`

## Required Environment Variables

You'll need to provide these three values as secrets:

- `VITE_FIREBASE_API_KEY` = your-api-key
- `VITE_FIREBASE_PROJECT_ID` = your-project-id  
- `VITE_FIREBASE_APP_ID` = your-app-id

The system will automatically construct the other needed URLs from the project ID.