// Script to complete the migration of remaining tables
import pg from 'pg';
const { Pool } = pg;

// Get connection strings from environment variables
import dotenv from 'dotenv';
dotenv.config();

// Database connection strings
const sourceConnectionString = process.env.NEON_DATABASE_URL || '';
const targetConnectionString = process.env.DATABASE_URL;

// Helper function to get all rows from a table
async function getTableData(pool, tableName) {
  const result = await pool.query(`SELECT * FROM ${tableName}`);
  return result.rows;
}

// Helper function to get table columns
async function getTableColumns(pool, tableName) {
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows.map(row => row.column_name);
}

// Helper function to insert data with matching columns only
async function insertDataWithMatchingColumns(pool, tableName, data, targetColumns) {
  if (data.length === 0) return;
  
  console.log(`Inserting ${data.length} rows into ${tableName}...`);
  
  // Get all column names from source data
  const sourceColumns = Object.keys(data[0]);
  
  // Find matching columns between source and target
  const matchingColumns = sourceColumns.filter(col => targetColumns.includes(col));
  
  console.log(`Using ${matchingColumns.length} matching columns: ${matchingColumns.join(', ')}`);
  
  for (const row of data) {
    try {
      // Only include matching columns
      const placeholders = matchingColumns.map((_, i) => `$${i + 1}`).join(', ');
      const values = matchingColumns.map(col => row[col]);
      
      const query = `
        INSERT INTO ${tableName} (${matchingColumns.join(', ')})
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

async function completeMigration() {
  console.log('Completing data migration for remaining tables...');
  
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
    
    // Tables that still need to be migrated
    const tables = [
      'activity_log',
      'group_invites',
      'user_balances',
      'user_balances_between_users'
    ];
    
    // Temporarily disable foreign key constraints
    console.log('Temporarily disabling foreign key constraints...');
    await targetPool.query('SET session_replication_role = replica;');
    
    // Migrate each table
    for (const table of tables) {
      console.log(`\nMigrating ${table}...`);
      
      try {
        // Get target table columns
        const targetColumns = await getTableColumns(targetPool, table);
        console.log(`Target table ${table} has columns: ${targetColumns.join(', ')}`);
        
        // Get data from source
        const data = await getTableData(sourcePool, table);
        console.log(`Found ${data.length} rows in source ${table}`);
        
        // Insert data into target with matching columns only
        await insertDataWithMatchingColumns(targetPool, table, data, targetColumns);
      } catch (error) {
        console.error(`Error migrating ${table}:`, error.message);
      }
    }
    
    // Re-enable foreign key constraints
    console.log('Re-enabling foreign key constraints...');
    await targetPool.query('SET session_replication_role = DEFAULT;');
    
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
completeMigration();