import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to revert to Replit database
async function revertToReplitDB(): Promise<void> {
  console.log('🔄 Reverting to Replit database...');
  
  const dbFilePath = path.join(process.cwd(), 'server', 'db.ts');
  
  try {
    // Read the current database configuration
    let content = fs.readFileSync(dbFilePath, 'utf8');
    
    // Check if we need to revert
    if (content.includes('SUPABASE_CONNECTION_STRING')) {
      // Update to use Replit database
      content = content.replace(
        /const connectionString = process\.env\.SUPABASE_CONNECTION_STRING;/g,
        'const connectionString = process.env.DATABASE_URL;'
      );
      
      // Write the updated configuration
      fs.writeFileSync(dbFilePath, content, 'utf8');
      
      console.log('✅ Successfully reverted to Replit database');
      console.log('🔹 Please restart your application for the changes to take effect');
    } else {
      console.log('ℹ️ No changes needed, already using Replit database');
    }
  } catch (error) {
    console.error('❌ Error reverting to Replit database:', error);
    process.exit(1);
  }
}

// Run the revert
revertToReplitDB();