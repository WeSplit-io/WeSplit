/**
 * Script to check what data exists in Firestore
 * This will help us understand if the data migration is needed
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(require('./backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json'))
});

const db = admin.firestore();

async function checkFirestoreData() {
  try {
    console.log('🔍 Checking Firestore data...\n');
    
    // Check users collection
    console.log('📊 USERS COLLECTION:');
    const usersSnapshot = await db.collection('users').get();
    console.log(`   Found ${usersSnapshot.docs.length} users`);
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - User ${doc.id}: ${data.name || data.email || 'Unknown'} (${data.email})`);
    });
    
    // Check groups collection
    console.log('\n📊 GROUPS COLLECTION:');
    const groupsSnapshot = await db.collection('groups').get();
    console.log(`   Found ${groupsSnapshot.docs.length} groups`);
    groupsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - Group ${doc.id}: ${data.name || 'Unnamed'} (created by: ${data.created_by})`);
    });
    
    // Check groupMembers collection
    console.log('\n📊 GROUP MEMBERS COLLECTION:');
    const groupMembersSnapshot = await db.collection('groupMembers').get();
    console.log(`   Found ${groupMembersSnapshot.docs.length} group memberships`);
    groupMembersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - Membership ${doc.id}: User ${data.user_id} in Group ${data.group_id}`);
    });
    
    // Check expenses collection
    console.log('\n📊 EXPENSES COLLECTION:');
    const expensesSnapshot = await db.collection('expenses').get();
    console.log(`   Found ${expensesSnapshot.docs.length} expenses`);
    expensesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - Expense ${doc.id}: ${data.description || 'No description'} (${data.amount} ${data.currency}) in Group ${data.group_id}`);
    });
    
    // Check verification codes collection
    console.log('\n📊 VERIFICATION CODES COLLECTION:');
    const verificationCodesSnapshot = await db.collection('verificationCodes').get();
    console.log(`   Found ${verificationCodesSnapshot.docs.length} verification codes`);
    
    // Check invites collection
    console.log('\n📊 INVITES COLLECTION:');
    const invitesSnapshot = await db.collection('invites').get();
    console.log(`   Found ${invitesSnapshot.docs.length} invites`);
    
    console.log('\n✅ Firestore data check completed!');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   Users: ${usersSnapshot.docs.length}`);
    console.log(`   Groups: ${groupsSnapshot.docs.length}`);
    console.log(`   Group Memberships: ${groupMembersSnapshot.docs.length}`);
    console.log(`   Expenses: ${expensesSnapshot.docs.length}`);
    console.log(`   Verification Codes: ${verificationCodesSnapshot.docs.length}`);
    console.log(`   Invites: ${invitesSnapshot.docs.length}`);
    
  } catch (error) {
    console.error('❌ Error checking Firestore data:', error);
  }
}

// Run the check
checkFirestoreData(); 