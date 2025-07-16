/**
 * Script to fix existing Firestore data
 * - Update group memberships with proper timestamps
 * - Fix expense group_id references
 * - Add proper member data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(require('./backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json'))
});

const db = admin.firestore();

async function fixFirestoreData() {
  try {
    console.log('🔧 Fixing Firestore data...\n');
    
    // 1. Fix group memberships - update joined_at timestamps
    console.log('📋 Fixing group memberships...');
    const groupMembersSnapshot = await db.collection('groupMembers').get();
    
    let membershipsFixed = 0;
    for (const membershipDoc of groupMembersSnapshot.docs) {
      const data = membershipDoc.data();
      
      // Check if joined_at needs fixing
      if (!data.joined_at || typeof data.joined_at === 'string') {
        await membershipDoc.ref.update({
          joined_at: admin.firestore.FieldValue.serverTimestamp(),
          fixed_at: admin.firestore.FieldValue.serverTimestamp()
        });
        membershipsFixed++;
        console.log(`✅ Fixed membership ${membershipDoc.id} for user ${data.user_id} in group ${data.group_id}`);
      }
    }
    console.log(`📊 Fixed ${membershipsFixed} group memberships\n`);
    
    // 2. Fix expenses - update group_id references
    console.log('💰 Fixing expenses...');
    const expensesSnapshot = await db.collection('expenses').get();
    
    let expensesFixed = 0;
    for (const expenseDoc of expensesSnapshot.docs) {
      const data = expenseDoc.data();
      
      // Check if group_id is undefined or needs fixing
      if (!data.group_id || data.group_id === 'undefined') {
        // Assign to a default group (group 1)
        await expenseDoc.ref.update({
          group_id: '1',
          fixed_at: admin.firestore.FieldValue.serverTimestamp()
        });
        expensesFixed++;
        console.log(`✅ Fixed expense ${expenseDoc.id}: assigned to group 1`);
      }
    }
    console.log(`📊 Fixed ${expensesFixed} expenses\n`);
    
    // 3. Add some sample expenses to groups for testing
    console.log('📝 Adding sample expenses...');
    
    
    e expenses\n`);
    
    // 4. Update group documents with proper metadata
    console.log('🏷️  Updating group metadata...');
    const groupsSnapshot = await db.collection('groups').get();
    
    let groupsUpdated = 0;
    for (const groupDoc of groupsSnapshot.docs) {
      const data = groupDoc.data();
      
      // Get member count for this group
      const memberQuery = await db.collection('groupMembers')
        .where('group_id', '==', groupDoc.id)
        .get();
      
      // Get expense count for this group
      const expenseQuery = await db.collection('expenses')
        .where('group_id', '==', groupDoc.id)
        .get();
      
      // Calculate expenses by currency
      const currencyMap = new Map();
      expenseQuery.docs.forEach(doc => {
        const expenseData = doc.data();
        const currency = expenseData.currency || 'USDC';
        const currentTotal = currencyMap.get(currency) || 0;
        currencyMap.set(currency, currentTotal + expenseData.amount);
      });
      
      const expensesByCurrency = Array.from(currencyMap.entries()).map(([currency, total]) => ({
        currency,
        total_amount: total
      }));
      
      await groupDoc.ref.update({
        member_count: memberQuery.docs.length,
        expense_count: expenseQuery.docs.length,
        expenses_by_currency: expensesByCurrency,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      groupsUpdated++;
      console.log(`✅ Updated group ${groupDoc.id} (${data.name}): ${memberQuery.docs.length} members, ${expenseQuery.docs.length} expenses`);
    }
    console.log(`📊 Updated ${groupsUpdated} groups\n`);
    
    console.log('🎉 Firestore data fix completed!');
    console.log(`📈 Summary:`);
    console.log(`   - Fixed ${membershipsFixed} group memberships`);
    console.log(`   - Fixed ${expensesFixed} expenses`);
    console.log(`   - Added ${sampleExpensesAdded} sample expenses`);
    console.log(`   - Updated ${groupsUpdated} groups`);
    
  } catch (error) {
    console.error('❌ Error fixing Firestore data:', error);
  }
}

// Run the fix
fixFirestoreData()
  .then(() => {
    console.log('\n✅ Data fix script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Data fix script failed:', error);
    process.exit(1);
  }); 