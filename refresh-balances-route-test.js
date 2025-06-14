// Script to force balance refresh through the new API route
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
let authCookies = '';

// Data for our test user - use environment variables for security
const loginData = {
  username: process.env.TEST_USERNAME || 'test_user',
  password: process.env.TEST_PASSWORD || 'test_password'
};

// Function to login and get session cookie
async function login() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Login successful');
    
    // Save cookies for subsequent requests
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      authCookies = setCookieHeader;
    }
    
    return true;
  } catch (error) {
    console.error('Login error:', error.message);
    return false;
  }
}

// Function to get all groups
async function getGroups() {
  try {
    const response = await fetch(`${BASE_URL}/api/groups`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get groups: ${response.status} ${response.statusText}`);
    }
    
    const groups = await response.json();
    console.log(`Found ${groups.length} groups`);
    return groups;
  } catch (error) {
    console.error('Error getting groups:', error.message);
    return [];
  }
}

// Function to refresh balances for a group
async function refreshGroupBalances(groupId) {
  try {
    console.log(`Refreshing balances for group ${groupId}...`);
    const response = await fetch(`${BASE_URL}/api/groups/${groupId}/refresh-balances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies
      }
    });
    
    const result = await response.json();

    if (response.ok && result.message === "Balances refreshed successfully") {
      console.log(`✅ Successfully refreshed balances for group ${groupId}`);
      return true;
    }

    console.error(
      `❌ Failed to refresh balances for group ${groupId}:`,
      result.error || result.message || 'Unknown error'
    );
    return false;
  } catch (error) {
    console.error(`❌ Error refreshing balances for group ${groupId}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Could not log in. Aborting.');
    return;
  }
  
  // Get all groups
  const groups = await getGroups();
  if (groups.length === 0) {
    console.log('No groups found. Nothing to refresh.');
    return;
  }
  
  // Refresh balances for each group
  for (const group of groups) {
    await refreshGroupBalances(group.id);
  }
  
  console.log('Balance refresh operation complete.');
}

// Run the main function
main().catch(error => {
  console.error('Unexpected error:', error);
});