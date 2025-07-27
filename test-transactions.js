const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

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

// Fonction pour créer des transactions de test
async function createTestTransactions() {
  try {
    console.log('🔄 Creating test transactions...');
    
    const testTransactions = [
      {
        type: 'send',
        amount: 50.00,
        currency: 'USDC',
        from_user: '1', // ID de l'utilisateur test
        to_user: 'John Doe',
        from_wallet: '0x1234567890abcdef',
        to_wallet: '0xabcdef1234567890',
        tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        note: 'Payment for dinner',
        status: 'completed',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      },
      {
        type: 'receive',
        amount: 25.00,
        currency: 'USDC',
        from_user: 'Jane Smith',
        to_user: '1', // ID de l'utilisateur test
        from_wallet: '0xabcdef1234567890',
        to_wallet: '0x1234567890abcdef',
        tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        note: 'Split payment',
        status: 'completed',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      },
      {
        type: 'deposit',
        amount: 100.00,
        currency: 'USDC',
        from_user: 'MoonPay',
        to_user: '1', // ID de l'utilisateur test
        from_wallet: '0x0000000000000000000000000000000000000000',
        to_wallet: '0x1234567890abcdef',
        tx_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        note: 'Top up via MoonPay',
        status: 'completed',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      },
      {
        type: 'withdraw',
        amount: 30.00,
        currency: 'USDC',
        from_user: '1', // ID de l'utilisateur test
        to_user: 'External Wallet',
        from_wallet: '0x1234567890abcdef',
        to_wallet: '0x2222222222222222222222222222222222222222',
        tx_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        note: 'Withdrawal to external wallet',
        status: 'completed',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
    ];

    const transactionsRef = collection(db, 'transactions');
    
    for (const transaction of testTransactions) {
      const docRef = await addDoc(transactionsRef, transaction);
      console.log('✅ Created transaction:', docRef.id, transaction.type, transaction.amount);
    }
    
    console.log('✅ All test transactions created successfully!');
    console.log('📱 Now check the Transaction History screen in your app');
    
  } catch (error) {
    console.error('❌ Error creating test transactions:', error);
  }
}

// Exécuter le script
createTestTransactions(); 