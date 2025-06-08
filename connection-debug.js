// Debug script to test database connection and authentication
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Clear console for better readability
console.clear();
console.log('============================================');
console.log('DATABASE CONNECTION & AUTHENTICATION TESTER');
console.log('============================================\n');

// Test each environment file separately to find the issue
async function testEnvironmentFiles() {
  console.log('TESTING ENVIRONMENT FILES:');
  console.log('--------------------------');
  
  const envFiles = ['.env', '.env.database', '.env.local', '.env.secrets', '.env.temp'];
  
  for (const file of envFiles) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        console.log(`\n${file} exists: ✅`);
        
        // Look for database connection string without exposing credentials
        const hasDBUrl = content.includes('DATABASE_URL');
        console.log(`${file} contains DATABASE_URL: ${hasDBUrl ? '✅' : '❌'}`);
        
        // If it has the database URL, test loading it
        if (hasDBUrl) {
          // Clear previous env variables
          delete process.env.DATABASE_URL;
          
          // Load only this env file
          dotenv.config({ path: file, override: true });
          
          // Check if it loaded correctly
          if (process.env.DATABASE_URL) {
            const urlParts = process.env.DATABASE_URL.split('@');
            if (urlParts.length > 1) {
              console.log(`${file} DATABASE_URL host: ${urlParts[1].split('/')[0]}`);
            }
          }
        }
      } else {
        console.log(`\n${file} does not exist ❌`);
      }
    } catch (error) {
      console.error(`Error checking ${file}:`, error.message);
    }
  }
}

// Test database connection with each available database URL
async function testDatabaseConnections() {
  console.log('\nTESTING DATABASE CONNECTIONS:');
  console.log('-----------------------------');
  
  // Get connection string from environment variables only
  const supabaseConnectionString = process.env.DATABASE_URL;
  
  // Connection strings to test
  const connectionStrings = [
    { name: 'Environment DATABASE_URL', url: process.env.DATABASE_URL },
    { name: 'Direct Supabase connection', url: supabaseConnectionString }
  ];
  
  for (const conn of connectionStrings) {
    if (!conn.url) {
      console.log(`\n${conn.name}: Not available ❌`);
      continue;
    }
    
    console.log(`\n${conn.name}:`);
    console.log(`URL begins with: ${conn.url.substring(0, 20)}...`);
    
    // Test the connection
    const pool = new Pool({
      connectionString: conn.url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000 // 10 second timeout
    });
    
    try {
      console.log('Attempting to connect...');
      const result = await pool.query('SELECT NOW() as time');
      console.log('✅ Connection successful!');
      console.log(`Server time: ${result.rows[0].time}`);
      
      // Test creating a test user
      console.log('\nTesting user creation and authentication:');
      try {
        // Check if test user exists
        const userCheck = await pool.query("SELECT * FROM users WHERE username = 'testuser2'");
        
        if (userCheck.rows.length > 0) {
          console.log('✅ Test user already exists');
        } else {
          // Create a test user
          await pool.query(`
            INSERT INTO users (username, password, name, email, created_at)
            VALUES ('testuser2', '$2b$10$5v8xL8CiO.38OYnGz7prSeQeN.jzHUWVP.4/dYS0o42SMy8Eqg6lG', 'Test User 2', 'test2@example.com', NOW())
          `);
          console.log('✅ Created test user');
        }
        
        // Verify user authentication
        const authCheck = await pool.query("SELECT * FROM users WHERE username = 'testuser2'");
        if (authCheck.rows.length > 0) {
          console.log('✅ Test user authentication successful');
          console.log(`User ID: ${authCheck.rows[0].id}`);
          console.log(`Username: ${authCheck.rows[0].username}`);
          console.log(`Name: ${authCheck.rows[0].name}`);
        }
      } catch (error) {
        console.error('❌ Error with user operations:', error.message);
      }
      
      // Check unique constraints on balance tables
      try {
        console.log('\nChecking unique constraints on balance tables:');
        const constraints = await pool.query(`
          SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
                 string_agg(ccu.column_name, ', ') as columns
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
              ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name IN ('user_balances', 'user_balances_between_users')
                AND tc.constraint_type = 'UNIQUE'
          GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
        `);
        
        if (constraints.rows.length > 0) {
          console.log('✅ Unique constraints found:');
          constraints.rows.forEach(c => {
            console.log(`- ${c.table_name}: ${c.constraint_name} (${c.columns})`);
          });
        } else {
          console.log('❌ No unique constraints found on balance tables');
          console.log('Adding unique constraints...');
          
          try {
            await pool.query(`
              ALTER TABLE user_balances 
              ADD CONSTRAINT IF NOT EXISTS user_balances_user_id_group_id_key 
              UNIQUE (user_id, group_id)
            `);
            console.log('✅ Added constraint to user_balances');
          } catch (error) {
            console.log('❌ Error adding constraint to user_balances:', error.message);
          }
          
          try {
            await pool.query(`
              ALTER TABLE user_balances_between_users 
              ADD CONSTRAINT IF NOT EXISTS user_balances_between_users_group_id_from_user_id_to_user_id_key 
              UNIQUE (group_id, from_user_id, to_user_id)
            `);
            console.log('✅ Added constraint to user_balances_between_users');
          } catch (error) {
            console.log('❌ Error adding constraint to user_balances_between_users:', error.message);
          }
        }
      } catch (error) {
        console.error('❌ Error checking constraints:', error.message);
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
}

// Consolidate environment files to create one reliable .env file
async function consolidateEnvFiles() {
  console.log('\nCONSOLIDATING ENVIRONMENT FILES:');
  console.log('--------------------------------');
  
  try {
    // Create a new consolidated .env file
    const newEnvContent = `# Consolidated environment file for Supabase connection
# Created: ${new Date().toISOString()}

# Supabase API URL and key
SUPABASE_URL=https://smrsiolztcggakkgtyab.supabase.co
SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY || 'NOT_SET'}

# Direct database connection string for Supabase
DATABASE_URL=\${DATABASE_URL}

# Disable the old Neon database connection
# NEON_DATABASE_URL=postgresql://neondb_owner:npg_leBjyQx9G5tb@ep-black-sunset-a4pj1sbl.us-east-1.aws.neon.tech/neondb?sslmode=require
`;

    // Make a backup of the current .env file if it exists
    if (fs.existsSync('.env')) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      fs.copyFileSync('.env', `.env.backup.${timestamp}`);
      console.log('✅ Created backup of current .env file');
    }
    
    // Write the new consolidated .env file
    fs.writeFileSync('.env', newEnvContent);
    console.log('✅ Created consolidated .env file');
    
    // Create a .env.local that mirrors the main .env
    fs.writeFileSync('.env.local', newEnvContent);
    console.log('✅ Updated .env.local file');
    
    // Update .env.database with just the DATABASE_URL
    fs.writeFileSync('.env.database', 'DATABASE_URL=postgresql://postgres:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres\n');
    console.log('✅ Updated .env.database file');
    
  } catch (error) {
    console.error('❌ Error consolidating environment files:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testEnvironmentFiles();
    await testDatabaseConnections();
    await consolidateEnvFiles();
    
    console.log('\n============================================');
    console.log('TESTING COMPLETE');
    console.log('============================================');
    console.log('Next steps:');
    console.log('1. Restart the application');
    console.log('2. Try logging in again');
    console.log('3. Check if the balance discrepancy is fixed');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runAllTests();