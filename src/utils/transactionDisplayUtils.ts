/**
 * Consolidated Transaction Display & Enrichment Utilities
 * Unified service combining display, conversion, and enrichment logic
 * Prevents code duplication and ensures consistency across all transaction handling
 */

import { Transaction } from '../types';

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
 * Ensures uniqueness by combining all available identifiers with index
 */
export function getTransactionKey(transaction: { id?: string; tx_hash?: string; transactionSignature?: string; created_at?: any }, index: number): string {
  // Build a unique key from all available identifiers
  const parts: string[] = [];
  
  if (transaction.id) {
    parts.push(transaction.id);
  }
  if (transaction.tx_hash) {
    parts.push(transaction.tx_hash);
  }
  if (transaction.transactionSignature) {
    parts.push(transaction.transactionSignature);
  }
  if (transaction.created_at) {
    // Use timestamp as part of key for uniqueness
    const timestamp = typeof transaction.created_at === 'string' 
      ? new Date(transaction.created_at).getTime()
      : (transaction.created_at?.toMillis?.() || transaction.created_at?.seconds * 1000 || Date.now());
    parts.push(String(timestamp));
  }
  
  // Always include index as fallback for uniqueness
  parts.push(String(index));
  
  // Join with separator and ensure it's unique
  const baseKey = parts.join('-');
  
  // If we still don't have enough uniqueness, add a hash
  if (parts.length < 3) {
    return `${baseKey}-${index}-${Date.now() % 10000}`;
  }
  
  return baseKey;
}

/**
 * Transaction Conversion Utilities
 * Converts Transaction type to UnifiedTransaction format for enrichment
 */

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

/**
 * Transaction Enrichment Utilities
 * Enriches transaction data with split names and external destination information
 */

import { logger } from '../services/analytics/loggingService';
import { UnifiedTransaction } from '../components/sharedWallet/TransactionHistoryItem';
import { LinkedWalletService } from '../services/blockchain/wallet/LinkedWalletService';
import { SplitWalletQueries } from '../services/split/SplitWalletQueries';
import { SplitStorageService } from '../services/splits/splitStorageService';

/**
 * Get split name from split wallet ID
 * Handles different ID formats: Firebase doc ID, custom ID, or wallet ID pattern
 */
export async function getSplitNameFromWalletId(splitWalletId: string): Promise<string | null> {
  try {
    if (!splitWalletId) return null;

    // First try to get the split wallet by the provided ID
    let walletResult = await SplitWalletQueries.getSplitWallet(splitWalletId);
    
    // If that fails and it looks like a custom ID pattern (e.g., "degen_split_wallet_176365"),
    // try to extract the numeric part and search by custom ID
    if (!walletResult.success && splitWalletId.includes('_')) {
      // Try searching by custom ID field in splitWallets collection
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../config/firebase/firebase');
        
        const splitWalletsRef = collection(db, 'splitWallets');
        // Try searching by the 'id' field (custom ID)
        const q = query(splitWalletsRef, where('id', '==', splitWalletId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const walletDoc = querySnapshot.docs[0];
          const walletData = walletDoc.data();
          const wallet = {
            ...walletData,
            firebaseDocId: walletDoc.id,
          } as any;
          
          walletResult = {
            success: true,
            wallet,
          };
        }
      } catch (searchError) {
        // If search fails, continue with original result
      }
    }
    
    if (!walletResult.success || !walletResult.wallet) {
      return null;
    }

    const wallet = walletResult.wallet;

    // Get the split data using billId
    if (wallet.billId) {
      const splitResult = await SplitStorageService.getSplitByBillId(wallet.billId);
      if (splitResult.success && splitResult.split) {
        return splitResult.split.title || null;
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting split name from wallet ID', error, 'TransactionEnrichment');
    return null;
  }
}

/**
 * Check if a wallet address belongs to a split wallet
 * Also handles backward compatibility with old splits
 */
export async function isSplitWalletAddress(address: string): Promise<{
  isSplitWallet: boolean;
  splitWalletId?: string;
  splitName?: string;
}> {
  try {
    if (!address) {
      return { isSplitWallet: false };
    }

    // Query split wallets by wallet address
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../config/firebase/firebase');
    
    const splitWalletsRef = collection(db, 'splitWallets');
    const q = query(splitWalletsRef, where('walletAddress', '==', address));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const walletDoc = querySnapshot.docs[0];
      const walletData = walletDoc.data();
      const splitWalletId = walletDoc.id;

      // Get split name
      const splitName = await getSplitNameFromWalletId(splitWalletId);

      return {
        isSplitWallet: true,
        splitWalletId,
        splitName: splitName || undefined,
      };
    }

    // Backward compatibility: Check if address might be an old split wallet
    // Old splits might not have walletAddress stored, so we check by billId pattern
    // This is a fallback for very old transactions
    return { isSplitWallet: false };
  } catch (error) {
    logger.error('Error checking if address is split wallet', error, 'TransactionEnrichment');
    return { isSplitWallet: false };
  }
}

/**
 * Extract split information from transaction memo/note (for backward compatibility with old splits)
 */
export function extractSplitInfoFromMemo(memo?: string | null): {
  isSplitTransaction: boolean;
  splitName?: string;
} {
  if (!memo) {
    return { isSplitTransaction: false };
  }

  // Check for common split-related patterns in memo
  const splitPatterns = [
    /split[_\s]?wallet[_\s]?(\w+)/i,
    /degen[_\s]?split[_\s]?fund[_\s]?locking[_\s]?-?\s*([^-]+)/i,
    /fair[_\s]?split[_\s]?participant[_\s]?payment[_\s]?-?\s*([^-]+)/i,
    /split[_\s]?payment[_\s]?-?\s*([^-]+)/i,
  ];

  for (const pattern of splitPatterns) {
    const match = memo.match(pattern);
    if (match && match[1]) {
      // Try to extract a meaningful name from the memo
      const extracted = match[1].trim();
      // If it looks like a wallet ID, we'll try to look it up later
      // For now, just mark it as a split transaction
      return {
        isSplitTransaction: true,
        splitName: extracted.length > 20 ? undefined : extracted, // Only use if it's short enough to be a name
      };
    }
  }

  // Check if memo contains split-related keywords
  const splitKeywords = ['split', 'degen', 'fair split', 'split wallet'];
  const hasSplitKeyword = splitKeywords.some(keyword => 
    memo.toLowerCase().includes(keyword.toLowerCase())
  );

  return {
    isSplitTransaction: hasSplitKeyword,
  };
}

/**
 * Check if a wallet address is an external card or external wallet for a user
 */
export async function getExternalDestinationInfo(
  address: string,
  userId: string
): Promise<{
  isExternalCard: boolean;
  isExternalWallet: boolean;
  label?: string;
}> {
  try {
    if (!address || !userId) {
      return { isExternalCard: false, isExternalWallet: false };
    }

    // Get linked destinations for the user
    const linkedDestinations = await LinkedWalletService.getLinkedDestinations(userId);

    // Check if it's a KAST card
    const kastCard = linkedDestinations.kastCards.find(
      card => (card.address === address || card.identifier === address) && card.isActive
    );
    if (kastCard) {
      return {
        isExternalCard: true,
        isExternalWallet: false,
        label: kastCard.label,
      };
    }

    // Check if it's an external wallet
    const externalWallet = linkedDestinations.externalWallets.find(
      wallet => (wallet.address === address || wallet.identifier === address) && wallet.isActive
    );
    if (externalWallet) {
      return {
        isExternalCard: false,
        isExternalWallet: true,
        label: externalWallet.label,
      };
    }

    return { isExternalCard: false, isExternalWallet: false };
  } catch (error) {
    logger.error('Error getting external destination info', error, 'TransactionEnrichment');
    return { isExternalCard: false, isExternalWallet: false };
  }
}

/**
 * Enrich a transaction with split names and external destination information
 * Handles backward compatibility with old splits and preserves 1/1 transfers and request logic
 */
export async function enrichTransaction(
  transaction: UnifiedTransaction,
  userId: string
): Promise<UnifiedTransaction> {
  try {
    const enriched = { ...transaction };

    // Backward compatibility: Check memo/note for old split transactions
    const memoSplitInfo = extractSplitInfoFromMemo(transaction.memo || transaction.note);
    if (memoSplitInfo.isSplitTransaction && !enriched.splitName) {
      // Try to find split wallet from memo if we have a wallet ID pattern
      const memo = transaction.memo || transaction.note || '';
      
      // Match full wallet ID pattern: "degen_split_wallet_176365" or "split_wallet_XXX"
      // Pattern: "degen_split_wallet_176365 1945921_k73xkz7oz" -> extract "degen_split_wallet_176365"
      const walletIdPatterns = [
        /(degen_split_wallet_\d+)/i,  // "degen_split_wallet_176365"
        /(split_wallet_[a-zA-Z0-9_]+)/i,  // "split_wallet_XXX"
      ];
      
      for (const pattern of walletIdPatterns) {
        const walletIdMatch = memo.match(pattern);
        if (walletIdMatch && walletIdMatch[1]) {
          const walletId = walletIdMatch[1];
          try {
            // Try to get split name from wallet ID
            const splitName = await getSplitNameFromWalletId(walletId);
            if (splitName) {
              enriched.splitName = splitName;
              enriched.splitWalletId = walletId;
              break; // Found it, no need to try other patterns
            }
          } catch (error) {
            // If lookup fails, try next pattern
            continue;
          }
        }
      }
    }

    // For send/payment transactions (funding INTO split wallets OR 1/1 transfers)
    if (transaction.type === 'send' || transaction.type === 'payment') {
      // Check if this is a 1/1 transfer (internal user-to-user)
      // 1/1 transfers have both from_user and to_user as user IDs (not wallet addresses)
      const isOneToOneTransfer = transaction.from_user && 
                                  transaction.to_user && 
                                  transaction.from_user !== transaction.to_user &&
                                  !transaction.from_user.startsWith('split_') &&
                                  !transaction.to_user.startsWith('split_') &&
                                  transaction.from_user.length < 20 && // User IDs are typically short
                                  transaction.to_user.length < 20;
      
      // Only enrich if it's not a clear 1/1 transfer (preserve 1/1 transfer display)
      if (!isOneToOneTransfer) {
        if (transaction.to_wallet) {
          // Check if destination is a split wallet (funding INTO split)
          const splitInfo = await isSplitWalletAddress(transaction.to_wallet);
          if (splitInfo.isSplitWallet) {
            enriched.splitWalletId = splitInfo.splitWalletId;
            enriched.splitName = splitInfo.splitName;
          } else {
            // Check if it's an external card or wallet
            const externalInfo = await getExternalDestinationInfo(transaction.to_wallet, userId);
            enriched.isExternalCard = externalInfo.isExternalCard;
            enriched.isExternalWallet = externalInfo.isExternalWallet;
          }
        }
        // Also check if source is a split wallet (withdrawal FROM split)
        if (transaction.from_wallet) {
          const splitInfo = await isSplitWalletAddress(transaction.from_wallet);
          if (splitInfo.isSplitWallet) {
            enriched.splitWalletId = splitInfo.splitWalletId;
            enriched.splitName = splitInfo.splitName;
          }
        }
      }
      // For 1/1 transfers, preserve original recipient/sender names (don't override)
    }

    // For withdrawal transactions (withdrawing FROM split wallets or TO external destinations)
    if (transaction.type === 'withdrawal') {
      // Check destination (external card/wallet)
      if (transaction.to_wallet) {
        const externalInfo = await getExternalDestinationInfo(transaction.to_wallet, userId);
        enriched.isExternalCard = externalInfo.isExternalCard;
        enriched.isExternalWallet = externalInfo.isExternalWallet;
      }
      // Check source (might be from a split wallet)
      if (transaction.from_wallet) {
        const splitInfo = await isSplitWalletAddress(transaction.from_wallet);
        if (splitInfo.isSplitWallet) {
          enriched.splitWalletId = splitInfo.splitWalletId;
          enriched.splitName = splitInfo.splitName;
        }
      }
    }

    // For receive/deposit transactions (receiving FROM split wallets)
    if (transaction.type === 'receive' || transaction.type === 'deposit') {
      if (transaction.from_wallet) {
        const splitInfo = await isSplitWalletAddress(transaction.from_wallet);
        if (splitInfo.isSplitWallet) {
          enriched.splitWalletId = splitInfo.splitWalletId;
          enriched.splitName = splitInfo.splitName;
        }
      }
    }

    return enriched;
  } catch (error) {
    logger.error('Error enriching transaction', error, 'TransactionEnrichment');
    return transaction;
  }
}

/**
 * Enrich multiple transactions in batch (with caching to avoid duplicate queries)
 */
export async function enrichTransactions(
  transactions: UnifiedTransaction[],
  userId: string
): Promise<UnifiedTransaction[]> {
  try {
    // Cache for split wallet lookups
    const splitWalletCache = new Map<string, { splitWalletId?: string; splitName?: string }>();
    const externalDestinationCache = new Map<string, { isExternalCard: boolean; isExternalWallet: boolean }>();

    const enriched = await Promise.all(
      transactions.map(async (transaction) => {
        const enrichedTx = { ...transaction };

        // Backward compatibility: Check memo/note for old split transactions
        const memoSplitInfo = extractSplitInfoFromMemo(transaction.memo || transaction.note);
        if (memoSplitInfo.isSplitTransaction && !enrichedTx.splitName) {
          const memo = transaction.memo || transaction.note || '';
          
          // Match full wallet ID pattern: "degen_split_wallet_176365" or "split_wallet_XXX"
          // Pattern: "degen_split_wallet_176365 1945921_k73xkz7oz" -> extract "degen_split_wallet_176365"
          const walletIdPatterns = [
            /(degen_split_wallet_\d+)/i,  // "degen_split_wallet_176365"
            /(split_wallet_[a-zA-Z0-9_]+)/i,  // "split_wallet_XXX"
          ];
          
          for (const pattern of walletIdPatterns) {
            const walletIdMatch = memo.match(pattern);
            if (walletIdMatch && walletIdMatch[1]) {
              const walletId = walletIdMatch[1];
              try {
                // Try to get split name from wallet ID
                const splitName = await getSplitNameFromWalletId(walletId);
                if (splitName) {
                  enrichedTx.splitName = splitName;
                  enrichedTx.splitWalletId = walletId;
                  break; // Found it, no need to try other patterns
                }
              } catch (error) {
                // If lookup fails, try next pattern
                continue;
              }
            }
          }
        }

        // For send/payment transactions (funding INTO split wallets OR 1/1 transfers OR requests)
        if (transaction.type === 'send' || transaction.type === 'payment') {
          // Check if this is a 1/1 transfer (internal user-to-user)
          const isOneToOneTransfer = transaction.from_user && 
                                      transaction.to_user && 
                                      transaction.from_user !== transaction.to_user &&
                                      !transaction.from_user.startsWith('split_') &&
                                      !transaction.to_user.startsWith('split_') &&
                                      transaction.from_user.length < 20 &&
                                      transaction.to_user.length < 20;
          
          // Preserve request/group logic - don't override if it's a request transaction
          // Request transactions are identified by group_id or specific memo patterns
          const isRequestTransaction = (transaction as any).group_id || 
                                       (transaction.memo || transaction.note || '').toLowerCase().includes('request') ||
                                       (transaction.memo || transaction.note || '').toLowerCase().includes('settlement');
          
          // Only enrich if it's not a clear 1/1 transfer or request (preserve original display)
          if (!isOneToOneTransfer && !isRequestTransaction) {
            // Check destination (funding INTO split wallet)
            if (transaction.to_wallet) {
              // Check cache first
              if (splitWalletCache.has(transaction.to_wallet)) {
                const cached = splitWalletCache.get(transaction.to_wallet)!;
                enrichedTx.splitWalletId = cached.splitWalletId;
                enrichedTx.splitName = cached.splitName;
              } else {
                // Check if it's a split wallet
                const splitInfo = await isSplitWalletAddress(transaction.to_wallet);
                splitWalletCache.set(transaction.to_wallet, {
                  splitWalletId: splitInfo.splitWalletId,
                  splitName: splitInfo.splitName,
                });
                if (splitInfo.isSplitWallet) {
                  enrichedTx.splitWalletId = splitInfo.splitWalletId;
                  enrichedTx.splitName = splitInfo.splitName;
                } else {
                  // Check if it's an external card or wallet
                  if (externalDestinationCache.has(transaction.to_wallet)) {
                    const cached = externalDestinationCache.get(transaction.to_wallet)!;
                    enrichedTx.isExternalCard = cached.isExternalCard;
                    enrichedTx.isExternalWallet = cached.isExternalWallet;
                  } else {
                    const externalInfo = await getExternalDestinationInfo(transaction.to_wallet, userId);
                    externalDestinationCache.set(transaction.to_wallet, {
                      isExternalCard: externalInfo.isExternalCard,
                      isExternalWallet: externalInfo.isExternalWallet,
                    });
                    enrichedTx.isExternalCard = externalInfo.isExternalCard;
                    enrichedTx.isExternalWallet = externalInfo.isExternalWallet;
                  }
                }
              }
            }
            // Also check source (withdrawing FROM split wallet)
            if (transaction.from_wallet) {
              if (splitWalletCache.has(transaction.from_wallet)) {
                const cached = splitWalletCache.get(transaction.from_wallet)!;
                // Only set if not already set from destination check
                if (!enrichedTx.splitWalletId) {
                  enrichedTx.splitWalletId = cached.splitWalletId;
                  enrichedTx.splitName = cached.splitName;
                }
              } else {
                const splitInfo = await isSplitWalletAddress(transaction.from_wallet);
                splitWalletCache.set(transaction.from_wallet, {
                  splitWalletId: splitInfo.splitWalletId,
                  splitName: splitInfo.splitName,
                });
                if (splitInfo.isSplitWallet && !enrichedTx.splitWalletId) {
                  enrichedTx.splitWalletId = splitInfo.splitWalletId;
                  enrichedTx.splitName = splitInfo.splitName;
                }
              }
            }
          }
          // For 1/1 transfers and requests, preserve original recipient/sender names
        }

        // For withdrawal transactions (withdrawing FROM split wallets OR TO external destinations)
        if (transaction.type === 'withdrawal') {
          // Check destination (external card/wallet)
          if (transaction.to_wallet) {
            if (externalDestinationCache.has(transaction.to_wallet)) {
              const cached = externalDestinationCache.get(transaction.to_wallet)!;
              enrichedTx.isExternalCard = cached.isExternalCard;
              enrichedTx.isExternalWallet = cached.isExternalWallet;
            } else {
              const externalInfo = await getExternalDestinationInfo(transaction.to_wallet, userId);
              externalDestinationCache.set(transaction.to_wallet, {
                isExternalCard: externalInfo.isExternalCard,
                isExternalWallet: externalInfo.isExternalWallet,
              });
              enrichedTx.isExternalCard = externalInfo.isExternalCard;
              enrichedTx.isExternalWallet = externalInfo.isExternalWallet;
            }
          }
          // Check source (might be from a split wallet)
          if (transaction.from_wallet) {
            if (splitWalletCache.has(transaction.from_wallet)) {
              const cached = splitWalletCache.get(transaction.from_wallet)!;
              enrichedTx.splitWalletId = cached.splitWalletId;
              enrichedTx.splitName = cached.splitName;
            } else {
              const splitInfo = await isSplitWalletAddress(transaction.from_wallet);
              splitWalletCache.set(transaction.from_wallet, {
                splitWalletId: splitInfo.splitWalletId,
                splitName: splitInfo.splitName,
              });
              if (splitInfo.isSplitWallet) {
                enrichedTx.splitWalletId = splitInfo.splitWalletId;
                enrichedTx.splitName = splitInfo.splitName;
              }
            }
          }
        }

        // For receive/deposit transactions (receiving FROM split wallets)
        if (transaction.type === 'receive' || transaction.type === 'deposit') {
          if (transaction.from_wallet) {
            if (splitWalletCache.has(transaction.from_wallet)) {
              const cached = splitWalletCache.get(transaction.from_wallet)!;
              enrichedTx.splitWalletId = cached.splitWalletId;
              enrichedTx.splitName = cached.splitName;
            } else {
              const splitInfo = await isSplitWalletAddress(transaction.from_wallet);
              splitWalletCache.set(transaction.from_wallet, {
                splitWalletId: splitInfo.splitWalletId,
                splitName: splitInfo.splitName,
              });
              if (splitInfo.isSplitWallet) {
                enrichedTx.splitWalletId = splitInfo.splitWalletId;
                enrichedTx.splitName = splitInfo.splitName;
              }
            }
          }
        }

        return enrichedTx;
      })
    );

    return enriched;
  } catch (error) {
    logger.error('Error enriching transactions', error, 'TransactionEnrichment');
    return transactions;
  }
}

