// fix-pooler-connection.js
// This script fixes the database connection to use the correct Supabase pooler URL

import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: './.env.local' });

console.log('Starting Supabase pooler connection fix...');

// Make sure we have the required environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is missing');
  process.exit(1);
}

// Extract the correct pooler URL from .env.local
const databaseUrl = process.env.DATABASE_URL;
console.log('Using pooler URL:', databaseUrl.replace(/:[^:@]*@/, ':****@'));

async function testPoolerConnection() {
  console.log('\nTesting connection to Supabase pooler...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Try to connect and run a simple query
    const client = await pool.connect();
    console.log('✅ Successfully connected to Supabase pooler!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Database time: ${result.rows[0].current_time}`);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase pooler:', error.message);
    return false;
  }
}

// Update all references to the old connection URL format
function updateDbFile() {
  console.log('\nUpdating database configuration files...');
  
  try {
    // Update server/db.ts to ensure it uses the correct pooler URL
    const dbFilePath = './server/db.ts';
    let dbContent = fs.readFileSync(dbFilePath, 'utf8');
    
    // Make sure SSL is enabled for Supabase
    if (!dbContent.includes('ssl: { rejectUnauthorized: false }')) {
      // Add SSL configuration if it doesn't exist
      dbContent = dbContent.replace(
        'export const pool = new Pool({',
        'export const pool = new Pool({\n  connectionString,\n  ssl: { rejectUnauthorized: false } // Required for Supabase connection'
      );
      
      fs.writeFileSync(dbFilePath, dbContent);
      console.log('✅ Updated server/db.ts with SSL configuration');
    } else {
      console.log('✓ server/db.ts already has SSL configuration');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating database files:', error.message);
    return false;
  }
}

// Make sure the session store uses the correct connection string
function updateSessionStore() {
  console.log('\nUpdating session store configuration...');
  
  try {
    const storageFilePath = './server/storage.ts';
    let storageContent = fs.readFileSync(storageFilePath, 'utf8');
    
    // Check if we need to update the session store configuration
    if (!storageContent.includes('conObject: {')) {
      console.log('Updating session store to use direct connection string');
      
      // Replace the session store configuration to use explicit connection string
      const oldConfig = /this\.sessionStore = new PostgresSessionStore\(\{[\s\S]*?\}\);/;
      const newConfig = `this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL || '',
        ssl: { rejectUnauthorized: false }
      },
      createTableIfMissing: true,
      tableName: 'session'
    });`;
      
      storageContent = storageContent.replace(oldConfig, newConfig);
      fs.writeFileSync(storageFilePath, storageContent);
      console.log('✅ Updated session store configuration');
    } else {
      console.log('✓ Session store already using correct configuration');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating session store:', error.message);
    return false;
  }
}

// Create the required tables in Supabase
async function createTables() {
  console.log('\nCreating required tables in Supabase...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    // Create session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log('✅ Session table created/verified');
    
    // Create user_balances table
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
    console.log('✅ User balances table created/verified');
    
    // Create user_balances_between_users table
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
    console.log('✅ User balances between users table created/verified');
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    return false;
  }
}

// Main function to fix everything
async function main() {
  console.log('==============================================');
  console.log('SUPABASE POOLER CONNECTION FIX');
  console.log('==============================================');
  
  // 1. Test connection to Supabase pooler
  const connectionOk = await testPoolerConnection();
  if (!connectionOk) {
    console.error('❌ Cannot proceed without a working database connection');
    process.exit(1);
  }
  
  // 2. Update database configuration files
  const dbFilesUpdated = updateDbFile();
  if (!dbFilesUpdated) {
    console.error('❌ Failed to update database configuration files');
    process.exit(1);
  }
  
  // 3. Update session store configuration
  const sessionStoreUpdated = updateSessionStore();
  if (!sessionStoreUpdated) {
    console.error('❌ Failed to update session store configuration');
    process.exit(1);
  }
  
  // 4. Create required tables
  const tablesCreated = await createTables();
  if (!tablesCreated) {
    console.error('❌ Failed to create required tables');
    process.exit(1);
  }
  
  console.log('\n==============================================');
  console.log('SUPABASE POOLER CONNECTION FIX COMPLETE');
  console.log('==============================================');
  console.log('✅ Database connection configured correctly');
  console.log('✅ All required tables created/verified');
  console.log('✅ Session store properly configured');
  console.log('\nYour application should now work with Supabase!');
  console.log('Restart the application to apply the changes.');
}

// Run the fix
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});