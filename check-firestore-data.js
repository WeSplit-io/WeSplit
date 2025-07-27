/**
 * Script to check what data exists in Firestore
 * This will help us understand if the data migration is needed
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Configuration Firebase (remplacez par vos vraies clés)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "wesplit-xxxxx.firebaseapp.com",
  projectId: "wesplit-xxxxx",
  storageBucket: "wesplit-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fonction pour vérifier les données dans Firestore
async function checkFirestoreData() {
  try {
    console.log('🔍 Checking Firestore data...');
    
    // Vérifier la collection transactions
    const transactionsRef = collection(db, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    console.log('📊 Found', transactionsSnapshot.docs.length, 'transactions in Firestore');
    
    if (transactionsSnapshot.docs.length > 0) {
      console.log('📋 Transaction details:');
      transactionsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Type: ${data.type}`);
        console.log(`     Amount: ${data.amount}`);
        console.log(`     From: ${data.from_user}`);
        console.log(`     To: ${data.to_user}`);
        console.log(`     Status: ${data.status}`);
        console.log(`     Created: ${data.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No transactions found in Firestore');
      console.log('💡 Run test-transactions.js to create test data');
    }
    
    // Vérifier la collection users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log('👥 Found', usersSnapshot.docs.length, 'users in Firestore');
    
    if (usersSnapshot.docs.length > 0) {
      console.log('📋 User details:');
      usersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Name: ${data.name}`);
        console.log(`     Email: ${data.email}`);
        console.log(`     Wallet: ${data.wallet_address}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Firestore data:', error);
  }
}

// Exécuter le script
checkFirestoreData(); 