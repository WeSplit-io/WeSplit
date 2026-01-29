/**
 * Split Wallet Creation Service
 * Handles creation and initialization of split wallets
 * Part of the modularized SplitWalletService
 *
 * @deprecated This module is an internal implementation detail of SplitWalletService.
 *             New code should call the facade in `src/services/split/index.ts` instead
 *             of importing SplitWalletCreation directly.
 */

import { logger } from '../core';
import { roundUsdcAmount as currencyRoundUsdcAmount } from '../../utils/ui/format';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from './types';
import { validateCreationParams, validateWalletAddress } from './SplitValidationService';

export class SplitWalletCreation {


  /**
   * Ensure user wallet is properly initialized
   */
  static async ensureUserWalletInitialized(userId: string): Promise<{success: boolean, error?: string}> {
    try {
      // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
      const { simplifiedWalletService } = await import('../blockchain/wallet/simplifiedWalletService');
      const userWallet = await simplifiedWalletService.getWalletInfo(userId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found' };
      }
      
      const addressValidation = validateWalletAddress(userWallet.address);
      if (!addressValidation.isValid) {
        return { success: false, error: addressValidation.errors.join(', ') };
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
      // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
      const { simplifiedWalletService } = await import('../blockchain/wallet/simplifiedWalletService');
      const userWallet = await simplifiedWalletService.getWalletInfo(userId);
      if (!userWallet) {
        return { success: false, balance: 0, error: 'User wallet not found' };
      }

      const balance = await simplifiedWalletService.getUserWalletBalance(userId);
      if (!balance) {
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
        logger.error('Test wallet creation failed', { error: result.error }, 'SplitWalletCreation');
        return { 
          success: false, 
          error: result.error || 'Test wallet creation failed' 
        };
      }
    } catch (error) {
      logger.error('Test wallet creation error', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletCreation');
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
      // Validate creation parameters using centralized validation service
      const validation = await validateCreationParams({
          billId,
          creatorId,
        totalAmount,
        currency,
        participants
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; ')
          };
      }

      // Check if wallet already exists for this billId
      try {
        const { SplitWalletQueries } = await import('./SplitWalletQueries');
        const existingWallet = await SplitWalletQueries.getSplitWalletByBillId(billId);
        if (existingWallet.success && existingWallet.wallet) {
          logger.warn('Split wallet already exists for this bill', {
            billId,
            existingWalletId: existingWallet.wallet.id,
            existingFirebaseDocId: existingWallet.wallet.firebaseDocId
          }, 'SplitWalletCreation');
          return {
            success: false,
            error: 'A split wallet already exists for this bill',
            wallet: existingWallet.wallet
          };
        }
      } catch (checkError) {
        logger.warn('Could not check for existing wallet, proceeding with creation', {
          billId,
          error: checkError instanceof Error ? checkError.message : String(checkError)
        }, 'SplitWalletCreation');
        // Continue with creation - this is not critical
      }
      
      logger.info('Creating split wallet', { 
        billId, 
        creatorId, 
        totalAmount, 
        currency,
        participantsCount: participants.length,
        participants: participants.map(p => ({
          userId: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed
        }))
      }, 'SplitWalletCreation');

      // Create a new dedicated wallet for this split
      // This wallet will be completely independent and not tied to any user account
      const { generateWalletFromMnemonic } = await import('../blockchain/wallet/derive');
      const walletResult = generateWalletFromMnemonic(); // Generates new mnemonic automatically
      
      const wallet = {
        address: walletResult.address,
        publicKey: walletResult.publicKey,
        secretKey: walletResult.secretKey
      };
      
      
      logger.info('Split wallet created with address', { 
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        isNewWallet: true,
        walletType: 'dedicated_split_wallet'
      }, 'SplitWalletCreation');

      // Create split wallet record (NO PRIVATE KEYS STORED)
      const splitWalletId = `split_wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const splitWalletData: Omit<SplitWallet, 'firebaseDocId'> = {
        id: splitWalletId,
        billId,
        creatorId,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        totalAmount: currencyRoundUsdcAmount(totalAmount),
        currency,
        status: 'active',
        participants: participants.map(p => ({
          ...p,
          amountOwed: currencyRoundUsdcAmount(p.amountOwed), // Round amountOwed to fix precision issues
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

      logger.info('Split wallet data stored in Firebase', {
        splitWalletId: createdSplitWallet.id,
        walletAddress: createdSplitWallet.walletAddress,
        publicKey: createdSplitWallet.publicKey,
        billId: createdSplitWallet.billId,
        creatorId: createdSplitWallet.creatorId,
        firebaseDocId: createdSplitWallet.firebaseDocId
      }, 'SplitWalletCreation');

      // Store private key securely for the creator (Regular Split)
      // The wallet service returns secretKey (base64), not privateKey
      const privateKey = wallet.secretKey;
      if (!privateKey) {
        logger.error('No private key available from wallet service', { 
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          hasSecretKey: !!wallet.secretKey
        }, 'SplitWalletCreation');
        throw new Error('No private key available from wallet service');
      }

      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      
      // CRITICAL FIX: Add retry mechanism for private key storage (3 attempts)
      const { RETRY_CONFIG } = await import('./constants/splitConstants');
      let storeResult = null;
      let lastError: string | undefined;
      const maxRetries = RETRY_CONFIG.MAX_ATTEMPTS;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        storeResult = await SplitWalletSecurity.storeFairSplitPrivateKey(
        splitWalletId,
        creatorId,
        privateKey
      );

        if (storeResult.success) {
          logger.info('Private key stored securely for creator', {
            splitWalletId,
            creatorId,
            attempt
          }, 'SplitWalletCreation');
          break;
        } else {
          lastError = storeResult.error;
          logger.warn(`Private key storage attempt ${attempt}/${maxRetries} failed`, {
            splitWalletId,
            creatorId,
            error: lastError,
            attempt
          }, 'SplitWalletCreation');
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.BACKOFF_BASE * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1)));
          }
        }
      }

      if (!storeResult || !storeResult.success) {
        logger.error('Failed to store private key for creator after all retries', { 
          error: lastError,
          attempts: maxRetries
        }, 'SplitWalletCreation');
        
        // CRITICAL: Private key storage failure means withdrawals won't work
        // We should fail the operation to prevent creating unusable wallets
        // Clean up the wallet that was created
        let cleanupSuccess = false;
        try {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId));
          cleanupSuccess = true;
          logger.info('Cleaned up split wallet after private key storage failure', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId
          }, 'SplitWalletCreation');
        } catch (cleanupError) {
          logger.error('Failed to cleanup split wallet after private key storage failure', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId,
            cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          }, 'SplitWalletCreation');
          
          // Mark wallet for manual cleanup by setting a flag
          try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId), {
              status: 'cancelled',
              error: 'Private key storage failed - requires manual cleanup',
              lastUpdated: new Date().toISOString()
            });
            logger.warn('Marked wallet for manual cleanup', {
              splitWalletId: createdSplitWallet.id,
              firebaseDocId: createdSplitWallet.firebaseDocId
            }, 'SplitWalletCreation');
          } catch (markError) {
            logger.error('Failed to mark wallet for manual cleanup', {
              splitWalletId: createdSplitWallet.id,
              error: markError instanceof Error ? markError.message : String(markError)
          }, 'SplitWalletCreation');
          }
        }
        
        return {
          success: false,
          error: `Failed to store private key after ${maxRetries} attempts: ${lastError || 'Unknown error'}. Split wallet creation aborted${cleanupSuccess ? '' : ' (wallet marked for manual cleanup)'}.`
        };
      }

      // CRITICAL FIX: Update the split document with wallet information to keep them synchronized
      // Add retry mechanism and fail wallet creation if split update fails (strict consistency)
        const { SplitStorageService } = await import('../splits/splitStorageService');
      let splitUpdateResult = null;
      let lastSyncError: string | undefined;
      const maxRetriesSync = RETRY_CONFIG.MAX_ATTEMPTS;
      
      for (let attempt = 1; attempt <= maxRetriesSync; attempt++) {
        try {
          splitUpdateResult = await SplitStorageService.updateSplitByBillId(billId, {
          walletId: createdSplitWallet.id,
          walletAddress: createdSplitWallet.walletAddress,
          updatedAt: new Date().toISOString()
        });
        
        if (splitUpdateResult.success) {
          logger.info('Split document updated with wallet information', {
            splitWalletId: createdSplitWallet.id,
            billId,
              walletAddress: createdSplitWallet.walletAddress,
              attempt
          }, 'SplitWalletCreation');
            break;
        } else {
            lastSyncError = splitUpdateResult.error;
            logger.warn(`Split document update attempt ${attempt}/${maxRetriesSync} failed`, {
            splitWalletId: createdSplitWallet.id,
            billId,
              error: lastSyncError,
              attempt
          }, 'SplitWalletCreation');
        }
      } catch (syncError) {
          lastSyncError = syncError instanceof Error ? syncError.message : String(syncError);
            logger.warn(`Split document update attempt ${attempt}/${maxRetriesSync} threw error`, {
          splitWalletId: createdSplitWallet.id,
          billId,
            error: lastSyncError,
            attempt
        }, 'SplitWalletCreation');
        }
        
        // Wait before retry (exponential backoff: 100ms, 200ms, 400ms)
        if (attempt < maxRetriesSync && (!splitUpdateResult || !splitUpdateResult.success)) {
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.BACKOFF_BASE * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1)));
        }
      }
      
      // CRITICAL: Fail wallet creation if split update fails after all retries
      // This ensures strict consistency between wallet and split documents
      if (!splitUpdateResult || !splitUpdateResult.success) {
        logger.error('Failed to update split document after all retries - rolling back wallet creation', {
          splitWalletId: createdSplitWallet.id,
          billId,
          error: lastSyncError,
          attempts: maxRetries
        }, 'SplitWalletCreation');
        
        // Rollback: Delete wallet and private key
        let rollbackSuccess = false;
        try {
          // Delete private key first
          const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
          await SplitWalletSecurity.deleteSplitWalletPrivateKey(splitWalletId, creatorId);
          
          // Delete wallet
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId));
          rollbackSuccess = true;
          logger.info('Rolled back wallet creation after split document update failure', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId
          }, 'SplitWalletCreation');
        } catch (rollbackError) {
          logger.error('Failed to rollback wallet creation', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId,
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          }, 'SplitWalletCreation');
          
          // Mark wallet for manual cleanup
          try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId), {
              status: 'cancelled',
              error: 'Split document sync failed - requires manual cleanup',
              lastUpdated: new Date().toISOString()
            });
          } catch (markError) {
            // Ignore - already in error state
          }
        }
        
        return {
          success: false,
          error: `Failed to update split document after ${maxRetriesSync} attempts: ${lastSyncError || 'Unknown error'}. Wallet creation rolled back${rollbackSuccess ? '' : ' (wallet marked for manual cleanup)'}.`
        };
      }

      // Cache the newly created wallet
      const { SplitWalletCache } = await import('./SplitWalletCache');
      SplitWalletCache.setWallet(createdSplitWallet);

      logger.info('Split wallet created and stored successfully', {
        splitWalletId: createdSplitWallet.id,
        firebaseDocId: docRef.id,
        walletAddress: wallet.address,
        totalAmount: createdSplitWallet.totalAmount,
        participantsCount: createdSplitWallet.participants.length,
        privateKeyStored: storeResult.success
      }, 'SplitWalletCreation');

      return {
        success: true,
        wallet: createdSplitWallet,
      };

    } catch (error) {
      logger.error('Failed to create split wallet', {
        error: error instanceof Error ? error.message : String(error),
        billId,
        creatorId
      }, 'SplitWalletCreation');
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
    creatorName: string,
    totalAmount: number,
    currency: string,
    participants: { userId: string; name: string; walletAddress: string; amountOwed: number }[]
  ): Promise<SplitWalletResult> {
    try {
      // Validate creation parameters using centralized validation service
      const validation = await validateCreationParams({
          billId,
          creatorId,
        totalAmount,
        currency,
        participants: participants.map(p => ({
          userId: p.userId,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed
        }))
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; ')
          };
      }

      // Check if wallet already exists for this billId
      try {
        const { SplitWalletQueries } = await import('./SplitWalletQueries');
        const existingWallet = await SplitWalletQueries.getSplitWalletByBillId(billId);
        if (existingWallet.success && existingWallet.wallet) {
          logger.warn('Degen split wallet already exists for this bill', {
            billId,
            existingWalletId: existingWallet.wallet.id,
            existingFirebaseDocId: existingWallet.wallet.firebaseDocId
          }, 'SplitWalletCreation');
          return {
            success: false,
            error: 'A split wallet already exists for this bill',
            wallet: existingWallet.wallet
          };
        }
      } catch (checkError) {
        logger.warn('Could not check for existing wallet, proceeding with creation', {
          billId,
          error: checkError instanceof Error ? checkError.message : String(checkError)
        }, 'SplitWalletCreation');
        // Continue with creation - this is not critical
      }

      logger.info('Creating Degen Split wallet with shared private key access', {
        billId,
        creatorId,
        totalAmount,
        currency,
        participantsCount: participants.length,
        participantWalletAddresses: participants.map(p => p.walletAddress)
      }, 'SplitWalletCreation');

      // Create a new dedicated wallet for this Degen Split
      const { generateWalletFromMnemonic } = await import('../blockchain/wallet/derive');
      const walletResult = generateWalletFromMnemonic(); // Generates new mnemonic automatically
      
      const wallet = {
        address: walletResult.address,
        publicKey: walletResult.publicKey,
        secretKey: walletResult.secretKey
      };
      
      logger.info('Degen Split wallet created with address', { 
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        isNewWallet: true,
        walletType: 'dedicated_degen_split_wallet'
      }, 'SplitWalletCreation');

      // Create split wallet record
      const splitWalletId = `degen_split_wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const splitWalletData: Omit<SplitWallet, 'firebaseDocId'> = {
        id: splitWalletId,
        billId,
        creatorId,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        totalAmount: currencyRoundUsdcAmount(totalAmount),
        currency,
        status: 'active',
        participants: participants.map(p => ({
          ...p,
          amountOwed: currencyRoundUsdcAmount(p.amountOwed), // Round amountOwed to fix precision issues
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

      logger.info('Degen Split wallet data stored in Firebase', {
        splitWalletId: createdSplitWallet.id,
        splitWalletAddress: createdSplitWallet.walletAddress,
        publicKey: createdSplitWallet.publicKey,
        billId: createdSplitWallet.billId,
        creatorId: createdSplitWallet.creatorId,
        firebaseDocId: createdSplitWallet.firebaseDocId,
        participantWalletAddresses: participants.map(p => p.walletAddress),
        isDedicatedWallet: true
      }, 'SplitWalletCreation');

      // CRITICAL FIX: Update existing split document instead of creating a new one
      // Add retry mechanism and fail wallet creation if split update fails (strict consistency)
        const { SplitStorageService } = await import('../splits/splitStorageService');
        
        // First, try to find the existing split by billId
        const existingSplitResult = await SplitStorageService.getSplitByBillId(createdSplitWallet.billId);
      const { RETRY_CONFIG: RETRY_CONFIG_DEGEN } = await import('./constants/splitConstants');
      let splitUpdateResult = null;
      let lastSyncError: string | undefined;
      const maxRetriesDegen = RETRY_CONFIG_DEGEN.MAX_ATTEMPTS;
        
        if (existingSplitResult.success && existingSplitResult.split) {
        // Update the existing split with wallet information (with retry)
        for (let attempt = 1; attempt <= maxRetriesDegen; attempt++) {
          try {
            splitUpdateResult = await SplitStorageService.updateSplit(existingSplitResult.split.id, {
            walletId: createdSplitWallet.id,
            walletAddress: createdSplitWallet.walletAddress,
            status: 'active' as const
          });
          
            if (splitUpdateResult.success) {
            logger.info('Existing degen split updated with wallet information', {
              splitWalletId: createdSplitWallet.id,
              splitId: existingSplitResult.split.id,
                billId: createdSplitWallet.billId,
                attempt
            }, 'SplitWalletCreation');
              break;
          } else {
              lastSyncError = splitUpdateResult.error;
              logger.warn(`Degen split update attempt ${attempt}/${maxRetriesDegen} failed`, {
              splitWalletId: createdSplitWallet.id,
              billId: createdSplitWallet.billId,
                error: lastSyncError,
                attempt
            }, 'SplitWalletCreation');
            }
          } catch (syncError) {
            lastSyncError = syncError instanceof Error ? syncError.message : String(syncError);
            logger.warn(`Degen split update attempt ${attempt}/${maxRetriesDegen} threw error`, {
              splitWalletId: createdSplitWallet.id,
              billId: createdSplitWallet.billId,
              error: lastSyncError,
              attempt
            }, 'SplitWalletCreation');
          }
          
          // Wait before retry (exponential backoff: 100ms, 200ms, 400ms)
          if (attempt < maxRetriesDegen && (!splitUpdateResult || !splitUpdateResult.success)) {
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
          }
          }
        } else {
          // Only create a new split if none exists (fallback case)
          logger.warn('No existing split found for degen wallet, creating fallback split', {
            splitWalletId: createdSplitWallet.id,
            billId: createdSplitWallet.billId
          }, 'SplitWalletCreation');
          
          const splitData = {
            billId: createdSplitWallet.billId,
            title: `Degen Split - ${createdSplitWallet.billId}`,
            description: `Fallback degen split for bill ${createdSplitWallet.billId}`,
            totalAmount: createdSplitWallet.totalAmount,
            currency: createdSplitWallet.currency,
            splitType: 'degen' as const,
            status: 'active' as const,
            creatorId: createdSplitWallet.creatorId,
            creatorName: creatorName,
            participants: participants.map(p => ({
              userId: p.userId,
              name: p.name,
              amountOwed: p.amountOwed,
              amountPaid: 0,
              status: 'pending' as const,
              walletAddress: p.walletAddress
            })),
            date: new Date().toISOString(),
            walletId: createdSplitWallet.id,
            walletAddress: createdSplitWallet.walletAddress
          };

        // Retry split creation
        for (let attempt = 1; attempt <= maxRetriesDegen; attempt++) {
          try {
            splitUpdateResult = await SplitStorageService.createSplit(splitData);
          
            if (splitUpdateResult.success) {
            logger.info('Fallback degen split document created in splits collection', {
              splitWalletId: createdSplitWallet.id,
                splitId: splitUpdateResult.split?.id,
              billId: createdSplitWallet.billId,
                firebaseDocId: splitUpdateResult.split?.firebaseDocId,
                attempt
            }, 'SplitWalletCreation');
              break;
          } else {
              lastSyncError = splitUpdateResult.error;
              logger.warn(`Fallback degen split creation attempt ${attempt}/${maxRetriesDegen} failed`, {
              splitWalletId: createdSplitWallet.id,
              billId: createdSplitWallet.billId,
                error: lastSyncError,
                attempt
            }, 'SplitWalletCreation');
          }
          } catch (syncError) {
            lastSyncError = syncError instanceof Error ? syncError.message : String(syncError);
            logger.warn(`Fallback degen split creation attempt ${attempt}/${maxRetriesDegen} threw error`, {
              splitWalletId: createdSplitWallet.id,
              billId: createdSplitWallet.billId,
              error: lastSyncError,
              attempt
            }, 'SplitWalletCreation');
          }
          
          // Wait before retry (exponential backoff: 100ms, 200ms, 400ms)
          if (attempt < maxRetriesDegen && (!splitUpdateResult || !splitUpdateResult.success)) {
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
          }
        }
      }
      
      // CRITICAL: Fail wallet creation if split update/create fails after all retries
      if (!splitUpdateResult || !splitUpdateResult.success) {
        logger.error('Failed to update/create split document after all retries - rolling back wallet creation', {
          splitWalletId: createdSplitWallet.id,
          billId: createdSplitWallet.billId,
          error: lastSyncError,
          attempts: maxRetries
        }, 'SplitWalletCreation');
        
        // Rollback: Delete private keys and wallet
        let rollbackSuccess = false;
        try {
          // Delete private keys first
          const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
          await SplitWalletSecurity.deleteSplitWalletPrivateKeyForAllParticipants(
            splitWalletId,
            participants.map(p => ({ userId: p.userId, name: p.name }))
          );
          
          // Delete wallet
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId));
          rollbackSuccess = true;
          logger.info('Rolled back degen wallet creation after split document update failure', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId
          }, 'SplitWalletCreation');
        } catch (rollbackError) {
          logger.error('Failed to rollback degen wallet creation', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId,
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          }, 'SplitWalletCreation');
          
          // Mark wallet for manual cleanup
          try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId), {
              status: 'cancelled',
              error: 'Split document sync failed - requires manual cleanup',
              lastUpdated: new Date().toISOString()
            });
          } catch (markError) {
            // Ignore - already in error state
          }
        }
        
        return {
          success: false,
          error: `Failed to update/create split document after ${maxRetriesDegen} attempts: ${lastSyncError || 'Unknown error'}. Wallet creation rolled back${rollbackSuccess ? '' : ' (wallet marked for manual cleanup)'}.`
        };
      }

      // Store private key for ALL participants (Degen Split feature)
      // The wallet service returns secretKey (base64), not privateKey
      const privateKey = wallet.secretKey;
      if (!privateKey) {
        logger.error('No private key available from wallet service', { 
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          hasSecretKey: !!wallet.secretKey
        }, 'SplitWalletCreation');
        throw new Error('No private key available from wallet service');
      }

      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      
      // CRITICAL FIX: Add retry mechanism for private key storage (3 attempts)
      // For degen splits, ensure all-or-nothing: all participants get keys or none do
      const { RETRY_CONFIG: RETRY_CONFIG_DEGEN_KEYS } = await import('./constants/splitConstants');
      let storeResult = null;
      let lastError: string | undefined;
      const maxRetriesDegenKeys = RETRY_CONFIG_DEGEN_KEYS.MAX_ATTEMPTS;
      
      for (let attempt = 1; attempt <= maxRetriesDegenKeys; attempt++) {
        storeResult = await SplitWalletSecurity.storeSplitWalletPrivateKeyForAllParticipants(
        splitWalletId,
        participants.map(p => ({ userId: p.userId, name: p.name })),
        privateKey
      );

        if (storeResult.success) {
          // Verify all keys were stored by checking each participant
          let allKeysStored = true;
          for (const participant of participants) {
            const hasKey = await SplitWalletSecurity.hasLocalPrivateKey(splitWalletId, participant.userId);
            if (!hasKey) {
              allKeysStored = false;
              logger.warn('Private key verification failed for participant', {
                splitWalletId,
                userId: participant.userId,
                attempt
              }, 'SplitWalletCreation');
              break;
            }
          }
          
          if (allKeysStored) {
            logger.info('Private keys stored and verified for all Degen Split participants', {
              splitWalletId,
              participantsCount: participants.length,
              attempt
            }, 'SplitWalletCreation');
            break;
          } else {
            // If verification failed, treat as storage failure and retry
            storeResult = { success: false, error: 'Key verification failed - not all participants have keys' };
            lastError = storeResult.error;
          }
        } else {
          lastError = storeResult.error;
          logger.warn(`Private key storage attempt ${attempt}/${maxRetriesDegenKeys} failed for degen split`, {
            splitWalletId,
            participantsCount: participants.length,
            error: lastError,
            attempt
          }, 'SplitWalletCreation');
        }
        
        // Wait before retry (exponential backoff: 100ms, 200ms, 400ms)
        if (attempt < maxRetriesDegenKeys && !storeResult.success) {
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG_DEGEN_KEYS.BACKOFF_BASE * Math.pow(RETRY_CONFIG_DEGEN_KEYS.BACKOFF_MULTIPLIER, attempt - 1)));
        }
      }

      if (!storeResult || !storeResult.success) {
        logger.error('Failed to store private keys for all participants after all retries', { 
          error: lastError,
          attempts: maxRetriesDegenKeys,
          participantsCount: participants.length
        }, 'SplitWalletCreation');
        
        // CRITICAL: Private key storage failure means participants can't withdraw
        // Clean up any keys that were stored (attempt cleanup)
        try {
          await SplitWalletSecurity.deleteSplitWalletPrivateKeyForAllParticipants(
            splitWalletId,
            participants.map(p => ({ userId: p.userId, name: p.name }))
          );
          logger.info('Cleaned up partially stored private keys', {
            splitWalletId,
            participantsCount: participants.length
          }, 'SplitWalletCreation');
        } catch (cleanupKeysError) {
          logger.warn('Failed to cleanup partially stored private keys', {
            splitWalletId,
            error: cleanupKeysError instanceof Error ? cleanupKeysError.message : String(cleanupKeysError)
          }, 'SplitWalletCreation');
        }
        
        // Clean up the wallet that was created
        let cleanupSuccess = false;
        try {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId));
          cleanupSuccess = true;
          logger.info('Cleaned up degen split wallet after private key storage failure', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId
          }, 'SplitWalletCreation');
        } catch (cleanupError) {
          logger.error('Failed to cleanup degen split wallet after private key storage failure', {
            splitWalletId: createdSplitWallet.id,
            firebaseDocId: createdSplitWallet.firebaseDocId,
            cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          }, 'SplitWalletCreation');
          
          // Mark wallet for manual cleanup
          try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'splitWallets', createdSplitWallet.firebaseDocId), {
              status: 'cancelled',
              error: 'Private key storage failed - requires manual cleanup',
              lastUpdated: new Date().toISOString()
            });
            logger.warn('Marked degen wallet for manual cleanup', {
              splitWalletId: createdSplitWallet.id,
              firebaseDocId: createdSplitWallet.firebaseDocId
            }, 'SplitWalletCreation');
          } catch (markError) {
            logger.error('Failed to mark degen wallet for manual cleanup', {
              splitWalletId: createdSplitWallet.id,
              error: markError instanceof Error ? markError.message : String(markError)
          }, 'SplitWalletCreation');
          }
        }
        
        return {
          success: false,
          error: `Failed to store private keys for all participants after ${maxRetriesDegenKeys} attempts: ${lastError || 'Unknown error'}. Split wallet creation aborted${cleanupSuccess ? '' : ' (wallet marked for manual cleanup)'}.`
        };
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
      logger.error('Failed to create Degen Split wallet', {
        error: error instanceof Error ? error.message : String(error),
        billId,
        creatorId
      }, 'SplitWalletCreation');
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

      // Create a new dedicated wallet with the same ID but reset data
      const { generateWalletFromMnemonic } = await import('../blockchain/wallet/derive');
      const newWalletResult = generateWalletFromMnemonic(); // Generates new mnemonic automatically
      
      const newWallet = {
        address: newWalletResult.address,
        publicKey: newWalletResult.publicKey,
        secretKey: newWalletResult.secretKey
      };

      // Update the wallet with new address and reset participants
      const updatedWalletData = {
        walletAddress: newWallet.address,
        publicKey: newWallet.publicKey,
        status: 'active' as const,
        participants: currentWallet.participants.map(p => ({
          ...p,
          amountPaid: 0,
          status: 'pending' as const,
          // Remove undefined fields - Firebase doesn't allow undefined values
          transactionSignature: undefined,
          paidAt: undefined,
        })),
        updatedAt: new Date().toISOString(),
        // Remove undefined fields - Firebase doesn't allow undefined values
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
      logger.error('Failed to force reset split wallet', {
        error: error instanceof Error ? error.message : String(error),
        splitWalletId
      }, 'SplitWalletCreation');
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
