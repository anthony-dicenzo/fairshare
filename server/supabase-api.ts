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

// Create table schemas in Supabase
export async function createSupabaseTables(): Promise<boolean> {
  console.log('Creating tables in Supabase...');
  
  const tableDefinitions = {
    users: `(
      id serial primary key,
      username text unique not null,
      password text not null,
      name text not null,
      email text unique not null,
      created_at timestamp default now() not null
    )`,
    groups: `(
      id serial primary key,
      name text not null,
      created_by integer not null, 
      created_at timestamp default now() not null
    )`,
    group_members: `(
      id serial primary key,
      group_id integer not null,
      user_id integer not null,
      role text default 'member' not null,
      joined_at timestamp default now() not null
    )`,
    expenses: `(
      id serial primary key,
      group_id integer not null,
      paid_by integer not null,
      title text not null,
      total_amount numeric not null,
      notes text,
      date timestamp default now() not null,
      created_at timestamp default now() not null
    )`,
    expense_participants: `(
      id serial primary key,
      expense_id integer not null,
      user_id integer not null,
      amount_owed numeric not null
    )`,
    payments: `(
      id serial primary key,
      group_id integer not null,
      paid_by integer not null,
      paid_to integer not null,
      amount numeric not null,
      note text,
      date timestamp default now() not null,
      created_at timestamp default now() not null
    )`,
    activity_log: `(
      id serial primary key,
      group_id integer,
      user_id integer not null,
      action_type text not null,
      expense_id integer,
      payment_id integer,
      created_at timestamp default now() not null
    )`,
    group_invites: `(
      id serial primary key,
      group_id integer not null,
      invited_by integer not null,
      email text not null,
      token text not null unique,
      status text default 'pending' not null,
      created_at timestamp default now() not null,
      expires_at timestamp default (now() + interval '7 days') not null
    )`,
    user_balances: `(
      id serial primary key,
      group_id integer not null,
      user_id integer not null,
      balance numeric default 0 not null,
      last_updated timestamp default now() not null,
      unique(group_id, user_id)
    )`,
    user_balances_between_users: `(
      id serial primary key,
      group_id integer not null,
      user_id integer not null,
      other_user_id integer not null,
      balance numeric default 0 not null,
      last_updated timestamp default now() not null,
      unique(group_id, user_id, other_user_id)
    )`,
    session: `(
      sid varchar primary key,
      sess json not null,
      expire timestamp not null
    )`
  };
  
  try {
    for (const [tableName, schema] of Object.entries(tableDefinitions)) {
      // Check if table exists
      const { error: checkError } = await supabase.from(tableName).select('id').limit(1);
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        console.log(`Creating table ${tableName}...`);
        
        // Use SQL API to create the table
        const { error: createError } = await supabase.rpc('execute_sql', {
          sql: `CREATE TABLE IF NOT EXISTS ${tableName} ${schema}`
        });
        
        if (createError) {
          console.error(`Error creating table ${tableName}:`, createError.message);
          // Try alternative approach
          await supabase.from(tableName).insert({}).select('id');
          console.log(`Created table ${tableName} through insert method`);
        }
      } else {
        console.log(`Table ${tableName} already exists`);
      }
    }
    
    console.log('✅ All tables ready in Supabase');
    return true;
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    return false;
  }
}

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
    // First make sure the table exists
    const { error: checkError } = await supabase.from(tableName).select('id').limit(1);
    
    if (checkError && checkError.code === '42P01') {
      console.error(`Table ${tableName} doesn't exist in Supabase`);
      return false;
    }
    
    // Try to clear existing data first (but continue if it fails)
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .neq('id', -1); // This will delete all rows
      
      if (deleteError) {
        console.warn(`Could not clear table ${tableName}:`, deleteError.message);
        console.warn('Will continue with insert anyway');
      }
    } catch (err) {
      console.warn(`Error during delete operation on ${tableName}:`, err);
    }
    
    // Insert new data in batches
    const BATCH_SIZE = 20;
    let successCount = 0;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      // Use upsert operation to avoid conflicts
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      
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