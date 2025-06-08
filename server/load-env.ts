// DEPRECATED: This file is being replaced by config/environment.ts
// Use the new centralized configuration system instead

import { config } from '../config/environment';

// Legacy function for backwards compatibility
export function loadEnvVariables() {
  console.warn('⚠️ loadEnvVariables() is deprecated. Use config from config/environment.ts instead');
  
  return {
    DATABASE_URL: config.database.url,
    SUPABASE_URL: config.supabase.url,
    SUPABASE_ANON_KEY: config.supabase.anonKey,
    VITE_FIREBASE_API_KEY: config.firebase.apiKey,
    VITE_FIREBASE_PROJECT_ID: config.firebase.projectId,
    VITE_FIREBASE_APP_ID: config.firebase.appId
  };
}