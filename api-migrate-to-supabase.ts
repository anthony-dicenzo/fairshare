import { Pool } from 'pg';
import dotenv from 'dotenv';
import { supabase, migrateTableViaAPI, testSupabaseConnection } from './server/supabase-api';

// Load environment variables
dotenv.config();

// Source database (Replit PostgreSQL)
const sourcePool = new Pool({
  connectionString: process.env.DATABASE_URL
});

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

// Function to get data from source database
async function getTableData(table: string): Promise<any[]> {
  try {
    const result = await sourcePool.query(`SELECT * FROM ${table}`);
    return result.rows;
  } catch (error) {
    console.error(`Error getting data from ${table}:`, error);
    return [];
  }
}

// Main migration function
async function migrateToSupabaseAPI(): Promise<void> {
  console.log('🚀 Starting migration to Supabase using the API...');
  
  try {
    // Test Supabase API connection
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Supabase API');
    }
    
    // Migrate each table
    for (const table of tables) {
      console.log(`\n📋 Processing table: ${table}`);
      
      // Get data from source
      const data = await getTableData(table);
      console.log(`📊 Found ${data.length} rows in ${table}`);
      
      // Migrate table via API
      const success = await migrateTableViaAPI(table, data);
      
      if (!success) {
        throw new Error(`Failed to migrate table: ${table}`);
      }
    }
    
    console.log('\n🎉 Migration to Supabase completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sourcePool.end();
  }
}

// Run the migration
migrateToSupabaseAPI();