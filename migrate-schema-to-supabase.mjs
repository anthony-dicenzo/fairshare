// Script to migrate schema to Supabase
import pg from 'pg';
const { Pool } = pg;

// Supabase connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

async function migrateSchema() {
  console.log('Migrating schema to Supabase...');
  
  try {
    console.log(`Using connection string starting with: ${connectionString.substring(0, 20)}...`);
    
    const pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false } // Required for Supabase connection
    });
    
    // Create all the necessary tables
    console.log('Creating database tables...');
    
    await pool.query(`
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
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        archived BOOLEAN DEFAULT FALSE NOT NULL
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
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- Group invites table
      CREATE TABLE IF NOT EXISTS group_invites (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        invited_by INTEGER NOT NULL REFERENCES users(id),
        invite_code TEXT NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- User balances table (for caching)
      CREATE TABLE IF NOT EXISTS user_balances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        group_id INTEGER NOT NULL REFERENCES groups(id),
        balance_amount TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (user_id, group_id)
      );
      
      -- User to user balances table (for caching between users)
      CREATE TABLE IF NOT EXISTS user_balances_between_users (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        balance_amount TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (group_id, from_user_id, to_user_id)
      );
      
      -- Session table for express-session
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await pool.query(`
      -- Indexes for user_balances
      CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances (user_id);
      CREATE INDEX IF NOT EXISTS idx_user_balances_group_id ON user_balances (group_id);
      
      -- Indexes for user_balances_between_users
      CREATE INDEX IF NOT EXISTS idx_user_balances_between_users_group_id ON user_balances_between_users (group_id);
      CREATE INDEX IF NOT EXISTS idx_user_balances_between_users_from_user_id ON user_balances_between_users (from_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_balances_between_users_to_user_id ON user_balances_between_users (to_user_id);
      
      -- Indexes for expenses
      CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses (group_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses (paid_by);
      
      -- Indexes for expense_participants
      CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants (expense_id);
      CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id ON expense_participants (user_id);
      
      -- Indexes for group_members
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
      CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
      
      -- Indexes for session
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    
    console.log('Schema migration completed successfully!');
    
    // Close the connection
    await pool.end();
  } catch (error) {
    console.error('Schema migration failed:', error);
  }
}

// Run the migration
migrateSchema();