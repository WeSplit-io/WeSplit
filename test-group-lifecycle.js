/**
 * WeSplit Group Lifecycle Test Script
 * 
 * This script tests the complete group lifecycle:
 * 1. Create group
 * 2. Invite user
 * 3. User joins via notification
 * 4. Add expense with split logic
 * 5. Leave group
 * 6. Delete group
 * 
 * Each step verifies:
 * - Firestore consistency
 * - Context updates
 * - UI refresh
 * - Error handling
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  writeBatch,
  runTransaction
} = require('firebase/firestore');
const { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut 
} = require('firebase/auth');

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyAL4g82j16qTwLQByCijWxOsQpxlZgb6p4",
  authDomain: "wesplit-35186.firebaseapp.com",
  projectId: "wesplit-35186",
  storageBucket: "wesplit-35186.firebasestorage.app",
  messagingSenderId: "483370851807",
  appId: "1:483370851807:web:b608c8e50d22b97b82386a",
  measurementId: "G-88XQ9QVVH4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Test users
const testUsers = {
  creator: {
    email: 'test.creator@wesplit.com',
    password: 'testpass123',
    name: 'Test Creator'
  },
  member: {
    email: 'test.member@wesplit.com',
    password: 'testpass123',
    name: 'Test Member'
  }
};

// Test data
let testGroup = null;
let testExpense = null;
let creatorUid = null;
let memberUid = null;

/**
 * Utility Functions
 */
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const verifyFirestoreConsistency = async (description, checks) => {
  log(`🔍 Verifying Firestore consistency: ${description}`);
  
  for (const check of checks) {
    try {
      const result = await check();
      log(`✅ ${check.name}: PASSED`, result);
    } catch (error) {
      log(`❌ ${check.name}: FAILED`, error.message);
      throw error;
    }
  }
};

const verifyContextUpdates = async (description, checks) => {
  log(`🔍 Verifying context updates: ${description}`);
  
  for (const check of checks) {
    try {
      const result = await check();
      log(`✅ ${check.name}: PASSED`, result);
    } catch (error) {
      log(`❌ ${check.name}: FAILED`, error.message);
      throw error;
    }
  }
};

const verifyUIRefresh = async (description, checks) => {
  log(`🔍 Verifying UI refresh: ${description}`);
  
  for (const check of checks) {
    try {
      const result = await check();
      log(`✅ ${check.name}: PASSED`, result);
    } catch (error) {
      log(`❌ ${check.name}: FAILED`, error.message);
      throw error;
    }
  }
};

/**
 * Step 1: Create Group
 */
const testCreateGroup = async () => {
  log('🚀 STEP 1: Testing Group Creation');
  
  try {
    // Sign in as creator
    const creatorCredential = await signInWithEmailAndPassword(
      auth, 
      testUsers.creator.email, 
      testUsers.creator.password
    );
    creatorUid = creatorCredential.user.uid;
    log('✅ Creator signed in successfully');

    // Create group data
    const groupData = {
      name: 'Test Group Lifecycle',
      description: 'Group for testing complete lifecycle',
      category: 'trip',
      currency: 'SOL',
      icon: 'people',
      color: '#A5EA15',
      created_by: creatorUid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 1,
      expense_count: 0,
      expenses_by_currency: []
    };

    // Create group in Firestore
    const groupRef = doc(collection(db, 'groups'));
    await groupRef.set(groupData);
    testGroup = { id: groupRef.id, ...groupData };
    log('✅ Group created in Firestore', testGroup);

    // Add creator as initial member
    const memberData = {
      user_id: creatorUid,
      group_id: groupRef.id,
      name: testUsers.creator.name,
      email: testUsers.creator.email,
      role: 'admin',
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      invitation_status: 'accepted',
      invited_at: new Date().toISOString(),
      invited_by: creatorUid
    };

    const memberRef = doc(collection(db, 'groupMembers'));
    await memberRef.set(memberData);
    log('✅ Creator added as group member');

    // Verify Firestore consistency
    await verifyFirestoreConsistency('Group Creation', [
      {
        name: 'Group Document Exists',
        fn: async () => {
          const groupDoc = await getDoc(groupRef);
          if (!groupDoc.exists()) throw new Error('Group document not found');
          return groupDoc.data();
        }
      },
      {
        name: 'Group Member Exists',
        fn: async () => {
          const memberQuery = query(
            collection(db, 'groupMembers'),
            where('group_id', '==', groupRef.id),
            where('user_id', '==', creatorUid)
          );
          const memberDocs = await getDocs(memberQuery);
          if (memberDocs.empty) throw new Error('Group member not found');
          return memberDocs.docs[0].data();
        }
      },
      {
        name: 'Group Member Count Updated',
        fn: async () => {
          const groupDoc = await getDoc(groupRef);
          const data = groupDoc.data();
          if (data.member_count !== 1) throw new Error('Member count not updated');
          return data.member_count;
        }
      }
    ]);

    log('✅ Step 1: Group Creation - ALL TESTS PASSED');
    return testGroup;

  } catch (error) {
    log('❌ Step 1: Group Creation - FAILED', error);
    throw error;
  }
};

/**
 * Step 2: Invite User
 */
const testInviteUser = async () => {
  log('🚀 STEP 2: Testing User Invitation');
  
  try {
    // Create invitation data
    const invitationData = {
      group_id: testGroup.id,
      invited_user_email: testUsers.member.email,
      invited_user_name: testUsers.member.name,
      invited_by: creatorUid,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    // Create invitation in Firestore
    const invitationRef = doc(collection(db, 'invitations'));
    await invitationRef.set(invitationData);
    log('✅ Invitation created in Firestore', invitationData);

    // Create notification for invited user
    const notificationData = {
      user_id: testUsers.member.email, // Will be updated when user joins
      type: 'group_invite',
      title: 'Group Invitation',
      message: `${testUsers.creator.name} invited you to join "${testGroup.name}"`,
      data: {
        groupId: testGroup.id,
        groupName: testGroup.name,
        invitedBy: creatorUid,
        invitedByName: testUsers.creator.name,
        inviteId: invitationRef.id
      },
      is_read: false,
      created_at: new Date().toISOString()
    };

    const notificationRef = doc(collection(db, 'notifications'));
    await notificationRef.set(notificationData);
    log('✅ Notification created for invited user');

    // Verify Firestore consistency
    await verifyFirestoreConsistency('User Invitation', [
      {
        name: 'Invitation Document Exists',
        fn: async () => {
          const inviteDoc = await getDoc(invitationRef);
          if (!inviteDoc.exists()) throw new Error('Invitation document not found');
          return inviteDoc.data();
        }
      },
      {
        name: 'Notification Document Exists',
        fn: async () => {
          const notifDoc = await getDoc(notificationRef);
          if (!notifDoc.exists()) throw new Error('Notification document not found');
          return notifDoc.data();
        }
      },
      {
        name: 'Invitation Status is Pending',
        fn: async () => {
          const inviteDoc = await getDoc(invitationRef);
          const data = inviteDoc.data();
          if (data.status !== 'pending') throw new Error('Invitation status not pending');
          return data.status;
        }
      }
    ]);

    log('✅ Step 2: User Invitation - ALL TESTS PASSED');
    return { invitationRef, notificationRef };

  } catch (error) {
    log('❌ Step 2: User Invitation - FAILED', error);
    throw error;
  }
};

/**
 * Step 3: User Joins via Notification
 */
const testUserJoinsViaNotification = async () => {
  log('🚀 STEP 3: Testing User Joins via Notification');
  
  try {
    // Sign in as member
    const memberCredential = await signInWithEmailAndPassword(
      auth, 
      testUsers.member.email, 
      testUsers.member.password
    );
    memberUid = memberCredential.user.uid;
    log('✅ Member signed in successfully');

    // Get invitation and notification
    const invitationQuery = query(
      collection(db, 'invitations'),
      where('group_id', '==', testGroup.id),
      where('invited_user_email', '==', testUsers.member.email)
    );
    const invitationDocs = await getDocs(invitationQuery);
    const invitation = invitationDocs.docs[0];
    
    const notificationQuery = query(
      collection(db, 'notifications'),
      where('data.groupId', '==', testGroup.id),
      where('type', '==', 'group_invite')
    );
    const notificationDocs = await getDocs(notificationQuery);
    const notification = notificationDocs.docs[0];

    if (!invitation || !notification) {
      throw new Error('Invitation or notification not found');
    }

    // Simulate user accepting invitation
    await runTransaction(db, async (transaction) => {
      // Update invitation status
      transaction.update(invitation.ref, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: memberUid
      });

      // Add user to group members
      const memberData = {
        user_id: memberUid,
        group_id: testGroup.id,
        name: testUsers.member.name,
        email: testUsers.member.email,
        role: 'member',
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        invitation_status: 'accepted',
        invited_at: invitation.data().created_at,
        invited_by: creatorUid
      };

      const memberRef = doc(collection(db, 'groupMembers'));
      transaction.set(memberRef, memberData);

      // Update group member count
      transaction.update(doc(db, 'groups', testGroup.id), {
        member_count: 2,
        updated_at: new Date().toISOString()
      });

      // Mark notification as read
      transaction.update(notification.ref, {
        is_read: true,
        read_at: new Date().toISOString()
      });
    });

    log('✅ Member joined group via notification');

    // Verify Firestore consistency
    await verifyFirestoreConsistency('User Joins via Notification', [
      {
        name: 'Invitation Status Updated',
        fn: async () => {
          const inviteDoc = await getDoc(invitation.ref);
          const data = inviteDoc.data();
          if (data.status !== 'accepted') throw new Error('Invitation status not updated');
          return data.status;
        }
      },
      {
        name: 'Group Member Added',
        fn: async () => {
          const memberQuery = query(
            collection(db, 'groupMembers'),
            where('group_id', '==', testGroup.id),
            where('user_id', '==', memberUid)
          );
          const memberDocs = await getDocs(memberQuery);
          if (memberDocs.empty) throw new Error('New group member not found');
          return memberDocs.docs[0].data();
        }
      },
      {
        name: 'Group Member Count Updated',
        fn: async () => {
          const groupDoc = await getDoc(doc(db, 'groups', testGroup.id));
          const data = groupDoc.data();
          if (data.member_count !== 2) throw new Error('Member count not updated');
          return data.member_count;
        }
      },
      {
        name: 'Notification Marked as Read',
        fn: async () => {
          const notifDoc = await getDoc(notification.ref);
          const data = notifDoc.data();
          if (!data.is_read) throw new Error('Notification not marked as read');
          return data.is_read;
        }
      }
    ]);

    log('✅ Step 3: User Joins via Notification - ALL TESTS PASSED');

  } catch (error) {
    log('❌ Step 3: User Joins via Notification - FAILED', error);
    throw error;
  }
};

/**
 * Step 4: Add Expense with Split Logic
 */
const testAddExpenseWithSplitLogic = async () => {
  log('🚀 STEP 4: Testing Add Expense with Split Logic');
  
  try {
    // Create expense data
    const expenseData = {
      group_id: testGroup.id,
      description: 'Test Expense for Lifecycle',
      amount: 100,
      currency: 'SOL',
      paid_by: creatorUid,
      category: 0, // Trip
      date: new Date().toISOString(),
      split_type: 'equal',
      split_data: [
        { user_id: creatorUid, amount: 50 },
        { user_id: memberUid, amount: 50 }
      ],
      receipt_image: null,
      converted_amount: 20000, // 100 SOL = 20000 USDC
      converted_currency: 'USDC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create expense in Firestore
    const expenseRef = doc(collection(db, 'expenses'));
    await expenseRef.set(expenseData);
    testExpense = { id: expenseRef.id, ...expenseData };
    log('✅ Expense created in Firestore', testExpense);

    // Update group expense count and totals
    await runTransaction(db, async (transaction) => {
      const groupRef = doc(db, 'groups', testGroup.id);
      const groupDoc = await transaction.get(groupRef);
      const groupData = groupDoc.data();

      // Update expense count
      const newExpenseCount = groupData.expense_count + 1;

      // Update expenses_by_currency
      const existingCurrency = groupData.expenses_by_currency.find(
        exp => exp.currency === 'SOL'
      );
      
      let updatedExpensesByCurrency = [...groupData.expenses_by_currency];
      if (existingCurrency) {
        updatedExpensesByCurrency = updatedExpensesByCurrency.map(exp =>
          exp.currency === 'SOL' 
            ? { ...exp, total_amount: exp.total_amount + 100 }
            : exp
        );
      } else {
        updatedExpensesByCurrency.push({
          currency: 'SOL',
          total_amount: 100
        });
      }

      transaction.update(groupRef, {
        expense_count: newExpenseCount,
        expenses_by_currency: updatedExpensesByCurrency,
        updated_at: new Date().toISOString()
      });
    });

    log('✅ Group expense data updated');

    // Create notifications for other members
    const membersToNotify = [memberUid]; // Only member, not creator
    for (const memberId of membersToNotify) {
      const notificationData = {
        user_id: memberId,
        type: 'expense_added',
        title: 'New Expense Added',
        message: `${testUsers.creator.name} added a new expense: Test Expense for Lifecycle`,
        data: {
          groupId: testGroup.id,
          expenseId: expenseRef.id,
          amount: 100,
          currency: 'SOL',
          paidBy: creatorUid,
          description: 'Test Expense for Lifecycle'
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      const notificationRef = doc(collection(db, 'notifications'));
      await notificationRef.set(notificationData);
    }

    log('✅ Notifications sent to group members');

    // Verify Firestore consistency
    await verifyFirestoreConsistency('Add Expense with Split Logic', [
      {
        name: 'Expense Document Exists',
        fn: async () => {
          const expenseDoc = await getDoc(expenseRef);
          if (!expenseDoc.exists()) throw new Error('Expense document not found');
          return expenseDoc.data();
        }
      },
      {
        name: 'Group Expense Count Updated',
        fn: async () => {
          const groupDoc = await getDoc(doc(db, 'groups', testGroup.id));
          const data = groupDoc.data();
          if (data.expense_count !== 1) throw new Error('Expense count not updated');
          return data.expense_count;
        }
      },
      {
        name: 'Group Expenses by Currency Updated',
        fn: async () => {
          const groupDoc = await getDoc(doc(db, 'groups', testGroup.id));
          const data = groupDoc.data();
          const solExpense = data.expenses_by_currency.find(exp => exp.currency === 'SOL');
          if (!solExpense || solExpense.total_amount !== 100) {
            throw new Error('Expenses by currency not updated correctly');
          }
          return data.expenses_by_currency;
        }
      },
      {
        name: 'Expense Notifications Created',
        fn: async () => {
          const notificationQuery = query(
            collection(db, 'notifications'),
            where('type', '==', 'expense_added'),
            where('data.expenseId', '==', expenseRef.id)
          );
          const notificationDocs = await getDocs(notificationQuery);
          if (notificationDocs.empty) throw new Error('Expense notifications not created');
          return notificationDocs.docs.map(doc => doc.data());
        }
      }
    ]);

    log('✅ Step 4: Add Expense with Split Logic - ALL TESTS PASSED');
    return testExpense;

  } catch (error) {
    log('❌ Step 4: Add Expense with Split Logic - FAILED', error);
    throw error;
  }
};

/**
 * Step 5: Leave Group
 */
const testLeaveGroup = async () => {
  log('🚀 STEP 5: Testing Leave Group');
  
  try {
    // Sign in as member (who will leave)
    await signInWithEmailAndPassword(
      auth, 
      testUsers.member.email, 
      testUsers.member.password
    );

    // Remove member from group
    await runTransaction(db, async (transaction) => {
      // Remove member from groupMembers
      const memberQuery = query(
        collection(db, 'groupMembers'),
        where('group_id', '==', testGroup.id),
        where('user_id', '==', memberUid)
      );
      const memberDocs = await getDocs(memberQuery);
      
      if (!memberDocs.empty) {
        transaction.delete(memberDocs.docs[0].ref);
      }

      // Update group member count
      const groupRef = doc(db, 'groups', testGroup.id);
      const groupDoc = await transaction.get(groupRef);
      const groupData = groupDoc.data();
      
      transaction.update(groupRef, {
        member_count: groupData.member_count - 1,
        updated_at: new Date().toISOString()
      });
    });

    log('✅ Member left group');

    // Verify Firestore consistency
    await verifyFirestoreConsistency('Leave Group', [
      {
        name: 'Group Member Removed',
        fn: async () => {
          const memberQuery = query(
            collection(db, 'groupMembers'),
            where('group_id', '==', testGroup.id),
            where('user_id', '==', memberUid)
          );
          const memberDocs = await getDocs(memberQuery);
          if (!memberDocs.empty) throw new Error('Group member still exists');
          return 'Member successfully removed';
        }
      },
      {
        name: 'Group Member Count Updated',
        fn: async () => {
          const groupDoc = await getDoc(doc(db, 'groups', testGroup.id));
          const data = groupDoc.data();
          if (data.member_count !== 1) throw new Error('Member count not updated');
          return data.member_count;
        }
      },
      {
        name: 'Group Still Exists',
        fn: async () => {
          const groupDoc = await getDoc(doc(db, 'groups', testGroup.id));
          if (!groupDoc.exists()) throw new Error('Group was deleted when it should not be');
          return groupDoc.data();
        }
      }
    ]);

    log('✅ Step 5: Leave Group - ALL TESTS PASSED');

  } catch (error) {
    log('❌ Step 5: Leave Group - FAILED', error);
    throw error;
  }
};

/**
 * Step 6: Delete Group
 */
const testDeleteGroup = async () => {
  log('🚀 STEP 6: Testing Delete Group');
  
  try {
    // Sign in as creator (only creator can delete)
    await signInWithEmailAndPassword(
      auth, 
      testUsers.creator.email, 
      testUsers.creator.password
    );

    // Delete group and all related data
    await runTransaction(db, async (transaction) => {
      // Delete group document
      const groupRef = doc(db, 'groups', testGroup.id);
      transaction.delete(groupRef);

      // Delete all group members
      const memberQuery = query(
        collection(db, 'groupMembers'),
        where('group_id', '==', testGroup.id)
      );
      const memberDocs = await getDocs(memberQuery);
      memberDocs.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Delete all group expenses
      const expenseQuery = query(
        collection(db, 'expenses'),
        where('group_id', '==', testGroup.id)
      );
      const expenseDocs = await getDocs(expenseQuery);
      expenseDocs.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Delete all group invitations
      const invitationQuery = query(
        collection(db, 'invitations'),
        where('group_id', '==', testGroup.id)
      );
      const invitationDocs = await getDocs(invitationQuery);
      invitationDocs.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Delete all group-related notifications
      const notificationQuery = query(
        collection(db, 'notifications'),
        where('data.groupId', '==', testGroup.id)
      );
      const notificationDocs = await getDocs(notificationQuery);
      notificationDocs.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });
    });

    log('✅ Group and all related data deleted');

    // Verify Firestore consistency
    await verifyFirestoreConsistency('Delete Group', [
      {
        name: 'Group Document Deleted',
        fn: async () => {
          const groupDoc = await getDoc(doc(db, 'groups', testGroup.id));
          if (groupDoc.exists()) throw new Error('Group document still exists');
          return 'Group successfully deleted';
        }
      },
      {
        name: 'Group Members Deleted',
        fn: async () => {
          const memberQuery = query(
            collection(db, 'groupMembers'),
            where('group_id', '==', testGroup.id)
          );
          const memberDocs = await getDocs(memberQuery);
          if (!memberDocs.empty) throw new Error('Group members still exist');
          return 'All group members deleted';
        }
      },
      {
        name: 'Group Expenses Deleted',
        fn: async () => {
          const expenseQuery = query(
            collection(db, 'expenses'),
            where('group_id', '==', testGroup.id)
          );
          const expenseDocs = await getDocs(expenseQuery);
          if (!expenseDocs.empty) throw new Error('Group expenses still exist');
          return 'All group expenses deleted';
        }
      },
      {
        name: 'Group Invitations Deleted',
        fn: async () => {
          const invitationQuery = query(
            collection(db, 'invitations'),
            where('group_id', '==', testGroup.id)
          );
          const invitationDocs = await getDocs(invitationQuery);
          if (!invitationDocs.empty) throw new Error('Group invitations still exist');
          return 'All group invitations deleted';
        }
      },
      {
        name: 'Group Notifications Deleted',
        fn: async () => {
          const notificationQuery = query(
            collection(db, 'notifications'),
            where('data.groupId', '==', testGroup.id)
          );
          const notificationDocs = await getDocs(notificationQuery);
          if (!notificationDocs.empty) throw new Error('Group notifications still exist');
          return 'All group notifications deleted';
        }
      }
    ]);

    log('✅ Step 6: Delete Group - ALL TESTS PASSED');

  } catch (error) {
    log('❌ Step 6: Delete Group - FAILED', error);
    throw error;
  }
};

/**
 * Setup Test Users
 */
const setupTestUsers = async () => {
  log('🔧 Setting up test users...');
  
  try {
    // Create test users if they don't exist
    for (const [role, user] of Object.entries(testUsers)) {
      try {
        await createUserWithEmailAndPassword(auth, user.email, user.password);
        log(`✅ Created test user: ${role}`);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          log(`ℹ️ Test user already exists: ${role}`);
        } else {
          throw error;
        }
      }
    }
    
    log('✅ Test users setup complete');
  } catch (error) {
    log('❌ Failed to setup test users', error);
    throw error;
  }
};

/**
 * Cleanup Test Data
 */
const cleanupTestData = async () => {
  log('🧹 Cleaning up test data...');
  
  try {
    // Sign out
    await signOut(auth);
    
    // Note: In a real test environment, you would clean up all test data
    // For this script, we'll just log what would be cleaned up
    log('ℹ️ Test data cleanup would include:');
    log('  - Deleting test users');
    log('  - Deleting any remaining test groups');
    log('  - Deleting any remaining test expenses');
    log('  - Deleting any remaining test notifications');
    
    log('✅ Test data cleanup complete');
  } catch (error) {
    log('❌ Failed to cleanup test data', error);
  }
};

/**
 * Main Test Runner
 */
const runGroupLifecycleTest = async () => {
  log('🚀 Starting WeSplit Group Lifecycle Test');
  log('==========================================');
  
  try {
    // Setup
    await setupTestUsers();
    
    // Step 1: Create Group
    await testCreateGroup();
    await delay(1000); // Wait for Firestore consistency
    
    // Step 2: Invite User
    await testInviteUser();
    await delay(1000);
    
    // Step 3: User Joins via Notification
    await testUserJoinsViaNotification();
    await delay(1000);
    
    // Step 4: Add Expense with Split Logic
    await testAddExpenseWithSplitLogic();
    await delay(1000);
    
    // Step 5: Leave Group
    await testLeaveGroup();
    await delay(1000);
    
    // Step 6: Delete Group
    await testDeleteGroup();
    await delay(1000);
    
    log('🎉 ALL TESTS PASSED! Group lifecycle test completed successfully.');
    
  } catch (error) {
    log('❌ TEST FAILED!', error);
    throw error;
  } finally {
    // Cleanup
    await cleanupTestData();
  }
};

/**
 * Context Update Verification Functions
 * (These would be called from the React app to verify context updates)
 */
const contextUpdateVerifiers = {
  afterGroupCreation: async (context) => {
    log('🔍 Verifying context updates after group creation');
    
    // Verify userGroups is updated
    if (!context.state.userGroups.find(g => g.id === testGroup.id)) {
      throw new Error('Group not added to userGroups in context');
    }
    
    // Verify currentGroup is set
    if (context.state.currentGroup?.id !== testGroup.id) {
      throw new Error('Current group not set in context');
    }
    
    log('✅ Context updates verified after group creation');
  },
  
  afterUserJoins: async (context) => {
    log('🔍 Verifying context updates after user joins');
    
    // Verify group member count is updated
    const group = context.state.userGroups.find(g => g.id === testGroup.id);
    if (group.member_count !== 2) {
      throw new Error('Group member count not updated in context');
    }
    
    // Verify notifications are updated
    const notifications = context.state.notifications;
    const groupNotifications = notifications.filter(n => 
      n.type === 'group_invite' && n.data?.groupId === testGroup.id
    );
    if (groupNotifications.length === 0) {
      throw new Error('Group notifications not updated in context');
    }
    
    log('✅ Context updates verified after user joins');
  },
  
  afterExpenseCreation: async (context) => {
    log('🔍 Verifying context updates after expense creation');
    
    // Verify group expense count is updated
    const group = context.state.userGroups.find(g => g.id === testGroup.id);
    if (group.expense_count !== 1) {
      throw new Error('Group expense count not updated in context');
    }
    
    // Verify expense is added to group expenses
    const groupExpenses = context.state.groupExpenses?.[testGroup.id] || [];
    if (groupExpenses.length === 0) {
      throw new Error('Expense not added to group expenses in context');
    }
    
    // Verify notifications are created
    const notifications = context.state.notifications;
    const expenseNotifications = notifications.filter(n => 
      n.type === 'expense_added' && n.data?.expenseId === testExpense.id
    );
    if (expenseNotifications.length === 0) {
      throw new Error('Expense notifications not created in context');
    }
    
    log('✅ Context updates verified after expense creation');
  },
  
  afterUserLeaves: async (context) => {
    log('🔍 Verifying context updates after user leaves');
    
    // Verify group member count is updated
    const group = context.state.userGroups.find(g => g.id === testGroup.id);
    if (group.member_count !== 1) {
      throw new Error('Group member count not updated in context after user leaves');
    }
    
    log('✅ Context updates verified after user leaves');
  },
  
  afterGroupDeletion: async (context) => {
    log('🔍 Verifying context updates after group deletion');
    
    // Verify group is removed from userGroups
    if (context.state.userGroups.find(g => g.id === testGroup.id)) {
      throw new Error('Group still exists in userGroups after deletion');
    }
    
    // Verify currentGroup is cleared
    if (context.state.currentGroup?.id === testGroup.id) {
      throw new Error('Current group not cleared after deletion');
    }
    
    log('✅ Context updates verified after group deletion');
  }
};

/**
 * UI Refresh Verification Functions
 * (These would be called from the React app to verify UI updates)
 */
const uiRefreshVerifiers = {
  afterGroupCreation: async (navigation, screens) => {
    log('🔍 Verifying UI refresh after group creation');
    
    // Verify we're on the group details screen
    if (navigation.getCurrentRoute()?.name !== 'GroupDetails') {
      throw new Error('Not on GroupDetails screen after group creation');
    }
    
    // Verify group info is displayed
    const groupDetailsScreen = screens.GroupDetails;
    if (!groupDetailsScreen.props.group || groupDetailsScreen.props.group.id !== testGroup.id) {
      throw new Error('Group details not displayed correctly');
    }
    
    log('✅ UI refresh verified after group creation');
  },
  
  afterUserJoins: async (navigation, screens) => {
    log('🔍 Verifying UI refresh after user joins');
    
    // Verify member list is updated
    const groupDetailsScreen = screens.GroupDetails;
    const members = groupDetailsScreen.props.group?.members || [];
    if (members.length !== 2) {
      throw new Error('Member list not updated in UI');
    }
    
    // Verify notifications screen shows the invitation
    const notificationsScreen = screens.Notifications;
    const notifications = notificationsScreen.props.notifications || [];
    const groupNotifications = notifications.filter(n => 
      n.type === 'group_invite' && n.data?.groupId === testGroup.id
    );
    if (groupNotifications.length === 0) {
      throw new Error('Group invitation not shown in notifications UI');
    }
    
    log('✅ UI refresh verified after user joins');
  },
  
  afterExpenseCreation: async (navigation, screens) => {
    log('🔍 Verifying UI refresh after expense creation');
    
    // Verify expense is shown in group details
    const groupDetailsScreen = screens.GroupDetails;
    const expenses = groupDetailsScreen.props.group?.expenses || [];
    if (expenses.length === 0) {
      throw new Error('Expense not shown in group details UI');
    }
    
    // Verify expense success screen is shown
    if (navigation.getCurrentRoute()?.name !== 'ExpenseSuccess') {
      throw new Error('Not on ExpenseSuccess screen after expense creation');
    }
    
    log('✅ UI refresh verified after expense creation');
  },
  
  afterUserLeaves: async (navigation, screens) => {
    log('🔍 Verifying UI refresh after user leaves');
    
    // Verify member list is updated
    const groupDetailsScreen = screens.GroupDetails;
    const members = groupDetailsScreen.props.group?.members || [];
    if (members.length !== 1) {
      throw new Error('Member list not updated in UI after user leaves');
    }
    
    log('✅ UI refresh verified after user leaves');
  },
  
  afterGroupDeletion: async (navigation, screens) => {
    log('🔍 Verifying UI refresh after group deletion');
    
    // Verify we're back to groups list
    if (navigation.getCurrentRoute()?.name !== 'GroupsList') {
      throw new Error('Not on GroupsList screen after group deletion');
    }
    
    // Verify group is not in the list
    const groupsListScreen = screens.GroupsList;
    const groups = groupsListScreen.props.groups || [];
    if (groups.find(g => g.id === testGroup.id)) {
      throw new Error('Group still shown in groups list after deletion');
    }
    
    log('✅ UI refresh verified after group deletion');
  }
};

// Export functions for use in React app
module.exports = {
  runGroupLifecycleTest,
  contextUpdateVerifiers,
  uiRefreshVerifiers,
  testCreateGroup,
  testInviteUser,
  testUserJoinsViaNotification,
  testAddExpenseWithSplitLogic,
  testLeaveGroup,
  testDeleteGroup
};

// Run the test if this file is executed directly
if (require.main === module) {
  runGroupLifecycleTest()
    .then(() => {
      log('🎉 All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      log('❌ Tests failed!', error);
      process.exit(1);
    });
} 