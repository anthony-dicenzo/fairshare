// This script ensures that DATABASE_URL is set to the Supabase connection string
// Run this before any database operations

// Check if SUPABASE_CONNECTION_STRING is set
if (!process.env.SUPABASE_CONNECTION_STRING) {
  console.error('SUPABASE_CONNECTION_STRING environment variable is missing!');
  console.error('Please set this variable to your Supabase database connection string.');
  process.exit(1);
}

// Set DATABASE_URL to the Supabase connection string
process.env.DATABASE_URL = process.env.SUPABASE_CONNECTION_STRING;

console.log('Successfully set DATABASE_URL to use Supabase connection string.');