// Load environment variables from all .env files
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Function to load environment variables from multiple .env files
export function loadEnvVariables() {
  // Load variables from primary .env file
  dotenv.config();
  
  // Try to load from .env.secrets (highest priority)
  try {
    if (fs.existsSync(path.resolve('.env.secrets'))) {
      dotenv.config({ path: path.resolve('.env.secrets') });
      console.log('Loaded environment variables from .env.secrets');
    }
  } catch (error) {
    console.log('No .env.secrets file found');
  }
  
  // Verify DATABASE_URL is set and in the correct format
  if (process.env.DATABASE_URL) {
    // Check if connection string is for Supabase
    if (!process.env.DATABASE_URL.includes('supabase')) {
      console.warn('⚠️ WARNING: DATABASE_URL does not appear to be a Supabase connection string');
    }
  } else {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  }
  
  // Return environment variables for easy access
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };
}