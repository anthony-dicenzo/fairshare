/**
 * Verification script to check balances after Test User Account removal
 */

import { db } from './server/db';
import { users, groups, expenses, expenseParticipants, userBalances } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function verifyBalances() {
  console.log('🔍 Verifying balances for House of Anthica after Test User removal...\n');
  
  try {
    // Get the House of Anthica group
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.name, 'House of Anthica'))
      .limit(1);
    
    if (group.length === 0) {
      console.log('❌ House of Anthica group not found');
      return;
    }
    
    const groupData = group[0];
    console.log(`✅ Group: ${groupData.name} (ID: ${groupData.id})\n`);
    
    // Get all group members with their current balances
    const currentBalances = await db
      .select({
        userId: userBalances.userId,
        balance: userBalances.balanceAmount,
        user: users
      })
      .from(userBalances)
      .innerJoin(users, eq(userBalances.userId, users.id))
      .where(eq(userBalances.groupId, groupData.id));
    
    console.log('📊 CURRENT BALANCES:');
    console.log('==================');
    for (const balance of currentBalances) {
      console.log(`${balance.user.name}: $${parseFloat(balance.balance).toFixed(2)}`);
    }
    console.log('');
    
    // Verify balances sum to zero (fundamental rule of expense sharing)
    const totalBalance = currentBalances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    console.log(`💰 Balance sum: $${totalBalance.toFixed(2)} ${Math.abs(totalBalance) < 0.01 ? '✅' : '❌'}`);
    
    if (Math.abs(totalBalance) > 0.01) {
      console.log('⚠️ WARNING: Balances do not sum to zero!');
    }
    console.log('');
    
    // Check for Test User Account in balances (should be none)
    const testUserBalance = currentBalances.find(b => b.user.email === 'test@test.com');
    if (testUserBalance) {
      console.log('❌ ERROR: Test User Account still has a balance!');
    } else {
      console.log('✅ Test User Account successfully removed from balances');
    }
    console.log('');
    
    // Get all expenses in the group and verify they only have 2 participants each
    const groupExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupData.id));
    
    console.log(`📋 EXPENSE VERIFICATION (${groupExpenses.length} total expenses):`);
    console.log('=================================');
    
    let expensesWithTestUser = 0;
    let expensesWithIncorrectSplit = 0;
    
    for (const expense of groupExpenses) {
      const participants = await db
        .select({
          participant: expenseParticipants,
          user: users
        })
        .from(expenseParticipants)
        .innerJoin(users, eq(expenseParticipants.userId, users.id))
        .where(eq(expenseParticipants.expenseId, expense.id));
      
      // Check if Test User is still in any expense
      const hasTestUser = participants.some(p => p.user.email === 'test@test.com');
      if (hasTestUser) {
        expensesWithTestUser++;
        console.log(`❌ ${expense.title}: Still has Test User Account`);
      }
      
      // Verify expense math
      const totalAmount = parseFloat(expense.totalAmount);
      const participantSum = participants.reduce((sum, p) => sum + parseFloat(p.participant.amountOwed), 0);
      const mathCorrect = Math.abs(totalAmount - participantSum) < 0.01;
      
      if (!mathCorrect) {
        expensesWithIncorrectSplit++;
        console.log(`❌ ${expense.title}: Math error - Total: $${totalAmount}, Sum: $${participantSum.toFixed(2)}`);
      }
      
      // Show sample of recently updated expenses
      if (participants.length === 2 && mathCorrect) {
        const perPerson = totalAmount / participants.length;
        console.log(`✅ ${expense.title}: $${totalAmount} → $${perPerson.toFixed(2)} each (${participants.length} people)`);
      }
    }
    
    console.log('\n📈 VERIFICATION SUMMARY:');
    console.log('=======================');
    console.log(`Total expenses: ${groupExpenses.length}`);
    console.log(`Expenses with Test User: ${expensesWithTestUser} ${expensesWithTestUser === 0 ? '✅' : '❌'}`);
    console.log(`Expenses with math errors: ${expensesWithIncorrectSplit} ${expensesWithIncorrectSplit === 0 ? '✅' : '❌'}`);
    console.log(`Balance sum correct: ${Math.abs(totalBalance) < 0.01 ? 'Yes ✅' : 'No ❌'}`);
    
    // Calculate what Anthony and Jesica should owe each other
    const anthony = currentBalances.find(b => b.user.name === 'Anthony DiCenzo');
    const jesica = currentBalances.find(b => b.user.name === 'Jes Mikkila');
    
    if (anthony && jesica) {
      console.log('\n👥 MEMBER SUMMARY:');
      console.log('==================');
      console.log(`Anthony DiCenzo: $${parseFloat(anthony.balance).toFixed(2)}`);
      console.log(`Jesica Mikkila: $${parseFloat(jesica.balance).toFixed(2)}`);
      
      const anthonyBalance = parseFloat(anthony.balance);
      const jesicaBalance = parseFloat(jesica.balance);
      
      if (anthonyBalance < 0) {
        console.log(`💸 Anthony owes Jesica: $${Math.abs(anthonyBalance).toFixed(2)}`);
      } else if (anthonyBalance > 0) {
        console.log(`💸 Jesica owes Anthony: $${anthonyBalance.toFixed(2)}`);
      } else {
        console.log(`💯 Perfectly even!`);
      }
    }
    
    if (expensesWithTestUser === 0 && expensesWithIncorrectSplit === 0 && Math.abs(totalBalance) < 0.01) {
      console.log('\n🎉 VERIFICATION PASSED: All balances are correct!');
    } else {
      console.log('\n⚠️ VERIFICATION ISSUES FOUND: Please review the errors above');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

// Run the verification
verifyBalances()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });