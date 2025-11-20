/**
 * Transaction Display Utilities
 * Shared utilities for transaction display logic across components
 * Prevents code duplication and ensures consistency
 */

import { Transaction } from '../types';
import { UnifiedTransaction } from '../components/sharedWallet/TransactionHistoryItem';

/**
 * Transaction type to icon name mapping
 */
export const TRANSACTION_ICON_MAP: Record<string, string> = {
  send: 'PaperPlaneTilt',
  receive: 'HandCoins',
  deposit: 'ArrowLineDown',
  withdraw: 'Bank',
  withdrawal: 'Bank',
  funding: 'ArrowDown',
  payment: 'PaperPlaneTilt',
  refund: 'ArrowCounterClockwise',
  transfer: 'ArrowsClockwise',
  fee: 'ArrowsClockwise',
};

/**
 * Transaction type to label mapping
 */
export const TRANSACTION_LABEL_MAP: Record<string, string> = {
  funding: 'Top Up',
  withdrawal: 'Withdrawal',
  withdraw: 'Withdrawal',
  send: 'Sent',
  receive: 'Received',
  deposit: 'Deposit',
  payment: 'Payment',
  refund: 'Refund',
  fee: 'Fee',
  transfer: 'Transfer',
};

/**
 * Get transaction icon name
 */
export function getTransactionIconName(type: string): string {
  return TRANSACTION_ICON_MAP[type] || 'PaperPlaneTilt';
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: string): string {
  return TRANSACTION_LABEL_MAP[type] || 'Transaction';
}

/**
 * Check if transaction type is income
 */
export function isIncomeTransaction(type: string): boolean {
  return ['funding', 'deposit', 'receive', 'refund'].includes(type);
}

/**
 * Check if transaction type is expense
 */
export function isExpenseTransaction(type: string): boolean {
  return ['withdrawal', 'withdraw', 'send', 'payment'].includes(type);
}

/**
 * Extract split name from transaction note/memo
 * Handles both enriched and raw note formats
 * Returns null if no valid split name found (to avoid showing wallet IDs)
 */
export function extractSplitNameFromNote(note?: string | null): string | null {
  if (!note) return null;
  
  // Check if note contains split wallet ID pattern
  // Pattern: "Degen Split fund locking - degen_split_wallet_XXX" or similar
  // Try to extract the split name that was added by enrichment
  // Enrichment adds split name like: "Degen Split fund locking - [Split Name]"
  const enrichedPattern = note.match(/-\s*([^-]+?)(?:\s*-\s*degen_split_wallet|$)/i);
  if (enrichedPattern && enrichedPattern[1]) {
    const potentialName = enrichedPattern[1].trim();
    // Only use if it's not a wallet ID pattern and looks like a name
    if (potentialName.length < 100 && 
        !potentialName.match(/^(degen_split_wallet_|split_wallet_|wallet_)/i) &&
        !potentialName.match(/\d{6,}/) && // Don't use if it contains long numbers (wallet IDs)
        potentialName.length > 3) {
      return potentialName;
    }
  }
  
  // Don't try to extract from raw notes with wallet IDs - enrichment should handle this
  // Return null to avoid showing messy wallet IDs
  return null;
}

/**
 * Clean transaction note by removing wallet IDs and keeping only meaningful text
 */
export function cleanTransactionNote(note?: string | null, splitName?: string | null): string {
  if (!note) return '';
  
  // If we have a split name, return a clean version
  if (splitName) {
    // Check if note contains split-related keywords
    if (note.toLowerCase().includes('split') || note.toLowerCase().includes('fund locking')) {
      // Return a clean description without wallet IDs
      return 'Split funding';
    }
    return splitName;
  }
  
  // Remove wallet ID patterns from note
  let cleaned = note
    .replace(/degen_split_wallet_\w+/gi, '')
    .replace(/split_wallet_\w+/gi, '')
    .replace(/wallet_\w+/gi, '')
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/-\s*-/g, '-') // Clean up double dashes
    .trim();
  
  // If cleaned note is too short or just contains generic text, return empty
  if (cleaned.length < 5 || cleaned.match(/^(Degen Split|Fair Split|Split)\s*(fund locking|payment)?$/i)) {
    return '';
  }
  
  return cleaned;
}

/**
 * Check if a name looks like a split name (not a wallet ID or generic text)
 */
export function isSplitName(name?: string | null): boolean {
  if (!name) return false;
  
  // Reject generic text patterns
  const genericPatterns = [
    /fund\s+locking/i,
    /locking/i,
    /^split\s*(fund|payment)?$/i,
    /^degen\s+split$/i,
    /^fair\s+split$/i,
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(name)) {
      return false;
    }
  }
  
  return name.length < 100 && 
         !name.match(/^(degen_split_wallet_|split_wallet_|wallet_)/i) &&
         !name.includes('Unknown') &&
         !name.match(/\d{6,}/) && // Don't accept if it contains long numbers (wallet IDs)
         name.length > 3;
}

/**
 * Get split name for send transactions (funding splits)
 */
export function getSplitNameForSend(transaction: Transaction | UnifiedTransaction): string | null {
  // First check if recipient_name has the split name (set by enrichment)
  const recipientName = 'recipient_name' in transaction 
    ? transaction.recipient_name 
    : (transaction as UnifiedTransaction).recipientName;
    
  if (isSplitName(recipientName)) {
    return recipientName;
  }
  
  // Otherwise, try to extract from note
  const note = transaction.note || (transaction as UnifiedTransaction).memo;
  return extractSplitNameFromNote(note);
}

/**
 * Get split name for receive transactions
 */
export function getSplitNameForReceive(transaction: Transaction | UnifiedTransaction): string | null {
  // Check sender_name first
  const senderName = 'sender_name' in transaction 
    ? transaction.sender_name 
    : (transaction as UnifiedTransaction).senderName;
    
  if (isSplitName(senderName)) {
    return senderName;
  }
  
  // Otherwise, try to extract from note
  const note = transaction.note || (transaction as UnifiedTransaction).memo;
  return extractSplitNameFromNote(note);
}

/**
 * Format transaction title for display
 */
export function formatTransactionTitle(
  transaction: Transaction | UnifiedTransaction,
  recipientName?: string,
  senderName?: string
): string {
  const type = transaction.type;
  
  switch (type) {
    case 'send':
    case 'payment': {
      const splitName = getSplitNameForSend(transaction);
      if (splitName) {
        return `Send to ${splitName}`;
      }
      
      // Check if this looks like a split transaction (has split-related note but no name yet)
      const note = transaction.note || (transaction as UnifiedTransaction).memo;
      const isSplitTransaction = note && (
        note.toLowerCase().includes('split') || 
        note.toLowerCase().includes('degen') ||
        note.match(/degen_split_wallet|split_wallet/i)
      );
      
      // If it's a split transaction but we don't have the name, show generic text
      if (isSplitTransaction) {
        return 'Send to Split';
      }
      
      const recipient = recipientName || 
        ('recipient_name' in transaction ? transaction.recipient_name : (transaction as UnifiedTransaction).recipientName) ||
        ('to_user' in transaction ? transaction.to_user : (transaction as UnifiedTransaction).to_user) ||
        'Unknown';
      return `Send to ${recipient}`;
    }
    case 'receive':
    case 'deposit': {
      const splitName = getSplitNameForReceive(transaction);
      if (splitName) {
        return `Received from ${splitName}`;
      }
      const sender = senderName || 
        ('sender_name' in transaction ? transaction.sender_name : (transaction as UnifiedTransaction).senderName) ||
        ('from_user' in transaction ? transaction.from_user : (transaction as UnifiedTransaction).from_user) ||
        'Unknown';
      return `Received from ${sender}`;
    }
    case 'deposit':
      return 'Deposit';
    case 'withdraw':
    case 'withdrawal':
      return 'Withdraw';
    default:
      return 'Transaction';
  }
}

/**
 * Format transaction source/subtitle for display
 * Cleans up messy notes with wallet IDs
 */
export function formatTransactionSource(transaction: Transaction | UnifiedTransaction): string {
  const type = transaction.type;
  const note = transaction.note || (transaction as UnifiedTransaction).memo;
  
  // Get split name if available (for clean display)
  const splitName = type === 'send' || type === 'payment' 
    ? getSplitNameForSend(transaction)
    : getSplitNameForReceive(transaction);
  
  switch (type) {
    case 'send':
    case 'payment': {
      // If it's a split funding transaction, show clean text
      if (splitName) {
        return 'Split funding';
      }
      
      // Check if this looks like a split transaction even without a name
      const isSplitTransaction = note && (
        note.toLowerCase().includes('split') || 
        note.toLowerCase().includes('degen') ||
        note.match(/degen_split_wallet|split_wallet/i)
      );
      
      if (isSplitTransaction) {
        return 'Split funding';
      }
      
      // Clean up note to remove wallet IDs
      const cleaned = cleanTransactionNote(note, splitName);
      return cleaned || 'Payment';
    }
    case 'receive': {
      // If it's from a split, show clean text
      if (splitName) {
        return 'Split payment';
      }
      const cleaned = cleanTransactionNote(note, splitName);
      return cleaned || 'Payment received';
    }
    case 'deposit':
      return 'MoonPay';
    case 'withdraw':
    case 'withdrawal':
      return 'Wallet';
    default:
      return '';
  }
}

/**
 * Deduplicate transactions by tx_hash or transactionSignature
 * Keeps the first occurrence of each unique transaction
 */
export function deduplicateTransactions<T extends { tx_hash?: string; transactionSignature?: string; id?: string }>(
  transactions: T[]
): T[] {
  return transactions.filter((tx, index, self) => {
    const txHash = tx.tx_hash || tx.transactionSignature;
    if (!txHash) return true; // Keep transactions without hash
    return index === self.findIndex((t) => 
      (t.tx_hash || t.transactionSignature) === txHash
    );
  });
}

/**
 * Generate unique key for transaction list items
 */
export function getTransactionKey(transaction: { id?: string; tx_hash?: string; transactionSignature?: string }, index: number): string {
  if (transaction.id) {
    return `${transaction.id}-${transaction.tx_hash || transaction.transactionSignature || index}`;
  }
  return transaction.tx_hash || transaction.transactionSignature || `tx-${index}`;
}

