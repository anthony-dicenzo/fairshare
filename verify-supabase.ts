import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseConnection = process.env.SUPABASE_CONNECTION_STRING;

// Verify API credentials
async function verifySupabaseAPI() {
  console.log('🔍 Verifying Supabase API credentials...');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase API credentials are missing');
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simple API health check
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase API test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase API credentials are valid');
    return true;
  } catch (error) {
    console.error('❌ Supabase API test failed:', error);
    return false;
  }
}

// Verify database connection
async function verifySupabaseDB() {
  console.log('🔍 Verifying Supabase database connection...');
  
  if (!supabaseConnection) {
    console.error('❌ Supabase connection string is missing');
    console.error('Please set SUPABASE_CONNECTION_STRING in your .env file');
    return false;
  }
  
  const pool = new Pool({
    connectionString: supabaseConnection,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Simple connection test
    const result = await pool.query('SELECT 1 as test');
    
    if (result.rows[0].test === 1) {
      console.log('✅ Supabase database connection is working');
      return true;
    } else {
      console.error('❌ Supabase database connection test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase database connection test failed:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Main verification function
async function verifySupabase() {
  console.log('🚀 Verifying Supabase setup...');
  
  const apiSuccess = await verifySupabaseAPI();
  const dbSuccess = await verifySupabaseDB();
  
  if (apiSuccess && dbSuccess) {
    console.log('\n🎉 All Supabase connections are working properly!');
    return true;
  } else {
    console.error('\n❌ Some Supabase connections are not working properly:');
    console.error(`  API: ${apiSuccess ? '✅ Working' : '❌ Not working'}`);
    console.error(`  Database: ${dbSuccess ? '✅ Working' : '❌ Not working'}`);
    
    console.log('\n📋 Common issues and solutions:');
    
    if (!apiSuccess) {
      console.log('- Make sure your Supabase project is active');
      console.log('- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct');
      console.log('- Check if your Supabase project has any Table Row Security (RLS) policies that might be blocking access');
    }
    
    if (!dbSuccess) {
      console.log('- Verify your SUPABASE_CONNECTION_STRING is correct');
      console.log('- Ensure your IP address is allowed in Supabase database settings');
      console.log('- Check if Replit allows outbound connections to your Supabase database port');
    }
    
    return false;
  }
}

// Run the verification
verifySupabase();