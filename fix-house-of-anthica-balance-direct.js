// Fix incorrect balance in the "House of Anthica" group by directly updating balance records
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { userBalances } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function fixHouseOfAnthicaBalance() {
  const GROUP_ID = 2;             // House of Anthica group ID
  const USER_ID_1 = 2;            // User with incorrect balance (adicenzo)
  const USER_ID_2 = 10;           // The other user (Jes)
  const CORRECT_BALANCE = -1834.32; // The correct balance amount

  // Initialize database connection
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  console.log(`Starting direct balance fix for House of Anthica (Group ID: ${GROUP_ID})`);
  
  try {
    // Get current balances
    const user1Balance = await db.select()
      .from(userBalances)
      .where(and(
        eq(userBalances.userId, USER_ID_1),
        eq(userBalances.groupId, GROUP_ID)
      ))
      .then(rows => rows[0]);
      
    const user2Balance = await db.select()
      .from(userBalances)
      .where(and(
        eq(userBalances.userId, USER_ID_2),
        eq(userBalances.groupId, GROUP_ID)
      ))
      .then(rows => rows[0]);
    
    if (!user1Balance || !user2Balance) {
      console.error("Could not find balance records");
      return;
    }
    
    console.log(`Current balance for User ID ${USER_ID_1}: $${user1Balance.balanceAmount}`);
    console.log(`Current balance for User ID ${USER_ID_2}: $${user2Balance.balanceAmount}`);
    
    // Update the balances to the correct amount
    await db.update(userBalances)
      .set({ balanceAmount: CORRECT_BALANCE.toString() })
      .where(and(
        eq(userBalances.userId, USER_ID_1),
        eq(userBalances.groupId, GROUP_ID)
      ));
      
    await db.update(userBalances)
      .set({ balanceAmount: (-CORRECT_BALANCE).toString() })
      .where(and(
        eq(userBalances.userId, USER_ID_2),
        eq(userBalances.groupId, GROUP_ID)
      ));
    
    console.log(`Updated balance for User ID ${USER_ID_1} to: $${CORRECT_BALANCE}`);
    console.log(`Updated balance for User ID ${USER_ID_2} to: $${-CORRECT_BALANCE}`);
    
    // Verify the updated balances
    const updatedUser1Balance = await db.select()
      .from(userBalances)
      .where(and(
        eq(userBalances.userId, USER_ID_1),
        eq(userBalances.groupId, GROUP_ID)
      ))
      .then(rows => rows[0]);
      
    const updatedUser2Balance = await db.select()
      .from(userBalances)
      .where(and(
        eq(userBalances.userId, USER_ID_2),
        eq(userBalances.groupId, GROUP_ID)
      ))
      .then(rows => rows[0]);
    
    console.log(`Verified balance for User ID ${USER_ID_1}: $${updatedUser1Balance.balanceAmount}`);
    console.log(`Verified balance for User ID ${USER_ID_2}: $${updatedUser2Balance.balanceAmount}`);
    
    console.log("Balance fix completed successfully!");
  } catch (error) {
    console.error("Error fixing balances:", error);
  }
}

fixHouseOfAnthicaBalance().catch(console.error);