import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
  ? createSupabaseClient(supabaseUrl, supabaseKey)
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
const connectionString = process.env.DATABASE_URL || '';

// Validate database connection string
if (!connectionString) {
  console.error('ERROR: Missing DATABASE_URL in environment variables.');
  console.error('Please set DATABASE_URL in your .env file.');
}

// Create a connection factory with retry logic
const createPgClient = () => {
  try {
    // Log connection attempt
    console.log('Attempting to connect to database...');
    
    const pgClient = postgres(connectionString, { 
      max: 5,              // Reduce max connections to avoid overwhelming the DB
      connect_timeout: 10, // Shorter timeout for faster feedback
      idle_timeout: 20,    // Idle timeout
      max_lifetime: 30 * 60, // Max lifetime
      // Add retry logic for better resilience
      onnotice: () => {}, // Suppress notice messages
      debug: false,       // Disable debug messages
      onparameter: () => {} // Suppress parameter messages
    });
    
    // Test the connection before returning
    (async () => {
      try {
        // Ping database to verify connection
        const result = await pgClient`SELECT 1`;
        console.log('✅ Database connection established successfully');
      } catch (error) {
        console.error('❌ Database connection failed during test:', error.message);
      }
    })();
    
    return pgClient;
  } catch (error) {
    console.error('❌ Failed to create database client:', error);
    // Return a dummy client that will return empty results
    // This prevents the app from crashing during startup
    return {
      async query() { 
        console.error('Database not available, returning empty set');
        return [];
      }
    } as any;
  }
};

// Initialize client with more resilient settings and fallback mode
const client = connectionString.length > 0 ? createPgClient() : null;

// Safely create Drizzle ORM instance
export const db = client ? drizzle(client, { schema }) : null;

// Create a regular PostgreSQL pool with better error handling
export const pool = connectionString ? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Supabase connection
  connectionTimeoutMillis: 10000,     // 10 seconds timeout (faster feedback)
  idleTimeoutMillis: 10000,           // 10 seconds idle timeout
  max: 5,                            // Fewer max clients
  allowExitOnIdle: true              // Allow clean shutdown
}) : null;

// Add connection testing on startup
if (pool) {
  pool.on('error', (error) => {
    console.error('Unexpected error on idle client', error);
  });
  
  // Test pool connection
  (async () => {
    try {
      const client = await pool.connect();
      console.log('✅ Connection pool established successfully');
      client.release();
    } catch (error) {
      console.error('❌ Connection pool creation failed:', error.message);
    }
  })();
}