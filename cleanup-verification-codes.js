/**
 * Script to clean up duplicate verification codes in Firestore
 * Run this script to remove old verification codes and fix the duplicate email issue
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   // or use service account file:
//   // credential: admin.credential.cert(require('./path/to/serviceAccountKey.json'))
// });

const db = admin.firestore();

async function cleanupVerificationCodes() {
  try {
    console.log('🧹 Starting cleanup of verification codes...');
    
    // Get all verification codes
    const verificationRef = db.collection('verificationCodes');
    const snapshot = await verificationRef.get();
    
    console.log(`Found ${snapshot.docs.length} total verification codes`);
    
    // Group by email
    const codesByEmail = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      
      if (!codesByEmail[email]) {
        codesByEmail[email] = [];
      }
      
      codesByEmail[email].push({
        id: doc.id,
        ...data
      });
    });
    
    // Clean up each email
    for (const [email, codes] of Object.entries(codesByEmail)) {
      console.log(`\n📧 Processing email: ${email}`);
      console.log(`   Found ${codes.length} codes`);
      
      // Sort by creation time (newest first)
      codes.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      
      // Keep only the newest unused code, delete the rest
      let keptCode = null;
      const codesToDelete = [];
      
      for (const code of codes) {
        if (!code.used && !keptCode) {
          keptCode = code;
          console.log(`   ✅ Keeping code: ${code.code} (created: ${code.createdAt})`);
        } else {
          codesToDelete.push(code);
          console.log(`   🗑️  Marking for deletion: ${code.code} (used: ${code.used}, created: ${code.createdAt})`);
        }
      }
      
      // Delete old codes
      if (codesToDelete.length > 0) {
        const deletePromises = codesToDelete.map(code => 
          verificationRef.doc(code.id).delete()
        );
        await Promise.all(deletePromises);
        console.log(`   🗑️  Deleted ${codesToDelete.length} old codes`);
      }
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupVerificationCodes(); 