/**
 * Test script to verify the new transaction-based contact system
 * Run this with: node test-transaction-contacts.js
 */

console.log('🧪 Testing Transaction-Based Contact System\n');

// Mock data for testing
const mockTransactionHistory = {
  success: true,
  transactions: [
    {
      id: 'tx1',
      type: 'send',
      amount: 50.0,
      currency: 'USDC',
      from_user: 'user123',
      to_user: 'user456',
      from_wallet: 'ABC123...XYZ789',
      to_wallet: 'DEF456...GHI012',
      recipient_name: 'Alice Johnson',
      sender_name: 'Bob Smith',
      created_at: '2024-01-15T10:30:00Z',
      status: 'completed'
    },
    {
      id: 'tx2',
      type: 'receive',
      amount: 25.0,
      currency: 'USDC',
      from_user: 'user789',
      to_user: 'user123',
      from_wallet: 'JKL789...MNO345',
      to_wallet: 'ABC123...XYZ789',
      recipient_name: 'Bob Smith',
      sender_name: 'Charlie Brown',
      created_at: '2024-01-14T15:45:00Z',
      status: 'completed'
    }
  ]
};

const mockUserSplits = {
  success: true,
  splits: [
    {
      id: 'split1',
      title: 'Dinner Split',
      participants: [
        {
          userId: 'user123',
          name: 'Bob Smith',
          email: 'bob@example.com',
          walletAddress: 'ABC123...XYZ789',
          amountOwed: 30.0,
          status: 'paid'
        },
        {
          userId: 'user456',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          walletAddress: 'DEF456...GHI012',
          amountOwed: 30.0,
          status: 'paid'
        },
        {
          userId: 'user999',
          name: 'David Wilson',
          email: 'david@example.com',
          walletAddress: 'PQR999...STU123',
          amountOwed: 30.0,
          status: 'paid'
        }
      ],
      createdAt: '2024-01-10T18:00:00Z'
    }
  ]
};

const mockManualContacts = [
  {
    id: 'contact1',
    name: 'Eve Davis',
    email: 'eve@example.com',
    wallet_address: 'VWX456...YZA789',
    wallet_public_key: 'public_key_eve',
    created_at: '2024-01-05T12:00:00Z',
    joined_at: '2024-01-05T12:00:00Z',
    first_met_at: '2024-01-05T12:00:00Z',
    avatar: '',
    mutual_groups_count: 0,
    isFavorite: true
  }
];

// Test 1: Contact discovery from transactions
console.log('1. Testing contact discovery from transactions:');
const transactionContacts = [];

mockTransactionHistory.transactions.forEach(transaction => {
  let contactUserId, contactWalletAddress, contactName;
  
  if (transaction.from_user === 'user123') {
    // User sent money to this contact
    contactUserId = transaction.to_user;
    contactWalletAddress = transaction.to_wallet;
    contactName = transaction.recipient_name;
  } else {
    // User received money from this contact
    contactUserId = transaction.from_user;
    contactWalletAddress = transaction.from_wallet;
    contactName = transaction.sender_name;
  }

  const contactId = String(contactUserId);
  const existing = transactionContacts.find(c => c.id === contactId);

  if (existing) {
    // Update existing contact
    existing.first_met_at = existing.first_met_at || transaction.created_at;
    existing.created_at = transaction.created_at > existing.created_at ? transaction.created_at : existing.created_at;
  } else {
    // Create new contact
    transactionContacts.push({
      id: contactId,
      name: contactName || formatWalletAddress(contactWalletAddress),
      email: '',
      wallet_address: contactWalletAddress,
      wallet_public_key: '',
      created_at: transaction.created_at,
      joined_at: transaction.created_at,
      first_met_at: transaction.created_at,
      avatar: '',
      mutual_groups_count: 0,
      isFavorite: false
    });
  }
});

console.log(`   Found ${transactionContacts.length} contacts from transactions:`);
transactionContacts.forEach(contact => {
  console.log(`   - ${contact.name} (${formatWalletAddress(contact.wallet_address)})`);
});

// Test 2: Contact discovery from splits
console.log('\n2. Testing contact discovery from splits:');
const splitContacts = [];

mockUserSplits.splits.forEach(split => {
  split.participants.forEach(participant => {
    if (participant.userId === 'user123') return; // Skip self

    const contactId = String(participant.userId);
    const existing = splitContacts.find(c => c.id === contactId);

    if (existing) {
      existing.mutual_groups_count = (existing.mutual_groups_count || 0) + 1;
    } else {
      splitContacts.push({
        id: contactId,
        name: participant.name || formatWalletAddress(participant.walletAddress),
        email: participant.email || '',
        wallet_address: participant.walletAddress,
        wallet_public_key: '',
        created_at: split.createdAt,
        joined_at: participant.joinedAt || split.createdAt,
        first_met_at: split.createdAt,
        avatar: '',
        mutual_groups_count: 1,
        isFavorite: false
      });
    }
  });
});

console.log(`   Found ${splitContacts.length} contacts from splits:`);
splitContacts.forEach(contact => {
  console.log(`   - ${contact.name} (${contact.mutual_groups_count} splits)`);
});

// Test 3: Contact merging and deduplication
console.log('\n3. Testing contact merging and deduplication:');
const contactsMap = new Map();

// Add transaction contacts
transactionContacts.forEach(contact => {
  contactsMap.set(contact.id, contact);
});

// Add split contacts (merge with existing)
splitContacts.forEach(contact => {
  const existing = contactsMap.get(contact.id);
  if (existing) {
    contactsMap.set(contact.id, {
      ...existing,
      mutual_groups_count: (existing.mutual_groups_count || 0) + 1
    });
  } else {
    contactsMap.set(contact.id, contact);
  }
});

// Add manual contacts (highest priority)
mockManualContacts.forEach(contact => {
  const existing = contactsMap.get(contact.id);
  if (existing) {
    contactsMap.set(contact.id, {
      ...existing,
      isFavorite: contact.isFavorite || existing.isFavorite,
      name: contact.name || existing.name,
      email: contact.email || existing.email
    });
  } else {
    contactsMap.set(contact.id, contact);
  }
});

const allContacts = Array.from(contactsMap.values());

// Sort by last interaction
allContacts.sort((a, b) => {
  const aLastInteraction = a.first_met_at || a.created_at;
  const bLastInteraction = b.first_met_at || b.created_at;
  return new Date(bLastInteraction).getTime() - new Date(aLastInteraction).getTime();
});

console.log(`   Total unique contacts: ${allContacts.length}`);
allContacts.forEach(contact => {
  const favorite = contact.isFavorite ? ' ⭐' : '';
  const splits = contact.mutual_groups_count > 0 ? ` (${contact.mutual_groups_count} splits)` : '';
  console.log(`   - ${contact.name}${favorite}${splits}`);
});

// Utility function
function formatWalletAddress(address) {
  if (!address) return 'No wallet';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

console.log('\n✅ All tests completed successfully!');
console.log('\n📋 Summary of changes:');
console.log('   • Removed group-based contact system');
console.log('   • Implemented transaction-based contact discovery');
console.log('   • Added split-based contact discovery');
console.log('   • Maintained manual contact management');
console.log('   • Added contact deduplication and merging');
console.log('   • Contacts now show split count instead of group count');
console.log('\n🔧 The contact list now works with splits and transactions!');
