import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Ensure required environment variables are set
const requiredVars = [
  'DATABASE_URL',
  'SUPABASE_CONNECTION_STRING',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Required environment variable ${varName} is not set!`);
    console.error('Please ensure it is properly set in your .env file');
    process.exit(1);
  }
}

// Configure connections
const SOURCE_DB = process.env.DATABASE_URL!;
const TARGET_DB = process.env.SUPABASE_CONNECTION_STRING!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Source database (Replit PostgreSQL)
const sourcePool = new Pool({
  connectionString: SOURCE_DB,
});

// Target database (Supabase PostgreSQL)
const targetPool = new Pool({
  connectionString: TARGET_DB,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

// Supabase client for API operations
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tables to migrate (in order to respect foreign key constraints)
const tables = [
  'users',
  'groups',
  'group_members',
  'expenses',
  'expense_participants',
  'payments',
  'activity_log',
  'group_invites',
  'user_balances',
  'user_balances_between_users',
  'session',
];

// Functions to handle the migration process

// Create tables in target database
async function createTables(): Promise<void> {
  console.log('📊 Creating tables in Supabase...');
  
  const client = await targetPool.connect();
  try {
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Groups table
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Group members table
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT DEFAULT 'member' NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        paid_by INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        total_amount NUMERIC NOT NULL,
        notes TEXT,
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Expense participants table
      CREATE TABLE IF NOT EXISTS expense_participants (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER NOT NULL REFERENCES expenses(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount_owed NUMERIC NOT NULL
      );

      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        paid_by INTEGER NOT NULL REFERENCES users(id),
        paid_to INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC NOT NULL,
        note TEXT,
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Activity log table
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        action_type TEXT NOT NULL,
        expense_id INTEGER REFERENCES expenses(id),
        payment_id INTEGER REFERENCES payments(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- Group invites table
      CREATE TABLE IF NOT EXISTS group_invites (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        invited_by INTEGER NOT NULL REFERENCES users(id),
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days') NOT NULL
      );

      -- User balances cache table
      CREATE TABLE IF NOT EXISTS user_balances (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        balance NUMERIC DEFAULT 0 NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(group_id, user_id)
      );

      -- User-to-user balances cache table
      CREATE TABLE IF NOT EXISTS user_balances_between_users (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        other_user_id INTEGER NOT NULL REFERENCES users(id),
        balance NUMERIC DEFAULT 0 NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(group_id, user_id, other_user_id)
      );

      -- Session table for authentication
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      );
    `);
    
    console.log('✅ Tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Migrate data for a single table
async function migrateTable(tableName: string): Promise<void> {
  console.log(`📋 Migrating table: ${tableName}`);
  
  // Get table schema
  const schemaResult = await sourcePool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  
  if (schemaResult.rows.length === 0) {
    console.warn(`⚠️ Table ${tableName} not found in source database, skipping`);
    return;
  }
  
  // Get data from source
  const dataResult = await sourcePool.query(`SELECT * FROM ${tableName}`);
  const rowCount = dataResult.rows.length;
  console.log(`📊 Found ${rowCount} rows in ${tableName}`);
  
  if (rowCount === 0) {
    console.log(`ℹ️ No data to migrate for ${tableName}`);
    return;
  }
  
  // Prepare column names and disable constraints on target
  const columnNames = schemaResult.rows.map(row => row.column_name);
  const columnList = columnNames.join(', ');
  
  await targetPool.query('SET session_replication_role = replica');
  
  try {
    // Clear existing data
    await targetPool.query(`DELETE FROM ${tableName}`);
    
    // Reset sequence if applicable
    if (columnNames.includes('id')) {
      try {
        await targetPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 1, false)`);
      } catch (error) {
        console.warn(`⚠️ Could not reset sequence for ${tableName}`);
      }
    }
    
    // Insert data in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < rowCount; i += BATCH_SIZE) {
      const batch = dataResult.rows.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        const values = columnNames.map(col => row[col]);
        const placeholders = columnNames.map((_, idx) => `$${idx + 1}`).join(', ');
        
        try {
          await targetPool.query(
            `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
            values
          );
          successCount++;
        } catch (error: any) {
          failCount++;
          console.error(`❌ Error inserting row in ${tableName}:`, error.message);
        }
      }
      
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rowCount / BATCH_SIZE)} processed`);
    }
    
    console.log(`✅ Table ${tableName} migration complete: ${successCount} rows inserted, ${failCount} failures`);
  } finally {
    // Re-enable constraints
    await targetPool.query('SET session_replication_role = DEFAULT');
  }
}

// Update db.ts to use Supabase
async function updateDatabaseConfig(useSupabase: boolean): Promise<void> {
  console.log(`⚙️ Updating database configuration to use ${useSupabase ? 'Supabase' : 'Replit'}...`);
  
  const dbFilePath = path.join(process.cwd(), 'server', 'db.ts');
  let content = fs.readFileSync(dbFilePath, 'utf8');
  
  if (useSupabase) {
    // Change to use Supabase connection
    content = content.replace(
      /const connectionString = process\.env\.DATABASE_URL;/g,
      'const connectionString = process.env.SUPABASE_CONNECTION_STRING;'
    );
  } else {
    // Change back to Replit database
    content = content.replace(
      /const connectionString = process\.env\.SUPABASE_CONNECTION_STRING;/g,
      'const connectionString = process.env.DATABASE_URL;'
    );
  }
  
  fs.writeFileSync(dbFilePath, content, 'utf8');
  console.log('✅ Database configuration updated');
}

// Main migration function
async function migrateToSupabase(): Promise<void> {
  console.log('🚀 Starting migration to Supabase...');
  
  try {
    // Step 1: Create tables in Supabase
    await createTables();
    
    // Step 2: Migrate data for each table
    for (const table of tables) {
      await migrateTable(table);
    }
    
    // Step 3: Update application to use Supabase
    await updateDatabaseConfig(true);
    
    console.log('\n🎉 Migration to Supabase completed successfully!');
    console.log('🔹 The application is now configured to use Supabase for database operations');
    console.log('🔹 Please restart your application for the changes to take effect');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    
    // Revert to Replit database
    console.log('⚠️ Reverting to Replit database...');
    await updateDatabaseConfig(false);
    
    process.exit(1);
  } finally {
    // Close database connections
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run the migration
migrateToSupabase();