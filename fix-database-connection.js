// fix-database-connection.js
// This script fixes database connection issues with Supabase

import dotenv from 'dotenv';
import fs from 'fs';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: './.env.local' });

console.log('Starting database connection fix...');

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is missing from environment variables');
  process.exit(1);
}

if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is missing from environment variables');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_ANON_KEY is missing from environment variables');
  process.exit(1);
}

// Log connection details (redacted)
const databaseUrl = process.env.DATABASE_URL;
const redactedUrl = databaseUrl.replace(/:[^:@]*@/, ':****@');
console.log('Using database URL:', redactedUrl);

// Test database connection
async function testConnection() {
  console.log('Testing database connection to Supabase...');
  
  try {
    // Create a PostgreSQL pool with the correct connection string
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    // Test the connection
    const client = await pool.connect();
    console.log('Connected to database successfully!');
    
    // Run a simple query to verify the connection
    const result = await client.query('SELECT NOW() as time');
    console.log('Database time:', result.rows[0].time);
    
    // Release the client
    client.release();
    
    // Close the pool
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    return false;
  }
}

// Create necessary session and balance tables if they don't exist
async function ensureTables() {
  console.log('Creating required tables if they don\'t exist...');
  
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    
    // Create session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    
    console.log('Session table created or verified.');
    
    // Create user_balances table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user_balances" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "group_id" INTEGER NOT NULL,
        "balance_amount" TEXT NOT NULL,
        "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE ("user_id", "group_id")
      );
    `);
    
    // Create user_balances_between_users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user_balances_between_users" (
        "id" SERIAL PRIMARY KEY,
        "group_id" INTEGER NOT NULL,
        "from_user_id" INTEGER NOT NULL,
        "to_user_id" INTEGER NOT NULL,
        "balance_amount" TEXT NOT NULL,
        "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE ("group_id", "from_user_id", "to_user_id")
      );
    `);
    
    console.log('Balance tables created or verified.');
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('Error creating tables:', error.message);
    return false;
  }
}

// Main function to fix database connection issues
async function fixDatabaseConnection() {
  console.log('---------------------------------');
  console.log('SUPABASE DATABASE CONNECTION FIX');
  console.log('---------------------------------');
  
  // 1. Test the connection
  const connectionSuccessful = await testConnection();
  
  if (!connectionSuccessful) {
    console.error('Could not establish database connection. Please check your DATABASE_URL.');
    process.exit(1);
  }
  
  // 2. Create necessary tables
  const tablesCreated = await ensureTables();
  
  if (!tablesCreated) {
    console.error('Failed to create required tables. Check database permissions.');
    process.exit(1);
  }
  
  console.log('---------------------------------');
  console.log('DATABASE CONNECTION FIX COMPLETE');
  console.log('---------------------------------');
  
  console.log('✅ Connection to Supabase established successfully');
  console.log('✅ All required tables have been created');
  console.log('✅ Your application should now work properly with Supabase');
  
  console.log('\nTo restart your application, use the workflow restart button.');
}

// Run the fix
fixDatabaseConnection().catch(error => {
  console.error('Unexpected error during database connection fix:', error);
  process.exit(1);
});