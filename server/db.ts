import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';  // Using standard pg instead of neon-serverless
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment from .env.local file if not already present
if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    
    // Parse environment variables
    envContent.split('\n').forEach((line: string) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove quotes if present
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.replace(/^"|"$/g, '');
        }
        
        process.env[key] = value;
      }
    });
    
    console.log('Successfully loaded environment from .env.local');
  } catch (error: any) {
    console.warn('Could not load .env.local file:', error?.message || 'Unknown error');
  }
}

// Validate Supabase credentials
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is not set');
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is not set');
}

// Validate URL format (should be https://yourproject.supabase.co)
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('SUPABASE_URL format appears to be incorrect:', supabaseUrl);
  console.error('Expected format: https://yourproject.supabase.co');
  throw new Error('Invalid SUPABASE_URL format');
}

const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Log connection (without exposing keys)
console.log('Connecting to Supabase at:', supabaseUrl);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Use the DATABASE_URL environment variable from secrets
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please set it in your secrets.');
}

// Get connection string from environment variable (which is securely stored in secrets)
const connectionString = process.env.DATABASE_URL;

// Log connection info without exposing the password
console.log('Using database connection (credentials hidden)');

// Initialize postgres client for Drizzle ORM
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

// Create a regular PostgreSQL pool for session store compatibility
// using the standard node-postgres library instead of neon-serverless
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

