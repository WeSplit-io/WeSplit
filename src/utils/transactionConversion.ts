/**
 * Transaction Conversion Utilities
 * Converts Transaction type to UnifiedTransaction format for enrichment
 */

import { Transaction } from '../types';
import { UnifiedTransaction } from '../components/sharedWallet/TransactionHistoryItem';

/**
 * Convert Transaction to UnifiedTransaction format
 * Maintains backward compatibility with old transaction formats
 * Preserves group_id and request-related information
 */
export function convertTransactionToUnified(transaction: Transaction): UnifiedTransaction {
  const unified: UnifiedTransaction = {
    id: transaction.id,
    firebaseDocId: transaction.id, // Use id as firebaseDocId if available
    type: mapTransactionType(transaction.type),
    amount: transaction.amount || 0,
    currency: transaction.currency || 'USDC',
    // User information
    from_user: transaction.from_user,
    to_user: transaction.to_user,
    senderName: transaction.sender_name,
    recipientName: transaction.recipient_name,
    // Wallet addresses - critical for enrichment
    from_wallet: transaction.from_wallet || '',
    to_wallet: transaction.to_wallet || '',
    // Additional fields
    memo: transaction.note,
    note: transaction.note,
    status: mapTransactionStatus(transaction.status),
    createdAt: transaction.created_at || new Date().toISOString(),
    created_at: transaction.created_at,
    // Transaction signature/hash
    tx_hash: transaction.tx_hash,
    transactionSignature: transaction.tx_hash,
  };

  // Preserve group_id for request transactions (add as custom property)
  // We'll use this in enrichment to identify request transactions
  if (transaction.group_id) {
    (unified as any).group_id = transaction.group_id;
  }

  return unified;
}

/**
 * Map Transaction type to UnifiedTransaction type
 */
function mapTransactionType(type: Transaction['type']): UnifiedTransaction['type'] {
  switch (type) {
    case 'send':
      return 'send';
    case 'receive':
      return 'receive';
    case 'deposit':
      return 'deposit';
    case 'withdraw':
      return 'withdrawal';
    default:
      return 'send';
  }
}

/**
 * Map Transaction status to UnifiedTransaction status
 */
function mapTransactionStatus(status: Transaction['status']): UnifiedTransaction['status'] {
  switch (status) {
    case 'completed':
      return 'confirmed';
    case 'pending':
      return 'pending';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Convert multiple transactions to UnifiedTransaction format
 */
export function convertTransactionsToUnified(transactions: Transaction[]): UnifiedTransaction[] {
  return transactions.map(convertTransactionToUnified);
}

