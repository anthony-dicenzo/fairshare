#!/usr/bin/env node

/**
 * Security Implementation Verification Script
 * Tests all security features of the backend API layer
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}${details ? ': ' + details : ''}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

async function testAuthenticationRequired() {
  console.log('\n🔐 Testing Authentication Requirements');
  
  try {
    // Test that protected endpoints require authentication
    const response = await fetch(`${BASE_URL}/api/groups`);
    const isUnauthorized = response.status === 401;
    logTest('Protected endpoint requires authentication', isUnauthorized, 
      `Status: ${response.status}`);
  } catch (error) {
    logTest('Protected endpoint test', false, `Error: ${error.message}`);
  }
}

async function testSecurityHeaders() {
  console.log('\n🛡️ Testing Security Headers');
  
  try {
    const response = await fetch(`${BASE_URL}/api/user`);
    const headers = response.headers;
    
    const hasXFrameOptions = headers.has('x-frame-options');
    const hasXContentTypeOptions = headers.has('x-content-type-options');
    const hasXXSSProtection = headers.has('x-xss-protection');
    
    logTest('X-Frame-Options header present', hasXFrameOptions);
    logTest('X-Content-Type-Options header present', hasXContentTypeOptions);
    logTest('X-XSS-Protection header present', hasXXSSProtection);
    
  } catch (error) {
    logTest('Security headers test', false, `Error: ${error.message}`);
  }
}

async function testEnvironmentSecurity() {
  console.log('\n🔧 Testing Environment Security');
  
  // Check that sensitive environment variables are set
  const requiredVars = ['DATABASE_URL', 'SESSION_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  
  requiredVars.forEach(varName => {
    const exists = process.env[varName] !== undefined;
    logTest(`${varName} environment variable set`, exists);
  });
  
  // Verify no service role keys are exposed (should not be in client-accessible vars)
  const noServiceRole = !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  logTest('No service role keys in client environment', noServiceRole);
}

async function runSecurityVerification() {
  console.log('🔒 FairShare Backend API Security Verification');
  console.log('===============================================');
  
  await testEnvironmentSecurity();
  await testAuthenticationRequired();
  await testSecurityHeaders();
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All security tests passed! Your backend API layer is properly secured.');
  } else {
    console.log('\n⚠️ Some security tests failed. Please review the failed tests above.');
  }
}

// Run the verification
runSecurityVerification().catch(console.error);