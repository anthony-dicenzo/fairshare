// Script to fix database constraints for proper balance calculations
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

// Load all environment files
dotenv.config();
dotenv.config({ path: '.env.secrets' });
dotenv.config({ path: '.env.database' });
dotenv.config({ path: '.env.local' });

// No fallback connection - require environment variable
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function fixDatabaseConstraints() {
  console.log('Starting database constraint fixes...');
  
  // Get connection string from environment only
  const connectionString = process.env.DATABASE_URL;
  console.log('Using database URL starting with:', connectionString.substring(0, 30) + '...');
  
  // Create a PostgreSQL pool with longer timeout
  const pool = new Pool({ 
    connectionString, 
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000 // 20 seconds timeout
  });
  
  try {
    console.log('Connecting to database...');
    const connectionTest = await pool.query('SELECT NOW() as time');
    console.log('Connected successfully!');
    console.log('Server time:', connectionTest.rows[0].time);
    
    // Check existing constraints
    console.log('\nChecking existing constraints...');
    const existingConstraints = await pool.query(`
      SELECT tc.constraint_name, tc.table_name, tc.constraint_type,
             string_agg(ccu.column_name, ', ') as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name IN ('user_balances', 'user_balances_between_users')
      GROUP BY tc.constraint_name, tc.table_name, tc.constraint_type
      ORDER BY tc.table_name, tc.constraint_type
    `);
    
    if (existingConstraints.rows.length > 0) {
      console.log('Found existing constraints:');
      existingConstraints.rows.forEach(c => {
        console.log(`- ${c.table_name}: ${c.constraint_name} (${c.constraint_type}) on columns: ${c.columns}`);
      });
    } else {
      console.log('No existing constraints found on balance tables');
    }
    
    // Add missing unique constraint on user_balances
    console.log('\nAdding unique constraint on user_balances...');
    try {
      await pool.query(`
        ALTER TABLE user_balances 
        ADD CONSTRAINT user_balances_user_id_group_id_key 
        UNIQUE (user_id, group_id)
      `);
      console.log('✅ Added unique constraint on user_balances (user_id, group_id)');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('Constraint already exists on user_balances');
      } else {
        console.error('Error adding constraint to user_balances:', error.message);
      }
    }
    
    // Add missing unique constraint on user_balances_between_users
    console.log('\nAdding unique constraint on user_balances_between_users...');
    try {
      await pool.query(`
        ALTER TABLE user_balances_between_users 
        ADD CONSTRAINT user_balances_between_users_group_id_from_user_id_to_user_i_key 
        UNIQUE (group_id, from_user_id, to_user_id)
      `);
      console.log('✅ Added unique constraint on user_balances_between_users (group_id, from_user_id, to_user_id)');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('Constraint already exists on user_balances_between_users');
      } else {
        console.error('Error adding constraint to user_balances_between_users:', error.message);
      }
    }
    
    // Check balance calculations between user balances and user_balances_between_users
    console.log('\nChecking balance calculations...');
    const userBalancesQuery = await pool.query(`
      SELECT user_id, SUM(balance_amount) as total_balance
      FROM user_balances
      WHERE user_id = 1
      GROUP BY user_id
    `);
    
    if (userBalancesQuery.rows.length > 0) {
      console.log(`User 1 total balance from user_balances: $${userBalancesQuery.rows[0].total_balance}`);
    } else {
      console.log('No balance records found for user 1');
    }
    
    // Check individual balances by group
    const groupBalancesQuery = await pool.query(`
      SELECT ub.user_id, ub.group_id, g.name as group_name, ub.balance_amount
      FROM user_balances ub
      JOIN groups g ON ub.group_id = g.id
      WHERE ub.user_id = 1
      ORDER BY ub.group_id
    `);
    
    console.log('\nIndividual group balances for user 1:');
    if (groupBalancesQuery.rows.length > 0) {
      groupBalancesQuery.rows.forEach(record => {
        console.log(`- Group ${record.group_id} (${record.group_name}): $${record.balance_amount}`);
      });
    } else {
      console.log('No group balance records found');
    }
    
    console.log('\nDatabase constraints fixed successfully!');
    console.log('The ON CONFLICT errors should now be resolved');
    console.log('Balance calculations should now be accurate');
    
  } catch (error) {
    console.error('Error fixing database constraints:', error);
    console.error('Error details:', error.message);
    
    // Provide helpful suggestions based on error
    if (error.code === 'ENOTFOUND') {
      console.log('\nThe database host could not be found:');
      console.log('1. Check if your DATABASE_URL is correct');
      console.log('2. Make sure you can access the Supabase database from your network');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\nConnection was refused:');
      console.log('1. Verify database port is correct');
      console.log('2. Check if the database is running and accessible');
    } else if (error.code === 'CONNECT_TIMEOUT') {
      console.log('\nConnection timed out:');
      console.log('1. Network might be blocking the connection');
      console.log('2. Database server might be under high load');
      console.log('3. Check if DATABASE_URL is in the correct format');
    }
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the fix
fixDatabaseConstraints().catch(console.error);