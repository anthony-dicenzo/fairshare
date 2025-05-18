// fix-database-connection.js
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('Fixing database connection to Supabase...');

try {
  // Read .env.local file
  const envPath = '.env.local';
  const envContent = readFileSync(envPath, 'utf8');
  console.log('Successfully read .env.local file');
  
  // Parse environment variables
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      // Remove quotes if present
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/^"|"$/g, '');
      }
      
      envVars[key] = value;
    }
  });
  
  // Check for required variables
  if (!envVars.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }
  if (!envVars.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is missing in .env.local');
  }
  if (!envVars.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is missing in .env.local');
  }
  
  // Mask credentials for logging
  const maskedDatabaseUrl = envVars.DATABASE_URL.replace(/:[^:@]*@/, ':****@');
  console.log('Database URL:', maskedDatabaseUrl);
  console.log('Supabase URL:', envVars.SUPABASE_URL);
  
  // Export the environment variables to a temporary shell script
  const exportScript = 'export-env.sh';
  const exportContent = Object.entries(envVars).map(([key, value]) => {
    return `export ${key}="${value}"`; 
  }).join('\n');
  
  writeFileSync(exportScript, exportContent);
  console.log('Created environment export script');
  
  // Make the script executable
  execSync(`chmod +x ${exportScript}`);
  
  // Export variables to the environment
  execSync(`. ./${exportScript}`);
  console.log('Exported environment variables');
  
  // Now run the database migration
  console.log('Running database migration...');
  execSync('node supabase-migration.js', { stdio: 'inherit' });
  
  console.log('Database connection fixed successfully!');
  console.log('Now restart your application using the workflow interface');
  
} catch (error) {
  console.error('Error fixing database connection:', error.message);
  process.exit(1);
}