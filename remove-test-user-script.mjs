/**
 * Script to remove Test User Account from House of Anthica group
 * and redistribute their expenses between remaining members
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use environment variables for database connection
import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';

// Import schema
import { expenses, expenseParticipants, groupMembers, users, groups } from './shared/schema.js';

// Create database connection
const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function removeTestUserFromGroup() {
  console.log('🚀 Starting removal of Test User Account from House of Anthica...');
  
  try {
    // First, let's identify the users and group
    const testUserEmail = 'test@test.com';
    const groupName = 'House of Anthica';
    
    // Find the Test User Account
    const testUser = await db
      .select()
      .from(users)
      .where(eq(users.email, testUserEmail))
      .limit(1);
    
    if (testUser.length === 0) {
      console.log('❌ Test User Account not found');
      return;
    }
    
    const testUserData = testUser[0];
    console.log(`✅ Found Test User Account: ID ${testUserData.id}, Name: ${testUserData.name}`);
    
    // Find the House of Anthica group
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.name, groupName))
      .limit(1);
    
    if (group.length === 0) {
      console.log('❌ House of Anthica group not found');
      return;
    }
    
    const groupData = group[0];
    console.log(`✅ Found group: ID ${groupData.id}, Name: ${groupData.name}`);
    
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
          eq(expenses.groupId, groupData.id),
          eq(expenseParticipants.userId, testUserData.id)
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
            eq(expenseParticipants.userId, testUserData.id)
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
          eq(groupMembers.groupId, groupData.id),
          eq(groupMembers.userId, testUserData.id)
        )
      )
      .returning();
    
    if (deletedMembers.length > 0) {
      console.log(`✅ Removed Test User Account from group membership`);
    } else {
      console.log(`⚠️ Test User Account was not a member of this group`);
    }
    
    // Trigger balance recalculation by making an API call to the refresh endpoint
    console.log(`\n🔄 Triggering balance recalculation for group ${groupData.id}...`);
    
    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupData.id}/refresh-balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ Balance recalculation completed`);
      } else {
        console.log(`⚠️ Balance recalculation may have failed (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️ Could not trigger balance recalculation: ${error.message}`);
    }
    
    // Summary
    console.log(`\n📋 SUMMARY:`);
    console.log(`✅ Processed ${expensesWithTestUser.length} expenses`);
    console.log(`✅ Removed Test User Account from all expenses`);
    console.log(`✅ Redistributed amounts among remaining participants`);
    console.log(`✅ Removed Test User Account from group membership`);
    console.log(`✅ Triggered balance recalculation`);
    console.log(`\n🎉 Test User Account successfully removed from House of Anthica!`);
    
  } catch (error) {
    console.error('❌ Error removing test user:', error);
    throw error;
  } finally {
    await sql.end();
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