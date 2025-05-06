// Supabase environment variable setup
// This script ensures our application uses Supabase exclusively by
// setting the DATABASE_URL to the Supabase connection string

// Get Supabase connection string
const supabaseConnectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!supabaseConnectionString) {
  console.error('ERROR: SUPABASE_CONNECTION_STRING environment variable is not set.');
  console.error('Please set this variable to connect to your Supabase database.');
  process.exit(1);
}

// Set DATABASE_URL to the Supabase connection string
// This is needed because drizzle.config.ts uses DATABASE_URL
process.env.DATABASE_URL = supabaseConnectionString;

console.log('✅ Supabase configuration complete - using Supabase exclusively');