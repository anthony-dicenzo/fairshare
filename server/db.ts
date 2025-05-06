import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';  // Using standard pg instead of neon-serverless

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing! Please check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Exclusively use Supabase connection string
const connectionString = process.env.SUPABASE_CONNECTION_STRING || '';

if (!connectionString) {
  console.error('Supabase connection string missing! Application will not function correctly without SUPABASE_CONNECTION_STRING.');
}

console.log('Using Supabase database connection...');

// Initialize postgres client for Drizzle ORM with Supabase-specific settings
const client = postgres(connectionString, { 
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30, // Increased timeout for more reliability
  prepare: false, // Disable prepared statements as recommended for Supabase
  ssl: true, // Enable SSL for secure Supabase connections
});

// Create database instance with schema
export const db = drizzle(client, { schema });

// Create a regular PostgreSQL pool for session store compatibility
export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Supabase connections
  max: 10, // Match the postgres client's max connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 30000, // 30 seconds
});