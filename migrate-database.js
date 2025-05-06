import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Convert exec to promise-based
const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

// Check for required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_CONNECTION_STRING',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

// Function to validate environment variables
async function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const missing = [];
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please ensure these variables are set in your .env file');
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

// Function to switch database configuration
async function updateDatabaseConfig(useSupabase) {
  const dbFilePath = './server/db.ts';
  
  try {
    // Read the db.ts file
    const content = await fs.readFile(dbFilePath, 'utf8');
    
    let updatedContent;
    if (useSupabase) {
      // Switch to Supabase
      updatedContent = content.replace(
        /const connectionString = process\.env\.DATABASE_URL;/,
        'const connectionString = process.env.SUPABASE_CONNECTION_STRING;'
      );
    } else {
      // Switch back to Replit DB
      updatedContent = content.replace(
        /const connectionString = process\.env\.SUPABASE_CONNECTION_STRING;/,
        'const connectionString = process.env.DATABASE_URL;'
      );
    }
    
    // Write updated content
    await fs.writeFile(dbFilePath, updatedContent, 'utf8');
    
    const dbType = useSupabase ? 'Supabase' : 'Replit';
    console.log(`✅ Updated db.ts to use ${dbType} database`);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating database configuration:', error);
    return false;
  }
}

// Function to run a script with node
async function runScript(scriptPath) {
  try {
    console.log(`🚀 Running ${scriptPath}...`);
    const { stdout, stderr } = await execPromise(`node ${scriptPath}`);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    return true;
  } catch (error) {
    console.error(`❌ Error running ${scriptPath}:`, error.message);
    return false;
  }
}

// Main migration function
async function migrateDatabase() {
  console.log('🚀 Starting database migration process...');
  
  // Validate environment
  if (!await validateEnvironment()) {
    process.exit(1);
  }
  
  try {
    // 1. Create tables in Supabase
    console.log('📊 Step 1: Creating tables in Supabase...');
    if (!await runScript('./create-supabase-tables.js')) {
      throw new Error('Failed to create tables in Supabase');
    }
    
    // 2. Migrate data from Replit to Supabase
    console.log('📋 Step 2: Migrating data to Supabase...');
    if (!await runScript('./migrate-to-supabase.js')) {
      throw new Error('Failed to migrate data to Supabase');
    }
    
    // 3. Update database configuration to use Supabase
    console.log('⚙️ Step 3: Updating application to use Supabase database...');
    if (!await updateDatabaseConfig(true)) {
      throw new Error('Failed to update database configuration');
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n🔹 The application is now configured to use Supabase for both API and database operations.');
    console.log('🔹 To revert to Replit database, run: node revert-migration.js');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n⚠️ Reverting to Replit database configuration...');
    await updateDatabaseConfig(false);
    console.log('✅ Reverted to Replit database configuration');
    process.exit(1);
  }
}

// Run the migration
migrateDatabase();