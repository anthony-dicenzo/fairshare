// Secure environment variable loading and validation
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'SUPABASE_URL', 
    'SUPABASE_ANON_KEY',
    'SESSION_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Environment configuration object
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  session: {
    secret: process.env.SESSION_SECRET!,
  },
  firebase: {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }
};

// Validate environment on module load
try {
  validateEnvironment();
  console.log('✅ Environment variables validated successfully');
} catch (error) {
  console.error('❌ Environment validation failed:', error instanceof Error ? error.message : String(error));
  console.error('Please check your environment variables and try again');
  process.exit(1);
}