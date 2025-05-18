import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';  // Using standard pg instead of neon-serverless

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://smrsiolztcggakkgtyab.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcnNpb2x6dGNnZ2Fra2d0eWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODA2MjEsImV4cCI6MjA2MjA1NjYyMX0.2Cr3iYDNyaXUNtrYRX0OOI4mnG6od5fY7CYcLU-NCSg';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Log the connection being used (without exposing full credentials)
console.log(`Connecting to Supabase at ${supabaseUrl}`);
console.log(`Using database URL starting with: ${process.env.DATABASE_URL?.substring(0, 15)}...`);

// Use the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

// Initialize postgres client for Drizzle ORM
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

// Create a regular PostgreSQL pool for session store compatibility
// using the standard node-postgres library instead of neon-serverless
export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});