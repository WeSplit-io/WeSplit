#!/usr/bin/env node

/**
 * SPEND Integration Endpoints Test Script
 * 
 * Tests all SPEND integration endpoints to verify they work correctly.
 * 
 * Usage:
 *   node tools/test-spend-endpoints.js [command]
 * 
 * Commands:
 *   all          - Run all tests (default)
 *   create       - Test createSplitFromPayment
 *   invite       - Test batchInviteParticipants
 *   pay          - Test payParticipantShare
 *   status       - Test getSplitStatus
 *   search       - Test searchKnownUsers
 *   flow         - Test complete flow (create -> invite -> pay -> status)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const CONFIG = {
  baseUrl: process.env.SPEND_API_BASE_URL || 'https://us-central1-wesplit-35186.cloudfunctions.net',
  apiKey: process.env.SPEND_API_KEY || 'wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg',
  timeout: 30000, // 30 seconds
};

// Test state (stores created split IDs, etc.)
const testState = {
  splitId: null,
  billId: null,
  userId: null,
  participants: [],
  treasuryWallet: '2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp', // SPEND production treasury
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  log('='.repeat(60), 'bright');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Make HTTP request
 */
function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
      ...headers,
    };

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: defaultHeaders,
      timeout: CONFIG.timeout,
    };

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          parsedData = responseData;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData,
          raw: responseData,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test 1: Create Split From Payment
 */
async function testCreateSplit() {
  logSection('Test 1: Create Split From Payment');

  const orderId = `test_order_${Date.now()}`;
  const invoiceId = `INV-${Date.now()}`;
  
  const testData = {
    email: 'creator@example.com',
    invoiceId: invoiceId,
    amount: 100.00,
    currency: 'USDC',
    merchant: {
      name: 'Test Store',
      address: '123 Test St',
      phone: '+1234567890',
    },
    transactionDate: new Date().toISOString(),
    source: 'spend',
    walletAddress: '11111111111111111111111111111112', // Valid Solana address format (32 chars, base58)
    items: [
      {
        name: 'Test Item 1',
        price: 50.00,
        quantity: 1,
      },
      {
        name: 'Test Item 2',
        price: 50.00,
        quantity: 1,
      },
    ],
    metadata: {
      treasuryWallet: testState.treasuryWallet,
      orderId: orderId,
      orderNumber: `ORD-${Date.now()}`,
      orderStatus: 'Payment_Pending',
      store: 'amazon',
      webhookUrl: 'https://spend.example.com/webhook',
      webhookSecret: 'test_secret',
      paymentThreshold: 1.0,
      callbackUrl: 'https://spend.example.com/callback', // Optional: Add to get redirect URL in response
      orderData: {
        id: orderId,
        order_number: `ORD-${Date.now()}`,
        status: 'Payment_Pending',
        store: 'amazon',
        total_amount: 100.00,
        items: [
          {
            name: 'Test Item 1',
            price: 50.00,
            quantity: 1,
          },
          {
            name: 'Test Item 2',
            price: 50.00,
            quantity: 1,
          },
        ],
        user_wallet: 'TestWallet12345678901234567890123456789012',
        customer_email: 'test@example.com',
        created_at: new Date().toISOString(),
      },
    },
  };

  try {
    logInfo(`Creating split for order: ${orderId}`);
    logInfo(`Invoice ID: ${invoiceId}`);
    logInfo(`Treasury wallet: ${testState.treasuryWallet}`);

    const response = await makeRequest('POST', '/createSplitFromPayment', testData);

    // Log full response for debugging if there's an error
    if (response.statusCode !== 200 || !response.data.success) {
      logError(`Failed to create split: ${response.data.error || 'Unknown error'}`);
      logError(`Status: ${response.statusCode}`);
      logError(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data };
    }

    // Parse response - the response has structure: { success: true, data: { splitId, userId, ... } }
    const responseData = response.data;
    const innerData = responseData.data || responseData; // Handle both nested and flat structures
    
    // Extract splitId from response
    const splitId = innerData.splitId || responseData.splitId;
    const billId = innerData.billId || responseData.billId; // Note: billId may not be in response (will be added in next deployment)
    const userId = innerData.userId || responseData.userId;
    const redirectUrl = innerData.redirectUrl || responseData.redirectUrl; // Redirect URL (only if callbackUrl provided)
    const firebaseDocId = innerData.firebaseDocId || responseData.firebaseDocId;

    if (!splitId) {
      logError('Split ID not found in response');
      logError(`Response structure: ${JSON.stringify(responseData, null, 2)}`);
      return { success: false, error: 'Split ID not found in response' };
    }

    testState.splitId = splitId;
    testState.billId = billId; // May be undefined - that's OK, we can get it from split later
    testState.userId = userId;

    logSuccess('Split created successfully!');
    logInfo(`Split ID: ${testState.splitId}`);
    logInfo(`User ID: ${testState.userId || 'N/A'}`);
    if (billId) {
      logInfo(`Bill ID: ${billId}`);
      testState.billId = billId;
    } else {
      logWarning(`Bill ID: Not in response (will be added in next deployment - available in split document)`);
    }
    if (redirectUrl) {
      logInfo(`Redirect URL: ${redirectUrl}`);
    } else {
      logInfo(`Redirect URL: Not provided (add callbackUrl to metadata to get redirect URL)`);
    }
    if (firebaseDocId) {
      logInfo(`Firebase Doc ID: ${firebaseDocId}`);
    }

    // Store participant info if available
    if (innerData.participants && innerData.participants.length > 0) {
      testState.participants = innerData.participants;
    } else if (responseData.participants && responseData.participants.length > 0) {
      testState.participants = responseData.participants;
    }

    return { success: true, data: innerData };
  } catch (error) {
    logError(`Error creating split: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Batch Invite Participants
 */
async function testBatchInvite() {
  logSection('Test 2: Batch Invite Participants');

  if (!testState.splitId) {
    logError('No split ID available. Run create test first.');
    return { success: false, error: 'No split ID' };
  }

  const testData = {
    splitId: testState.splitId,
    inviterId: testState.userId,
    inviterName: 'Test Creator',
    participants: [
      {
        email: 'participant1@example.com',
        name: 'Participant One',
        amountOwed: 33.33,
      },
      {
        email: 'participant2@example.com',
        name: 'Participant Two',
        amountOwed: 33.33,
      },
      {
        email: 'participant3@example.com',
        name: 'Participant Three',
        amountOwed: 33.34,
      },
    ],
  };

  try {
    logInfo(`Inviting ${testData.participants.length} participants to split: ${testState.splitId}`);

    const response = await makeRequest('POST', '/batchInviteParticipants', testData);

    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Participants invited successfully!');
      
      const summary = response.data.summary || {};
      const results = response.data.results || {};
      
      // Log full response for debugging
      if (summary.pendingInvites === 0 && summary.addedExisting === 0) {
        logWarning('No users were added or invited. Checking response details...');
        logInfo(`Full response: ${JSON.stringify(response.data, null, 2)}`);
      }
      
      logInfo(`Total processed: ${summary.total || 0}`);
      logInfo(`Existing users added: ${summary.addedExisting || 0}`);
      logInfo(`Pending invites (new users): ${summary.pendingInvites || 0}`);
      logInfo(`Already participants: ${summary.alreadyParticipant || 0}`);
      logInfo(`Failed: ${summary.failed || 0}`);

      // Show email status
      if (summary.emailStatus) {
        const emailStatus = summary.emailStatus;
        logInfo(`Emails sent: ${emailStatus.sent || 0}`);
        logInfo(`Emails failed: ${emailStatus.failed || 0}`);
        logInfo(`Emails skipped: ${emailStatus.skipped || 0}`);
      }
      
      // Show detailed email results
      if (results.emailStatus && results.emailStatus.length > 0) {
        logInfo(`\nEmail sending details:`);
        results.emailStatus.forEach((status) => {
          if (status.sent) {
            logSuccess(`  ✅ ${status.email}: Sent (${status.messageId || 'no message ID'})`);
          } else {
            logError(`  ❌ ${status.email}: Failed - ${status.reason || 'Unknown error'}`);
            if (status.error) {
              logError(`     Error: ${status.error}`);
            }
          }
        });
      }

      // Show detailed results
      if (results.addedExisting && results.addedExisting.length > 0) {
        logInfo(`\nExisting users added to split:`);
        results.addedExisting.forEach((p) => {
          logInfo(`  - ${p.email} (${p.userId}) - ${p.amountOwed} USDC`);
        });
        testState.participants.push(...results.addedExisting);
      }
      
      if (results.pendingInvites && results.pendingInvites.length > 0) {
        logInfo(`\nPending invitations created:`);
        results.pendingInvites.forEach((p) => {
          logInfo(`  - ${p.email} - ${p.amountOwed} USDC`);
          logInfo(`    Invite link: ${p.inviteLink || 'N/A'}`);
        });
      }
      
      if (results.alreadyParticipant && results.alreadyParticipant.length > 0) {
        logInfo(`\nAlready participants:`);
        results.alreadyParticipant.forEach((p) => {
          logInfo(`  - ${p.email} (${p.userId})`);
        });
      }
      
      if (results.failed && results.failed.length > 0) {
        logWarning(`\nFailed invitations:`);
        results.failed.forEach((p) => {
          logWarning(`  - ${p.email}: ${p.error || 'Unknown error'}`);
        });
      }

      return { success: true, data: response.data };
    } else {
      logError(`Failed to invite participants: ${response.data.error || 'Unknown error'}`);
      logError(`Status: ${response.statusCode}`);
      logError(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    logError(`Error inviting participants: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Pay Participant Share
 */
async function testPayParticipantShare() {
  logSection('Test 3: Pay Participant Share');

  if (!testState.splitId) {
    logError('No split ID available. Run create test first.');
    return { success: false, error: 'Missing split ID' };
  }

  // Get split status to find participants
  let participant = null;
  let amount = 33.33;

  if (testState.participants.length > 0) {
    // Use participant from test state if available
    participant = testState.participants[0];
    amount = participant.amountOwed || 33.33;
  } else {
    // Get split status to find the creator (who is always a participant)
    logInfo('No participants in test state, fetching split status to find creator...');
    try {
      const statusResponse = await makeRequest('GET', `/getSplitStatus?splitId=${testState.splitId}`);
      if (statusResponse.statusCode === 200 && statusResponse.data.success) {
        const split = statusResponse.data.split;
        if (split.participants && split.participants.length > 0) {
          // Use the first participant (usually the creator)
          participant = split.participants[0];
          amount = participant.amountOwed || split.totalAmount || 100.00;
          logInfo(`Using participant from split: ${participant.email || participant.userId}`);
        }
      }
    } catch (error) {
      logError(`Failed to get split status: ${error.message}`);
    }
  }

  if (!participant || !participant.userId) {
    logError('No participant found. Make sure to run invite test or the split has participants.');
    return { success: false, error: 'No participant available' };
  }

  const testData = {
    splitId: testState.splitId,
    participantId: participant.userId,
    amount: amount,
    currency: 'USDC',
    transactionSignature: `test_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  try {
    logInfo(`Recording payment for participant: ${participant.email || participant.userId || participant.id}`);
    logInfo(`Participant ID: ${participant.userId || participant.id}`);
    logInfo(`Amount: ${amount} USDC`);
    logInfo(`Transaction: ${testData.transactionSignature}`);

    const response = await makeRequest('POST', '/payParticipantShare', testData);

    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Payment recorded successfully!');
      logInfo(`Amount paid: ${response.data.amountPaid || amount}`);
      logInfo(`Remaining: ${response.data.remainingAmount || 0}`);
      logInfo(`Split status: ${response.data.splitStatus || 'N/A'}`);
      logInfo(`Fully funded: ${response.data.isFullyFunded ? 'Yes' : 'No'}`);

      if (response.data.deepLink) {
        logInfo(`Deep link: ${response.data.deepLink}`);
      }

      return { success: true, data: response.data };
    } else {
      logError(`Failed to record payment: ${response.data.error || 'Unknown error'}`);
      logError(`Status: ${response.statusCode}`);
      logError(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    logError(`Error recording payment: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Get Split Status
 */
async function testGetSplitStatus() {
  logSection('Test 4: Get Split Status');

  if (!testState.splitId) {
    logError('No split ID available. Run create test first.');
    return { success: false, error: 'No split ID' };
  }

  try {
    logInfo(`Getting status for split: ${testState.splitId}`);

    const response = await makeRequest('GET', `/getSplitStatus?splitId=${testState.splitId}`);

    if (response.statusCode === 200 && response.data.success) {
      const split = response.data.split;
      logSuccess('Split status retrieved successfully!');
      logInfo(`Title: ${split.title || 'N/A'}`);
      logInfo(`Status: ${split.status || 'N/A'}`);
      logInfo(`Total amount: ${split.totalAmount || 0} ${split.currency || 'USDC'}`);
      logInfo(`Amount collected: ${split.amountCollected || 0} ${split.currency || 'USDC'}`);
      logInfo(`Remaining: ${split.remainingAmount || 0} ${split.currency || 'USDC'}`);
      logInfo(`Completion: ${split.completionPercentage || 0}%`);
      logInfo(`Participants: ${split.participantsCount || 0}`);
      logInfo(`Participants paid: ${split.participantsPaid || 0}`);

      if (split.externalMetadata) {
        logInfo(`Order ID: ${split.externalMetadata.orderId || 'N/A'}`);
        logInfo(`Payment status: ${split.externalMetadata.paymentStatus || 'pending'}`);
      }

      return { success: true, data: response.data };
    } else {
      logError(`Failed to get split status: ${response.data.error || 'Unknown error'}`);
      logError(`Status: ${response.statusCode}`);
      logError(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    logError(`Error getting split status: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Search Known Users
 */
async function testSearchKnownUsers() {
  logSection('Test 5: Search Known Users');

  const searchQuery = 'participant';

  try {
    logInfo(`Searching for users with query: ${searchQuery}`);

    const response = await makeRequest('GET', `/searchKnownUsers?query=${encodeURIComponent(searchQuery)}&limit=20`);

    if (response.statusCode === 200 && response.data.success) {
      logSuccess('User search completed!');
      logInfo(`Found: ${response.data.foundUsers?.length || 0}`);
      logInfo(`Not found: ${response.data.notFoundEmails?.length || 0}`);

      if (response.data.foundUsers && response.data.foundUsers.length > 0) {
        response.data.foundUsers.forEach((user) => {
          logInfo(`  - ${user.email}: ${user.name} (${user.userId})`);
        });
      }

      return { success: true, data: response.data };
    } else {
      logError(`Failed to search users: ${response.data.error || 'Unknown error'}`);
      logError(`Status: ${response.statusCode}`);
      logError(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    logError(`Error searching users: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Complete Flow
 */
async function testCompleteFlow() {
  logSection('Complete SPEND Integration Flow Test');

  const results = {
    create: null,
    invite: null,
    pay: null,
    status: null,
  };

  // Step 1: Create split
  log('\n📝 Step 1: Creating split...');
  results.create = await testCreateSplit();
  if (!results.create.success) {
    logError('Flow stopped: Failed to create split');
    return results;
  }

  // Wait a bit for split to be fully created
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 2: Invite participants
  log('\n📧 Step 2: Inviting participants...');
  results.invite = await testBatchInvite();
  if (!results.invite.success) {
    logWarning('Flow continued: Failed to invite participants (may be expected)');
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Record payment
  log('\n💰 Step 3: Recording payment...');
  results.pay = await testPayParticipantShare();
  if (!results.pay.success) {
    logWarning('Flow continued: Failed to record payment (may be expected)');
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Get status
  log('\n📊 Step 4: Getting split status...');
  results.status = await testGetSplitStatus();
  if (!results.status.success) {
    logWarning('Flow continued: Failed to get status');
  }

  // Summary
  logSection('Flow Test Summary');
  log(`Create split: ${results.create.success ? '✅' : '❌'}`);
  log(`Invite participants: ${results.invite?.success ? '✅' : '❌'}`);
  log(`Record payment: ${results.pay?.success ? '✅' : '❌'}`);
  log(`Get status: ${results.status?.success ? '✅' : '❌'}`);

  if (testState.splitId) {
    logInfo(`\nTest split ID: ${testState.splitId}`);
    logInfo(`You can check this split in Firebase Console`);
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2] || 'all';

  logSection('SPEND Integration Endpoints Test Suite');
  logInfo(`Base URL: ${CONFIG.baseUrl}`);
  logInfo(`API Key: ${CONFIG.apiKey.substring(0, 10)}...`);
  logInfo(`Command: ${command}`);

  let results;

  switch (command) {
    case 'create':
      results = await testCreateSplit();
      break;
    case 'invite':
      results = await testBatchInvite();
      break;
    case 'pay':
      results = await testPayParticipantShare();
      break;
    case 'status':
      results = await testGetSplitStatus();
      break;
    case 'search':
      results = await testSearchKnownUsers();
      break;
    case 'flow':
      results = await testCompleteFlow();
      break;
    case 'all':
    default:
      logSection('Running All Tests');
      await testCreateSplit();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await testBatchInvite();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await testPayParticipantShare();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await testGetSplitStatus();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testSearchKnownUsers();
      break;
  }

  logSection('Test Suite Complete');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  testCreateSplit,
  testBatchInvite,
  testPayParticipantShare,
  testGetSplitStatus,
  testSearchKnownUsers,
  testCompleteFlow,
};
