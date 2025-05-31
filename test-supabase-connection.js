// Test Supabase Connection Script
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.secrets' });

async function testConnection() {
  console.log('Testing Supabase database connection...');
  
  // Get connection string from environment variables
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable not found!');
    console.log('Please make sure DATABASE_URL is set in your .env or .env.secrets file.');
    return;
  }
  
  console.log(`Connection string begins with: ${connectionString.substring(0, 30)}...`);
  
  // Create a PostgreSQL pool
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10 seconds timeout
  });
  
  try {
    // Test the connection
    console.log('Attempting to connect...');
    const result = await pool.query('SELECT NOW() as time');
    console.log('✅ Connection successful!');
    console.log(`Server time: ${result.rows[0].time}`);
    
    // Check the database tables
    console.log('\nChecking database tables...');
    const tables = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tables.rows.forEach(table => {
      console.log(`- ${table.table_name} (${table.column_count} columns)`);
    });
    
    // Check unique constraints
    console.log('\nChecking unique constraints on user_balances and user_balances_between_users tables...');
    const uniqueConstraints = await pool.query(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, 
             string_agg(ccu.column_name, ', ') AS columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name IN ('user_balances', 'user_balances_between_users') 
            AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
    `);
    
    if (uniqueConstraints.rows.length === 0) {
      console.log('⚠️ No unique constraints found on these tables.');
      console.log('This may be causing the ON CONFLICT error in your application.');
      
      // Check if we need to add unique constraints
      console.log('\nRecommended action: Add unique constraints to fix ON CONFLICT errors.');
      console.log('For user_balances: A unique constraint on (user_id, group_id)');
      console.log('For user_balances_between_users: A unique constraint on (group_id, from_user_id, to_user_id)');
    } else {
      console.log('Unique constraints:');
      uniqueConstraints.rows.forEach(constraint => {
        console.log(`- ${constraint.table_name}: ${constraint.constraint_name} (${constraint.columns})`);
      });
    }
    
    // Check overall balance calculation issue
    console.log('\nInvestigating balance discrepancy...');
    const balances = await pool.query(`
      SELECT ub.user_id, ub.group_id, ub.balance_amount, g.name as group_name
      FROM user_balances ub
      JOIN groups g ON ub.group_id = g.id
      WHERE ub.user_id = 1  -- Assuming user_id 1 is the one with the discrepancy
    `);
    
    console.log('User balances:');
    let totalBalance = 0;
    balances.rows.forEach(balance => {
      console.log(`- Group ${balance.group_id} (${balance.group_name}): $${balance.balance_amount}`);
      totalBalance += parseFloat(balance.balance_amount);
    });
    
    console.log(`\nTotal calculated balance: $${totalBalance.toFixed(2)}`);
    console.log('Compare this with what you see in the UI to verify the discrepancy');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.error('\nDetails:');
    console.error(`- Error code: ${error.code}`);
    console.error(`- Error message: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\nThe database host could not be found. Suggestions:');
      console.log('1. Check if the hostname in DATABASE_URL is correct');
      console.log('2. Verify your internet connection');
      console.log('3. Make sure the Supabase project is active and accessible');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\nConnection was actively refused. Suggestions:');
      console.log('1. Verify the port number in DATABASE_URL is correct');
      console.log('2. Check if the database server is running');
      console.log('3. Ensure your IP is allowed in Supabase\'s access controls');
    } else if (error.code === 'CONNECT_TIMEOUT') {
      console.log('\nConnection timed out. Suggestions:');
      console.log('1. Check if the database server is accessible from your network');
      console.log('2. Verify the connection string format is correct');
      console.log('3. The server might be under high load or unresponsive');
    }
  } finally {
    // Close the pool
    await pool.end();
    console.log('\nConnection pool closed.');
  }
}

// Run the test
testConnection().catch(console.error);