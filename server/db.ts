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

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Use DATABASE_URL from environment (should be Supabase connection string)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

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
  console.log('Using connection string:', connectionString.substring(0, 20) + '...');
} catch (error) {
  console.error('Error parsing database URL:', error instanceof Error ? error.message : String(error));
}

// Create Supabase client for API interactions
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Initialize postgres client for Drizzle ORM with fresh connection
let client = null;
try {
  // Force a fresh connection to ensure schema is recognized
  client = postgres(connectionString, { 
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false },
    // Force schema refresh
    prepare: false,
    connection: {
      statement_timeout: 30000
    }
  });
  console.log('Successfully initialized database client with fresh connection');
} catch (error) {
  console.error('Failed to initialize database client:', error instanceof Error ? error.message : String(error));
}

// Create the Drizzle ORM instance with fresh schema
export const db = client ? drizzle(client, { schema, logger: false }) : null;

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
  console.error('Failed to initialize database pool:', error instanceof Error ? error.message : String(error));
}

export const pool = poolInstance;