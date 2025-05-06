import { promisify } from 'util';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to switch database configuration back to Replit
async function revertToReplitDatabase() {
  console.log('🔄 Reverting to Replit database configuration...');
  
  const dbFilePath = './server/db.ts';
  
  try {
    // Read the db.ts file
    const content = await fs.readFile(dbFilePath, 'utf8');
    
    // Switch back to Replit DB
    let updatedContent = content;
    
    // Replace any Supabase connection string with DATABASE_URL
    if (content.includes('SUPABASE_CONNECTION_STRING')) {
      updatedContent = content.replace(
        /const connectionString = process\.env\.SUPABASE_CONNECTION_STRING;/g,
        'const connectionString = process.env.DATABASE_URL;'
      );
    }
    
    // Write updated content
    await fs.writeFile(dbFilePath, updatedContent, 'utf8');
    
    console.log('✅ Successfully reverted to Replit database configuration');
    console.log('🔹 Please restart your application for changes to take effect');
    
    return true;
  } catch (error) {
    console.error('❌ Error reverting database configuration:', error);
    return false;
  }
}

// Run the reversion
revertToReplitDatabase();