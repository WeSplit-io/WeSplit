/**
 * Get User Referral Code Script
 * Retrieves the referral code for a specific user from Firestore
 * 
 * Usage:
 *   node get-referral-code.js GymQMVM4niW8v1DdEwNSnY5VePq1
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function getUserReferralCode(userId) {
  try {
    console.log(`🔍 Fetching user data for: ${userId}\n`);
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`❌ User with ID ${userId} not found`);
      return null;
    }
    
    const userData = userDoc.data();
    const referralCode = userData?.referral_code;
    
    console.log('📊 User Information:');
    console.log(`   Name: ${userData?.name || 'N/A'}`);
    console.log(`   Email: ${userData?.email || 'N/A'}`);
    console.log(`   User ID: ${userId}`);
    
    if (referralCode) {
      console.log(`\n✅ Referral Code: ${referralCode}`);
      return referralCode;
    } else {
      console.log(`\n⚠️  User exists but has no referral code`);
      console.log(`\n💡 You can generate one using the referral service`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching user referral code:', error.message);
    throw error;
  }
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a user ID as an argument');
  console.log('Usage: node get-referral-code.js <userId>');
  process.exit(1);
}

getUserReferralCode(userId)
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
