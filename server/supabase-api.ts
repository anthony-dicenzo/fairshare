import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase API credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Verify credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase API credentials missing! Please check environment variables.');
  process.exit(1);
}

// Initialize Supabase client with service role for admin access
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Generic function to migrate a table using Supabase API
export async function migrateTableViaAPI<T extends Record<string, any>>(
  tableName: string,
  data: T[]
): Promise<boolean> {
  if (!data || data.length === 0) {
    console.log(`No data to migrate for table: ${tableName}`);
    return true;
  }
  
  console.log(`Migrating ${data.length} rows to ${tableName} via Supabase API...`);
  
  try {
    // Clear existing data first
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', -1); // This will delete all rows
    
    if (deleteError) {
      console.error(`Error clearing table ${tableName}:`, deleteError.message);
      return false;
    }
    
    // Insert new data in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch in ${tableName}:`, error.message);
        return false;
      }
      
      successCount += batch.length;
      console.log(`Inserted ${successCount}/${data.length} rows in ${tableName}`);
    }
    
    console.log(`✅ Successfully migrated ${tableName} via Supabase API`);
    return true;
  } catch (error) {
    console.error(`Error migrating ${tableName} via Supabase API:`, error);
    return false;
  }
}

// Function to test Supabase API connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase API test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase API connection successful');
    return true;
  } catch (error) {
    console.error('Supabase API test failed:', error);
    return false;
  }
}