require('dotenv').config();
const { Pool } = require('pg');

async function fixActivityLogSchema() {
  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding metadata column to activity_log table...');
    
    // Check if column exists first
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_log' AND column_name = 'metadata'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Column does not exist, adding it now...');
      await pool.query(`ALTER TABLE activity_log ADD COLUMN metadata TEXT`);
      console.log('Added metadata column to activity_log table');
    } else {
      console.log('Metadata column already exists');
    }
    
    console.log('Schema fix completed successfully!');
  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await pool.end();
  }
}

fixActivityLogSchema().catch(console.error);