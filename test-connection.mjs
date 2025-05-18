// Simple script to test Supabase connection
import pg from 'pg';
const { Pool } = pg;

// Hardcoded connection string for testing
const connectionString = 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

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