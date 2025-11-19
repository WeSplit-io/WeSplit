/**
 * Shared Wallet Utilities
 * Common helper functions to reduce code duplication
 */

import { db } from '../../config/firebase/firebase';
import { collection, query, where, getDocs, DocumentSnapshot } from 'firebase/firestore';
import type { SharedWallet } from './types';

/**
 * Get shared wallet document by custom ID
 * This is a common pattern used throughout the shared wallet services
 * 
 * @param sharedWalletId - The custom shared wallet ID
 * @returns The document snapshot and wallet data, or null if not found
 */
export async function getSharedWalletDocById(
  sharedWalletId: string
): Promise<{ doc: DocumentSnapshot; wallet: SharedWallet; walletDocId: string } | null> {
  const q = query(
    collection(db, 'sharedWallets'),
    where('id', '==', sharedWalletId)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }

  const walletDoc = querySnapshot.docs[0];
  const wallet = walletDoc.data() as SharedWallet;
  const walletDocId = walletDoc.id;

  return { doc: walletDoc, wallet, walletDocId };
}

/**
 * Validate shared wallet ID format
 */
export function isValidSharedWalletId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.startsWith('shared_wallet_');
}

/**
 * Generate unique ID for shared wallets or transactions
 * @param prefix - Prefix for the ID (default: 'shared_wallet')
 * @returns Unique ID string
 */
export function generateUniqueId(prefix: string = 'shared_wallet'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

