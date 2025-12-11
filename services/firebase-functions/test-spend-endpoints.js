/**
 * Comprehensive test script for SPEND API endpoints
 * Tests all endpoints: searchKnownUsers, batchInviteParticipants, email sending, etc.
 * 
 * Usage:
 *   node test-spend-endpoints.js
 * 
 * Environment Variables:
 *   - API_KEY: Your SPEND API key (default: uses test key from docs)
 *   - BASE_URL: Base URL for functions (default: production)
 *   - USE_EMULATOR: Set to 'true' to use emulator (default: false)
 *   - EMULATOR_HOST: Emulator host (default: localhost)
 *   - EMULATOR_PORT: Emulator port (default: 5001)
 */

const https = require('https');
const http = require('http');

// Configuration
const API_KEY = process.env.API_KEY || 'wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg';
const BASE_URL = process.env.BASE_URL || 'https://us-central1-wesplit-35186.cloudfunctions.net';
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';
const EMULATOR_HOST = process.env.EMULATOR_HOST || 'localhost';
const EMULATOR_PORT = parseInt(process.env.EMULATOR_PORT || '5001');

// Test data
const TEST_SPLIT_ID = process.env.TEST_SPLIT_ID || `test_split_${Date.now()}`;
const TEST_INVITER_ID = process.env.TEST_INVITER_ID || 'test_creator_123';
const TEST_INVITER_NAME = process.env.TEST_INVITER_NAME || 'Test Creator';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = USE_EMULATOR 
      ? `http://${EMULATOR_HOST}:${EMULATOR_PORT}/wesplit-35186/us-central1${path}`
      : `${BASE_URL}${path}`;

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        ...headers,
      },
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            raw: body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            raw: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test result formatter
 */
function formatTestResult(testName, passed, details = {}) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${icon} ${testName}${colors.reset}`);
  
  if (details.status) {
    console.log(`   Status: ${details.status}`);
  }
  if (details.message) {
    console.log(`   ${details.message}`);
  }
  if (details.error) {
    console.log(`   ${colors.red}Error: ${details.error}${colors.reset}`);
  }
  if (details.data && Object.keys(details.data).length > 0) {
    console.log(`   Data: ${JSON.stringify(details.data, null, 2).split('\n').join('\n   ')}`);
  }
  console.log('');
  
  return passed;
}

/**
 * Test 1: Search Known Users
 */
async function testSearchKnownUsers() {
  console.log(`${colors.cyan}=== Test 1: Search Known Users ===${colors.reset}`);
  
  try {
    // Test with valid query
    const response = await makeRequest('GET', '/searchKnownUsers?query=test&limit=5');
    const passed = response.status === 200 && response.body.success === true;
    
    return formatTestResult(
      'Search Known Users',
      passed,
      {
        status: response.status,
        message: passed 
          ? `Found ${response.body.total || 0} users`
          : `Failed: ${response.body.error || response.body.message || 'Unknown error'}`,
        data: passed ? { total: response.body.total, usersCount: response.body.users?.length || 0 } : response.body,
      }
    );
  } catch (error) {
    return formatTestResult(
      'Search Known Users',
      false,
      {
        error: error.message,
      }
    );
  }
}

/**
 * Test 2: Batch Invite Participants (with email sending)
 */
async function testBatchInviteParticipants() {
  console.log(`${colors.cyan}=== Test 2: Batch Invite Participants ===${colors.reset}`);
  
  // First, we need a valid split ID - try to create one or use existing
  let splitId = TEST_SPLIT_ID;
  
  // Try to get an existing split or create one via createSplitFromPayment
  // For now, we'll use the test split ID and handle the case where it doesn't exist
  
  const testParticipants = [
    {
      email: `test_user_${Date.now()}@example.com`,
      name: 'Test User 1',
      amountOwed: 25.50,
    },
    {
      email: `test_user_${Date.now() + 1}@example.com`,
      name: 'Test User 2',
      amountOwed: 25.50,
    },
  ];

  try {
    const response = await makeRequest('POST', '/batchInviteParticipants', {
      splitId: splitId,
      inviterId: TEST_INVITER_ID,
      inviterName: TEST_INVITER_NAME,
      participants: testParticipants,
      sendNotifications: true, // Test email sending
    });

    const passed = response.status === 200 && response.body.success === true;
    
    return formatTestResult(
      'Batch Invite Participants',
      passed,
      {
        status: response.status,
        message: passed
          ? `Invited ${response.body.summary?.pendingInvites || 0} new users, ${response.body.summary?.addedExisting || 0} existing users`
          : `Failed: ${response.body.error || response.body.message || 'Unknown error'}. Note: Split may not exist - create one first via createSplitFromPayment`,
        data: passed ? {
          summary: response.body.summary,
          pendingInvites: response.body.results?.pendingInvites?.length || 0,
          addedExisting: response.body.results?.addedExisting?.length || 0,
        } : response.body,
      }
    );
  } catch (error) {
    return formatTestResult(
      'Batch Invite Participants',
      false,
      {
        error: error.message,
      }
    );
  }
}

/**
 * Test 3: Get Split Status
 */
async function testGetSplitStatus() {
  console.log(`${colors.cyan}=== Test 3: Get Split Status ===${colors.reset}`);
  
  try {
    const response = await makeRequest('GET', `/getSplitStatus?splitId=${TEST_SPLIT_ID}`);
    
    // This might fail if split doesn't exist, which is okay for testing
    const passed = response.status === 200 && response.body.success === true;
    
    return formatTestResult(
      'Get Split Status',
      passed || response.status === 404, // 404 is acceptable if split doesn't exist
      {
        status: response.status,
        message: passed
          ? `Split status: ${response.body.split?.status || 'unknown'}`
          : response.status === 404
            ? 'Split not found (expected if not created yet)'
            : `Failed: ${response.body.error || response.body.message || 'Unknown error'}`,
        data: passed ? {
          status: response.body.split?.status,
          amountCollected: response.body.split?.amountCollected,
          participantsCount: response.body.split?.participantsCount,
        } : undefined,
      }
    );
  } catch (error) {
    return formatTestResult(
      'Get Split Status',
      false,
      {
        error: error.message,
      }
    );
  }
}

/**
 * Test 4: Match Users By Email
 */
async function testMatchUsersByEmail() {
  console.log(`${colors.cyan}=== Test 4: Match Users By Email ===${colors.reset}`);
  
  const testEmails = [
    'test@example.com',
    'nonexistent@example.com',
  ];

  try {
    const response = await makeRequest('POST', '/matchUsersByEmail', {
      emails: testEmails,
      splitId: TEST_SPLIT_ID,
      creatorId: TEST_INVITER_ID,
    });

    const passed = response.status === 200 && response.body.success === true;
    
    return formatTestResult(
      'Match Users By Email',
      passed,
      {
        status: response.status,
        message: passed
          ? `Found ${response.body.stats?.existingCount || 0} existing, ${response.body.stats?.newCount || 0} new users`
          : `Failed: ${response.body.error || response.body.message || 'Unknown error'}`,
        data: passed ? {
          existingCount: response.body.stats?.existingCount,
          newCount: response.body.stats?.newCount,
          totalEmails: response.body.stats?.totalEmails,
        } : response.body,
      }
    );
  } catch (error) {
    return formatTestResult(
      'Match Users By Email',
      false,
      {
        error: error.message,
      }
    );
  }
}

/**
 * Test 5: Search Known Users - Edge Cases
 */
async function testSearchKnownUsersEdgeCases() {
  console.log(`${colors.cyan}=== Test 5: Search Known Users - Edge Cases ===${colors.reset}`);
  
  const tests = [];
  
  // Test 1: Query too short
  try {
    const response = await makeRequest('GET', '/searchKnownUsers?query=a');
    tests.push({
      name: 'Query too short (should fail)',
      passed: response.status === 400,
      details: {
        status: response.status,
        message: response.status === 400 ? 'Correctly rejected short query' : 'Should have rejected query < 2 chars',
      },
    });
  } catch (error) {
    tests.push({
      name: 'Query too short',
      passed: false,
      details: { error: error.message },
    });
  }
  
  // Test 2: Missing query parameter
  try {
    const response = await makeRequest('GET', '/searchKnownUsers');
    tests.push({
      name: 'Missing query parameter (should fail)',
      passed: response.status === 400,
      details: {
        status: response.status,
        message: response.status === 400 ? 'Correctly rejected missing query' : 'Should have rejected missing query',
      },
    });
  } catch (error) {
    tests.push({
      name: 'Missing query parameter',
      passed: false,
      details: { error: error.message },
    });
  }
  
  // Test 3: Limit too high (should cap at 50)
  try {
    const response = await makeRequest('GET', '/searchKnownUsers?query=test&limit=100');
    tests.push({
      name: 'Limit too high (should cap at 50)',
      passed: response.status === 200 && (response.body.users?.length || 0) <= 50,
      details: {
        status: response.status,
        message: `Returned ${response.body.users?.length || 0} users (should be ≤ 50)`,
      },
    });
  } catch (error) {
    tests.push({
      name: 'Limit too high',
      passed: false,
      details: { error: error.message },
    });
  }
  
  // Format all test results
  let allPassed = true;
  tests.forEach(test => {
    const passed = formatTestResult(test.name, test.passed, test.details);
    if (!passed) allPassed = false;
  });
  
  return allPassed;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   SPEND API Endpoints Test Suite                        ║${colors.reset}`);
  console.log(`${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`Base URL: ${USE_EMULATOR ? `http://${EMULATOR_HOST}:${EMULATOR_PORT}` : BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log(`Test Split ID: ${TEST_SPLIT_ID}`);
  console.log('');
  
  const results = [];
  
  // Run all tests
  results.push(await testSearchKnownUsers());
  results.push(await testMatchUsersByEmail());
  results.push(await testBatchInviteParticipants());
  results.push(await testGetSplitStatus());
  results.push(await testSearchKnownUsersEdgeCases());
  
  // Summary
  console.log(`${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Test Summary                                            ║${colors.reset}`);
  console.log(`${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${total - passed}${colors.reset}`);
  console.log(`Success Rate: ${percentage}%`);
  console.log('');
  
  if (passed === total) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Check the output above for details.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testSearchKnownUsers,
  testBatchInviteParticipants,
  testGetSplitStatus,
  testMatchUsersByEmail,
  testSearchKnownUsersEdgeCases,
};
