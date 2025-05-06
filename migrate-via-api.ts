import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to run a script
function runScript(scriptPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`🚀 Running ${scriptPath}...`);
    
    const process = spawn('npx', ['tsx', scriptPath], { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scriptPath} completed successfully`);
        resolve(true);
      } else {
        console.error(`❌ ${scriptPath} failed with code ${code}`);
        resolve(false);
      }
    });
    
    process.on('error', (err) => {
      console.error(`❌ Error running ${scriptPath}:`, err);
      resolve(false);
    });
  });
}

// Function to update db.ts to use Supabase
async function updateDbConfiguration(): Promise<boolean> {
  console.log('⚙️ Updating database configuration to use Supabase...');
  
  const dbFilePath = path.join(process.cwd(), 'server', 'db.ts');
  
  try {
    // Read current content
    let content = fs.readFileSync(dbFilePath, 'utf8');
    
    // Check if already configured for Supabase
    if (content.includes('process.env.SUPABASE_CONNECTION_STRING')) {
      console.log('✅ Already configured to use Supabase');
      return true;
    }
    
    // Update to use Supabase
    content = content.replace(
      /const connectionString = process\.env\.DATABASE_URL;/g,
      'const connectionString = process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL;'
    );
    
    // Add a note about the change
    content = content.replace(
      /console\.log\('✅ Database connection successful'\);/,
      "console.log('✅ Database connection successful');\nconsole.log('🔌 Using Supabase for database operations');"
    );
    
    // Write updated content
    fs.writeFileSync(dbFilePath, content, 'utf8');
    
    console.log('✅ Database configuration updated to use Supabase');
    return true;
  } catch (error) {
    console.error('❌ Error updating database configuration:', error);
    return false;
  }
}

// Main function to orchestrate the migration
async function migrateToSupabaseViaAPI(): Promise<void> {
  console.log('🚀 Starting complete migration to Supabase via API...');
  console.log('This process will:');
  console.log('1. Create tables in Supabase');
  console.log('2. Migrate data from Replit to Supabase');
  console.log('3. Update application to use Supabase');
  console.log('');
  
  try {
    // Step 1: Create tables in Supabase
    console.log('\n📊 Step 1: Creating tables in Supabase...');
    const tablesCreated = await runScript('./create-supabase-tables-api.ts');
    
    if (!tablesCreated) {
      throw new Error('Failed to create tables in Supabase');
    }
    
    // Step 2: Migrate data to Supabase
    console.log('\n📋 Step 2: Migrating data to Supabase...');
    const dataMigrated = await runScript('./api-migrate-to-supabase.ts');
    
    if (!dataMigrated) {
      throw new Error('Failed to migrate data to Supabase');
    }
    
    // Step 3: Update application to use Supabase
    console.log('\n⚙️ Step 3: Updating application configuration...');
    const configUpdated = await updateDbConfiguration();
    
    if (!configUpdated) {
      throw new Error('Failed to update application configuration');
    }
    
    console.log('\n🎉 Migration to Supabase completed successfully!');
    console.log('Your application is now set up to use Supabase exclusively.');
    console.log('Please restart your application for the changes to take effect.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n⚠️ To restore the original configuration, run: ./supabase-tools.sh revert');
    process.exit(1);
  }
}

// Run the migration
migrateToSupabaseViaAPI();