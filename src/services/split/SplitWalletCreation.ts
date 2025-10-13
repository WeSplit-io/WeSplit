/**
 * Split Wallet Creation Service
 * Handles creation and initialization of split wallets
 * Part of the modularized SplitWalletService
 */

import { walletService } from '../WalletService';
import { logger } from '../loggingService';
import { roundUsdcAmount as currencyRoundUsdcAmount } from '../../utils/currencyUtils';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from './types';

export class SplitWalletCreation {
  /**
   * Round USDC amount to proper precision (6 decimal places)
   * Uses floor instead of round to avoid rounding up beyond available balance
   */
  static roundUsdcAmount(amount: number): number {
    return currencyRoundUsdcAmount(amount);
  }

  /**
   * Validate wallet address format
   */
  static isValidWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    
    // Remove common invalid values
    const invalidValues = ['No wallet address', 'Unknown wallet', '', 'null', 'undefined'];
    if (invalidValues.includes(address.toLowerCase())) return false;
    
    // Check if it's a valid Solana public key format
    try {
      const { PublicKey } = require('@solana/web3.js');
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure user wallet is properly initialized
   */
  static async ensureUserWalletInitialized(userId: string): Promise<{success: boolean, error?: string}> {
    try {
      const userWallet = await walletService.getUserWallet(userId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found' };
      }
      
      if (!this.isValidWalletAddress(userWallet.address)) {
        return { success: false, error: 'Invalid user wallet address' };
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to ensure user wallet initialized', error, 'SplitWalletCreation');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Check USDC balance for user
   */
  static async checkUsdcBalance(userId: string): Promise<{success: boolean, balance: number, error?: string}> {
    try {
      const userWallet = await walletService.getUserWallet(userId);
      if (!userWallet) {
        return { success: false, balance: 0, error: 'User wallet not found' };
      }

      const balance = await walletService.getUserWalletBalance(userId);
      if (balance === null) {
        return { success: false, balance: 0, error: 'Failed to get wallet balance' };
      }

      return { 
        success: true, 
        balance: balance.usdcBalance || 0 
      };
    } catch (error) {
      logger.error('Failed to check USDC balance', error, 'SplitWalletCreation');
      return { 
        success: false, 
        balance: 0, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Ensure USDC token account exists for user
   */
  static async ensureUsdcTokenAccount(userId: string): Promise<{success: boolean, error?: string}> {
    try {
      const userWallet = await walletService.getUserWallet(userId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found' };
      }

      // Check if USDC token account exists
      const hasUsdcAccount = await walletService.hasUsdcTokenAccount(userId);
      if (!hasUsdcAccount) {
        // Create USDC token account
        const createResult = await walletService.createUsdcTokenAccount(userId);
        if (!createResult.success) {
          return { 
            success: false, 
            error: createResult.error || 'Failed to create USDC token account' 
          };
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to ensure USDC token account', error, 'SplitWalletCreation');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Test split wallet creation (for debugging)
   */
  static async testSplitWalletCreation(): Promise<{ success: boolean; error?: string; walletId?: string }> {
    try {
      
      const testBillId = `test_bill_${Date.now()}`;
      const testCreatorId = 'test_creator_123';
      const testTotalAmount = 100;
      const testCurrency = 'USDC';
      const testParticipants = [
        {
          userId: 'test_user_1',
          name: 'Test User 1',
          walletAddress: '11111111111111111111111111111111', // Dummy address
          amountOwed: 50
        },
        {
          userId: 'test_user_2',
          name: 'Test User 2',
          walletAddress: '22222222222222222222222222222222', // Dummy address
          amountOwed: 50
        }
      ];

      const result = await this.createSplitWallet(
        testBillId,
        testCreatorId,
        testTotalAmount,
        testCurrency,
        testParticipants
      );

      if (result.success && result.wallet) {
        return { 
          success: true, 
          walletId: result.wallet.id 
        };
      } else {
        console.error('❌ SplitWalletCreation: Test wallet creation failed:', result.error);
        return { 
          success: false, 
          error: result.error || 'Test wallet creation failed' 
        };
      }
    } catch (error) {
      console.error('❌ SplitWalletCreation: Test wallet creation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown test error' 
      };
    }
  }

  /**
   * Create a new split wallet for a bill
   * The creator becomes the owner and has full custody
   */
  static async createSplitWallet(
    billId: string,
    creatorId: string,
    totalAmount: number,
    currency: string = 'USDC',
    participants: Omit<SplitWalletParticipant, 'amountPaid' | 'status' | 'transactionSignature' | 'paidAt'>[]
  ): Promise<SplitWalletResult> {
    try {
      
      logger.info('Creating split wallet', { 
        billId, 
        creatorId, 
        totalAmount, 
        currency,
        participants: participants.map(p => ({
          userId: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed
        }))
      }, 'SplitWalletCreation');

      // Create a new dedicated wallet for this split
      // This wallet will be managed by the creator but is separate from their main wallet
      const wallet = await walletService.createWalletForProvider();
      if (!wallet) {
        throw new Error('Failed to create wallet for split');
      }
      
      
      logger.info('Split wallet created with address', { 
        walletAddress: wallet.address,
        publicKey: wallet.publicKey 
      }, 'SplitWalletCreation');

      // Create split wallet record (NO PRIVATE KEYS STORED)
      const splitWalletId = `split_wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const splitWalletData: Omit<SplitWallet, 'firebaseDocId'> = {
        id: splitWalletId,
        billId,
        creatorId,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        totalAmount: SplitWalletCreation.roundUsdcAmount(totalAmount),
        currency,
        status: 'active',
        participants: participants.map(p => ({
          ...p,
          amountPaid: 0,
          status: 'pending' as const,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store in Firebase
      const docRef = await addDoc(collection(db, 'splitWallets'), splitWalletData);
      
      const createdSplitWallet: SplitWallet = {
        ...splitWalletData,
        firebaseDocId: docRef.id,
      };


      logger.info('Split wallet created and stored successfully', {
        splitWalletId: createdSplitWallet.id,
        firebaseDocId: docRef.id,
        walletAddress: wallet.address,
        totalAmount: createdSplitWallet.totalAmount,
        participantsCount: createdSplitWallet.participants.length
      }, 'SplitWalletCreation');

      return {
        success: true,
        wallet: createdSplitWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletCreation: Error creating split wallet:', error);
      logger.error('Failed to create split wallet', error, 'SplitWalletCreation');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create split wallet for Degen Split with shared private key access
   * All participants get access to the private key for withdrawal/claiming
   */
  static async createDegenSplitWallet(
    billId: string,
    creatorId: string,
    totalAmount: number,
    currency: string,
    participants: Array<{ userId: string; name: string; walletAddress: string; amountOwed: number }>
  ): Promise<SplitWalletResult> {
    try {
      logger.info('Creating Degen Split wallet with shared private key access', {
        billId,
        creatorId,
        totalAmount,
        currency,
        participantsCount: participants.length
      }, 'SplitWalletCreation');

      // Create a new dedicated wallet for this Degen Split
      const wallet = await walletService.createWalletForProvider();
      if (!wallet) {
        throw new Error('Failed to create wallet for Degen Split');
      }
      
      logger.info('Degen Split wallet created with address', { 
        walletAddress: wallet.address,
        publicKey: wallet.publicKey 
      }, 'SplitWalletCreation');

      // Create split wallet record
      const splitWalletId = `degen_split_wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const splitWalletData: Omit<SplitWallet, 'firebaseDocId'> = {
        id: splitWalletId,
        billId,
        creatorId,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        totalAmount: SplitWalletCreation.roundUsdcAmount(totalAmount),
        currency,
        status: 'active',
        participants: participants.map(p => ({
          ...p,
          amountPaid: 0,
          status: 'pending' as const,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store in Firebase
      const docRef = await addDoc(collection(db, 'splitWallets'), splitWalletData);
      
      const createdSplitWallet: SplitWallet = {
        ...splitWalletData,
        firebaseDocId: docRef.id,
      };

      // Store private key for ALL participants (Degen Split feature)
      // The wallet service returns secretKey (base64), not privateKey
      const privateKey = wallet.secretKey;
      if (!privateKey) {
        logger.error('No private key available from wallet service', { 
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          hasSecretKey: !!wallet.secretKey,
          hasPrivateKey: !!wallet.privateKey
        }, 'SplitWalletCreation');
        throw new Error('No private key available from wallet service');
      }

      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      const storeResult = await SplitWalletSecurity.storeSplitWalletPrivateKeyForAllParticipants(
        splitWalletId,
        participants.map(p => ({ userId: p.userId, name: p.name })),
        privateKey
      );

      if (!storeResult.success) {
        logger.error('Failed to store private keys for all participants', { error: storeResult.error }, 'SplitWalletCreation');
        // Don't fail the entire operation, but log the error
      } else {
        logger.info('Private keys stored for all Degen Split participants', {
          splitWalletId,
          participantsCount: participants.length
        }, 'SplitWalletCreation');
      }

      logger.info('Degen Split wallet created and stored successfully', {
        splitWalletId: createdSplitWallet.id,
        firebaseDocId: docRef.id,
        walletAddress: wallet.address,
        totalAmount: createdSplitWallet.totalAmount,
        participantsCount: createdSplitWallet.participants.length,
        sharedPrivateKeyAccess: true
      }, 'SplitWalletCreation');

      return {
        success: true,
        wallet: createdSplitWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletCreation: Error creating Degen Split wallet:', error);
      logger.error('Failed to create Degen Split wallet', error, 'SplitWalletCreation');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Force reset a split wallet (for debugging/testing)
   */
  static async forceResetSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {

      // Get the current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: currentWalletResult.error || 'Split wallet not found',
        };
      }

      const currentWallet = currentWalletResult.wallet;

      // Create a new wallet with the same ID but reset data
      const newWallet = await walletService.createWalletForProvider();
      if (!newWallet) {
        throw new Error('Failed to create new wallet for reset');
      }

      // Update the wallet with new address and reset participants
      const updatedWalletData = {
        walletAddress: newWallet.address,
        publicKey: newWallet.publicKey,
        status: 'active' as const,
        participants: currentWallet.participants.map(p => ({
          ...p,
          amountPaid: 0,
          status: 'pending' as const,
          transactionSignature: undefined,
          paidAt: undefined,
        })),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
      };

      // Update in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), updatedWalletData);

      const resetWallet: SplitWallet = {
        ...currentWallet,
        ...updatedWalletData,
      };


      logger.info('Split wallet force reset completed', {
        splitWalletId,
        newWalletAddress: newWallet.address,
        participantsCount: resetWallet.participants.length
      }, 'SplitWalletCreation');

      return {
        success: true,
        wallet: resetWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletCreation: Error force resetting split wallet:', error);
      logger.error('Failed to force reset split wallet', error, 'SplitWalletCreation');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper method to get split wallet (direct Firebase query to avoid circular imports)
   */
  private static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      const { getDoc, doc, getDocs, query, where, collection } = await import('firebase/firestore');
      
      // Try to get by Firebase document ID first
      const docRef = doc(db, 'splitWallets', splitWalletId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const walletData = docSnap.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: docSnap.id,
        };
        return { success: true, wallet };
      }

      // If not found by Firebase ID, try to find by custom ID
      const q = query(
        collection(db, 'splitWallets'),
        where('id', '==', splitWalletId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const walletData = doc.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: doc.id,
        };
        return { success: true, wallet };
      }

      return { success: false, error: 'Split wallet not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
