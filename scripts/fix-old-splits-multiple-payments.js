/**
 * Database Migration Script: Fix Old Splits for Multiple Payments
 * 
 * This script updates old splits to allow multiple payments by:
 * 1. Finding participants who are marked as "paid" but might need to pay more
 * 2. Updating their status to "pending" if they have remaining balance
 * 3. Optionally updating their amountOwed if needed
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
// const serviceAccount = require('./path-to-your-service-account-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const db = admin.firestore();

async function fixOldSplitsForMultiplePayments() {
  console.log('🔧 Starting migration to fix old splits for multiple payments...\n');

  try {
    // Get all split wallets
    const splitWalletsSnapshot = await db.collection('splitWallets').get();
    
    let updatedSplits = 0;
    let updatedParticipants = 0;

    for (const doc of splitWalletsSnapshot.docs) {
      const splitWallet = doc.data();
      const splitWalletId = doc.id;
      
      console.log(`\n📋 Processing split wallet: ${splitWalletId}`);
      
      let needsUpdate = false;
      const updatedParticipants = splitWallet.participants.map(participant => {
        // Check if participant is marked as "paid" but might need to pay more
        if (participant.status === 'paid' && participant.amountPaid > 0) {
          console.log(`   👤 Participant ${participant.userId} (${participant.name}):`);
          console.log(`      Current: amountOwed=${participant.amountOwed}, amountPaid=${participant.amountPaid}, status=${participant.status}`);
          
          // Option 1: Reset to pending if they want to pay more
          // Uncomment this if you want to reset all "paid" participants to "pending"
          /*
          if (participant.amountPaid >= participant.amountOwed) {
            console.log(`      ✅ Resetting to pending status`);
            needsUpdate = true;
            return {
              ...participant,
              status: 'pending'
            };
          }
          */
          
          // Option 2: Increase amountOwed for specific participants
          // This is useful if you know they need to pay more
          if (participant.userId === 'CSidsEhjn6QgtUcskHo8FxfRxFL2') {
            const newAmountOwed = participant.amountOwed + 4.8; // Add the additional amount they want to pay
            console.log(`      ✅ Increasing amountOwed from ${participant.amountOwed} to ${newAmountOwed}`);
            needsUpdate = true;
            return {
              ...participant,
              amountOwed: newAmountOwed,
              status: 'pending'
            };
          }
        }
        
        return participant;
      });

      if (needsUpdate) {
        console.log(`   💾 Updating split wallet ${splitWalletId}...`);
        await doc.ref.update({
          participants: updatedParticipants,
          updatedAt: new Date().toISOString()
        });
        updatedSplits++;
        console.log(`   ✅ Updated successfully`);
      } else {
        console.log(`   ⏭️  No updates needed`);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`   📊 Updated ${updatedSplits} split wallets`);
    console.log(`   👥 Updated ${updatedParticipants} participants`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Specific function to fix your exact split
async function fixSpecificSplit() {
  const splitWalletId = 'split_wallet_1760541485464_08lea4k1b';
  const participantId = 'CSidsEhjn6QgtUcskHo8FxfRxFL2';
  
  console.log(`🔧 Fixing specific split: ${splitWalletId}`);
  
  try {
    const docRef = db.collection('splitWallets').doc(splitWalletId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log('❌ Split wallet not found');
      return;
    }
    
    const splitWallet = doc.data();
    const updatedParticipants = splitWallet.participants.map(participant => {
      if (participant.userId === participantId) {
        console.log(`   👤 Found participant: ${participant.name}`);
        console.log(`      Before: amountOwed=${participant.amountOwed}, amountPaid=${participant.amountPaid}, status=${participant.status}`);
        
        // Increase amountOwed to allow additional payment
        const newAmountOwed = participant.amountOwed + 4.8;
        
        console.log(`      After: amountOwed=${newAmountOwed}, amountPaid=${participant.amountPaid}, status=pending`);
        
        return {
          ...participant,
          amountOwed: newAmountOwed,
          status: 'pending'
        };
      }
      return participant;
    });
    
    await docRef.update({
      participants: updatedParticipants,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Split wallet updated successfully!');
    
  } catch (error) {
    console.error('❌ Failed to update split wallet:', error);
  }
}

// Run the specific fix
if (require.main === module) {
  // Uncomment the function you want to run:
  // fixOldSplitsForMultiplePayments();
  fixSpecificSplit();
}

module.exports = { fixOldSplitsForMultiplePayments, fixSpecificSplit };
