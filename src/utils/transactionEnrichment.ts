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

