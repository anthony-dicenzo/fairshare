import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Check for Supabase connection string
if (!process.env.SUPABASE_CONNECTION_STRING) {
  console.error('SUPABASE_CONNECTION_STRING environment variable is missing');
  console.error('Please ensure it is properly set in your .env file');
  process.exit(1);
}

// Check for Supabase API credentials
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase API credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing');
  console.error('Please ensure they are properly set in your .env file');
  process.exit(1);
}

// Source database (Replit PostgreSQL)
const sourcePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Target database (Supabase PostgreSQL)
const targetPool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

// Supabase client for API operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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
  'user_balances_between_users'
];

// Helper function to execute SQL
async function executeSQL(pool, query, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

// Main migration function
async function migrateData() {
  console.log('🚀 Starting database migration to Supabase...');
  
  try {
    // Check source database connection
    console.log('🔍 Checking source database connection...');
    await executeSQL(sourcePool, 'SELECT 1');
    console.log('✅ Source database connection successful');
    
    // Check target database connection
    console.log('🔍 Checking target database connection...');
    await executeSQL(targetPool, 'SELECT 1');
    console.log('✅ Target database connection successful');
    
    // Disable foreign key checks on target
    await executeSQL(targetPool, 'SET session_replication_role = replica;');
    
    // Process each table
    for (const table of tables) {
      console.log(`📋 Processing table: ${table}`);
      
      // Get table schema from source
      const schemaResult = await executeSQL(
        sourcePool,
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position`,
        [table]
      );
      
      if (schemaResult.rows.length === 0) {
        console.warn(`⚠️ Table ${table} not found in source database, skipping`);
        continue;
      }
      
      // Create table in target if it doesn't exist
      console.log(`🔨 Ensuring table ${table} exists in target database...`);
      
      // Get data from source
      console.log(`📤 Exporting data from source table: ${table}`);
      const dataResult = await executeSQL(sourcePool, `SELECT * FROM ${table}`);
      const rowCount = dataResult.rows.length;
      console.log(`📊 Found ${rowCount} rows in ${table}`);
      
      if (rowCount > 0) {
        // Prepare column names
        const columnNames = schemaResult.rows.map(row => row.column_name);
        const columnList = columnNames.join(', ');
        
        // Clear existing data in target
        console.log(`🧹 Clearing existing data in target table: ${table}`);
        await executeSQL(targetPool, `DELETE FROM ${table}`);
        
        // Generate sequence reset for tables with id column
        if (columnNames.includes('id')) {
          try {
            await executeSQL(targetPool, `SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)`);
            console.log(`🔄 Reset sequence for ${table}`);
          } catch (error) {
            console.warn(`⚠️ Could not reset sequence for ${table}: ${error.message}`);
          }
        }
        
        // Insert data in batches
        const BATCH_SIZE = 100;
        console.log(`📥 Importing data to target table: ${table}`);
        
        for (let i = 0; i < rowCount; i += BATCH_SIZE) {
          const batch = dataResult.rows.slice(i, i + BATCH_SIZE);
          
          // Process each row in the batch
          for (const row of batch) {
            const values = columnNames.map(col => row[col]);
            const placeholders = columnNames.map((_, idx) => `$${idx + 1}`).join(', ');
            
            // Insert row
            try {
              await executeSQL(
                targetPool,
                `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`,
                values
              );
            } catch (error) {
              console.error(`❌ Error inserting row in ${table}:`, error.message);
              console.error('Row data:', row);
            }
          }
          
          console.log(`✅ Imported batch ${i / BATCH_SIZE + 1}/${Math.ceil(rowCount / BATCH_SIZE)} for ${table}`);
        }
      }
      
      console.log(`✅ Table ${table} migration complete`);
    }
    
    // Enable foreign key checks
    await executeSQL(targetPool, 'SET session_replication_role = DEFAULT;');
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run the migration
migrateData();