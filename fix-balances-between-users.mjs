// Script to fix the user_balances_between_users table
import pg from 'pg';
const { Pool } = pg;

// Database connection strings
const sourceConnectionString = 'postgresql://neondb_owner:npg_leBjyQx9G5tb@ep-black-sunset-a4pj1sbl.us-east-1.aws.neon.tech/neondb?sslmode=require';
const targetConnectionString = 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

async function fixUserBalancesBetweenUsers() {
  console.log('Fixing user_balances_between_users table...');
  
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
    console.log(`Found ${sourceData.rows.length} user balances between users in source database`);
    
    // Check source columns
    if (sourceData.rows.length > 0) {
      console.log('Source database columns:', Object.keys(sourceData.rows[0]).join(', '));
    }
    
    // Get target table schema
    const targetSchema = await targetPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances_between_users'
      ORDER BY ordinal_position
    `);
    
    console.log('Target database columns:');
    targetSchema.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
    
    // Clear existing data in target
    await targetPool.query('DELETE FROM user_balances_between_users');
    
    // Temporarily disable constraints
    await targetPool.query('SET session_replication_role = replica;');
    
    // Insert data with column mapping
    let successCount = 0;
    for (const balance of sourceData.rows) {
      try {
        await targetPool.query(`
          INSERT INTO user_balances_between_users 
          (id, group_id, from_user_id, to_user_id, balance_amount, last_updated)
          VALUES 
          ($1, $2, $3, $4, $5, $6)
        `, [
          balance.id, 
          balance.group_id,
          balance.user_id,         // Source 'user_id' maps to target 'from_user_id'
          balance.other_user_id,   // Source 'other_user_id' maps to target 'to_user_id'
          balance.amount,          // Source 'amount' maps to target 'balance_amount'
          balance.last_updated || new Date()
        ]);
        
        successCount++;
      } catch (error) {
        console.error(`Error inserting balance between users ${balance.id}:`, error.message);
      }
    }
    
    // Reset sequence
    await targetPool.query(`
      SELECT setval('user_balances_between_users_id_seq', 
                   (SELECT COALESCE(MAX(id), 0) FROM user_balances_between_users), 
                   true)
    `);
    
    console.log(`Successfully migrated ${successCount} out of ${sourceData.rows.length} balances between users`);
    
    // Re-enable constraints
    await targetPool.query('SET session_replication_role = DEFAULT;');
    
    // Verify counts in each table
    const tables = [
      'users', 'groups', 'group_members', 'expenses', 'expense_participants',
      'payments', 'activity_log', 'group_invites', 'user_balances', 'user_balances_between_users'
    ];
    
    console.log('\nData migration verification:');
    for (const table of tables) {
      const targetCount = await targetPool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${targetCount.rows[0].count} rows`);
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
fixUserBalancesBetweenUsers();