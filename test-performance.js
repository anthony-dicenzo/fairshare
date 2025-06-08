/**
 * Performance Test Suite for RLS Optimizations
 * Tests expense operations to verify sub-100ms performance target
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'adicenzo@example.com',
  password: 'test123'
};

class PerformanceTest {
  constructor() {
    this.cookies = '';
    this.results = [];
  }

  async login() {
    console.log('🔐 Authenticating test user...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (response.ok) {
      this.cookies = response.headers.get('set-cookie') || '';
      console.log('✅ Authentication successful');
      return true;
    }
    return false;
  }

  async timeRequest(name, requestFn) {
    const start = performance.now();
    try {
      const result = await requestFn();
      const duration = performance.now() - start;
      
      this.results.push({
        name,
        duration: Math.round(duration),
        status: 'success',
        target: duration < 100 ? '✅' : '⚠️'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.results.push({
        name,
        duration: Math.round(duration),
        status: 'error',
        target: '❌',
        error: error.message
      });
      throw error;
    }
  }

  async testGetGroups() {
    return this.timeRequest('Get Groups', async () => {
      const response = await fetch(`${BASE_URL}/api/groups`, {
        headers: { Cookie: this.cookies }
      });
      return response.json();
    });
  }

  async testGetGroupExpenses(groupId) {
    return this.timeRequest('Get Group Expenses', async () => {
      const response = await fetch(`${BASE_URL}/api/groups/${groupId}/expenses`, {
        headers: { Cookie: this.cookies }
      });
      return response.json();
    });
  }

  async testCreateExpense(groupId) {
    const expenseData = {
      groupId,
      description: `Performance Test ${Date.now()}`,
      amount: 25.99,
      paidBy: 1,
      participants: [{ userId: 1, amountOwed: 25.99 }]
    };

    return this.timeRequest('Create Expense', async () => {
      const response = await fetch(`${BASE_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: this.cookies
        },
        body: JSON.stringify(expenseData)
      });
      return response.json();
    });
  }

  async testGetGroupBalances(groupId) {
    return this.timeRequest('Get Group Balances', async () => {
      const response = await fetch(`${BASE_URL}/api/groups/${groupId}/balances`, {
        headers: { Cookie: this.cookies }
      });
      return response.json();
    });
  }

  async testDeleteExpense(expenseId) {
    return this.timeRequest('Delete Expense', async () => {
      const response = await fetch(`${BASE_URL}/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Cookie: this.cookies }
      });
      return response.json();
    });
  }

  printResults() {
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('=' * 50);
    console.log('Target: Sub-100ms response times\n');

    this.results.forEach(result => {
      console.log(`${result.target} ${result.name}: ${result.duration}ms`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const successfulTests = this.results.filter(r => r.status === 'success');
    const averageTime = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    const underTarget = successfulTests.filter(r => r.duration < 100).length;

    console.log('\n📈 SUMMARY:');
    console.log(`Average Response Time: ${Math.round(averageTime)}ms`);
    console.log(`Tests Under 100ms: ${underTarget}/${successfulTests.length} (${Math.round(underTarget/successfulTests.length*100)}%)`);
    
    if (averageTime < 100 && underTarget === successfulTests.length) {
      console.log('🎯 PERFORMANCE TARGET ACHIEVED!');
    } else {
      console.log('⚠️  Performance target not fully met');
    }
  }

  async runFullTest() {
    console.log('🚀 Starting RLS Performance Test Suite...\n');

    try {
      // Login
      await this.login();

      // Get groups to find a test group
      const groups = await this.testGetGroups();
      if (!groups || groups.length === 0) {
        throw new Error('No groups available for testing');
      }

      const testGroupId = groups[0].id;
      console.log(`📁 Using test group: ${groups[0].name} (ID: ${testGroupId})`);

      // Test expense operations
      await this.testGetGroupExpenses(testGroupId);
      await this.testGetGroupBalances(testGroupId);
      
      const expense = await this.testCreateExpense(testGroupId);
      if (expense && expense.id) {
        // Small delay to ensure expense is created
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.testDeleteExpense(expense.id);
      }

      // Test again after operations
      await this.testGetGroupExpenses(testGroupId);
      await this.testGetGroupBalances(testGroupId);

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }

    this.printResults();
  }
}

// Run the test
const test = new PerformanceTest();
test.runFullTest().catch(console.error);