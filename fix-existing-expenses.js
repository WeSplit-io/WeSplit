// Script to fix existing expenses in Firebase
// This will set missing paid_by and splitData.memberIds for proper balance calculation

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up your service account)
// For now, this is a template - you'll need to add your Firebase config

async function fixExistingExpenses() {
  try {
    console.log('🔧 Starting to fix existing expenses...');
    
    // Get all expenses from Firebase
    const expensesSnapshot = await admin.firestore().collection('expenses').get();
    const expenses = [];
    
    expensesSnapshot.forEach(doc => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Found ${expenses.length} expenses to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const expense of expenses) {
      const needsFix = !expense.paid_by || 
                      !expense.splitData || 
                      !expense.splitData.memberIds || 
                      expense.splitData.memberIds.length === 0;
      
      if (needsFix) {
        console.log(`🔧 Fixing expense: ${expense.description} (${expense.id})`);
        
        // Get the group members for this expense
        const groupDoc = await admin.firestore()
          .collection('groups')
          .doc(expense.group_id)
          .get();
        
        if (!groupDoc.exists) {
          console.log(`❌ Group ${expense.group_id} not found for expense ${expense.id}`);
          continue;
        }
        
        const groupData = groupDoc.data();
        
        // Get group members
        const membersSnapshot = await admin.firestore()
          .collection('groupMembers')
          .where('group_id', '==', expense.group_id)
          .get();
        
        const members = [];
        membersSnapshot.forEach(doc => {
          members.push(doc.data());
        });
        
        if (members.length === 0) {
          console.log(`❌ No members found for group ${expense.group_id}`);
          continue;
        }
        
        // Set default values
        const updates = {};
        
        // Set paid_by to the first member if not set
        if (!expense.paid_by) {
          updates.paid_by = members[0].user_id;
          console.log(`  - Set paid_by to: ${members[0].user_id}`);
        }
        
        // Set splitData.memberIds to all group members if not set
        if (!expense.splitData || !expense.splitData.memberIds || expense.splitData.memberIds.length === 0) {
          const memberIds = members.map(m => m.user_id);
          const amountPerPerson = expense.amount / memberIds.length;
          
          updates.splitData = {
            memberIds: memberIds,
            amountPerPerson: amountPerPerson,
            splitType: 'equal'
          };
          
          console.log(`  - Set splitData.memberIds to: ${memberIds.join(', ')}`);
          console.log(`  - Set amountPerPerson to: ${amountPerPerson}`);
        }
        
        // Update the expense in Firebase
        await admin.firestore()
          .collection('expenses')
          .doc(expense.id)
          .update(updates);
        
        fixedCount++;
        console.log(`✅ Fixed expense ${expense.id}`);
        
      } else {
        skippedCount++;
        console.log(`⏭️  Skipping expense ${expense.id} (already has required fields)`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixedCount} expenses`);
    console.log(`⏭️  Skipped: ${skippedCount} expenses`);
    console.log(`📊 Total processed: ${expenses.length} expenses`);
    
  } catch (error) {
    console.error('❌ Error fixing expenses:', error);
  }
}

// Note: You need to initialize Firebase Admin with your service account
// Uncomment and configure the following lines with your Firebase config:

/*
const serviceAccount = require('./path/to/your/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

fixExistingExpenses();
*/

console.log('🔧 Expense fix script created!');
console.log('📝 To use this script:');
console.log('1. Get your Firebase service account key from Firebase Console');
console.log('2. Save it as serviceAccountKey.json in your project');
console.log('3. Uncomment the Firebase initialization code above');
console.log('4. Run: node fix-existing-expenses.js'); 