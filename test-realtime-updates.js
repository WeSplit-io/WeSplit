/**
 * Test script to verify real-time updates are working
 * This script simulates a user accepting a split invitation
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Firebase configuration (you'll need to add your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRealtimeUpdates() {
  try {
    console.log('🧪 Testing real-time updates...');
    
    // Replace with an actual split ID from your database
    const splitId = 'your-split-id-here';
    
    // Get the current split data
    const splitRef = doc(db, 'splits', splitId);
    const splitDoc = await getDoc(splitRef);
    
    if (!splitDoc.exists()) {
      console.error('❌ Split not found:', splitId);
      return;
    }
    
    const splitData = splitDoc.data();
    console.log('📊 Current split data:', {
      id: splitData.id,
      title: splitData.title,
      participantsCount: splitData.participants?.length || 0,
      participants: splitData.participants?.map(p => ({
        name: p.name,
        status: p.status
      }))
    });
    
    // Simulate a participant accepting the invitation
    const updatedParticipants = splitData.participants.map(participant => {
      if (participant.status === 'pending' || participant.status === 'invited') {
        return {
          ...participant,
          status: 'accepted',
          joinedAt: new Date().toISOString()
        };
      }
      return participant;
    });
    
    // Update the split with the new participant status
    await updateDoc(splitRef, {
      participants: updatedParticipants,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Split updated successfully!');
    console.log('📊 Updated participants:', updatedParticipants.map(p => ({
      name: p.name,
      status: p.status
    })));
    
    console.log('🔍 Check your app now - you should see real-time updates!');
    
  } catch (error) {
    console.error('❌ Error testing real-time updates:', error);
  }
}

// Run the test
testRealtimeUpdates();
