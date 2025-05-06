import { execSync } from 'child_process';

// Ensure SUPABASE_CONNECTION_STRING is available (exclusively use Supabase)
if (!process.env.SUPABASE_CONNECTION_STRING) {
  console.error('SUPABASE_CONNECTION_STRING environment variable is not set');
  console.error('Please set the SUPABASE_CONNECTION_STRING environment variable');
  process.exit(1);
}

// For compatibility with drizzle.config.ts, set DATABASE_URL to SUPABASE_CONNECTION_STRING
process.env.DATABASE_URL = process.env.SUPABASE_CONNECTION_STRING;
console.log('Using Supabase connection for database operations...');

console.log('Pushing database schema to Supabase...');
try {
  // Execute drizzle-kit push with the --force flag to auto-accept prompts
  execSync('npx drizzle-kit push --force', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure DATABASE_URL is set to SUPABASE_CONNECTION_STRING for the child process
      DATABASE_URL: process.env.SUPABASE_CONNECTION_STRING
    }
  });
  console.log('Schema push to Supabase completed successfully!');
} catch (error) {
  console.error('Error pushing schema to Supabase:', error.message);
  process.exit(1);
}