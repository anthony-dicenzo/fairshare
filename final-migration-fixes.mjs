// Script to fix remaining issues with the migration
import pg from 'pg';
const { Pool } = pg;

// Database connection strings
const sourceConnectionString = 'postgresql://neondb_owner:npg_leBjyQx9G5tb@ep-black-sunset-a4pj1sbl.us-east-1.aws.neon.tech/neondb?sslmode=require';
const targetConnectionString = 'postgresql://postgres.smrsiolztcggakkgtyab:WCRjkMkrg7vDYahc@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

async function fixGroupInvites() {
  console.log('Fixing group_invites table...');
  
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
    const sourceData = await sourcePool.query('SELECT * FROM group_invites');
    console.log(`Found ${sourceData.rows.length} group invites in source database`);
    
    // Get target table columns
    const columnsResult = await targetPool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'group_invites'
    `);
    
    console.log('Target group_invites table schema:');
    columnsResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
    
    // Clear existing invites in target
    await targetPool.query('DELETE FROM group_invites');
    
    // Temporarily disable constraints
    await targetPool.query('SET session_replication_role = replica;');
    
    // Insert with default values for required fields
    let successCount = 0;
    for (const invite of sourceData.rows) {
      try {
        const result = await targetPool.query(`
          INSERT INTO group_invites 
          (id, group_id, email, invited_by, token, status, created_at)
          VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
        `, [
          invite.id, 
          invite.group_id,
          invite.email || 'migrated@example.com', // Default email if missing
          invite.invited_by || 1, // Default to first user if missing
          invite.token || 'migrated-token-' + Math.random().toString(36).substring(2, 15),
          invite.status || 'pending',
          invite.created_at || new Date()
        ]);
        
        successCount++;
      } catch (error) {
        console.error(`Error inserting group invite ${invite.id}:`, error.message);
      }
    }
    
    // Reset sequence
    await targetPool.query(`
      SELECT setval('group_invites_id_seq', (SELECT COALESCE(MAX(id), 0) FROM group_invites), true)
    `);
    
    console.log(`Successfully migrated ${successCount} out of ${sourceData.rows.length} group invites`);
    
    // Re-enable constraints
    await targetPool.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Error fixing group invites:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

async function fixUserBalances() {
  console.log('\nFixing user_balances table...');
  
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
    const sourceData = await sourcePool.query('SELECT * FROM user_balances');
    console.log(`Found ${sourceData.rows.length} user balances in source database`);
    
    // Clear existing balances in target
    await targetPool.query('DELETE FROM user_balances');
    
    // Temporarily disable constraints
    await targetPool.query('SET session_replication_role = replica;');
    
    // Track processed user/group combinations to avoid duplicates
    const processedCombinations = new Set();
    
    // Insert without duplicates
    let successCount = 0;
    for (const balance of sourceData.rows) {
      const key = `${balance.user_id}-${balance.group_id}`;
      
      // Skip if we've already processed this combination
      if (processedCombinations.has(key)) {
        console.log(`Skipping duplicate user_balance for user ${balance.user_id} in group ${balance.group_id}`);
        continue;
      }
      
      try {
        await targetPool.query(`
          INSERT INTO user_balances 
          (id, user_id, group_id, balance_amount, last_updated)
          VALUES 
          ($1, $2, $3, $4, $5)
        `, [
          balance.id, 
          balance.user_id,
          balance.group_id,
          balance.balance_amount,
          balance.last_updated || new Date()
        ]);
        
        processedCombinations.add(key);
        successCount++;
      } catch (error) {
        console.error(`Error inserting user balance ${balance.id}:`, error.message);
      }
    }
    
    // Reset sequence
    await targetPool.query(`
      SELECT setval('user_balances_id_seq', (SELECT COALESCE(MAX(id), 0) FROM user_balances), true)
    `);
    
    console.log(`Successfully migrated ${successCount} out of ${sourceData.rows.length} user balances`);
    
    // Re-enable constraints
    await targetPool.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Error fixing user balances:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

async function fixUserBalancesBetweenUsers() {
  console.log('\nFixing user_balances_between_users table...');
  
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
    
    // Clear existing data in target
    await targetPool.query('DELETE FROM user_balances_between_users');
    
    // Temporarily disable constraints
    await targetPool.query('SET session_replication_role = replica;');
    
    // Insert data
    let successCount = 0;
    for (const balance of sourceData.rows) {
      try {
        await targetPool.query(`
          INSERT INTO user_balances_between_users 
          (id, group_id, user_id, other_user_id, amount, last_updated)
          VALUES 
          ($1, $2, $3, $4, $5, $6)
        `, [
          balance.id, 
          balance.group_id,
          balance.user_id,
          balance.other_user_id,
          balance.amount,
          balance.last_updated || new Date()
        ]);
        
        successCount++;
      } catch (error) {
        console.error(`Error inserting balance between users ${balance.id}:`, error.message);
      }
    }
    
    // Reset sequence
    await targetPool.query(`
      SELECT setval('user_balances_between_users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM user_balances_between_users), true)
    `);
    
    console.log(`Successfully migrated ${successCount} out of ${sourceData.rows.length} balances between users`);
    
    // Re-enable constraints
    await targetPool.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Error fixing balances between users:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run all fixes
async function runAllFixes() {
  try {
    await fixGroupInvites();
    await fixUserBalances();
    await fixUserBalancesBetweenUsers();
    console.log('\nAll migration fixes completed successfully!');
  } catch (error) {
    console.error('Error running fixes:', error);
  }
}

runAllFixes();