import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';  // Using standard pg instead of neon-serverless

// Supabase credentials are read from the environment so the app can connect to
// any Supabase project.
const supabaseUrl = process.env.SUPABASE_URL || 'https://smrsiolztcggakkgtyab.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Use the DATABASE_URL environment variable, falling back to a sample Supabase
// connection string if not provided.
let connectionString = process.env.DATABASE_URL || 
  'postgres://postgres:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

// Clean up the URL if it contains quotes or other unexpected characters
if (connectionString.startsWith('"') && connectionString.includes('"', 1)) {
  connectionString = connectionString.replace(/^"|".*$/g, '');
}

console.log('Using connection string (masked):', 
  connectionString.replace(/:[^:@]*@/, ':****@')); // Log without password

// Initialize postgres client for Drizzle ORM
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

// Create a regular PostgreSQL pool for session store compatibility
// using the standard node-postgres library instead of neon-serverless
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

