// Script to migrate data from Neon to Supabase
import pg from 'pg';
const { Pool } = pg;

// Database connection strings
const sourceConnectionString = 'postgresql://neondb_owner:npg_leBjyQx9G5tb@ep-black-sunset-a4pj1sbl.us-east-1.aws.neon.tech/neondb?sslmode=require';
const targetConnectionString = 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

// Helper function to get all rows from a table
async function getTableData(pool, tableName) {
  const result = await pool.query(`SELECT * FROM ${tableName}`);
  return result.rows;
}

// Helper function to insert data with IDs into a table
async function insertTableDataWithIds(pool, tableName, data) {
  if (data.length === 0) return;
  
  console.log(`Inserting ${data.length} rows into ${tableName} with IDs...`);
  
  // Get all column names including ID
  const columns = Object.keys(data[0]);
  
  for (const row of data) {
    try {
      // Build placeholders for each row
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map(col => row[col]);
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      
      await pool.query(query, values);
    } catch (error) {
      console.error(`Failed to insert row with ID ${row.id} into ${tableName}:`, error.message);
    }
  }
  
  // Reset the sequence
  await pool.query(`
    SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 
                  (SELECT COALESCE(MAX(id), 0) FROM ${tableName}), true)
  `);
  
  console.log(`✅ Successfully inserted data into ${tableName}`);
}

async function disableForeignKeyChecks(pool) {
  console.log('Temporarily disabling foreign key constraints...');
  await pool.query('SET session_replication_role = replica;');
}

async function enableForeignKeyChecks(pool) {
  console.log('Re-enabling foreign key constraints...');
  await pool.query('SET session_replication_role = DEFAULT;');
}

async function migrateData() {
  console.log('Starting data migration from Neon to Supabase...');
  
  // Connect to source database (Neon)
  const sourcePool = new Pool({ 
    connectionString: sourceConnectionString,
    ssl: { rejectUnauthorized: true }
  });
  
  // Connect to target database (Supabase)
  const targetPool = new Pool({ 
    connectionString: targetConnectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Test connections
    console.log('Testing database connections...');
    
    const sourceTest = await sourcePool.query('SELECT NOW() as time');
    console.log('Source database connected:', sourceTest.rows[0].time);
    
    const targetTest = await targetPool.query('SELECT NOW() as time');
    console.log('Target database connected:', targetTest.rows[0].time);
    
    // Disable foreign key constraints for the migration
    await disableForeignKeyChecks(targetPool);
    
    // Order of tables to migrate (to respect foreign key constraints)
    const tables = [
      'users', 
      'groups', 
      'group_members', 
      'expenses', 
      'expense_participants', 
      'payments', 
      'activity_log', 
      'group_invites', 
      'user_balances', 
      'user_balances_between_users'
    ];
    
    // First clear all tables to avoid conflicts
    for (const table of [...tables].reverse()) {
      try {
        console.log(`Clearing existing data from ${table}...`);
        await targetPool.query(`DELETE FROM ${table}`);
      } catch (error) {
        console.error(`Error clearing ${table}:`, error.message);
      }
    }
    
    // Migrate each table
    for (const table of tables) {
      console.log(`\nMigrating ${table}...`);
      
      try {
        // Get data from source
        const data = await getTableData(sourcePool, table);
        console.log(`Found ${data.length} rows in source ${table}`);
        
        // Insert data into target with IDs preserved
        await insertTableDataWithIds(targetPool, table, data);
      } catch (error) {
        console.error(`Error migrating ${table}:`, error.message);
      }
    }
    
    // Re-enable foreign key constraints
    await enableForeignKeyChecks(targetPool);
    
    // Verify migration
    for (const table of tables) {
      const result = await targetPool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} rows`);
    }
    
    console.log('\nData migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close connections
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run the migration
migrateData();