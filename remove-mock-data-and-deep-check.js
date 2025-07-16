const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (you'll need to add your service account key)
// const serviceAccount = require('./path-to-your-service-account-key.json');
// initializeApp({
//   credential: cert(serviceAccount)
// });

// For now, we'll create a mock version that can be run with proper credentials
const db = getFirestore();

console.log('🔍 DEEP CHECK: Starting comprehensive group process analysis...\n');

// 1. REMOVE ALL MOCK DATA
async function removeMockData() {
  console.log('🗑️  STEP 1: Removing all mock data...\n');
  
  try {
    // Remove mock users
    console.log('📊 Removing mock users...');
    const usersSnapshot = await db.collection('users').get();
    let mockUsersRemoved = 0;
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      if (data.email && (
        data.email.includes('example.com') || 
        data.email.includes('test') ||
        data.name === 'John Doe' ||
        data.name === 'Jane Smith' ||
        data.name === 'Bob Johnson' ||
        data.wallet_address?.includes('mock') ||
        data.wallet_address?.includes('wallet1') ||
        data.wallet_address?.includes('wallet2') ||
        data.wallet_address?.includes('wallet3')
      )) {
        await doc.ref.delete();
        mockUsersRemoved++;
        console.log(`   ❌ Removed mock user: ${data.name || data.email}`);
      }
    }
    console.log(`   ✅ Removed ${mockUsersRemoved} mock users\n`);
    
    // Remove mock groups
    console.log('📊 Removing mock groups...');
    const groupsSnapshot = await db.collection('groups').get();
    let mockGroupsRemoved = 0;
    
    for (const doc of groupsSnapshot.docs) {
      const data = doc.data();
      if (data.name && (
        data.name === 'Weekend Trip' ||
        data.name === 'Dinner Group' ||
        data.name === 'Test Group' ||
        data.name.includes('Sample') ||
        data.name.includes('Mock')
      )) {
        await doc.ref.delete();
        mockGroupsRemoved++;
        console.log(`   ❌ Removed mock group: ${data.name}`);
      }
    }
    console.log(`   ✅ Removed ${mockGroupsRemoved} mock groups\n`);
    
    // Remove mock expenses
    console.log('📊 Removing mock expenses...');
    const expensesSnapshot = await db.collection('expenses').get();
    let mockExpensesRemoved = 0;
    
    for (const doc of expensesSnapshot.docs) {
      const data = doc.data();
      if (data.description && (
        data.description === 'Hotel accommodation' ||
        data.description === 'Gas for the trip' ||
        data.description === 'Groceries for breakfast' ||
        data.description === 'Pizza dinner' ||
        data.description === 'Thai food delivery' ||
        data.description === 'Lunch' ||
        data.description === 'Coffee' ||
        data.description === 'Office supplies' ||
        data.description === 'Team dinner' ||
        data.description.includes('Sample') ||
        data.description.includes('Mock')
      )) {
        await doc.ref.delete();
        mockExpensesRemoved++;
        console.log(`   ❌ Removed mock expense: ${data.description}`);
      }
    }
    console.log(`   ✅ Removed ${mockExpensesRemoved} mock expenses\n`);
    
    // Remove orphaned group members
    console.log('📊 Cleaning up orphaned group members...');
    const groupMembersSnapshot = await db.collection('groupMembers').get();
    let orphanedMembersRemoved = 0;
    
    for (const doc of groupMembersSnapshot.docs) {
      const data = doc.data();
      
      // Check if group exists
      const groupDoc = await db.collection('groups').doc(data.group_id).get();
      if (!groupDoc.exists) {
        await doc.ref.delete();
        orphanedMembersRemoved++;
        console.log(`   ❌ Removed orphaned group member: User ${data.user_id} in non-existent group ${data.group_id}`);
      }
      
      // Check if user exists
      const userDoc = await db.collection('users').doc(data.user_id).get();
      if (!userDoc.exists) {
        await doc.ref.delete();
        orphanedMembersRemoved++;
        console.log(`   ❌ Removed orphaned group member: Non-existent user ${data.user_id} in group ${data.group_id}`);
      }
    }
    console.log(`   ✅ Removed ${orphanedMembersRemoved} orphaned group members\n`);
    
  } catch (error) {
    console.error('❌ Error removing mock data:', error);
  }
}

// 2. DEEP CHECK GROUP PROCESS
async function deepCheckGroupProcess() {
  console.log('🔍 STEP 2: Deep checking group process...\n');
  
  try {
    // Check data integrity
    console.log('📊 Checking data integrity...');
    
    const usersSnapshot = await db.collection('users').get();
    const groupsSnapshot = await db.collection('groups').get();
    const groupMembersSnapshot = await db.collection('groupMembers').get();
    const expensesSnapshot = await db.collection('expenses').get();
    
    console.log(`   📈 Total users: ${usersSnapshot.docs.length}`);
    console.log(`   📈 Total groups: ${groupsSnapshot.docs.length}`);
    console.log(`   📈 Total group memberships: ${groupMembersSnapshot.docs.length}`);
    console.log(`   📈 Total expenses: ${expensesSnapshot.docs.length}\n`);
    
    // Check group member counts
    console.log('📊 Checking group member counts...');
    const groupMemberCounts = {};
    
    for (const doc of groupMembersSnapshot.docs) {
      const data = doc.data();
      const groupId = data.group_id;
      groupMemberCounts[groupId] = (groupMemberCounts[groupId] || 0) + 1;
    }
    
    let memberCountMismatches = 0;
    for (const doc of groupsSnapshot.docs) {
      const data = doc.data();
      const actualCount = groupMemberCounts[doc.id] || 0;
      const storedCount = data.member_count || 0;
      
      if (actualCount !== storedCount) {
        memberCountMismatches++;
        console.log(`   ⚠️  Group ${data.name} (${doc.id}): stored=${storedCount}, actual=${actualCount}`);
      }
    }
    
    if (memberCountMismatches === 0) {
      console.log('   ✅ All group member counts are accurate\n');
    } else {
      console.log(`   ⚠️  Found ${memberCountMismatches} member count mismatches\n`);
    }
    
    // Check expense counts
    console.log('📊 Checking expense counts...');
    const groupExpenseCounts = {};
    
    for (const doc of expensesSnapshot.docs) {
      const data = doc.data();
      const groupId = data.group_id;
      groupExpenseCounts[groupId] = (groupExpenseCounts[groupId] || 0) + 1;
    }
    
    let expenseCountMismatches = 0;
    for (const doc of groupsSnapshot.docs) {
      const data = doc.data();
      const actualCount = groupExpenseCounts[doc.id] || 0;
      const storedCount = data.expense_count || 0;
      
      if (actualCount !== storedCount) {
        expenseCountMismatches++;
        console.log(`   ⚠️  Group ${data.name} (${doc.id}): stored=${storedCount}, actual=${actualCount}`);
      }
    }
    
    if (expenseCountMismatches === 0) {
      console.log('   ✅ All expense counts are accurate\n');
    } else {
      console.log(`   ⚠️  Found ${expenseCountMismatches} expense count mismatches\n`);
    }
    
    // Check expenses_by_currency calculations
    console.log('📊 Checking expenses_by_currency calculations...');
    let currencyMismatches = 0;
    
    for (const doc of groupsSnapshot.docs) {
      const data = doc.data();
      const groupId = doc.id;
      
      // Calculate actual expenses by currency
      const groupExpenses = expensesSnapshot.docs.filter(expDoc => expDoc.data().group_id === groupId);
      const actualCurrencyTotals = {};
      
      groupExpenses.forEach(expDoc => {
        const expData = expDoc.data();
        const currency = expData.currency || 'USDC';
        actualCurrencyTotals[currency] = (actualCurrencyTotals[currency] || 0) + expData.amount;
      });
      
      const storedCurrencyTotals = data.expenses_by_currency || [];
      const storedMap = {};
      storedCurrencyTotals.forEach(item => {
        storedMap[item.currency] = item.total_amount;
      });
      
      // Compare
      let hasMismatch = false;
      for (const [currency, actualTotal] of Object.entries(actualCurrencyTotals)) {
        const storedTotal = storedMap[currency] || 0;
        if (Math.abs(actualTotal - storedTotal) > 0.01) {
          hasMismatch = true;
          console.log(`   ⚠️  Group ${data.name} (${doc.id}) ${currency}: stored=${storedTotal}, actual=${actualTotal}`);
        }
      }
      
      if (hasMismatch) {
        currencyMismatches++;
      }
    }
    
    if (currencyMismatches === 0) {
      console.log('   ✅ All currency totals are accurate\n');
    } else {
      console.log(`   ⚠️  Found ${currencyMismatches} currency total mismatches\n`);
    }
    
    // Check data consistency
    console.log('📊 Checking data consistency...');
    
    // Check for expenses without valid group_id
    const orphanedExpenses = expensesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !groupsSnapshot.docs.find(gDoc => gDoc.id === data.group_id);
    });
    
    if (orphanedExpenses.length > 0) {
      console.log(`   ⚠️  Found ${orphanedExpenses.length} orphaned expenses (no valid group)`);
    } else {
      console.log('   ✅ No orphaned expenses found');
    }
    
    // Check for expenses without valid paid_by
    const expensesWithoutPayer = expensesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.paid_by || !usersSnapshot.docs.find(uDoc => uDoc.id === data.paid_by);
    });
    
    if (expensesWithoutPayer.length > 0) {
      console.log(`   ⚠️  Found ${expensesWithoutPayer.length} expenses without valid payer`);
    } else {
      console.log('   ✅ All expenses have valid payers');
    }
    
    // Check for group members without valid user
    const invalidGroupMembers = groupMembersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !usersSnapshot.docs.find(uDoc => uDoc.id === data.user_id);
    });
    
    if (invalidGroupMembers.length > 0) {
      console.log(`   ⚠️  Found ${invalidGroupMembers.length} group members without valid user`);
    } else {
      console.log('   ✅ All group members have valid users');
    }
    
    // Check for group members without valid group
    const invalidGroupMemberships = groupMembersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !groupsSnapshot.docs.find(gDoc => gDoc.id === data.group_id);
    });
    
    if (invalidGroupMemberships.length > 0) {
      console.log(`   ⚠️  Found ${invalidGroupMemberships.length} group memberships without valid group`);
    } else {
      console.log('   ✅ All group memberships have valid groups\n');
    }
    
  } catch (error) {
    console.error('❌ Error in deep check:', error);
  }
}

// 3. VALIDATE GROUP CREATION PROCESS
async function validateGroupCreationProcess() {
  console.log('🔍 STEP 3: Validating group creation process...\n');
  
  try {
    // Check if groups have proper creator as member
    console.log('📊 Checking group creators are members...');
    const groupsSnapshot = await db.collection('groups').get();
    let creatorNotMemberCount = 0;
    
    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;
      const creatorId = groupData.created_by;
      
      if (creatorId) {
        const memberQuery = await db.collection('groupMembers')
          .where('group_id', '==', groupId)
          .where('user_id', '==', creatorId)
          .get();
        
        if (memberQuery.empty) {
          creatorNotMemberCount++;
          console.log(`   ⚠️  Group ${groupData.name} (${groupId}): creator ${creatorId} is not a member`);
        }
      }
    }
    
    if (creatorNotMemberCount === 0) {
      console.log('   ✅ All group creators are members\n');
    } else {
      console.log(`   ⚠️  Found ${creatorNotMemberCount} groups where creator is not a member\n`);
    }
    
    // Check expense data structure
    console.log('📊 Checking expense data structure...');
    const expensesSnapshot = await db.collection('expenses').get();
    let invalidExpenses = 0;
    
    for (const doc of expensesSnapshot.docs) {
      const data = doc.data();
      const issues = [];
      
      if (!data.description) issues.push('missing description');
      if (!data.amount || data.amount <= 0) issues.push('invalid amount');
      if (!data.paid_by) issues.push('missing paid_by');
      if (!data.group_id) issues.push('missing group_id');
      if (!data.currency) issues.push('missing currency');
      
      if (issues.length > 0) {
        invalidExpenses++;
        console.log(`   ⚠️  Expense ${doc.id}: ${issues.join(', ')}`);
      }
    }
    
    if (invalidExpenses === 0) {
      console.log('   ✅ All expenses have valid data structure\n');
    } else {
      console.log(`   ⚠️  Found ${invalidExpenses} expenses with invalid data structure\n`);
    }
    
    // Check split data structure
    console.log('📊 Checking expense split data...');
    let invalidSplitData = 0;
    
    for (const doc of expensesSnapshot.docs) {
      const data = doc.data();
      
      if (data.split_data) {
        const splitData = data.split_data;
        const issues = [];
        
        if (!splitData.memberIds || !Array.isArray(splitData.memberIds)) {
          issues.push('invalid memberIds');
        }
        
        if (splitData.splitType && !['equal', 'manual'].includes(splitData.splitType)) {
          issues.push('invalid splitType');
        }
        
        if (issues.length > 0) {
          invalidSplitData++;
          console.log(`   ⚠️  Expense ${doc.id} split data: ${issues.join(', ')}`);
        }
      }
    }
    
    if (invalidSplitData === 0) {
      console.log('   ✅ All split data is valid\n');
    } else {
      console.log(`   ⚠️  Found ${invalidSplitData} expenses with invalid split data\n`);
    }
    
  } catch (error) {
    console.error('❌ Error validating group creation process:', error);
  }
}

// 4. PERFORMANCE ANALYSIS
async function performanceAnalysis() {
  console.log('🔍 STEP 4: Performance analysis...\n');
  
  try {
    const startTime = Date.now();
    
    // Test group loading performance
    console.log('📊 Testing group loading performance...');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.docs.length > 0) {
      const testUserId = usersSnapshot.docs[0].id;
      console.log(`   Testing with user: ${testUserId}`);
      
      const groupStartTime = Date.now();
      
      // Simulate getUserGroups operation
      const groupMembersRef = db.collection('groupMembers');
      const memberQuery = groupMembersRef.where('user_id', '==', testUserId);
      const memberDocs = await memberQuery.get();
      
      const groupIds = memberDocs.docs.map(doc => doc.data().group_id);
      
      const groups = [];
      for (const groupId of groupIds) {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (groupDoc.exists) {
          groups.push(groupDoc.data());
        }
      }
      
      const groupEndTime = Date.now();
      const groupLoadTime = groupEndTime - groupStartTime;
      
      console.log(`   ✅ Loaded ${groups.length} groups in ${groupLoadTime}ms`);
      
      if (groupLoadTime > 5000) {
        console.log('   ⚠️  Group loading is slow (>5s)');
      } else if (groupLoadTime > 2000) {
        console.log('   ⚠️  Group loading is moderately slow (>2s)');
      } else {
        console.log('   ✅ Group loading performance is good');
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`\n📊 Total analysis time: ${totalTime}ms`);
    
  } catch (error) {
    console.error('❌ Error in performance analysis:', error);
  }
}

// 5. RECOMMENDATIONS
function generateRecommendations() {
  console.log('🔍 STEP 5: Generating recommendations...\n');
  
  console.log('📋 RECOMMENDATIONS:');
  console.log('');
  console.log('1. 🗑️  MOCK DATA REMOVAL:');
  console.log('   ✅ Remove all mock data from Firebase');
  console.log('   ✅ Remove sample data creation from backend');
  console.log('   ✅ Remove mock wallet generation fallbacks');
  console.log('   ✅ Remove mock contact creation in settlement');
  console.log('');
  console.log('2. 🔧 DATA INTEGRITY:');
  console.log('   ✅ Implement data validation on all write operations');
  console.log('   ✅ Add automatic member count updates');
  console.log('   ✅ Add automatic expense count updates');
  console.log('   ✅ Add automatic currency total calculations');
  console.log('');
  console.log('3. 🚀 PERFORMANCE:');
  console.log('   ✅ Implement proper indexing for queries');
  console.log('   ✅ Add caching for frequently accessed data');
  console.log('   ✅ Optimize group loading with batch operations');
  console.log('   ✅ Implement pagination for large datasets');
  console.log('');
  console.log('4. 🛡️  ERROR HANDLING:');
  console.log('   ✅ Add comprehensive error handling');
  console.log('   ✅ Implement retry mechanisms for failed operations');
  console.log('   ✅ Add data validation before writes');
  console.log('   ✅ Implement rollback mechanisms');
  console.log('');
  console.log('5. 📊 MONITORING:');
  console.log('   ✅ Add performance monitoring');
  console.log('   ✅ Implement data integrity checks');
  console.log('   ✅ Add usage analytics');
  console.log('   ✅ Monitor error rates and types');
  console.log('');
}

// Main execution
async function main() {
  console.log('🚀 Starting comprehensive group process analysis...\n');
  
  try {
    // Uncomment these when you have Firebase Admin credentials
    // await removeMockData();
    // await deepCheckGroupProcess();
    // await validateGroupCreationProcess();
    // await performanceAnalysis();
    
    generateRecommendations();
    
    console.log('\n✅ Analysis completed!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Add Firebase Admin credentials to run the full analysis');
    console.log('2. Review and implement the recommendations above');
    console.log('3. Test the group creation process with real data');
    console.log('4. Monitor performance and data integrity');
    
  } catch (error) {
    console.error('❌ Error in main analysis:', error);
  }
}

// Export functions for manual execution
module.exports = {
  removeMockData,
  deepCheckGroupProcess,
  validateGroupCreationProcess,
  performanceAnalysis,
  generateRecommendations,
  main
};

// Run if called directly
if (require.main === module) {
  main();
} 