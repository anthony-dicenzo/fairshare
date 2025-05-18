import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';  // Using standard pg instead of neon-serverless

// Get Supabase credentials - MUST be provided in environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials in environment variables.');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.');
}

// Create Supabase client only if credentials are available
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Log connection information (without exposing sensitive details)
if (supabaseUrl) {
  console.log(`Connecting to Supabase at ${supabaseUrl}`);
}

if (process.env.DATABASE_URL) {
  const urlParts = process.env.DATABASE_URL.split('@');
  if (urlParts.length > 1) {
    console.log(`Database host: ${urlParts[1].split('/')[0]}`);
  }
}

// Use the DATABASE_URL from environment variables (REQUIRED)
const connectionString = process.env.DATABASE_URL;

// Validate database connection string
if (!connectionString) {
  console.error('ERROR: Missing DATABASE_URL in environment variables.');
  console.error('Please set DATABASE_URL in your .env file.');
}

// Initialize postgres client for Drizzle ORM
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

// Create a regular PostgreSQL pool for session store compatibility
// using the standard node-postgres library instead of neon-serverless
export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});