/**
 * Test expense editing functionality to identify issues when adding new users to expenses
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testExpenseEditWithNewUsers() {
  console.log('🧪 Testing expense edit functionality with new users...\n');
  
  try {
    // Step 1: Test authentication
    console.log('1. Testing authentication...');
    const userResponse = await fetch(`${BASE_URL}/api/user`, {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=test-session' // This will need to be a real session
      }
    });
    
    console.log(`Auth status: ${userResponse.status}`);
    if (userResponse.status === 401) {
      console.log('❌ Not authenticated - need to login first');
      return;
    }
    
    const userData = await userResponse.json();
    console.log(`✅ Authenticated as user ${userData.id}\n`);
    
    // Step 2: Get a group with multiple members
    console.log('2. Finding a group with multiple members...');
    const groupsResponse = await fetch(`${BASE_URL}/api/groups`, {
      credentials: 'include'
    });
    
    if (!groupsResponse.ok) {
      throw new Error(`Failed to fetch groups: ${groupsResponse.status}`);
    }
    
    const groups = await groupsResponse.json();
    console.log(`Found ${groups.length} groups`);
    
    if (groups.length === 0) {
      console.log('❌ No groups found');
      return;
    }
    
    // Find a group with multiple members
    let testGroup = null;
    let groupMembers = [];
    
    for (const group of groups) {
      const membersResponse = await fetch(`${BASE_URL}/api/groups/${group.id}/members`, {
        credentials: 'include'
      });
      
      if (membersResponse.ok) {
        const members = await membersResponse.json();
        if (members.length >= 2) {
          testGroup = group;
          groupMembers = members;
          break;
        }
      }
    }
    
    if (!testGroup) {
      console.log('❌ No group with multiple members found');
      return;
    }
    
    console.log(`✅ Using group "${testGroup.name}" with ${groupMembers.length} members`);
    console.log(`Members: ${groupMembers.map(m => `${m.name} (ID: ${m.userId})`).join(', ')}\n`);
    
    // Step 3: Get existing expenses in the group
    console.log('3. Finding existing expenses...');
    const expensesResponse = await fetch(`${BASE_URL}/api/groups/${testGroup.id}/expenses`, {
      credentials: 'include'
    });
    
    if (!expensesResponse.ok) {
      throw new Error(`Failed to fetch expenses: ${expensesResponse.status}`);
    }
    
    const expenses = await expensesResponse.json();
    console.log(`Found ${expenses.length} expenses in group`);
    
    if (expenses.length === 0) {
      console.log('❌ No expenses found to edit');
      return;
    }
    
    // Find an expense with fewer participants than group members
    let testExpense = null;
    let expenseParticipants = [];
    
    for (const expense of expenses) {
      const participantsResponse = await fetch(`${BASE_URL}/api/expenses/${expense.id}/participants`, {
        credentials: 'include'
      });
      
      if (participantsResponse.ok) {
        const participants = await participantsResponse.json();
        if (participants.length < groupMembers.length) {
          testExpense = expense;
          expenseParticipants = participants;
          break;
        }
      }
    }
    
    if (!testExpense) {
      console.log('ℹ️ All expenses already include all group members');
      // Use the first expense anyway for testing
      testExpense = expenses[0];
      const participantsResponse = await fetch(`${BASE_URL}/api/expenses/${testExpense.id}/participants`, {
        credentials: 'include'
      });
      expenseParticipants = participantsResponse.ok ? await participantsResponse.json() : [];
    }
    
    console.log(`✅ Testing with expense "${testExpense.title}" (ID: ${testExpense.id})`);
    console.log(`Current participants: ${expenseParticipants.length}, Group members: ${groupMembers.length}\n`);
    
    // Step 4: Try to edit the expense to include all group members
    console.log('4. Attempting to edit expense to include all group members...');
    
    const totalAmount = parseFloat(testExpense.totalAmount);
    const participantCount = groupMembers.length;
    const amountPerPerson = totalAmount / participantCount;
    
    // Create participants array with all group members
    const allParticipants = groupMembers.map(member => ({
      userId: member.userId,
      amountOwed: amountPerPerson
    }));
    
    const updateData = {
      title: testExpense.title,
      totalAmount: totalAmount,
      paidBy: testExpense.paidBy,
      date: testExpense.date,
      notes: testExpense.notes || "",
      participants: allParticipants
    };
    
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    const updateResponse = await fetch(`${BASE_URL}/api/expenses/${testExpense.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    console.log(`Update response status: ${updateResponse.status}`);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Update failed');
      console.log('Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Parsed error:', errorJson);
      } catch (e) {
        console.log('Raw error text:', errorText);
      }
    } else {
      const result = await updateResponse.json();
      console.log('✅ Update successful');
      console.log('Updated expense:', result);
      
      // Verify the participants were updated
      const verifyResponse = await fetch(`${BASE_URL}/api/expenses/${testExpense.id}/participants`, {
        credentials: 'include'
      });
      
      if (verifyResponse.ok) {
        const updatedParticipants = await verifyResponse.json();
        console.log(`\n✅ Verification: Expense now has ${updatedParticipants.length} participants`);
        updatedParticipants.forEach(p => {
          const member = groupMembers.find(m => m.userId === p.userId);
          console.log(`  - ${member?.name || 'Unknown'} (ID: ${p.userId}): $${p.amountOwed}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testExpenseEditWithNewUsers().catch(console.error);