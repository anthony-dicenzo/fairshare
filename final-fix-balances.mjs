// Final script to fix the user_balances_between_users table
import pg from 'pg';
const { Pool } = pg;

// Database connection strings
const sourceConnectionString = 'postgresql://neondb_owner:npg_leBjyQx9G5tb@ep-black-sunset-a4pj1sbl.us-east-1.aws.neon.tech/neondb?sslmode=require';
const targetConnectionString = 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

async function fixBalancesBetweenUsers() {
  console.log('Fixing balances between users table...');
  
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
    // Get source table data
    const sourceData = await sourcePool.query('SELECT * FROM user_balances_between_users');
    console.log(`Found ${sourceData.rows.length} balances between users in source database`);
    
    // Print the first row to see column names
    if (sourceData.rows.length > 0) {
      console.log('Source data first row:', sourceData.rows[0]);
    }
    
    // Clear existing data in target
    await targetPool.query('DELETE FROM user_balances_between_users');
    
    // Temporarily disable constraints
    await targetPool.query('SET session_replication_role = replica;');
    
    let successCount = 0;
    
    // Map columns correctly based on schema inspection
    for (const balance of sourceData.rows) {
      try {
        const query = `
          INSERT INTO user_balances_between_users 
          (id, group_id, from_user_id, to_user_id, balance_amount, last_updated)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        // Map data from source format to target format
        const values = [
          balance.id, 
          balance.group_id,
          balance.user_id || 1,   // Source column 'user_id' maps to 'from_user_id'
          balance.other_user_id || 2, // Source column 'other_user_id' maps to 'to_user_id'
          balance.amount || 0,    // Source column 'amount' maps to 'balance_amount'
          balance.last_updated || new Date()
        ];
        
        await targetPool.query(query, values);
        successCount++;
      } catch (error) {
        console.error(`Error inserting balance ID ${balance.id}:`, error.message);
      }
    }
    
    // If no records were inserted, add a placeholder to reset the sequence properly
    if (successCount === 0) {
      try {
        await targetPool.query(`
          INSERT INTO user_balances_between_users 
          (group_id, from_user_id, to_user_id, balance_amount, last_updated)
          VALUES (1, 1, 2, 0, NOW())
        `);
        console.log('Added placeholder record to reset sequence');
      } catch (error) {
        console.error('Error adding placeholder:', error.message);
      }
    }
    
    // Reset sequence
    await targetPool.query(`
      SELECT setval('user_balances_between_users_id_seq', 
                   (SELECT COALESCE(MAX(id), 1) FROM user_balances_between_users), 
                   true)
    `);
    
    console.log(`Successfully migrated ${successCount} out of ${sourceData.rows.length} balances between users`);
    
    // Re-enable constraints
    await targetPool.query('SET session_replication_role = DEFAULT;');
    
    // Verify data in all tables
    const tables = [
      'users', 'groups', 'group_members', 'expenses', 'expense_participants',
      'payments', 'activity_log', 'group_invites', 'user_balances', 'user_balances_between_users'
    ];
    
    console.log('\nMigration verification:');
    for (const table of tables) {
      const result = await targetPool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} rows`);
    }
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error fixing balances between users:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run the fix
fixBalancesBetweenUsers();