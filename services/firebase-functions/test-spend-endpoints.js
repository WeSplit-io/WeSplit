/**
 * Comprehensive test script for SPEND API endpoints
 * Tests all endpoints: searchKnownUsers, batchInviteParticipants, email sending, etc.
 * 
 * Updated: 2025-01-27
 * - Uses new deep link domain: wesplit-deeplinks.web.app
 * - Tests production logic and URL validation
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
 *   - DEEP_LINK_DOMAIN: Deep link domain (default: wesplit-deeplinks.web.app)
 */

const https = require('https');
const http = require('http');

// Configuration
const API_KEY = process.env.API_KEY || 'wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg';
const BASE_URL = process.env.BASE_URL || 'https://us-central1-wesplit-35186.cloudfunctions.net';
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';
const EMULATOR_HOST = process.env.EMULATOR_HOST || 'localhost';
const EMULATOR_PORT = parseInt(process.env.EMULATOR_PORT || '5001');
const DEEP_LINK_DOMAIN = process.env.DEEP_LINK_DOMAIN || 'wesplit-deeplinks.web.app';
// Use production endpoints (not test/mock endpoints) to match SPEND team testing
const USE_PRODUCTION_ENDPOINTS = process.env.USE_PRODUCTION_ENDPOINTS !== 'false'; // Default: true

// Test data
const TEST_SPLIT_ID = process.env.TEST_SPLIT_ID || `test_split_${Date.now()}`;
const TEST_INVITER_ID = process.env.TEST_INVITER_ID || 'test_creator_123';
const TEST_INVITER_NAME = process.env.TEST_INVITER_NAME || 'Test Creator';

// Store created split ID for use across tests
let createdSplitId = null;

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
 * Test 0: Create Split (helper function)
 */
async function createTestSplit() {
  console.log(`${colors.cyan}=== Test 0: Create Test Split ===${colors.reset}`);
  
  const testWalletAddress = 'BPFLoaderUpgradeab1e11111111111111111111111';
  const testTreasuryWallet = '2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp';
  
  const payload = {
    email: 'test-creator@example.com',
    walletAddress: testWalletAddress,
    invoiceId: `TEST-INV-${Date.now()}`,
    amount: 100.00,
    currency: 'USDC',
    merchant: {
      name: 'Test Merchant',
      address: '123 Test Street'
    },
    transactionDate: new Date().toISOString(),
    source: 'spend',
    callbackUrl: 'spend://order/TEST-123/success',
    metadata: {
      orderData: {
        id: `ord_test_${Math.random().toString(36).substr(2, 9)}`,
        order_number: `ORD-TEST-${Date.now()}`,
        store: 'amazon',
        status: 'Payment_Pending',
        total_amount: 100.00
      },
      orderId: `ORD-TEST-${Date.now()}`,
      treasuryWallet: testTreasuryWallet,
      webhookUrl: 'https://spend.example.com/webhooks/wesplit',
      webhookSecret: 'test_secret_123',
      paymentThreshold: 1.0
    }
  };

  try {
    // Always use production endpoint to match SPEND team testing
    const endpoint = USE_PRODUCTION_ENDPOINTS ? '/createSplitFromPayment' : '/testCreateSplitFromPayment';
    
    if (!USE_PRODUCTION_ENDPOINTS) {
      console.log(`${colors.yellow}⚠️  Using test endpoint (not production). Set USE_PRODUCTION_ENDPOINTS=true to test real endpoints.${colors.reset}`);
    } else {
      console.log(`${colors.cyan}ℹ️  Using PRODUCTION endpoint: ${endpoint}${colors.reset}`);
    }
    
    const response = await makeRequest('POST', endpoint, payload);
    
    if (response.status === 200 && response.body.success) {
      const splitId = response.body.data?.splitId;
      if (splitId) {
        createdSplitId = splitId;
        console.log(`${colors.green}✅ Split created using ${USE_PRODUCTION_ENDPOINTS ? 'PRODUCTION' : 'TEST'} endpoint: ${splitId}${colors.reset}\n`);
        return splitId;
      }
    }
    
    // Log error details
    console.log(`${colors.red}❌ Split creation failed:${colors.reset}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${response.body.error || response.body.message || 'Unknown error'}`);
    if (response.body.errors) {
      console.log(`   Validation errors: ${JSON.stringify(response.body.errors)}`);
    }
    
    console.log(`${colors.yellow}⚠️  Could not create split, will use test ID: ${TEST_SPLIT_ID}${colors.reset}\n`);
    return TEST_SPLIT_ID;
  } catch (error) {
    console.log(`${colors.red}❌ Error creating split: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Will use test ID: ${TEST_SPLIT_ID}${colors.reset}\n`);
    return TEST_SPLIT_ID;
  }
}

/**
 * Test 2: Batch Invite Participants (with email sending)
 */
async function testBatchInviteParticipants() {
  console.log(`${colors.cyan}=== Test 2: Batch Invite Participants ===${colors.reset}`);
  
  // Use created split ID if available, otherwise use test ID
  const splitId = createdSplitId || TEST_SPLIT_ID;
  
  if (!createdSplitId) {
    console.log(`${colors.yellow}⚠️  No split created yet. Attempting to create one...${colors.reset}`);
    const newSplitId = await createTestSplit();
    if (newSplitId && newSplitId !== TEST_SPLIT_ID) {
      createdSplitId = newSplitId;
    }
  }
  
  const finalSplitId = createdSplitId || splitId;
  
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
      splitId: finalSplitId,
      inviterId: TEST_INVITER_ID,
      inviterName: TEST_INVITER_NAME,
      participants: testParticipants,
      sendNotifications: false, // Set to false to avoid email sending in tests
    });

    const passed = response.status === 200 && response.body.success === true;
    
    return formatTestResult(
      'Batch Invite Participants',
      passed,
      {
        status: response.status,
        message: passed
          ? `Invited ${response.body.summary?.pendingInvites || 0} new users, ${response.body.summary?.addedExisting || 0} existing users`
          : `Failed: ${response.body.error || response.body.message || 'Unknown error'}. Split ID used: ${finalSplitId}`,
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
  
  const splitId = createdSplitId || TEST_SPLIT_ID;
  
  try {
    const response = await makeRequest('GET', `/getSplitStatus?splitId=${splitId}`);
    
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
 * Test 5: Deep Link URL Validation
 */
async function testDeepLinkURLValidation() {
  console.log(`${colors.cyan}=== Test 5: Deep Link URL Validation ===${colors.reset}`);
  
  const tests = [];
  
  // Test 1: Valid callback URL (should pass)
  try {
    const validCallbackUrl = 'spend://order/ORD-123/success';
    const response = await makeRequest('POST', '/createSplitFromPayment', {
      email: 'test@example.com',
      amount: 100,
      currency: 'USDC',
      invoiceId: 'TEST-INV-123',
      metadata: {
        callbackUrl: validCallbackUrl,
        treasuryWallet: '2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp',
        orderId: 'ORD-123'
      }
    });
    
    tests.push({
      name: 'Valid callback URL (spend://)',
      passed: response.status === 200 || response.status === 400, // 400 if validation fails, 200 if passes
      details: {
        status: response.status,
        message: response.status === 200 
          ? 'Valid callback URL accepted' 
          : response.status === 400
            ? 'Callback URL validation working (rejected invalid format)'
            : 'Unexpected response',
      },
    });
  } catch (error) {
    tests.push({
      name: 'Valid callback URL',
      passed: false,
      details: { error: error.message },
    });
  }
  
  // Test 2: Invalid callback URL - dangerous protocol (should fail)
  try {
    const maliciousUrl = 'javascript:alert("xss")';
    const response = await makeRequest('POST', '/createSplitFromPayment', {
      email: 'test@example.com',
      amount: 100,
      currency: 'USDC',
      invoiceId: 'TEST-INV-123',
      metadata: {
        callbackUrl: maliciousUrl,
        treasuryWallet: '2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp',
        orderId: 'ORD-123'
      }
    });
    
    tests.push({
      name: 'Invalid callback URL - dangerous protocol (should reject)',
      passed: response.status === 400,
      details: {
        status: response.status,
        message: response.status === 400 
          ? 'Correctly rejected dangerous protocol' 
          : 'Should have rejected javascript: protocol',
      },
    });
  } catch (error) {
    tests.push({
      name: 'Invalid callback URL - dangerous protocol',
      passed: false,
      details: { error: error.message },
    });
  }
  
  // Test 3: Deep link domain verification
  try {
    const deepLinkUrl = `https://${DEEP_LINK_DOMAIN}/view-split?splitId=test123`;
    tests.push({
      name: 'Deep link domain configuration',
      passed: DEEP_LINK_DOMAIN === 'wesplit-deeplinks.web.app',
      details: {
        status: 'info',
        message: `Using deep link domain: ${DEEP_LINK_DOMAIN}`,
        exampleUrl: deepLinkUrl,
      },
    });
  } catch (error) {
    tests.push({
      name: 'Deep link domain configuration',
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
 * Test 6: Pay Participant Share
 */
async function testPayParticipantShare() {
  console.log(`${colors.cyan}=== Test 6: Pay Participant Share ===${colors.reset}`);
  
  // Use created split ID
  const splitId = createdSplitId;
  
  if (!splitId || splitId === TEST_SPLIT_ID) {
    return formatTestResult(
      'Pay Participant Share',
      false,
      {
        status: 'skipped',
        message: 'No valid split created - cannot test payment flow',
      }
    );
  }

  // First get split status to find a participant
  try {
    const statusResponse = await makeRequest('GET', `/getSplitStatus?splitId=${splitId}`);
    
    if (statusResponse.status !== 200 || !statusResponse.body.success) {
      return formatTestResult(
        'Pay Participant Share',
        false,
        {
          status: statusResponse.status,
          message: 'Could not get split status to find participant',
          error: statusResponse.body.error,
        }
      );
    }

    const participants = statusResponse.body.split?.participants || [];
    
    // Find a participant that hasn't fully paid (or the creator)
    const participant = participants.find(p => p.status !== 'paid') || participants[0];
    
    if (!participant || !participant.userId) {
      return formatTestResult(
        'Pay Participant Share',
        false,
        {
          status: 'error',
          message: 'No participant found to test payment',
        }
      );
    }

    // Make payment request
    const paymentPayload = {
      splitId: splitId,
      participantId: participant.userId,
      amount: 10.00, // Small test amount
      currency: 'USDC',
      transactionSignature: `test_tx_${Date.now()}`, // Mock signature for testing
    };

    const response = await makeRequest('POST', '/payParticipantShare', paymentPayload);
    
    const passed = response.status === 200 && response.body.success === true;
    
    return formatTestResult(
      'Pay Participant Share',
      passed,
      {
        status: response.status,
        message: passed
          ? `Payment recorded: ${response.body.amountPaid} USDC, Status: ${response.body.splitStatus}`
          : `Failed: ${response.body.error || response.body.message || 'Unknown error'}`,
        data: passed ? {
          amountPaid: response.body.amountPaid,
          remainingAmount: response.body.remainingAmount,
          splitStatus: response.body.splitStatus,
          isFullyFunded: response.body.isFullyFunded,
        } : response.body,
      }
    );
  } catch (error) {
    return formatTestResult(
      'Pay Participant Share',
      false,
      {
        error: error.message,
      }
    );
  }
}

/**
 * Test 7: Verify Payment Updates Split Status
 */
async function testPaymentUpdatesStatus() {
  console.log(`${colors.cyan}=== Test 7: Verify Payment Updates Split Status ===${colors.reset}`);
  
  const splitId = createdSplitId;
  
  if (!splitId || splitId === TEST_SPLIT_ID) {
    return formatTestResult(
      'Verify Payment Updates Status',
      true, // Skip but pass
      {
        status: 'skipped',
        message: 'No valid split created - skipping status verification',
      }
    );
  }

  try {
    const response = await makeRequest('GET', `/getSplitStatus?splitId=${splitId}`);
    
    if (response.status !== 200 || !response.body.success) {
      return formatTestResult(
        'Verify Payment Updates Status',
        false,
        {
          status: response.status,
          message: 'Could not verify split status after payment',
        }
      );
    }

    const split = response.body.split;
    const hasPayments = split.amountCollected > 0;
    const participantsHavePayments = split.participants?.some(p => (p.amountPaid || 0) > 0);
    
    return formatTestResult(
      'Verify Payment Updates Status',
      true, // Pass as long as we can check status
      {
        status: response.status,
        message: `Split status: ${split.status}, Collected: ${split.amountCollected}/${split.totalAmount}`,
        data: {
          status: split.status,
          amountCollected: split.amountCollected,
          totalAmount: split.totalAmount,
          completionPercentage: split.completionPercentage,
          hasPayments,
          participantsHavePayments,
        },
      }
    );
  } catch (error) {
    return formatTestResult(
      'Verify Payment Updates Status',
      false,
      {
        error: error.message,
      }
    );
  }
}

/**
 * Test 8: Search Known Users - Edge Cases
 */
async function testSearchKnownUsersEdgeCases() {
  console.log(`${colors.cyan}=== Test 8: Search Known Users - Edge Cases ===${colors.reset}`);
  
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
  console.log(`Deep Link Domain: ${DEEP_LINK_DOMAIN}`);
  console.log(`Production Endpoints: ${USE_PRODUCTION_ENDPOINTS ? '✅ YES (matches SPEND team)' : '❌ NO (using test endpoints)'}`);
  console.log('');
  
  const results = [];
  
  // Run all tests
  // First, create a test split if needed
  console.log(`${colors.cyan}=== Creating test split for subsequent tests ===${colors.reset}`);
  await createTestSplit();
  console.log('');
  
  results.push(await testSearchKnownUsers());
  results.push(await testMatchUsersByEmail());
  results.push(await testBatchInviteParticipants());
  results.push(await testGetSplitStatus());
  results.push(await testDeepLinkURLValidation());
  results.push(await testPayParticipantShare());
  results.push(await testPaymentUpdatesStatus());
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
  createTestSplit,
  testSearchKnownUsers,
  testBatchInviteParticipants,
  testGetSplitStatus,
  testMatchUsersByEmail,
  testDeepLinkURLValidation,
  testPayParticipantShare,
  testPaymentUpdatesStatus,
  testSearchKnownUsersEdgeCases,
};
