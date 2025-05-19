import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from all available .env files
dotenv.config();
dotenv.config({ path: '.env.secrets' });
dotenv.config({ path: '.env.database' });
dotenv.config({ path: '.env.local' });

// Use Supabase connection directly to ensure we don't use Neon database
const SUPABASE_CONNECTION = 'postgresql://postgres:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Force using Supabase connection string instead of relying on environment variables
// This ensures we're connecting to Supabase instead of the old Neon database
const connectionString = SUPABASE_CONNECTION;

// Log connection information (safely)
if (supabaseUrl) {
  console.log(`Connecting to Supabase API at ${supabaseUrl}`);
}

// Extract and log database host without showing credentials
try {
  const urlParts = connectionString.split('@');
  if (urlParts.length > 1) {
    console.log(`Database host: ${urlParts[1].split('/')[0]}`);
  }
} catch (error) {
  console.error('Error parsing database URL:', error.message);
}

// Create Supabase client for API interactions
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Initialize postgres client for Drizzle ORM with better error handling
let client = null;
try {
  client = postgres(connectionString, { 
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Successfully initialized database client');
} catch (error) {
  console.error('Failed to initialize database client:', error.message);
}

// Create the Drizzle ORM instance
export const db = client ? drizzle(client, { schema }) : null;

// Create a PostgreSQL pool for session store compatibility
let poolInstance = null;
try {
  poolInstance = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  console.log('Successfully initialized database pool');
} catch (error) {
  console.error('Failed to initialize database pool:', error.message);
}

export const pool = poolInstance;