// Script to update balances via API call
import fetch from 'node-fetch';

async function updateGroupBalances(groupId) {
  try {
    // First, log in to the application to get a session
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'adicenzo',
        password: 'password123'
      }),
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed with status:', loginResponse.status);
      return;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Now call the balance refresh endpoint
    const refreshResponse = await fetch(`http://localhost:5000/api/groups/${groupId}/refresh-balances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    if (refreshResponse.ok) {
      console.log(`Successfully refreshed balances for group ${groupId}`);
    } else {
      console.error(`Failed to refresh balances for group ${groupId}:`, await refreshResponse.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Use group ID 2 as an example
updateGroupBalances(2);