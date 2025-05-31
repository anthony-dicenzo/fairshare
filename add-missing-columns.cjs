require('dotenv').config();
const { Pool } = require('pg');

async function addMissingColumns() {
  console.log('Connecting to Supabase database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding missing columns to restore full functionality...');
    
    // Add metadata column to activity_log table
    console.log('1. Adding metadata column to activity_log table...');
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata TEXT`);
    console.log('   ✓ metadata column added to activity_log');
    
    // Add invite_code column to group_invites table
    console.log('2. Adding invite_code column to group_invites table...');
    await pool.query(`ALTER TABLE group_invites ADD COLUMN IF NOT EXISTS invite_code TEXT`);
    console.log('   ✓ invite_code column added to group_invites');
    
    // Make invite_code unique
    console.log('3. Adding unique constraint to invite_code...');
    try {
      await pool.query(`ALTER TABLE group_invites ADD CONSTRAINT unique_invite_code UNIQUE (invite_code)`);
      console.log('   ✓ unique constraint added');
    } catch (error) {
      if (error.code === '23505' || error.message.includes('already exists')) {
        console.log('   ✓ unique constraint already exists');
      } else {
        console.log('   ! Could not add unique constraint, but column exists');
      }
    }
    
    // Update existing group_invites to have invite codes
    console.log('4. Updating existing invites with codes...');
    const updateResult = await pool.query(`
      UPDATE group_invites 
      SET invite_code = 'invite-' || id || '-' || group_id 
      WHERE invite_code IS NULL
    `);
    console.log(`   ✓ Updated ${updateResult.rowCount} existing invites`);
    
    // Add index for better performance
    console.log('5. Adding index for invite_code lookups...');
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_invites_invite_code ON group_invites(invite_code)`);
      console.log('   ✓ Index added');
    } catch (error) {
      console.log('   ! Index may already exist');
    }
    
    // Verify columns were added
    console.log('\n6. Verifying columns...');
    const metadataCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_log' AND column_name = 'metadata'
    `);
    
    const inviteCodeCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'group_invites' AND column_name = 'invite_code'
    `);
    
    if (metadataCheck.rows.length > 0) {
      console.log('   ✓ metadata column exists in activity_log');
    } else {
      console.log('   ✗ metadata column missing from activity_log');
    }
    
    if (inviteCodeCheck.rows.length > 0) {
      console.log('   ✓ invite_code column exists in group_invites');
    } else {
      console.log('   ✗ invite_code column missing from group_invites');
    }
    
    console.log('\n✅ Database schema fix completed successfully!');
    console.log('Your application should now have full functionality.');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
  } finally {
    await pool.end();
  }
}

addMissingColumns().catch(console.error);