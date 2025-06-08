import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';
import { config } from '../config/environment';

// Get Supabase credentials from secure configuration
const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;

// Use DATABASE_URL from secure configuration
const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Verify we're using Supabase (not Neon)
if (connectionString.includes('neon.tech')) {
  throw new Error('CRITICAL: DATABASE_URL still points to Neon database! Please update environment variables to use Supabase.');
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

// Initialize postgres client for Drizzle ORM
let client = null;
try {
  client = postgres(connectionString, { 
    ssl: 'require',
    connect_timeout: 10,
    max: 20,              // Increased pool size for better concurrency
    idle_timeout: 30,     // Optimized idle timeout
    max_lifetime: 60 * 30,
    prepare: false,       // Disable prepared statements for better RLS performance
    transform: {
      undefined: null
    }
  });
  console.log('Successfully initialized database client for Supabase');
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

// Function to set RLS context for current user
export async function setRLSContext(userId: number) {
  if (!db) return;
  
  try {
    await db.execute(`SET app.current_user_id = '${userId}'`);
    console.log(`RLS context set for user ${userId}`);
  } catch (error) {
    console.error('Failed to set RLS context:', error);
  }
}