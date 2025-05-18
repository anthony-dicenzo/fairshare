const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/postgres-js');
const schema = require('./shared/schema');

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create pool and drizzle instance with SSL for Supabase
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool, { schema });

// Directly create the schema from our schema definitions
async function pushSchema() {
  try {
    console.log('Pushing schema to database...');
    
    // Create tables directly
    await db.execute(`
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
    `);

    console.log('Schema push completed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

pushSchema();