// Test alternative Supabase connection formats
import pg from 'pg';
const { Pool } = pg;

// Log header
console.log('============================================');
console.log('TESTING ALTERNATIVE SUPABASE CONNECTIONS');
console.log('============================================\n');

// Connection string variations to try
const connectionStrings = [
  // Standard format
  {
    name: 'Standard connection string',
    url: 'postgresql://postgres:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
  },
  // Direct connection without pooler prefix
  {
    name: 'Direct connection without pooler',
    url: 'postgresql://postgres:WCRjkMkrg7vDYahc@db.smrsiolztcggakkgtyab.supabase.co:5432/postgres'
  },
  // Connection with sslmode parameter
  {
    name: 'With sslmode parameter',
    url: 'postgresql://postgres:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?sslmode=require'
  },
  // Connection with direct project reference
  {
    name: 'Direct project reference',
    url: 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
  }
];

// Test each connection string
async function testConnections() {
  for (const conn of connectionStrings) {
    console.log(`\nTesting: ${conn.name}`);
    console.log(`URL: ${conn.url}`);
    
    const pool = new Pool({ 
      connectionString: conn.url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    
    try {
      console.log('Attempting to connect...');
      const result = await pool.query('SELECT NOW() as time');
      console.log('✅ CONNECTION SUCCESSFUL!');
      console.log(`Server time: ${result.rows[0].time}`);
      
      // Try a simple user query
      try {
        const userResult = await pool.query('SELECT COUNT(*) FROM users');
        console.log(`User count: ${userResult.rows[0].count}`);
      } catch (error) {
        console.error('Error querying users:', error.message);
      }
      
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      if (error.code) {
        console.error(`Error code: ${error.code}`);
      }
    } finally {
      await pool.end();
    }
  }
  
  console.log('\n============================================');
  console.log('TESTING COMPLETE');
  console.log('============================================');
}

// Run the tests
testConnections();