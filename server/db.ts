import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { Pool } from 'pg';

// Configuration for database connections
const DB_CONFIG = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Setup Supabase client for API access
export const supabase = createClient(supabaseUrl, supabaseKey);

if (supabaseUrl && supabaseKey) {
  console.log('✅ Supabase client configured for API operations');
} else {
  console.warn('⚠️ Supabase API credentials not configured');
}

// Database connection setup
// We'll use Replit's DATABASE_URL which is reliable within Replit's environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set! Database functionality will be unavailable');
  process.exit(1);
}

// Create database connections
let sqlClient;
let db;
let pool;

try {
  console.log('🔄 Initializing database connection...');
  
  // Initialize Postgres client for Drizzle ORM
  sqlClient = postgres(connectionString, {
    max: DB_CONFIG.max,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });
  
  // Create Drizzle ORM instance
  db = drizzle(sqlClient, { schema });
  
  // Create Postgres connection pool for session store
  pool = new Pool({
    connectionString,
    max: DB_CONFIG.max,
    idleTimeoutMillis: DB_CONFIG.idleTimeoutMillis,
    connectionTimeoutMillis: DB_CONFIG.connectionTimeoutMillis
  });
  
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Export database interfaces
export { db, pool };