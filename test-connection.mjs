// Simple script to test Supabase connection
import pg from 'pg';
const { Pool } = pg;

// Get connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function testConnection() {
  console.log('Testing connection to Supabase database...');
  
  try {
    console.log(`Using connection string starting with: ${connectionString.substring(0, 20)}...`);
    
    const pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false } // Required for Supabase connection
    });
    
    // Test the connection with a simple query
    const result = await pool.query('SELECT NOW() as current_time');
    
    console.log('Connection successful!');
    console.log('Current time from database:', result.rows[0].current_time);
    
    // Close the connection
    await pool.end();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

// Run the test
testConnection();