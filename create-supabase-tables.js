import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for Supabase connection string
if (!process.env.SUPABASE_CONNECTION_STRING) {
  console.error('SUPABASE_CONNECTION_STRING environment variable is missing');
  console.error('Please ensure it is properly set in your .env file');
  process.exit(1);
}

// Target database (Supabase PostgreSQL)
const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

// Main function to create tables
async function createTables() {
  const client = await pool.connect();
  console.log('🚀 Starting table creation in Supabase...');
  
  try {
    // Check database connection
    console.log('🔍 Checking database connection...');
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Create tables
    console.log('📊 Creating tables...');
    
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Groups table
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Group members table
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT DEFAULT 'member' NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        paid_by INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        total_amount NUMERIC NOT NULL,
        notes TEXT,
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Expense participants table
      CREATE TABLE IF NOT EXISTS expense_participants (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER NOT NULL REFERENCES expenses(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount_owed NUMERIC NOT NULL
      );

      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        paid_by INTEGER NOT NULL REFERENCES users(id),
        paid_to INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC NOT NULL,
        note TEXT,
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Activity log table
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        action_type TEXT NOT NULL,
        expense_id INTEGER REFERENCES expenses(id),
        payment_id INTEGER REFERENCES payments(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- Group invites table
      CREATE TABLE IF NOT EXISTS group_invites (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        invited_by INTEGER NOT NULL REFERENCES users(id),
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days') NOT NULL
      );

      -- User balances cache table
      CREATE TABLE IF NOT EXISTS user_balances (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        balance NUMERIC DEFAULT 0 NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(group_id, user_id)
      );

      -- User-to-user balances cache table
      CREATE TABLE IF NOT EXISTS user_balances_between_users (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        other_user_id INTEGER NOT NULL REFERENCES users(id),
        balance NUMERIC DEFAULT 0 NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(group_id, user_id, other_user_id)
      );

      -- Session table for authentication
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      );
    `);
    
    console.log('✅ Tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
createTables();