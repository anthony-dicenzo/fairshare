import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';  // Using standard pg instead of neon-serverless

// Fixed hardcoded Supabase credentials (in production you would use environment variables)
const supabaseUrl = 'https://smrsiolztcggakkgtyab.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcnNpb2x6dGNnZ2Fra2d0eWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODA2MjEsImV4cCI6MjA2MjA1NjYyMX0.2Cr3iYDNyaXUNtrYRX0OOI4mnG6od5fY7CYcLU-NCSg';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Use the existing DATABASE_URL with fallback to a fixed connection string
const connectionString = process.env.DATABASE_URL || 'postgres://postgres.smrsiolztcggakkgtyab:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcnNpb2x6dGNnZ2Fra2d0eWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODA2MjEsImV4cCI6MjA2MjA1NjYyMX0.2Cr3iYDNyaXUNtrYRX0OOI4mnG6od5fY7CYcLU-NCSg@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

// Initialize postgres client for Drizzle ORM
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

// Create a regular PostgreSQL pool for session store compatibility
// using the standard node-postgres library instead of neon-serverless
export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});