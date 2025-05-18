// supabase-migration.js
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment from .env.local file directly
try {
  const envPath = join(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  
  // Parse environment variables
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      // Remove quotes if present
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/^"|"$/g, '');
      }
      
      process.env[key] = value;
    }
  });
  
  console.log('Successfully loaded environment from .env.local');
} catch (error) {
  console.warn('Could not load .env.local file:', error.message);
}

// Also load from dotenv as fallback
dotenv.config();

import postgres from 'postgres';
import { Pool } from 'pg';

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is missing');
  process.exit(1);
}

// Create a postgres client for Supabase
const connectionString = process.env.DATABASE_URL;

// Log connection info (without credentials)
console.log('Connecting to Supabase with pooler URL (credentials hidden)');
console.log(connectionString.replace(/:[^:@]*@/, ':****@'));

// Create connection instances
const sql = postgres(connectionString, { 
  max: 1,
  ssl: { rejectUnauthorized: false },
  idle_timeout: 20,
  connect_timeout: 10
});

// Also create a pg Pool for compatibility
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrateToSupabase() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`Connection successful, server time: ${result.rows[0].current_time}`);
    
    console.log('Creating database schema...');
    
    await pool.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
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
        archived BOOLEAN DEFAULT FALSE NOT NULL,
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
        email TEXT NOT NULL,
        invited_by INTEGER NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- User balances in group table
      CREATE TABLE IF NOT EXISTS user_balances_in_group (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        group_id INTEGER NOT NULL REFERENCES groups(id),
        balance_amount NUMERIC NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (user_id, group_id)
      );
      
      -- User balances between users table
      CREATE TABLE IF NOT EXISTS user_balances_between_users (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        balance_amount NUMERIC NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (group_id, from_user_id, to_user_id)
      );
      
      -- Session store table for connect-pg-simple
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    
    console.log('Schema creation completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    // Close connections
    await pool.end();
    await sql.end();
  }
}

migrateToSupabase().catch(console.error);