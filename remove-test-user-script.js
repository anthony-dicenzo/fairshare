/**
 * Script to remove Test User Account from House of Anthica group
 * and redistribute their expenses between remaining members
 */

const { createConnection } = require('./server/db.ts');
const { expenses, expenseParticipants, groupMembers, users, groups } = require('./shared/schema.ts');
const { eq, and } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/postgres-js');

// Initialize database connection
const db = createConnection();

async function removeTestUserFromGroup() {
  console.log('🚀 Starting removal of Test User Account from House of Anthica...');
  
  try {
    // First, let's identify the users and group
    const testUserEmail = 'test@test.com';
    const groupName = 'House of Anthica';
    
    // Find the Test User Account
    const testUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, testUserEmail)
    });
    
    if (!testUser) {
      console.log('❌ Test User Account not found');
      return;
    }
    
    console.log(`✅ Found Test User Account: ID ${testUser.id}, Name: ${testUser.name}`);
    
    // Find the House of Anthica group
    const group = await db.query.groups.findFirst({
      where: (groups, { eq }) => eq(groups.name, groupName)
    });
    
    if (!group) {
      console.log('❌ House of Anthica group not found');
      return;
    }
    
    console.log(`✅ Found group: ID ${group.id}, Name: ${group.name}`);
    
    // Find all expenses in this group that include the test user
    const expensesWithTestUser = await db
      .select({
        expense: expenses,
        participant: expenseParticipants
      })
      .from(expenses)
      .innerJoin(expenseParticipants, eq(expenses.id, expenseParticipants.expenseId))
      .where(
        and(
          eq(expenses.groupId, group.id),
          eq(expenseParticipants.userId, testUser.id)
        )
      );
    
    console.log(`📊 Found ${expensesWithTestUser.length} expenses involving Test User Account`);
    
    // Process each expense
    for (const item of expensesWithTestUser) {
      const expense = item.expense;
      const testUserParticipation = item.participant;
      
      console.log(`\n💰 Processing expense: ${expense.title} (ID: ${expense.id})`);
      console.log(`   Test user owes: $${testUserParticipation.amountOwed}`);
      
      // Get all participants for this expense
      const allParticipants = await db
        .select()
        .from(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, expense.id));
      
      console.log(`   Total participants before removal: ${allParticipants.length}`);
      
      // Remove test user from this expense
      await db
        .delete(expenseParticipants)
        .where(
          and(
            eq(expenseParticipants.expenseId, expense.id),
            eq(expenseParticipants.userId, testUser.id)
          )
        );
      
      console.log(`   ✅ Removed Test User Account from expense`);
      
      // Get remaining participants
      const remainingParticipants = await db
        .select()
        .from(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, expense.id));
      
      if (remainingParticipants.length > 0) {
        // Calculate new amount per person (total expense / remaining participants)
        const totalAmount = parseFloat(expense.totalAmount);
        const newAmountPerPerson = totalAmount / remainingParticipants.length;
        
        console.log(`   💡 Redistributing $${totalAmount} among ${remainingParticipants.length} remaining participants`);
        console.log(`   💰 New amount per person: $${newAmountPerPerson.toFixed(2)}`);
        
        // Update each remaining participant's amount
        for (const participant of remainingParticipants) {
          await db
            .update(expenseParticipants)
            .set({ amountOwed: newAmountPerPerson.toString() })
            .where(
              and(
                eq(expenseParticipants.expenseId, expense.id),
                eq(expenseParticipants.userId, participant.userId)
              )
            );
          
          console.log(`   ✅ Updated participant ${participant.userId} to owe $${newAmountPerPerson.toFixed(2)}`);
        }
      }
    }
    
    // Remove test user from the group membership
    console.log(`\n👥 Removing Test User Account from group membership...`);
    const deletedMembers = await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, testUser.id)
        )
      )
      .returning();
    
    if (deletedMembers.length > 0) {
      console.log(`✅ Removed Test User Account from group membership`);
    } else {
      console.log(`⚠️ Test User Account was not a member of this group`);
    }
    
    // Trigger balance recalculation for the group
    console.log(`\n🔄 Triggering balance recalculation for group ${group.id}...`);
    
    // Import and use the balance update function
    const { storage } = await import('./server/storage.js');
    await storage.updateAllBalancesInGroup(group.id);
    
    console.log(`✅ Balance recalculation completed`);
    
    // Summary
    console.log(`\n📋 SUMMARY:`);
    console.log(`✅ Processed ${expensesWithTestUser.length} expenses`);
    console.log(`✅ Removed Test User Account from all expenses`);
    console.log(`✅ Redistributed amounts among remaining participants`);
    console.log(`✅ Removed Test User Account from group membership`);
    console.log(`✅ Recalculated all balances`);
    console.log(`\n🎉 Test User Account successfully removed from House of Anthica!`);
    
  } catch (error) {
    console.error('❌ Error removing test user:', error);
    throw error;
  }
}

// Run the script
removeTestUserFromGroup()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });