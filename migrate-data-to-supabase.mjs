// Script to migrate data to Supabase
import pg from 'pg';
const { Pool } = pg;

// Supabase connection string
const targetConnectionString = process.env.DATABASE_URL || 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

// To migrate data, please provide your source database credentials
// We can only use the target database for now as we don't have source credentials
async function migrateData() {
  console.log('Starting data migration to Supabase...');
  
  try {
    console.log(`Connecting to target database...`);
    
    // Connect to the Supabase database
    const targetPool = new Pool({ 
      connectionString: targetConnectionString,
      ssl: { rejectUnauthorized: false } 
    });
    
    // Check connection by fetching users
    const userResult = await targetPool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userResult.rows[0].count);
    
    console.log(`Found ${userCount} users in the target database.`);
    
    if (userCount > 0) {
      console.log('Data might already exist in the target database.');
      console.log('To import data from your previous database, please provide the source database credentials.');
    } else {
      console.log('Target database is empty and ready for data import.');
      console.log('To continue, please provide your source database connection details.');
    }
    
    // Create a sample user for testing if the database is empty
    if (userCount === 0) {
      console.log('Creating a sample user for testing...');
      
      await targetPool.query(`
        INSERT INTO users (username, password, name, email, created_at)
        VALUES ('testuser', '$2b$10$5v8xL8CiO.38OYnGz7prSeQeN.jzHUWVP.4/dYS0o42SMy8Eqg6lG', 'Test User', 'test@example.com', NOW())
        ON CONFLICT (username) DO NOTHING;
      `);
      
      console.log('Sample user created successfully.');
    }
    
    // Close the connection
    await targetPool.end();
    
    console.log('Data migration preparation completed.');
    console.log('To migrate your actual data, please provide your source database connection details.');
  } catch (error) {
    console.error('Error during data migration:', error);
  }
}

// Run the migration
migrateData();