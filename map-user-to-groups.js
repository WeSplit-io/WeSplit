/**
 * Script to map a new Firebase user to existing groups
 * This adds group memberships for a user who doesn't have any yet
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(require('./backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json'))
});

const db = admin.firestore();

async function mapUserToGroups() {
  try {
    console.log('🔍 Mapping user to groups...\n');
    
    // Configuration - update these values
    const targetUserId = 'NRR1QG3SIGMCBKlanLVZyYztQdD3'; // The new Firebase user ID
    const targetUserEmail = 'vincent@we.split'; // The user's email
    
    // Option 1: Map to specific groups by ID
    const groupIdsToJoin = ['1', '3', '5']; // Add the group IDs you want the user to join
    
    // Option 2: Map to all existing groups
    // const allGroupsSnapshot = await db.collection('groups').get();
    // const groupIdsToJoin = allGroupsSnapshot.docs.map(doc => doc.id);
    
    console.log(`📋 Mapping user ${targetUserEmail} (${targetUserId}) to ${groupIdsToJoin.length} groups`);
    
    let added = 0;
    let errors = 0;
    
    for (const groupId of groupIdsToJoin) {
      try {
        // Check if group exists
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
          console.log(`⚠️  Group ${groupId} does not exist, skipping...`);
          continue;
        }
        
        // Check if membership already exists
        const existingMembership = await db.collection('groupMembers')
          .where('user_id', '==', targetUserId)
          .where('group_id', '==', groupId)
          .get();
        
        if (!existingMembership.empty) {
          console.log(`ℹ️  User already member of group ${groupId}, skipping...`);
          continue;
        }
        
        // Add group membership
        await db.collection('groupMembers').add({
          user_id: targetUserId,
          group_id: groupId,
          joined_at: new Date().toISOString(),
          mappedAt: admin.firestore.FieldValue.serverTimestamp(),
          mappedFrom: 'manual_mapping'
        });
        
        console.log(`✅ Added user to group ${groupId}`);
        added++;
        
      } catch (error) {
        console.error(`❌ Error adding user to group ${groupId}:`, error);
        errors++;
      }
    }
    
    console.log(`\n🎉 Mapping completed!`);
    console.log(`   Added to ${added} groups`);
    console.log(`   Errors: ${errors}`);
    
    // Verify the mapping
    console.log('\n🔍 Verifying mapping...');
    const userMemberships = await db.collection('groupMembers')
      .where('user_id', '==', targetUserId)
      .get();
    
    console.log(`   User now has ${userMemberships.docs.length} group memberships:`);
    for (const membership of userMemberships.docs) {
      const data = membership.data();
      console.log(`   - Group ${data.group_id} (joined: ${data.joined_at})`);
    }
    
  } catch (error) {
    console.error('❌ Error mapping user to groups:', error);
  }
}

// Run the mapping
mapUserToGroups()
  .then(() => {
    console.log('\n✅ Mapping script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Mapping script failed:', error);
    process.exit(1);
  }); 