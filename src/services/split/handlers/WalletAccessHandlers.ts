/**
 * Wallet Access Handlers
 * Extracted from SplitWalletPayments to reduce bundle size
 * All heavy imports are dynamically loaded to prevent bundling issues
 */

import { logger } from '../../core';
import type { SplitWallet, SplitWalletResult } from '../types';

export async function getSplitWalletPrivate(splitWalletId: string): Promise<SplitWalletResult> {
  try {
    // Dynamically import Firebase to reduce bundle size
    const { doc, getDoc, collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('../../../config/firebase/firebase');
    
    const directDoc = await getDoc(doc(db, 'splitWallets', splitWalletId));
    
    if (directDoc.exists()) {
      const walletData = directDoc.data();
      const wallet: SplitWallet = {
        ...walletData,
        firebaseDocId: directDoc.id,
      } as SplitWallet;
      
      return {
        success: true,
        wallet,
      };
    }

    const q = query(
      collection(db, 'splitWallets'),
      where('id', '==', splitWalletId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'Split wallet not found'
      };
    }

    const queryDoc = querySnapshot.docs[0];
    if (!queryDoc) {
      return {
        success: false,
        error: 'Split wallet not found'
      };
    }
    
    const walletData = queryDoc.data();
    const wallet: SplitWallet = {
      ...walletData,
      firebaseDocId: queryDoc.id,
    } as SplitWallet;

    logger.debug('Split wallet found by custom ID', {
      splitWalletId,
      firebaseDocId: queryDoc.id,
      status: wallet.status
    });
      
    return {
      success: true,
      wallet,
    };
  } catch (error) {
    logger.error('Failed to get split wallet', error as any, 'WalletAccessHandlers');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getFairSplitPrivateKeyPrivate(splitWalletId: string, creatorId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
  try {
    const { SplitWalletSecurity } = await import('../SplitWalletSecurity');
    return await SplitWalletSecurity.getFairSplitPrivateKey(splitWalletId, creatorId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getSplitWalletPrivateKeyPrivate(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
  try {
    const { SplitWalletSecurity } = await import('../SplitWalletSecurity');
    return await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, requesterId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
