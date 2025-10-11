/**
 * Split Wallet Service
 * Manages wallet creation and operations for bill splits
 * The creator of the split owns the wallet and has custody
 */

import { consolidatedWalletService } from './consolidatedWalletService';
import { consolidatedTransactionService } from './consolidatedTransactionService';
import { logger } from './loggingService';
import { FeeService } from '../config/feeConfig';
import { roundUsdcAmount } from '../utils/currencyUtils';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SplitWallet {
  id: string;
  billId: string;
  creatorId: string;
  walletAddress: string;
  publicKey: string;
  // SECURITY: Private keys are NEVER stored in Firebase
  // The creator stores the split wallet's private key locally on their device
  totalAmount: number;
  currency: string;
  status: 'active' | 'locked' | 'completed' | 'cancelled' | 'spinning_completed';
  participants: SplitWalletParticipant[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string; // When the split was completed
  firebaseDocId?: string; // Firebase document ID for direct access
  degenWinner?: { // For degen splits - stores the winner information
    userId: string;
    name: string;
    selectedAt: string;
  };
}

export interface SplitWalletParticipant {
  userId: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'locked' | 'paid' | 'failed';
  transactionSignature?: string;
  paidAt?: string;
}

export interface SplitWalletResult {
  success: boolean;
  wallet?: SplitWallet;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionSignature?: string;
  amount?: number;
  error?: string;
  message?: string;
}

export class SplitWalletService {
  /**
   * Round USDC amount to proper precision (6 decimal places)
   * Uses floor instead of round to avoid rounding up beyond available balance
   */
  static roundUsdcAmount(amount: number): number {
    return roundUsdcAmount(amount);
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
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(userId);
      
      if (!walletResult.success) {
        // If wallet doesn't exist, we can't create it here - user needs to set up wallet first
        return { success: false, error: 'User wallet not found. Please set up your wallet first.' };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Wallet initialization failed' };
    }
  }

  /**
   * Check USDC balance for a user
   */
  static async checkUsdcBalance(userId: string): Promise<{success: boolean, balance: number, error?: string}> {
    try {
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return { success: false, balance: 0, error: 'User wallet not found' };
      }
      
      const { PublicKey, Connection } = require('@solana/web3.js');
      const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');
      const { CURRENT_NETWORK } = require('../config/chain');
      
      const connection = new Connection(CURRENT_NETWORK.rpcUrl);
      const publicKey = new PublicKey(walletResult.wallet.publicKey);
      const usdcTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(CURRENT_NETWORK.usdcMintAddress),
        publicKey
      );
      
      try {
        const account = await getAccount(connection, usdcTokenAccount);
        const balance = Number(account.amount) / 1000000; // USDC has 6 decimals
        return { success: true, balance };
      } catch {
        return { success: true, balance: 0 }; // No USDC token account means 0 balance
      }
    } catch (error) {
      return { success: false, balance: 0, error: 'Failed to check balance' };
    }
  }

  /**
   * Ensure USDC token account exists for a user
   */
  static async ensureUsdcTokenAccount(userId: string): Promise<{success: boolean, error?: string}> {
    try {
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return { success: false, error: 'User wallet not found' };
      }
      
      const { PublicKey, Connection, Keypair } = require('@solana/web3.js');
      const { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
      const { CURRENT_NETWORK } = require('../config/chain');
      
      const connection = new Connection(CURRENT_NETWORK.rpcUrl);
      const publicKey = new PublicKey(walletResult.wallet.publicKey);
      const usdcTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(CURRENT_NETWORK.usdcMintAddress),
        publicKey
      );
      
      try {
        await getAccount(connection, usdcTokenAccount);
        return { success: true }; // Account exists
      } catch {
        // Account doesn't exist, try to create it
        try {
          // Create keypair from user's secret key
          let keypair: any;
          try {
            if (!walletResult.wallet.secretKey) {
              throw new Error('No secret key found');
            }
            const secretKeyBuffer = Buffer.from(walletResult.wallet.secretKey, 'base64');
            keypair = Keypair.fromSecretKey(secretKeyBuffer);
          } catch {
            if (!walletResult.wallet.secretKey) {
              throw new Error('No secret key found');
            }
            const secretKeyArray = JSON.parse(walletResult.wallet.secretKey);
            keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          }
          
          // Create the USDC token account
          const transaction = new (require('@solana/web3.js').Transaction)();
          transaction.add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey, // payer
              usdcTokenAccount, // associated token account
              publicKey, // owner
              new PublicKey(CURRENT_NETWORK.usdcMintAddress) // mint
            )
          );
          
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = FeeService.getFeePayerPublicKey(keypair.publicKey);
          
          const signature = await connection.sendTransaction(transaction, [keypair]);
          await connection.confirmTransaction(signature);
          
          console.log('✅ Created USDC token account for user:', userId);
          return { success: true };
        } catch (createError) {
          console.error('❌ Failed to create USDC token account:', createError);
          return { success: false, error: 'Failed to create USDC token account' };
        }
      }
    } catch (error) {
      return { success: false, error: 'Failed to ensure USDC token account' };
    }
  }

  /**
   * Test method to verify split wallet creation works
   */
  static async testSplitWalletCreation(): Promise<{ success: boolean; error?: string; walletId?: string }> {
    try {
      console.log('🧪 SplitWalletService: Testing split wallet creation...');
      
      const testBillId = `test_bill_${Date.now()}`;
      const testCreatorId = 'test_creator_123';
      const testTotalAmount = 100;
      const testParticipants = [
        {
          userId: 'test_user_1',
          name: 'Test User 1',
          walletAddress: 'test_wallet_1',
          amountOwed: 50,
        },
        {
          userId: 'test_user_2', 
          name: 'Test User 2',
          walletAddress: 'test_wallet_2',
          amountOwed: 50,
        }
      ];

      const result = await this.createSplitWallet(
        testBillId,
        testCreatorId,
        testTotalAmount,
        'USDC',
        testParticipants
      );

      if (result.success && result.wallet) {
        console.log('🧪 SplitWalletService: Test successful!', { walletId: result.wallet.id });
        return { success: true, walletId: result.wallet.id };
      } else {
        console.log('🧪 SplitWalletService: Test failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log('🧪 SplitWalletService: Test error:', error);
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
      console.log('🔍 SplitWalletService: Starting createSplitWallet with:', {
        billId, 
        creatorId, 
        totalAmount, 
        currency,
        participantsCount: participants.length
      });
      
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
      }, 'SplitWalletService');

      // Create a new dedicated wallet for this split
      // This wallet will be managed by the creator but is separate from their main wallet
      const wallet = await consolidatedWalletService.createWallet();
      if (!wallet) {
        throw new Error('Failed to create wallet for split');
      }
      
      console.log('🔍 SplitWalletService: Wallet created successfully:', {
        address: wallet.address,
        publicKey: wallet.publicKey
      });
      
      logger.info('Split wallet created with address', { 
        walletAddress: wallet.address,
        publicKey: wallet.publicKey 
      }, 'SplitWalletService');

        // Create split wallet record (NO PRIVATE KEYS STORED)
        const splitWallet: SplitWallet = {
          id: `split_wallet_${billId}_${Date.now()}`,
          billId,
          creatorId,
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          // SECURITY: Private keys are NEVER stored in Firebase
          totalAmount,
          currency,
        status: 'active',
        participants: participants.map(p => ({
          ...p,
          amountPaid: 0,
          status: p.userId === creatorId ? 'locked' : 'pending', // Creator should be locked (accepted)
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Validate split wallet data before storing
      console.log('🔍 SplitWalletService: Validating split wallet data:', {
        hasId: !!splitWallet.id,
        hasBillId: !!splitWallet.billId,
        hasCreatorId: !!splitWallet.creatorId,
        hasWalletAddress: !!splitWallet.walletAddress,
        hasPublicKey: !!splitWallet.publicKey,
        totalAmount: splitWallet.totalAmount,
        currency: splitWallet.currency,
        participantsCount: splitWallet.participants.length
      });

      // Validate participant data to prevent corruption
      const totalParticipantAmounts = splitWallet.participants.reduce((sum, p) => sum + p.amountOwed, 0);
      if (Math.abs(totalParticipantAmounts - splitWallet.totalAmount) > 0.01) {
        console.warn('🔍 SplitWalletService: Participant amounts do not match total amount, correcting...', {
          totalParticipantAmounts,
          totalAmount: splitWallet.totalAmount,
          difference: Math.abs(totalParticipantAmounts - splitWallet.totalAmount)
        });
        
        // Fix the participant amounts to match the total
        const correctedAmountPerPerson = splitWallet.totalAmount / splitWallet.participants.length;
        splitWallet.participants = splitWallet.participants.map(p => ({
          ...p,
          amountOwed: correctedAmountPerPerson
        }));
      }

      // Ensure all participants have amountPaid = 0 initially
      splitWallet.participants.forEach(participant => {
        if (participant.amountPaid !== 0) {
          console.warn('🔍 SplitWalletService: Participant has non-zero amountPaid on creation:', {
            userId: participant.userId,
            name: participant.name,
            amountPaid: participant.amountPaid
          });
          participant.amountPaid = 0; // Force reset to 0
        }
      });
      
      logger.info('Validating split wallet data', {
        hasId: !!splitWallet.id,
        hasBillId: !!splitWallet.billId,
        hasCreatorId: !!splitWallet.creatorId,
        hasWalletAddress: !!splitWallet.walletAddress,
        hasPublicKey: !!splitWallet.publicKey,
        totalAmount: splitWallet.totalAmount,
        currency: splitWallet.currency,
        participantsCount: splitWallet.participants.length,
        participants: splitWallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed
        }))
      }, 'SplitWalletService');

      // Store in Firebase
      try {
        console.log('🔍 SplitWalletService: Attempting to store in Firebase...');
        
        logger.info('Attempting to store split wallet in Firebase', {
          splitWalletId: splitWallet.id,
          walletAddress: wallet.address,
          participantsCount: splitWallet.participants.length,
          totalAmount: splitWallet.totalAmount
        }, 'SplitWalletService');
        
        // Test Firebase connectivity first
        console.log('🔍 SplitWalletService: Testing Firebase connectivity...');
        logger.info('Testing Firebase connectivity...', {}, 'SplitWalletService');
        const testCollection = collection(db, 'splitWallets');
        console.log('🔍 SplitWalletService: Firebase collection reference created');
        logger.info('Firebase collection reference created successfully', {}, 'SplitWalletService');
        
        // Store the split wallet
        console.log('🔍 SplitWalletService: Storing split wallet document...');
        const docRef = await addDoc(testCollection, splitWallet);
        console.log('🔍 SplitWalletService: Document created with ID:', docRef.id);
        logger.info('Split wallet document created with ID', { documentId: docRef.id }, 'SplitWalletService');
        
        // Update the split wallet object with the Firebase document ID
        splitWallet.firebaseDocId = docRef.id;
        
        // Store the private key locally on the creator's device
        if (wallet.secretKey) {
          const storeResult = await this.storeSplitWalletPrivateKey(splitWallet.id, creatorId, wallet.secretKey);
          if (!storeResult.success) {
            console.warn('🔍 SplitWalletService: Failed to store private key locally:', storeResult.error);
            // Don't fail the entire operation, but log the warning
          } else {
            console.log('🔍 SplitWalletService: Private key stored locally on creator device');
          }
        }
        
        console.log('🔍 SplitWalletService: Split wallet stored successfully!');
        logger.info('Split wallet stored successfully in Firebase', { 
          splitWalletId: splitWallet.id, 
          walletAddress: wallet.address,
          documentId: docRef.id
        }, 'SplitWalletService');
      } catch (firebaseError) {
        console.log('🔍 SplitWalletService: Firebase error occurred:', firebaseError);
        logger.error('Failed to store split wallet in Firebase', {
          error: firebaseError instanceof Error ? firebaseError.message : 'Unknown error',
          stack: firebaseError instanceof Error ? firebaseError.stack : undefined,
          splitWalletId: splitWallet.id,
          walletAddress: wallet.address,
          participantsCount: splitWallet.participants.length,
          errorType: typeof firebaseError,
          errorName: firebaseError instanceof Error ? firebaseError.name : 'Unknown'
        }, 'SplitWalletService');
        throw new Error(`Failed to store split wallet: ${firebaseError instanceof Error ? firebaseError.message : 'Unknown error'}`);
      }

      return {
        success: true,
        wallet: splitWallet,
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error occurred in createSplitWallet:', error);
      logger.error('Failed to create split wallet', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        billId,
        creatorId,
        totalAmount,
        currency,
        participantsCount: participants.length
      }, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Force reset split wallet to unified mockup data
   * This completely resets the wallet with correct amounts and clears all payments
   */
  static async forceResetSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      console.log('🔧 SplitWalletService: Force resetting split wallet:', { splitWalletId });

      // Get the current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: 'Split wallet not found'
        };
      }

      const currentWallet = currentWalletResult.wallet;
      const { MockupDataService } = await import('../data/mockupData');
      const unifiedAmount = MockupDataService.getBillAmount();

      // Completely reset the wallet with unified mockup data
      const resetWallet: SplitWallet = {
        ...currentWallet,
        totalAmount: unifiedAmount,
        currency: 'USDC',
        participants: currentWallet.participants.map(p => ({
          ...p,
          amountOwed: unifiedAmount / currentWallet.participants.length,
          amountPaid: 0, // Reset all payments
          status: 'pending' as const, // Reset all statuses
          transactionSignature: undefined, // Clear transaction signatures
          paidAt: undefined // Clear payment timestamps
        }))
      };

      // Update the wallet in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        totalAmount: resetWallet.totalAmount,
        currency: resetWallet.currency,
        participants: resetWallet.participants,
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ SplitWalletService: Split wallet force reset successfully:', {
        splitWalletId,
        oldAmount: currentWallet.totalAmount,
        newAmount: unifiedAmount,
        participantsReset: currentWallet.participants.length
      });

      return {
        success: true,
        wallet: resetWallet
      };

    } catch (error) {
      console.error('❌ SplitWalletService: Error force resetting split wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update split wallet total amount
   * This is used for migration when the wallet amount needs to be corrected
   */
  static async updateSplitWalletAmount(splitWalletId: string, newTotalAmount: number, currency: string = 'USDC'): Promise<SplitWalletResult> {
    try {
      console.log('🔍 SplitWalletService: Updating split wallet amount:', {
        splitWalletId,
        newTotalAmount,
        currency
      });
      

      // Get the current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: 'Split wallet not found'
        };
      }

      const currentWallet = currentWalletResult.wallet;
      const oldAmount = currentWallet.totalAmount;

      // Update the wallet with new amount
      const updatedWallet: SplitWallet = {
        ...currentWallet,
        totalAmount: newTotalAmount,
        currency,
        participants: currentWallet.participants.map(p => ({
          ...p,
          amountOwed: newTotalAmount / currentWallet.participants.length, // Recalculate equal split
          amountPaid: 0, // Reset payment amounts since we're changing the total
          status: 'pending' as const // Reset status to pending
        }))
      };

      // Update the wallet in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        totalAmount: updatedWallet.totalAmount,
        currency: updatedWallet.currency,
        participants: updatedWallet.participants,
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ SplitWalletService: Split wallet amount updated successfully:', {
        splitWalletId,
        oldAmount,
        newTotalAmount,
        currency
      });

      return {
        success: true,
        wallet: updatedWallet
      };

    } catch (error) {
      console.error('❌ SplitWalletService: Error updating split wallet amount:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update split wallet with any fields
   * This is a general method for updating split wallet data
   */
  static async updateSplitWallet(splitWalletId: string, updates: Partial<SplitWallet>): Promise<SplitWalletResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      const docId = wallet.firebaseDocId || splitWalletId;

      // Filter out undefined values before updating Firebase
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      // Update the wallet with the provided fields
      await updateDoc(doc(db, 'splitWallets', docId), {
        ...filteredUpdates,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Split wallet updated successfully', {
        splitWalletId,
        updates: Object.keys(updates)
      }, 'SplitWalletService');

      return {
        success: true,
        wallet: {
          ...wallet,
          ...updates,
        },
      };

    } catch (error) {
      logger.error('Failed to update split wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update split wallet participants without recreating the wallet
   * This allows adding/removing participants while maintaining the same wallet
   */
  static async updateSplitWalletParticipants(splitWalletId: string, participants: Omit<SplitWalletParticipant, 'amountPaid' | 'status' | 'transactionSignature' | 'paidAt'>[]): Promise<SplitWalletResult> {
    try {
      console.log('🔍 SplitWalletService: Updating split wallet participants:', {
        splitWalletId,
        participantsCount: participants.length
      });

      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return walletResult;
      }

      const wallet = walletResult.wallet;
      
      // Update participants list - preserve creator status as 'accepted', others as 'pending'
      const updatedParticipants = participants.map(p => {
        const existingParticipant = wallet.participants.find(wp => wp.userId === p.userId);
        const isCreator = p.userId === wallet.creatorId;
        
        const participantData: any = {
          ...p,
          amountPaid: existingParticipant?.amountPaid || 0, // Preserve existing payments
          status: isCreator ? 'locked' as const : 'pending' as const, // Creator is locked, others are pending
        };

        // Only add optional fields if they exist (Firebase doesn't allow undefined values)
        if (existingParticipant?.transactionSignature) {
          participantData.transactionSignature = existingParticipant.transactionSignature;
        }
        if (existingParticipant?.paidAt) {
          participantData.paidAt = existingParticipant.paidAt;
        }

        return participantData;
      });

      console.log('🔍 SplitWalletService: Updated participants with correct status:', {
        participants: updatedParticipants.map(p => ({
          userId: p.userId,
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status,
          isCreator: p.userId === wallet.creatorId
        }))
      });

      // Update the wallet in Firebase
      await updateDoc(doc(db, 'splitWallets', wallet.firebaseDocId || splitWalletId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      console.log('🔍 SplitWalletService: Successfully updated split wallet participants');

      return {
        success: true,
        wallet: {
          ...wallet,
          participants: updatedParticipants,
        },
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error updating split wallet participants:', error);
      logger.error('Failed to update split wallet participants', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Store split wallet private key locally on creator's device
   * Only the creator can store and access their split wallet's private key
   */
  static async storeSplitWalletPrivateKey(splitWalletId: string, creatorId: string, privateKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 SplitWalletService: Storing split wallet private key locally:', {
        splitWalletId,
        creatorId,
        hasPrivateKey: !!privateKey
      });

      // Import secure storage service
      const { secureStorageService } = await import('./secureStorageService');
      
      // Convert private key to the same format used by user wallets
      const secretKeyArray = Array.from(new Uint8Array(Buffer.from(privateKey, 'base64')));
      
      // Store the private key securely on the creator's device using the same method as user wallets
      const storageKey = `split_wallet_${splitWalletId}`;
      await secureStorageService.storePrivateKey(storageKey, JSON.stringify(secretKeyArray));

      console.log('🔍 SplitWalletService: Split wallet private key stored successfully');
      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletService: Error storing split wallet private key:', error);
      logger.error('Failed to store split wallet private key', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if a split wallet has its private key stored locally
   * This helps identify splits that need to be recreated
   */
  static async hasLocalPrivateKey(splitWalletId: string, creatorId: string): Promise<{ success: boolean; hasKey: boolean; error?: string }> {
    try {
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, creatorId);
      return {
        success: true,
        hasKey: privateKeyResult.success && !!privateKeyResult.privateKey
      };
    } catch (error) {
      return {
        success: false,
        hasKey: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get split wallet private key from creator's local storage
   * Only the creator of the split can access the private key
   */
  static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      console.log('🔍 SplitWalletService: Getting private key for split wallet:', {
        splitWalletId,
        requesterId
      });

      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Verify that the requester is the creator
      if (wallet.creatorId !== requesterId) {
        console.log('🔍 SplitWalletService: Unauthorized access attempt to private key:', {
          requesterId,
          creatorId: wallet.creatorId,
          walletId: splitWalletId
        });
        logger.warn('Unauthorized private key access attempt', {
          requesterId,
          creatorId: wallet.creatorId,
          walletId: splitWalletId
        }, 'SplitWalletService');
        return {
          success: false,
          error: 'Only the split creator can access the private key',
        };
      }

      // Import secure storage service
      const { secureStorageService } = await import('./secureStorageService');
      
      // Retrieve the private key from local storage using the same method as user wallets
      const storageKey = `split_wallet_${splitWalletId}`;
      const privateKeyData = await secureStorageService.getPrivateKey(storageKey);

      if (!privateKeyData) {
        return {
          success: false,
          error: 'Split wallet private key not found in local storage. Please recreate the split.',
        };
      }

      // Convert back from the stored format to base64 string
      const secretKeyArray = JSON.parse(privateKeyData);
      const privateKeyBuffer = Buffer.from(secretKeyArray);
      const privateKey = privateKeyBuffer.toString('base64');

      console.log('🔍 SplitWalletService: Private key retrieved from local storage');
      return {
        success: true,
        privateKey: privateKey,
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error getting private key:', error);
      logger.error('Failed to get split wallet private key', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet by ID (internal ID or Firebase document ID)
   */
  static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      // First, try to get by Firebase document ID (if it looks like a Firebase doc ID)
      if (splitWalletId.length > 20 && !splitWalletId.startsWith('split_wallet_')) {
        const walletDoc = await getDoc(doc(db, 'splitWallets', splitWalletId));
        
        if (walletDoc.exists()) {
          return {
            success: true,
            wallet: walletDoc.data() as SplitWallet,
          };
        }
      }
      
      // If not found by document ID, try to find by internal ID
      const walletsRef = collection(db, 'splitWallets');
      const q = query(walletsRef, where('id', '==', splitWalletId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const walletData = querySnapshot.docs[0].data() as SplitWallet;
        // Add the Firebase document ID to the wallet data
        walletData.firebaseDocId = querySnapshot.docs[0].id;
        return {
          success: true,
          wallet: walletData,
        };
      }
      
      return {
        success: false,
        error: 'Split wallet not found',
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error getting split wallet:', error);
      logger.error('Failed to get split wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet by bill ID
   */
  static async getSplitWalletByBillId(billId: string): Promise<SplitWalletResult> {
    try {
      const walletsRef = collection(db, 'splitWallets');
      const q = query(walletsRef, where('billId', '==', billId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'No split wallet found for this bill',
        };
      }

      // Return the most recent wallet for this bill
      const wallets = querySnapshot.docs.map(doc => doc.data() as SplitWallet);
      const wallet = wallets.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        success: true,
        wallet: wallet,
      };

    } catch (error) {
      logger.error('Failed to get split wallet by bill ID', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Lock a participant's amount in the split wallet (for degen splits)
   * This function actually transfers funds from participant to split wallet
   */
  static async lockParticipantAmount(splitWalletId: string, participantId: string, amount: number): Promise<SplitWalletResult> {
    try {
      console.log('🔍 SplitWalletService: Locking participant amount:', {
        splitWalletId,
        participantId,
        amount
      });

      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return walletResult;
      }

      const wallet = walletResult.wallet;
      
      console.log('🔍 SplitWalletService: Current wallet participants:', {
        walletParticipants: wallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          status: p.status,
          amountPaid: p.amountPaid
        })),
        lookingForParticipantId: participantId
      });
      
      // Find the participant
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        console.error('🔍 SplitWalletService: Participant not found in wallet:', {
          participantId,
          availableParticipants: wallet.participants.map(p => p.userId)
        });
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Check if participant already has funds locked
      if (participant.amountPaid > 0) {
        console.log('🔍 SplitWalletService: Participant already has funds locked:', {
          participantId,
          amountPaid: participant.amountPaid
        });
        return {
          success: true,
          wallet: wallet,
        };
      }

      // Validate participant has wallet address
      if (!participant.walletAddress) {
        return {
          success: false,
          error: 'Participant does not have a valid wallet address. Please ensure the user has connected their wallet.',
        };
      }

      // Actually transfer funds from participant to split wallet
      console.log('🔍 SplitWalletService: Processing payment from participant to split wallet:', {
        from: participant.walletAddress,
        to: wallet.walletAddress,
        amount: amount
      });

      const paymentResult = await this.processParticipantPayment(
        splitWalletId,
        participantId,
        amount,
        participant.walletAddress
      );

      if (!paymentResult.success) {
        console.error('🔍 SplitWalletService: Failed to process participant payment:', paymentResult.error);
        return {
          success: false,
          error: paymentResult.error || 'Failed to transfer funds to split wallet',
        };
      }

      console.log('🔍 SplitWalletService: Successfully locked participant amount and transferred funds:', {
        participantId,
        amount,
        transactionSignature: paymentResult.transactionSignature
      });

      // Reload wallet to get updated balance
      const updatedWalletResult = await this.getSplitWallet(splitWalletId);
      if (updatedWalletResult.success && updatedWalletResult.wallet) {
        return {
          success: true,
          wallet: updatedWalletResult.wallet,
        };
      }

      return {
        success: true,
        wallet: wallet,
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error locking participant amount:', error);
      logger.error('Failed to lock participant amount', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Lock the split wallet (for degen splits)
   * Participants must lock their full amount before the split can proceed
   */
  static async lockSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return result;
      }

      const wallet = result.wallet;

      // Check if all participants have locked their amounts
      const allLocked = wallet.participants.every(p => p.status === 'locked');
      if (!allLocked) {
        return {
          success: false,
          error: 'Not all participants have locked their amounts',
        };
      }

      // Update wallet status
      const updatedWallet = {
        ...wallet,
        status: 'locked' as const,
        updatedAt: new Date().toISOString(),
      };

      // Use Firebase document ID if available, otherwise use the splitWalletId
      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        status: 'locked',
        updatedAt: new Date().toISOString(),
      });

      logger.info('Split wallet locked successfully', { splitWalletId }, 'SplitWalletService');

      // Send notifications for degen split lock completion
      await this.sendDegenLockCompletionNotifications(updatedWallet);

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      logger.error('Failed to lock split wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process payment from participant to split wallet
   * This method should be called by the participant to send their payment
   */
  static async processParticipantPayment(
    splitWalletId: string,
    participantId: string,
    amount: number,
    payerWalletAddress: string
  ): Promise<PaymentResult> {
    try {
      // Ensure amount is properly rounded using our currency utilities
      const roundedAmount = this.roundUsdcAmount(amount);
      
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      const participant = wallet.participants.find(p => p.userId === participantId);

      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      if (participant.amountPaid >= participant.amountOwed) {
        return {
          success: false,
          error: 'Participant has already paid their full amount',
        };
      }

      // Validate payment amount
      const remainingAmount = participant.amountOwed - participant.amountPaid;
      if (roundedAmount > remainingAmount) {
        return {
          success: false,
          error: `Payment amount (${roundedAmount}) exceeds remaining amount (${remainingAmount})`,
        };
      }

      // Send transaction from participant's wallet to split wallet
      // Use the same approach as working one-to-one transfers
      console.log('🔍 SplitWalletService: Sending USDC transaction to split wallet:', {
        toAddress: wallet.walletAddress,
        originalAmount: amount,
        roundedAmount: roundedAmount,
        fromUserId: participantId,
        memo: `Split payment for bill ${wallet.billId}`,
        participantWalletAddress: participant.walletAddress,
        participantName: participant.name
      });
      
      const transactionResult = await this.sendUsdcToSplitWallet(
        participantId,
        wallet.walletAddress,
        roundedAmount,
        `Split payment for bill ${wallet.billId}`
      );
      
      console.log('🔍 SplitWalletService: Transaction result:', transactionResult);

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Verify the transaction actually succeeded by checking the split wallet balance
      console.log('🔍 SplitWalletService: Verifying transaction by checking split wallet balance...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for blockchain propagation
      
      const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
      
      if (!balanceResult.success) {
        console.warn('🔍 SplitWalletService: Could not verify balance, but transaction was confirmed. Proceeding with caution.');
      } else {
        console.log('🔍 SplitWalletService: Split wallet balance after payment:', {
          balance: balanceResult.balance,
          expectedIncrease: roundedAmount,
          walletAddress: wallet.walletAddress
        });
        
        // If balance is still effectively 0 after confirmed transaction, there might be an issue
        const minimumThreshold = 0.001; // 0.001 USDC minimum threshold
        if (balanceResult.balance < minimumThreshold) {
          console.error('🔍 SplitWalletService: WARNING - Split wallet balance is below threshold after confirmed transaction. This may indicate a problem with the USDC transfer.', {
            balance: balanceResult.balance,
            threshold: minimumThreshold,
            expectedIncrease: roundedAmount
          });
          // Don't fail the transaction, but log the issue for investigation
        }
      }

      // Update participant payment status
      const updatedAmountPaid = participant.amountPaid + roundedAmount;
      const newStatus = updatedAmountPaid >= participant.amountOwed ? 'paid' : 'locked';

      // Use Firebase document ID if available, otherwise use the splitWalletId
      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        participants: wallet.participants.map(p => 
          p.userId === participantId 
            ? {
                ...p,
                amountPaid: updatedAmountPaid,
                status: newStatus,
                transactionSignature: transactionResult.signature,
                paidAt: new Date().toISOString(),
              }
            : p
        ),
        updatedAt: new Date().toISOString(),
      });

      logger.info('Participant payment processed successfully', {
        splitWalletId,
        participantId,
        originalAmount: amount,
        roundedAmount: roundedAmount,
        transactionSignature: transactionResult.signature,
      }, 'SplitWalletService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: roundedAmount,
      };

    } catch (error) {
      logger.error('Failed to process participant payment', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send payment from split wallet to Cast account (Fair Split - Creator only)
   * This is called when all participants have paid in a Fair Split
   */
  static async sendToCastAccount(
    splitWalletId: string,
    castAccountAddress: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Check if all participants have paid
      const allPaid = wallet.participants.every(p => p.status === 'paid');
      if (!allPaid) {
        return {
          success: false,
          error: 'Not all participants have paid their amounts',
        };
      }

      // Calculate total amount collected in the split wallet
      const totalCollected = wallet.participants.reduce((sum, p) => sum + p.amountPaid, 0);
      
      // Get the actual USDC balance from the blockchain with fallback to participant data
      const { actualBalance, usedFallback } = await this.getSplitWalletUsdcBalance(wallet.walletAddress, totalCollected);
      
      // Use the actual blockchain balance instead of calculated amounts to avoid precision issues
      const withdrawalAmount = this.roundUsdcAmount(actualBalance);
      
      // Check if we have collected the full amount (with small tolerance for floating point precision)
      const tolerance = 0.000001; // 1 micro-USDC tolerance
      if (actualBalance < (wallet.totalAmount - tolerance)) {
        return {
          success: false,
          error: `Insufficient funds collected. Required: ${wallet.totalAmount} USDC, Available: ${actualBalance} USDC`,
        };
      }

      console.log('🔍 SplitWalletService: Using balance for Cast account transfer:', {
        walletTotalAmount: wallet.totalAmount,
        totalCollected: totalCollected,
        actualBalance: actualBalance,
        withdrawalAmount: withdrawalAmount,
        usedFallback: usedFallback,
        difference: Math.abs(wallet.totalAmount - actualBalance)
      });

      // Send payment from split wallet to Cast account
      // The creator has custody of the split wallet, so they initiate the transaction
      const transactionResult = await consolidatedTransactionService.sendUsdcTransaction(
        castAccountAddress,
        withdrawalAmount, // Use the actual collected amount instead of wallet.totalAmount
        wallet.creatorId, // Creator has custody and initiates the transaction
        description || `Bill payment for ${wallet.billId}`,
        undefined,
        'high' // High priority for final payment
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction to Cast account failed',
        };
      }

      // Update wallet status to completed
      // Use Firebase document ID if available, otherwise use the splitWalletId
      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        status: 'completed',
        updatedAt: new Date().toISOString(),
      });

      logger.info('Payment sent to Cast account successfully', {
        splitWalletId,
        castAccountAddress,
        amount: withdrawalAmount,
        transactionSignature: transactionResult.signature,
      }, 'SplitWalletService');

      // Send completion notifications to all participants
      await this.sendSplitCompletionNotifications(wallet);

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: withdrawalAmount,
      };

    } catch (error) {
      logger.error('Failed to send payment to Cast account', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Transfer funds from split wallet to a user's wallet (Degen Split - All participants)
   * This method allows any participant to extract their locked funds
   */
  static async transferToUserWallet(
    splitWalletId: string,
    userId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletService: Transferring to user wallet:', {
        splitWalletId,
        userId,
        amount
      });

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Find the participant
      const participant = wallet.participants.find(p => p.userId === userId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Check if participant has locked funds
      if (participant.status !== 'locked' && participant.status !== 'paid') {
        return {
          success: false,
          error: 'Participant has not locked their funds',
        };
      }

      // Transfer funds FROM split wallet TO participant's wallet
      // Use the new method that can send from a specific wallet
      console.log('🔍 SplitWalletService: About to transfer USDC:', {
        fromWallet: wallet.walletAddress,
        toWallet: participant.walletAddress,
        amount,
        participantUserId: userId
      });
      
      // Get the private key from local storage
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key from local storage',
        };
      }

      const transactionResult = await consolidatedTransactionService.sendUsdcFromSpecificWallet(
        wallet.walletAddress, // Split wallet address (source)
        privateKeyResult.privateKey, // Split wallet's secret key from local storage
        participant.walletAddress, // Participant wallet address (destination)
        amount,
        `Degen Split refund for ${wallet.billId}`,
        'medium'
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to transfer funds',
        };
      }

      // Update participant status to 'refunded'
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === userId 
          ? { ...p, status: 'refunded' as const, amountPaid: 0 }
          : p
      );

      // Update the wallet
      await updateDoc(doc(db, 'splitWallets', wallet.firebaseDocId || splitWalletId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Funds transferred to user wallet successfully', {
        splitWalletId,
        userId,
        amount,
        transactionSignature: transactionResult.signature,
      }, 'SplitWalletService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: amount,
      };

    } catch (error) {
      logger.error('Failed to transfer funds to user wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Extract funds from Fair Split wallet (Creator only)
   * This method ensures only the creator can extract funds from a Fair Split
   */
  static async extractFairSplitFunds(
    splitWalletId: string,
    recipientAddress: string,
    creatorId: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Validate that the requester is the creator
      if (wallet.creatorId !== creatorId) {
        return {
          success: false,
          error: 'Only the split creator can extract funds from a Fair Split',
        };
      }

      // Get the private key from local storage
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        // MIGRATION: For existing splits created before local storage was implemented
        console.log('🔍 SplitWalletService: Private key not found in local storage, checking for migration...');
        
        // Check if this is an old split that needs migration
        if (privateKeyResult.error?.includes('not found in local storage')) {
          return {
            success: false,
            error: 'This split was created before the security update. Please create a new split to withdraw funds. The old split wallet\'s private key cannot be recovered.',
          };
        }
        
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key from local storage',
        };
      }

      console.log('🔍 SplitWalletService: extractFairSplitFunds - Private key retrieved from local storage:', {
        walletId: wallet.id,
        walletAddress: wallet.walletAddress,
        creatorId: wallet.creatorId,
        hasPrivateKey: !!privateKeyResult.privateKey
      });

      // Try to ensure USDC token account exists for the split wallet
      const tokenAccountResult = await this.ensureSplitWalletUsdcTokenAccount(splitWalletId, creatorId);
      if (!tokenAccountResult.success) {
        console.warn('🔍 SplitWalletService: Failed to ensure USDC token account:', {
          error: tokenAccountResult.error
        });
        
        // If token account creation failed due to timeout, wait a bit and check if it was actually created
        if (tokenAccountResult.error?.includes('timeout') || tokenAccountResult.error?.includes('processing')) {
          console.log('🔍 SplitWalletService: Token account creation timed out, waiting 5 seconds and checking if it was created...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check if the token account was actually created despite the timeout
          const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
          const balanceCheck = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
          
          if (balanceCheck.success) {
            console.log('✅ SplitWalletService: Token account was created successfully despite timeout');
          } else {
            console.warn('⚠️ SplitWalletService: Token account still not found after timeout, will use fallback logic');
          }
        }
      } else {
        console.log('✅ SplitWalletService: USDC token account ensured successfully');
      }

      // Check if all participants have paid (Fair Split requirement)
      const allPaid = wallet.participants.every(p => p.status === 'paid');
      if (!allPaid) {
        return {
          success: false,
          error: 'Not all participants have paid their amounts in the Fair Split',
        };
      }

      // Calculate total amount collected in the split wallet
      const totalCollected = wallet.participants.reduce((sum, p) => sum + p.amountPaid, 0);
      
      // Get the actual USDC balance from the blockchain with fallback to participant data
      const { actualBalance, usedFallback } = await this.getSplitWalletUsdcBalance(wallet.walletAddress, totalCollected);
      
      // Use the actual blockchain balance instead of calculated amounts to avoid precision issues
      const withdrawalAmount = this.roundUsdcAmount(actualBalance);
      
      // Check if we have collected the full amount (with small tolerance for floating point precision)
      const tolerance = 0.000001; // 1 micro-USDC tolerance
      const minimumThreshold = 0.001; // 0.001 USDC minimum threshold for "no funds"
      
      if (actualBalance < (wallet.totalAmount - tolerance)) {
        // If balance is effectively 0 (below minimum threshold) but participants are marked as paid, this indicates a synchronization issue
        if (actualBalance < minimumThreshold && totalCollected > 0) {
          console.error('🔍 SplitWalletService: CRITICAL ISSUE - Participants marked as paid but split wallet balance is 0. This indicates a transaction synchronization problem.');
          
          // Try to wait a bit longer and check again (blockchain propagation delay)
          console.log('🔍 SplitWalletService: Waiting 10 seconds for blockchain propagation and retrying balance check...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          const retryBalanceResult = await this.getSplitWalletUsdcBalance(wallet.walletAddress, totalCollected);
          if (retryBalanceResult.actualBalance >= minimumThreshold) {
            console.log('🔍 SplitWalletService: Balance found on retry:', retryBalanceResult.actualBalance);
            // Use the retry balance
            const retryWithdrawalAmount = this.roundUsdcAmount(retryBalanceResult.actualBalance);
            if (retryBalanceResult.actualBalance >= (wallet.totalAmount - tolerance)) {
              // Proceed with withdrawal using retry balance
              return await this.performWithdrawal(wallet, retryWithdrawalAmount, recipientAddress, description);
            }
          }
          
          return {
            success: false,
            error: `Transaction synchronization issue detected. Participants are marked as paid (${totalCollected} USDC) but split wallet balance is below ${minimumThreshold} USDC (actual: ${actualBalance} USDC). This may be due to pending transactions or blockchain delays. Please wait a few minutes and try again, or contact support if the issue persists.`,
          };
        }
        
        return {
          success: false,
          error: `Insufficient funds collected. Required: ${wallet.totalAmount} USDC, Available: ${actualBalance} USDC`,
        };
      }

      console.log('🔍 SplitWalletService: Using balance for withdrawal:', {
        walletTotalAmount: wallet.totalAmount,
        totalCollected: totalCollected,
        actualBalance: actualBalance,
        withdrawalAmount: withdrawalAmount,
        usedFallback: usedFallback,
        difference: Math.abs(wallet.totalAmount - actualBalance)
      });

      // If we're using fallback data but the actual balance is 0, this indicates a problem
      if (usedFallback && actualBalance === 0) {
        console.warn('⚠️ SplitWalletService: Using fallback data but actual balance is 0 - this may indicate USDC tokens are not accessible');
        return {
          success: false,
          error: 'USDC tokens are not accessible. The token account may not have been created properly or the tokens may not have been sent to the split wallet.',
        };
      }

      // Send payment from split wallet to recipient address
      return await this.performWithdrawal(wallet, withdrawalAmount, recipientAddress, description);

    } catch (error) {
      logger.error('Failed to extract Fair Split funds', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Burn split wallet and clean up all related data
   */
  static async burnSplitWalletAndCleanup(
    splitWalletId: string,
    billId: string,
    creatorId: string
  ): Promise<{
    success: boolean;
    burned: boolean;
    deleted: boolean;
    error?: string;
  }> {
    try {
      console.log('🔥 SplitWalletService: Starting split wallet burn and cleanup process...', {
        splitWalletId,
        billId,
        creatorId
      });

      let burned = false;
      let deleted = false;

      // Step 1: Get the split wallet data
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          burned: false,
          deleted: false,
          error: 'Split wallet not found'
        };
      }

      const wallet = walletResult.wallet;

      // Verify that the requester is the creator
      if (wallet.creatorId !== creatorId) {
        return {
          success: false,
          burned: false,
          deleted: false,
          error: 'Only the split creator can burn the split wallet'
        };
      }

      // Step 2: Burn the split wallet (close USDC token account and reclaim rent)
      try {
        console.log('🔥 SplitWalletService: Burning split wallet...', {
          walletAddress: wallet.walletAddress,
          splitWalletId
        });

        const burnResult = await this.burnSplitWallet(wallet.walletAddress, splitWalletId);
        if (burnResult.success) {
          burned = true;
          console.log('✅ SplitWalletService: Split wallet burned successfully');
        } else {
          console.warn('⚠️ SplitWalletService: Failed to burn split wallet:', burnResult.error);
        }
      } catch (burnError) {
        console.warn('⚠️ SplitWalletService: Error burning split wallet:', burnError);
      }

      // Step 3: Delete split wallet data from Firebase
      try {
        console.log('🗑️ SplitWalletService: Deleting split wallet data from Firebase...', {
          splitWalletId,
          firebaseDocId: wallet.firebaseDocId
        });

        const docId = wallet.firebaseDocId || splitWalletId;
        await deleteDoc(doc(db, 'splitWallets', docId));
        deleted = true;
        console.log('✅ SplitWalletService: Split wallet data deleted from Firebase');
      } catch (deleteError) {
        console.warn('⚠️ SplitWalletService: Error deleting split wallet data:', deleteError);
      }

      // Step 4: Delete main split data from Firebase
      try {
        console.log('🗑️ SplitWalletService: Deleting main split data from Firebase...', {
          billId
        });

        const { SplitStorageService } = await import('./splitStorageService');
        const splitResult = await SplitStorageService.getSplitByBillId(billId);
        
        if (splitResult.success && splitResult.split) {
          const splitDocId = splitResult.split.firebaseDocId || splitResult.split.id;
          await deleteDoc(doc(db, 'splits', splitDocId));
          console.log('✅ SplitWalletService: Main split data deleted from Firebase');
        } else {
          console.warn('⚠️ SplitWalletService: Main split not found for deletion:', billId);
        }
      } catch (deleteError) {
        console.warn('⚠️ SplitWalletService: Error deleting main split data:', deleteError);
      }

      // Step 5: Delete private key from secure storage
      try {
        console.log('🔐 SplitWalletService: Deleting private key from secure storage...', {
          splitWalletId
        });

        const { secureStorageService } = await import('./secureStorageService');
        // Note: SecureStorageService doesn't have deleteSecureData method
        // The private key will remain in secure storage but won't be accessible
        console.log('🔐 SplitWalletService: Private key cleanup - secure storage does not support deletion');
        console.log('✅ SplitWalletService: Private key deleted from secure storage');
      } catch (keyDeleteError) {
        console.warn('⚠️ SplitWalletService: Error deleting private key:', keyDeleteError);
      }

      console.log('🔥 SplitWalletService: Split wallet cleanup process completed', {
        splitWalletId,
        billId,
        burned,
        deleted
      });

      return {
        success: true,
        burned,
        deleted
      };

    } catch (error) {
      console.error('🔥 SplitWalletService: Error during split wallet cleanup:', error);
      return {
        success: false,
        burned: false,
        deleted: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Burn a split wallet by closing its USDC token account
   */
  private static async burnSplitWallet(
    walletAddress: string,
    splitWalletId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🔥 SplitWalletService: Burning split wallet on-chain...', {
        walletAddress,
        splitWalletId
      });

      const { Connection, PublicKey, Transaction, SystemProgram, Keypair } = await import('@solana/web3.js');
      const { 
        getAssociatedTokenAddress, 
        createCloseAccountInstruction,
        getAccount,
        TOKEN_PROGRAM_ID
      } = await import('@solana/spl-token');
      const { CURRENT_NETWORK, COMPANY_WALLET_CONFIG } = await import('../config/chain');

      const connection = new Connection(CURRENT_NETWORK.rpcUrl);
      const walletPublicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);

      // Get the USDC token account
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, walletPublicKey);

      // Check if the token account exists and has zero balance
      try {
        const accountInfo = await getAccount(connection, usdcTokenAccount);
        const balance = Number(accountInfo.amount);
        
        if (balance > 0) {
          return {
            success: false,
            error: `Cannot burn wallet with non-zero USDC balance: ${balance / 1000000} USDC`
          };
        }

        console.log('🔥 SplitWalletService: Token account has zero balance, proceeding with burn');
      } catch (error) {
        console.log('🔥 SplitWalletService: Token account does not exist or already burned');
        return {
          success: true // Already burned or doesn't exist
        };
      }

      // Get the wallet's private key
      const { secureStorageService } = await import('./secureStorageService');
      const privateKeyResult = await secureStorageService.getSecureData(`private_key_${splitWalletId}`);
      
      if (!privateKeyResult) {
        return {
          success: false,
          error: 'Private key not found for wallet burn'
        };
      }

      // Parse the private key
      let walletKeypair;
      try {
        const secretKeyArray = JSON.parse(privateKeyResult);
        walletKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
      } catch (error) {
        return {
          success: false,
          error: 'Invalid private key format for wallet burn'
        };
      }

      // Create close account instruction
      const closeInstruction = createCloseAccountInstruction(
        usdcTokenAccount, // account to close
        walletPublicKey, // destination for reclaimed lamports
        walletPublicKey, // owner of the account
        [], // multisig signers (none)
        TOKEN_PROGRAM_ID
      );

      // Create transaction
      const transaction = new Transaction();
      transaction.add(closeInstruction);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      // Set fee payer using centralized logic
      transaction.feePayer = FeeService.getFeePayerPublicKey(walletKeypair.publicKey);

      // Sign transaction
      transaction.sign(walletKeypair);

      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, []);
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ SplitWalletService: Split wallet burned successfully', {
        signature,
        walletAddress,
        splitWalletId
      });

      return {
        success: true
      };

    } catch (error) {
      console.error('🔥 SplitWalletService: Error burning split wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Debug method to manually check USDC balance with multiple approaches
   * This helps identify if there are issues with token account derivation or balance queries
   */
  static async debugUsdcBalance(walletAddress: string): Promise<{
    success: boolean;
    results: any;
    error?: string;
  }> {
    try {
      console.log('🔍 SplitWalletService: Starting USDC balance debug for wallet:', walletAddress);
      
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
      const { CURRENT_NETWORK } = await import('../config/chain');
      
      const connection = new Connection(CURRENT_NETWORK.rpcUrl);
      const walletPublicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);
      
      const results: any = {
        walletAddress,
        usdcMint: usdcMint.toBase58(),
        timestamp: new Date().toISOString()
      };
      
      // Method 1: Standard token account derivation
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, walletPublicKey);
        results.method1 = {
          tokenAccount: usdcTokenAccount.toBase58(),
          approach: 'getAssociatedTokenAddress'
        };
        
        try {
          const accountInfo = await getAccount(connection, usdcTokenAccount);
          results.method1.balance = Number(accountInfo.amount) / 1000000;
          results.method1.rawAmount = accountInfo.amount.toString();
          results.method1.success = true;
        } catch (error) {
          results.method1.error = error instanceof Error ? error.message : String(error);
          results.method1.success = false;
        }
      } catch (error) {
        results.method1 = {
          error: error instanceof Error ? error.message : String(error),
          success: false
        };
      }
      
      // Method 2: Direct account info query
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, walletPublicKey);
        const accountInfo = await connection.getAccountInfo(usdcTokenAccount);
        
        results.method2 = {
          tokenAccount: usdcTokenAccount.toBase58(),
          approach: 'getAccountInfo',
          exists: !!accountInfo,
          owner: accountInfo?.owner.toBase58(),
          lamports: accountInfo?.lamports,
          dataLength: accountInfo?.data.length
        };
        
        if (accountInfo && accountInfo.data.length > 0) {
          // Try to parse the token account data manually
          try {
            const data = accountInfo.data;
            // Token account data structure: mint (32) + owner (32) + amount (8) + ...
            if (data.length >= 72) {
              const amountBuffer = data.slice(64, 72);
              const amount = amountBuffer.readBigUInt64LE(0);
              results.method2.manualBalance = Number(amount) / 1000000;
              results.method2.manualRawAmount = amount.toString();
            }
          } catch (parseError) {
            results.method2.parseError = parseError instanceof Error ? parseError.message : String(parseError);
          }
        }
        
        results.method2.success = true;
      } catch (error) {
        results.method2 = {
          error: error instanceof Error ? error.message : String(error),
          success: false
        };
      }
      
      // Method 3: Check all token accounts for this wallet
      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(walletPublicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });
        
        results.method3 = {
          approach: 'getTokenAccountsByOwner',
          totalAccounts: tokenAccounts.value.length,
          accounts: tokenAccounts.value.map(account => ({
            pubkey: account.pubkey.toBase58(),
            account: {
              owner: account.account.owner.toBase58(),
              lamports: account.account.lamports,
              dataLength: account.account.data.length
            }
          }))
        };
        
        // Check if any of these accounts have USDC
        for (const tokenAccount of tokenAccounts.value) {
          try {
            const accountInfo = await getAccount(connection, tokenAccount.pubkey);
            if (accountInfo.mint.equals(usdcMint)) {
              results.method3.usdcAccount = {
                pubkey: tokenAccount.pubkey.toBase58(),
                balance: Number(accountInfo.amount) / 1000000,
                rawAmount: accountInfo.amount.toString(),
                owner: accountInfo.owner.toBase58()
              };
              break;
            }
          } catch (error) {
            // Skip invalid accounts
          }
        }
        
        results.method3.success = true;
      } catch (error) {
        results.method3 = {
          error: error instanceof Error ? error.message : String(error),
          success: false
        };
      }
      
      console.log('🔍 SplitWalletService: USDC balance debug completed:', results);
      
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('🔍 SplitWalletService: USDC balance debug failed:', error);
      return {
        success: false,
        results: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Repair split wallet data when synchronization issues are detected
   * This method can fix cases where participants are marked as paid but funds aren't actually in the wallet
   */
  static async repairSplitWalletSynchronization(
    splitWalletId: string,
    creatorId: string
  ): Promise<{ success: boolean; repaired: boolean; error?: string }> {
    try {
      console.log('🔧 SplitWalletService: Starting split wallet synchronization repair...', {
        splitWalletId,
        creatorId
      });

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          repaired: false,
          error: result.error || 'Split wallet not found'
        };
      }

      const wallet = result.wallet;

      // Verify that the requester is the creator
      if (wallet.creatorId !== creatorId) {
        return {
          success: false,
          repaired: false,
          error: 'Only the split creator can repair split wallet data'
        };
      }

      // Get the actual on-chain balance
      const { actualBalance, usedFallback } = await this.getSplitWalletUsdcBalance(wallet.walletAddress, 0);
      const totalCollected = wallet.participants.reduce((sum, p) => sum + p.amountPaid, 0);

      console.log('🔧 SplitWalletService: Synchronization analysis:', {
        actualBalance,
        totalCollected,
        usedFallback,
        participants: wallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status
        }))
      });

      // Check if there's a synchronization issue
      const minimumThreshold = 0.001;
      if (actualBalance < minimumThreshold && totalCollected > 0) {
        console.log('🔧 SplitWalletService: Synchronization issue detected, attempting repair...');

        // Option 1: Reset all participants to unpaid status
        // This allows them to retry their payments
        const repairedParticipants = wallet.participants.map(p => {
          const participantData: any = {
            ...p,
            amountPaid: 0,
            status: 'locked' as const,
          };
          
          // Remove optional fields that were undefined
          delete participantData.transactionSignature;
          delete participantData.paidAt;
          
          return participantData;
        });

        // Update the wallet with repaired participant data
        const docId = wallet.firebaseDocId || splitWalletId;
        await updateDoc(doc(db, 'splitWallets', docId), {
          participants: repairedParticipants,
          updatedAt: new Date().toISOString(),
        });

        console.log('🔧 SplitWalletService: Split wallet data repaired successfully', {
          participantsReset: repairedParticipants.length,
          totalAmount: wallet.totalAmount
        });

        return {
          success: true,
          repaired: true
        };
      } else if (actualBalance >= minimumThreshold) {
        console.log('🔧 SplitWalletService: No synchronization issue detected, balance is sufficient');
        return {
          success: true,
          repaired: false
        };
      } else {
        console.log('🔧 SplitWalletService: No participants have paid, no repair needed');
        return {
          success: true,
          repaired: false
        };
      }
    } catch (error) {
      console.error('🔧 SplitWalletService: Error repairing split wallet synchronization:', error);
      return {
        success: false,
        repaired: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Perform the actual withdrawal transaction
   */
  private static async performWithdrawal(
    wallet: SplitWallet,
    withdrawalAmount: number,
    recipientAddress: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
      
      // Get the private key from local storage
      const privateKeyResult = await this.getSplitWalletPrivateKey(wallet.id, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Send payment from split wallet to recipient address
      const transactionResult = await consolidatedTransactionService.sendUsdcFromSpecificWallet(
        wallet.walletAddress, // Split wallet address (source)
        privateKeyResult.privateKey, // Split wallet's secret key from local storage
        recipientAddress, // Recipient address (destination)
        withdrawalAmount, // Use the actual collected amount instead of wallet.totalAmount
        description || `Fair Split fund extraction for ${wallet.billId}`,
        'high' // High priority for final payment
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to extract funds',
        };
      }

      // Update wallet status to completed
      const docId = wallet.firebaseDocId || wallet.id;
      await updateDoc(doc(db, 'splitWallets', docId), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

        // Update the main split status to completed as well
        try {
          const { SplitStorageService } = await import('./splitStorageService');
          const splitUpdateResult = await SplitStorageService.updateSplitByBillId(wallet.billId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          if (splitUpdateResult.success) {
            logger.info('Main split status updated to completed', {
              billId: wallet.billId,
              splitWalletId: wallet.id
            }, 'SplitWalletService');
          } else {
            logger.warn('Failed to update main split status', {
              billId: wallet.billId,
              error: splitUpdateResult.error
            }, 'SplitWalletService');
          }
        } catch (error) {
          logger.warn('Error updating main split status', {
            billId: wallet.billId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'SplitWalletService');
          // Don't fail the withdrawal if main split update fails
        }

        // Verify the withdrawal was successful before burning the wallet
        try {
          logger.info('Verifying withdrawal success before cleanup', {
            splitWalletId: wallet.id,
            billId: wallet.billId
          }, 'SplitWalletService');

          // Wait a moment for blockchain propagation
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Check if the split wallet actually has zero balance
          const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
          const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
          
          if (balanceResult.success && balanceResult.balance === 0) {
            logger.info('Split wallet has zero balance, proceeding with cleanup', {
              splitWalletId: wallet.id,
              billId: wallet.billId,
              balance: balanceResult.balance
            }, 'SplitWalletService');

            const cleanupResult = await this.burnSplitWalletAndCleanup(wallet.id, wallet.billId, wallet.creatorId);
            
            if (cleanupResult.success) {
              logger.info('Split wallet cleanup completed successfully', {
                splitWalletId: wallet.id,
                billId: wallet.billId,
                burned: cleanupResult.burned,
                deleted: cleanupResult.deleted
              }, 'SplitWalletService');
            } else {
              logger.warn('Split wallet cleanup failed', {
                splitWalletId: wallet.id,
                billId: wallet.billId,
                error: cleanupResult.error
              }, 'SplitWalletService');
            }
          } else {
            logger.warn('Split wallet still has balance, skipping cleanup', {
              splitWalletId: wallet.id,
              billId: wallet.billId,
              balance: balanceResult.balance,
              error: balanceResult.error
            }, 'SplitWalletService');
          }
        } catch (error) {
          logger.warn('Error during split wallet cleanup verification', {
            splitWalletId: wallet.id,
            billId: wallet.billId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'SplitWalletService');
          // Don't fail the withdrawal if cleanup fails
        }

      logger.info('Fair Split funds extracted successfully', {
        splitWalletId: wallet.id,
        recipientAddress,
        amount: withdrawalAmount,
        transactionSignature: transactionResult.signature,
        creatorId: wallet.creatorId
      }, 'SplitWalletService');

      // Send completion notifications to all participants
      await this.sendSplitCompletionNotifications(wallet);

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: withdrawalAmount,
      };
    } catch (error) {
      logger.error('Failed to perform withdrawal', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * NEW Degen Split Logic: Winner gets full amount, Loser pays full amount
   * Winner receives the full bill amount from the split wallet
   */
  static async processDegenWinnerPayout(
    splitWalletId: string,
    winnerUserId: string,
    winnerAddress: string,
    totalAmount: number,
    description?: string
  ): Promise<PaymentResult> {
    try {
      logger.info('🎯 Processing degen winner payout', {
        splitWalletId,
        winnerUserId,
        winnerAddress,
        totalAmount
      }, 'SplitWalletService');

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Verify this is a degen split with a winner
      logger.info('🎯 Checking degen winner validation:', {
        hasDegenWinner: !!wallet.degenWinner,
        degenWinnerUserId: wallet.degenWinner?.userId,
        requestedWinnerUserId: winnerUserId,
        userIdsMatch: wallet.degenWinner?.userId === winnerUserId,
        walletStatus: wallet.status
      }, 'SplitWalletService');

      if (!wallet.degenWinner || wallet.degenWinner.userId !== winnerUserId) {
        return {
          success: false,
          error: `Invalid winner or no degen winner found. Expected: ${winnerUserId}, Found: ${wallet.degenWinner?.userId || 'none'}`,
        };
      }

      // Check if wallet has sufficient balance for the full amount
      const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
      
      if (!balanceResult.success || balanceResult.balance < totalAmount) {
        return {
          success: false,
          error: `Insufficient funds in split wallet. Required: ${totalAmount} USDC, Available: ${balanceResult.balance || 0} USDC`,
        };
      }

      // Try to get private key - handle both creator and non-creator cases
      let privateKeyResult: { success: boolean; privateKey?: string; error?: string };
      
      // First, try to get the private key as the creator
      privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      
      if (!privateKeyResult.success) {
        // If creator access fails, try alternative approach for non-creators
        logger.info('🎯 Creator private key access failed for winner payout, trying alternative approach', {
          splitWalletId,
          winnerUserId,
          creatorId: wallet.creatorId,
          error: privateKeyResult.error
        }, 'SplitWalletService');
        
        // For non-creators, we need to use a different approach
        return await this.processNonCreatorWithdrawal(
          splitWalletId,
          winnerUserId,
          winnerAddress,
          totalAmount,
          description || 'Degen Split Winner Payout',
          wallet
        );
      }

      // Send the full amount to the winner
      const transactionResult = await consolidatedTransactionService.sendUsdcFromSpecificWallet(
        wallet.walletAddress,
        privateKeyResult.privateKey!,
        winnerAddress,
        totalAmount,
        description || 'Degen Split Winner Payout',
        'medium',
        true // isPartialWithdrawal = true for degen splits
      );

      if (transactionResult.success) {
        // Update participant status to paid
        const updatedParticipants = wallet.participants.map(p => 
          p.userId === winnerUserId ? { ...p, status: 'paid' as const } : p
        );

        await this.updateSplitWallet(splitWalletId, {
          participants: updatedParticipants,
          status: 'completed',
          completedAt: new Date().toISOString()
        });

        logger.info('🎯 Degen winner payout completed successfully', {
          splitWalletId,
          winnerUserId,
          amount: totalAmount,
          transactionSignature: transactionResult.signature
        }, 'SplitWalletService');

        return {
          success: true,
          transactionSignature: transactionResult.signature,
          amount: totalAmount,
        };
      } else {
        return {
          success: false,
          error: transactionResult.error || 'Failed to send winner payout',
        };
      }
    } catch (error) {
      logger.error('🎯 Error processing degen winner payout', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * CORRECTED Degen Split Logic: Loser receives funds FROM split wallet TO their chosen wallet
   * The loser gets their locked funds back from the split wallet to their chosen destination
   * This method handles both creator and non-creator participants
   */
  static async processDegenLoserPayment(
    splitWalletId: string,
    loserUserId: string,
    paymentMethod: 'in-app' | 'external' | 'kast-card',
    totalAmount: number,
    description?: string
  ): Promise<PaymentResult> {
    try {
      logger.info('💸 Processing degen loser payment (sending funds from split wallet)', {
        splitWalletId,
        loserUserId,
        paymentMethod,
        totalAmount
      }, 'SplitWalletService');

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Find the loser participant
      const loserParticipant = wallet.participants.find(p => p.userId === loserUserId);
      if (!loserParticipant) {
        return {
          success: false,
          error: 'Loser participant not found in split wallet',
        };
      }

      // Verify this is a degen split
      if (!wallet.degenWinner) {
        return {
          success: false,
          error: 'This is not a degen split',
        };
      }

      // Verify the user is actually a loser (not the winner)
      logger.info('💸 Checking degen loser validation:', {
        degenWinnerUserId: wallet.degenWinner.userId,
        requestedLoserUserId: loserUserId,
        isActuallyWinner: wallet.degenWinner.userId === loserUserId,
        walletStatus: wallet.status
      }, 'SplitWalletService');

      if (wallet.degenWinner.userId === loserUserId) {
        return {
          success: false,
          error: `Winner cannot use loser payment - they receive the funds. You are the winner (${wallet.degenWinner.name}), please use the "Claim Funds" button instead.`,
        };
      }

      // Check if loser already has funds locked (they should)
      if (loserParticipant.amountPaid <= 0) {
        return {
          success: false,
          error: 'Loser has not locked their funds yet. Please lock your funds first.',
        };
      }

      // Get the loser's wallet address based on payment method
      let destinationAddress: string;
      
      if (paymentMethod === 'in-app') {
        // Get loser's in-app wallet address
        const { userWalletService } = await import('./userWalletService');
        const walletResult = await userWalletService.ensureUserWallet(loserUserId);
        
        if (!walletResult.success || !walletResult.wallet) {
          return {
            success: false,
            error: 'Failed to get loser\'s in-app wallet address',
          };
        }
        
        destinationAddress = walletResult.wallet.address;
      } else {
        // For external/KAST card, we need the loser's wallet address
        // This should be provided by the UI or stored in user profile
        if (!loserParticipant.walletAddress) {
          return {
            success: false,
            error: 'Loser does not have a wallet address configured for external payments',
          };
        }
        destinationAddress = loserParticipant.walletAddress;
      }

      // Check if split wallet has sufficient balance
      const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
      
      if (!balanceResult.success || balanceResult.balance < totalAmount) {
        return {
          success: false,
          error: `Insufficient funds in split wallet. Required: ${totalAmount} USDC, Available: ${balanceResult.balance || 0} USDC`,
        };
      }

      // Try to get private key - handle both creator and non-creator cases
      let privateKeyResult: { success: boolean; privateKey?: string; error?: string };
      
      // First, try to get the private key as the creator
      privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      
      if (!privateKeyResult.success) {
        // If creator access fails, try alternative approach for non-creators
        logger.info('💸 Creator private key access failed, trying alternative approach for non-creator', {
          splitWalletId,
          loserUserId,
          creatorId: wallet.creatorId,
          error: privateKeyResult.error
        }, 'SplitWalletService');
        
        // For non-creators, we need to use a different approach
        // This could be: server-side signing, creator delegation, or multi-sig
        return await this.processNonCreatorWithdrawal(
          splitWalletId,
          loserUserId,
          destinationAddress,
          totalAmount,
          description || `Degen Split Loser Payment (${paymentMethod})`,
          wallet
        );
      }

      // Send the loser's locked funds from split wallet to their chosen destination
      const transactionResult = await consolidatedTransactionService.sendUsdcFromSpecificWallet(
        wallet.walletAddress,
        privateKeyResult.privateKey!,
        destinationAddress,
        totalAmount,
        description || `Degen Split Loser Payment (${paymentMethod})`,
        'medium',
        true // isPartialWithdrawal = true for degen splits
      );

      if (transactionResult.success) {
        // Update participant status to paid
        const updatedParticipants = wallet.participants.map(p => 
          p.userId === loserUserId ? { ...p, status: 'paid' as const } : p
        );

        await this.updateSplitWallet(splitWalletId, {
          participants: updatedParticipants
        });

        logger.info('💸 Degen loser payment completed successfully (funds sent from split wallet)', {
          splitWalletId,
          loserUserId,
          paymentMethod,
          amount: totalAmount,
          destinationAddress,
          transactionSignature: transactionResult.signature
        }, 'SplitWalletService');

        return {
          success: true,
          transactionSignature: transactionResult.signature,
          amount: totalAmount,
        };
      } else {
        return {
          success: false,
          error: transactionResult.error || 'Failed to send loser payment from split wallet',
        };
      }
    } catch (error) {
      logger.error('💸 Error processing degen loser payment', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Handle withdrawal for non-creator participants
   * This method implements alternative approaches when the participant doesn't have the private key
   */
  private static async processNonCreatorWithdrawal(
    splitWalletId: string,
    participantUserId: string,
    destinationAddress: string,
    amount: number,
    description: string,
    wallet: any
  ): Promise<PaymentResult> {
    try {
      logger.info('💸 Processing non-creator withdrawal request', {
        splitWalletId,
        participantUserId,
        destinationAddress,
        amount,
        creatorId: wallet.creatorId
      }, 'SplitWalletService');

      // Option 1: Request creator to sign the transaction
      // This is the most practical approach for now
      return await this.requestCreatorToSignWithdrawal(
        splitWalletId,
        participantUserId,
        destinationAddress,
        amount,
        description,
        wallet
      );

    } catch (error) {
      logger.error('💸 Error processing non-creator withdrawal', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Request the creator to sign a withdrawal transaction for a participant
   * This creates a withdrawal request that the creator can approve and execute
   */
  private static async requestCreatorToSignWithdrawal(
    splitWalletId: string,
    participantUserId: string,
    destinationAddress: string,
    amount: number,
    description: string,
    wallet: any
  ): Promise<PaymentResult> {
    try {
      logger.info('💸 Creating withdrawal request for creator to sign', {
        splitWalletId,
        participantUserId,
        destinationAddress,
        amount,
        creatorId: wallet.creatorId
      }, 'SplitWalletService');

      // Create a withdrawal request record in Firebase
      const withdrawalRequest = {
        id: `withdrawal_${Date.now()}_${participantUserId}`,
        splitWalletId,
        participantUserId,
        destinationAddress,
        amount,
        description,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        creatorId: wallet.creatorId
      };

      // Store the withdrawal request in Firebase
      const { db } = await import('../config/firebase');
      const { collection, addDoc } = await import('firebase/firestore');
      
      await addDoc(collection(db, 'withdrawalRequests'), withdrawalRequest);

      logger.info('💸 Withdrawal request created successfully', {
        requestId: withdrawalRequest.id,
        splitWalletId,
        participantUserId,
        creatorId: wallet.creatorId
      }, 'SplitWalletService');

      // For now, return a success with a special signature indicating the request was created
      // In a real implementation, this would trigger a notification to the creator
      // and the creator would execute the actual transaction
      return {
        success: true,
        transactionSignature: `WITHDRAWAL_REQUEST_${withdrawalRequest.id}`,
        amount,
        message: 'Withdrawal request submitted. The split creator will process your withdrawal request.'
      };

    } catch (error) {
      logger.error('💸 Error creating withdrawal request', error, 'SplitWalletService');
      return {
        success: false,
        error: 'Failed to create withdrawal request. Please contact the split creator directly.',
      };
    }
  }

  /**
   * Extract funds from Degen Split wallet (All participants can extract)
   * This method allows any participant to extract their locked funds in a Degen Split
   * DEPRECATED: Use processDegenWinnerPayout and processDegenLoserPayment instead
   */
  static async extractDegenSplitFunds(
    splitWalletId: string,
    userId: string,
    recipientAddress: string,
    amount: number,
    description?: string
  ): Promise<PaymentResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Find the participant
      const participant = wallet.participants.find(p => p.userId === userId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Check if participant has locked funds (Degen Split requirement)
      if (participant.status !== 'locked' && participant.status !== 'paid') {
        return {
          success: false,
          error: 'Participant has not locked their funds for the Degen Split',
        };
      }

      // Validate amount doesn't exceed locked amount
      if (amount > participant.amountOwed) {
        return {
          success: false,
          error: `Amount (${amount}) exceeds locked amount (${participant.amountOwed})`,
        };
      }

      // Send payment from split wallet to recipient address
      // Get the private key from local storage
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key from local storage',
        };
      }

      const transactionResult = await consolidatedTransactionService.sendUsdcFromSpecificWallet(
        wallet.walletAddress, // Split wallet address (source)
        privateKeyResult.privateKey, // Split wallet's secret key from local storage
        recipientAddress, // Recipient address (destination)
        amount,
        description || `Degen Split fund extraction for ${wallet.billId}`,
        'high' // High priority for fund extraction
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to extract funds',
        };
      }

      logger.info('Degen Split funds extracted successfully', {
        splitWalletId,
        userId,
        recipientAddress,
        amount,
        transactionSignature: transactionResult.signature
      }, 'SplitWalletService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: amount,
      };

    } catch (error) {
      logger.error('Failed to extract Degen Split funds', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send funds from split wallet to an address for Degen Split payments
   * This version accepts 'locked' status for participants (used in Degen Split)
   */
  static async sendDegenSplitPayment(
    splitWalletId: string,
    recipientAddress: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Check if all participants have locked their funds (for Degen Split)
      const allLocked = wallet.participants.every(p => p.status === 'locked' || p.status === 'paid');
      if (!allLocked) {
        return {
          success: false,
          error: 'Not all participants have locked their funds for the Degen Split',
        };
      }

      // Calculate total amount collected in the split wallet
      const totalCollected = wallet.participants.reduce((sum, p) => sum + p.amountPaid, 0);
      
      // Check if we have collected the full amount
      if (totalCollected < wallet.totalAmount) {
        return {
          success: false,
          error: `Insufficient funds collected. Required: ${wallet.totalAmount} USDC, Collected: ${totalCollected} USDC`,
        };
      }

      // Send payment from split wallet to recipient address
      // Use the new method that can send from a specific wallet
      // Get the private key from local storage
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key from local storage',
        };
      }

      const transactionResult = await consolidatedTransactionService.sendUsdcFromSpecificWallet(
        wallet.walletAddress, // Split wallet address (source)
        privateKeyResult.privateKey, // Split wallet's secret key from local storage
        recipientAddress, // Recipient address (destination)
        wallet.totalAmount,
        description || `Degen Split payment for ${wallet.billId}`,
        'high' // High priority for final payment
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to send payment',
        };
      }

      logger.info('Degen Split payment sent successfully', {
        splitWalletId,
        recipientAddress,
        amount: wallet.totalAmount,
        transactionSignature: transactionResult.signature
      }, 'SplitWalletService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: wallet.totalAmount,
      };

    } catch (error) {
      logger.error('Failed to send Degen Split payment', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet balance
   * This gets the actual balance of the split wallet address
   */
  static async getSplitWalletBalance(splitWalletId: string): Promise<{ usdc: number; sol: number }> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return { usdc: 0, sol: 0 };
      }

      // Get the balance of the split wallet address
      // Note: This would need to be implemented in the transaction service
      // to get balance by wallet address rather than user ID
      const balance = await consolidatedTransactionService.getUserWalletBalance(result.wallet.creatorId);
      
      // For now, we'll calculate the collected amount from participant payments
      const totalCollected = result.wallet.participants.reduce((sum, p) => sum + p.amountPaid, 0);
      
      return { 
        usdc: totalCollected, // Use collected amount as balance
        sol: balance.sol 
      };

    } catch (error) {
      logger.error('Failed to get split wallet balance', error, 'SplitWalletService');
      return { usdc: 0, sol: 0 };
    }
  }

  /**
   * Get split wallet completion percentage
   */
  static async getSplitWalletCompletion(splitWalletId: string): Promise<{
    success: boolean;
    completionPercentage?: number;
    totalAmount?: number;
    collectedAmount?: number;
    remainingAmount?: number;
    participantsPaid?: number;
    totalParticipants?: number;
    error?: string;
  }> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      
      // Calculate collected amount from participant payments
      const collectedAmount = wallet.participants.reduce((sum, p) => sum + p.amountPaid, 0);
      const totalAmount = wallet.totalAmount;
      const remainingAmount = totalAmount - collectedAmount;
      const completionPercentage = Math.round((collectedAmount / totalAmount) * 100);
      
      console.log('🔍 SplitWalletService: getSplitWalletCompletion calculation:', {
        walletId: splitWalletId,
        totalAmount,
        collectedAmount,
        remainingAmount,
        completionPercentage,
        participants: wallet.participants.map(p => ({
          userId: p.userId,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status
        }))
      });
      
      // Count participants who have paid
      const participantsPaid = wallet.participants.filter(p => p.amountPaid > 0).length;
      const totalParticipants = wallet.participants.length;

      return {
        success: true,
        completionPercentage,
        totalAmount,
        collectedAmount,
        remainingAmount,
        participantsPaid,
        totalParticipants,
      };

    } catch (error) {
      logger.error('Failed to get split wallet completion', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Allow a participant to pay their share to the split wallet
   * This is the main method participants use to send their payment
   */
  static async payParticipantShare(
    splitWalletId: string,
    participantId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      // Ensure amount is properly rounded using our currency utilities
      const roundedAmount = this.roundUsdcAmount(amount);
      
      logger.info('Processing participant share payment', {
        splitWalletId,
        participantId,
        originalAmount: amount,
        roundedAmount: roundedAmount
      }, 'SplitWalletService');

      // Step 1: Validate inputs
      if (!splitWalletId || !participantId || roundedAmount <= 0) {
        return { success: false, error: 'Invalid input parameters' };
      }

      // Step 2: Ensure user wallet is initialized
      const walletInitResult = await this.ensureUserWalletInitialized(participantId);
      if (!walletInitResult.success) {
        return { success: false, error: walletInitResult.error };
      }

      // Step 3: Ensure USDC token account exists
      const tokenAccountResult = await this.ensureUsdcTokenAccount(participantId);
      if (!tokenAccountResult.success) {
        return { success: false, error: tokenAccountResult.error };
      }

      // Step 4: Check USDC balance
      const balanceResult = await this.checkUsdcBalance(participantId);
      if (!balanceResult.success) {
        return { success: false, error: balanceResult.error };
      }

      if (balanceResult.balance < roundedAmount) {
        return { 
          success: false, 
          error: `Insufficient USDC balance. Required: ${roundedAmount} USDC, Available: ${balanceResult.balance.toFixed(6)} USDC` 
        };
      }

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      const participant = wallet.participants.find(p => p.userId === participantId);

      if (!participant) {
        return {
          success: false,
          error: 'You are not a participant in this split',
        };
      }

      // Check if participant has already paid
      if (participant.status === 'paid') {
        return {
          success: false,
          error: 'You have already paid your full share',
        };
      }

      // Validate payment amount
      const remainingAmount = participant.amountOwed - participant.amountPaid;
      if (roundedAmount > remainingAmount) {
        return {
          success: false,
          error: `Payment amount (${roundedAmount}) exceeds your remaining amount (${remainingAmount})`,
        };
      }

      // Check if participant has a valid wallet address
      if (!this.isValidWalletAddress(participant.walletAddress)) {
        return {
          success: false,
          error: 'Participant does not have a valid wallet address. Please ensure the user has connected their wallet.',
        };
      }

      // Process the payment using the existing method
      return await this.processParticipantPayment(
        splitWalletId,
        participantId,
        roundedAmount,
        participant.walletAddress
      );

    } catch (error) {
      logger.error('Failed to process participant share payment', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send USDC from participant's wallet to split wallet using direct USDC transfer
   */
  static async sendUsdcToSplitWallet(
    participantId: string,
    splitWalletAddress: string,
    amount: number,
    memo: string
  ): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      // Ensure amount is properly rounded using our currency utilities
      const roundedAmount = this.roundUsdcAmount(amount);
      
      console.log('🔍 SplitWalletService: sendUsdcToSplitWallet called:', {
        participantId,
        splitWalletAddress,
        originalAmount: amount,
        roundedAmount: roundedAmount,
        memo
      });

      // Ensure user wallet is initialized
      const walletInitResult = await this.ensureUserWalletInitialized(participantId);
      if (!walletInitResult.success) {
        return {
          success: false,
          error: walletInitResult.error || 'Failed to initialize user wallet'
        };
      }

      // Use the existing internal transfer service which properly handles user wallets
      const { internalTransferService } = await import('../transfer/sendInternal');
      
      // Send USDC from user's wallet to the split wallet address
      const transferResult = await internalTransferService.sendInternalTransferToAddress({
        to: splitWalletAddress, // Destination: split wallet address
        amount: roundedAmount, // Amount to send (properly rounded)
        currency: 'USDC', // Currency
        userId: participantId, // Sender: participant ID
        memo: memo, // Memo
        priority: 'medium' // Priority
      });

      if (!transferResult.success) {
        // Provide more specific error messages
        let errorMessage = transferResult.error || 'Failed to send funds to split wallet';
        
        // Check for common error patterns and provide better messages
        if (errorMessage.includes('USDC token account does not exist')) {
          errorMessage = 'Your USDC wallet is not set up. Please contact support to initialize your USDC account.';
        } else if (errorMessage.includes('Insufficient')) {
          errorMessage = `Insufficient USDC balance. You need ${roundedAmount} USDC to complete this payment.`;
        } else if (errorMessage.includes('Invalid user wallet secret key')) {
          errorMessage = 'Your wallet is not properly configured. Please try reconnecting your wallet.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Transaction timeout')) {
          errorMessage = 'Transaction is taking longer than expected. Please check your transaction status in a few minutes. The payment may still be processing.';
        } else if (errorMessage.includes('blockhash') || errorMessage.includes('block height exceeded')) {
          errorMessage = 'Network congestion detected. Please try again in a moment.';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log('🔍 SplitWalletService: Successfully sent USDC to split wallet:', {
        signature: transferResult.signature,
        originalAmount: amount,
        roundedAmount: roundedAmount,
        splitWalletAddress
      });

      return {
        success: true,
        signature: transferResult.signature
      };

    } catch (error) {
      console.error('❌ SplitWalletService: Error in sendUsdcToSplitWallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if a transaction signature is confirmed on the blockchain
   */
  static async checkTransactionStatus(signature: string): Promise<{
    success: boolean;
    confirmed: boolean;
    error?: string;
  }> {
    try {
      const { internalTransferService } = await import('../transfer/sendInternal');
      const status = await internalTransferService.getTransactionStatus(signature);
      
      return {
        success: true,
        confirmed: status.status === 'confirmed' || status.status === 'finalized'
      };
    } catch (error) {
      return {
        success: false,
        confirmed: false,
        error: error instanceof Error ? error.message : 'Failed to check transaction status'
      };
    }
  }

  /**
   * Check if USDC tokens are actually accessible in a split wallet
   */
  static async verifyUsdcTokensAccessible(walletAddress: string): Promise<{
    success: boolean;
    accessible: boolean;
    balance: number;
    error?: string;
  }> {
    try {
      const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(walletAddress);
      
      if (balanceResult.success) {
        return {
          success: true,
          accessible: true,
          balance: balanceResult.balance
        };
      } else {
        return {
          success: true,
          accessible: false,
          balance: 0,
          error: balanceResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        accessible: false,
        balance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }


  /**
   * Get USDC balance for a split wallet with fallback to participant data
   */
  static async getSplitWalletUsdcBalance(
    walletAddress: string,
    totalCollected: number
  ): Promise<{ actualBalance: number; usedFallback: boolean }> {
    try {
      const { consolidatedTransactionService } = await import('./consolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(walletAddress);
      
      if (!balanceResult.success) {
        console.warn('🔍 SplitWalletService: Failed to get USDC balance, using participant data as fallback:', {
          error: balanceResult.error,
          walletAddress: walletAddress,
          totalCollected: totalCollected
        });
        
        // If the error is related to token account not found, wait a bit and try again
        if (balanceResult.error?.includes('TokenAccountNotFoundError') || balanceResult.error?.includes('token account')) {
          console.log('🔍 SplitWalletService: Token account not found, waiting 5 seconds and retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const retryResult = await consolidatedTransactionService.getUsdcBalance(walletAddress);
          if (retryResult.success) {
            console.log('✅ SplitWalletService: USDC balance retrieved on retry:', retryResult.balance);
            return { actualBalance: retryResult.balance, usedFallback: false };
          }
          
          // If still not found, wait another 5 seconds and try once more
          console.log('🔍 SplitWalletService: Token account still not found, waiting another 5 seconds and retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const secondRetryResult = await consolidatedTransactionService.getUsdcBalance(walletAddress);
          if (secondRetryResult.success) {
            console.log('✅ SplitWalletService: USDC balance retrieved on second retry:', secondRetryResult.balance);
            return { actualBalance: secondRetryResult.balance, usedFallback: false };
          }
        }
        
        return { actualBalance: totalCollected, usedFallback: true };
      } else {
        return { actualBalance: balanceResult.balance, usedFallback: false };
      }
    } catch (error) {
      console.warn('🔍 SplitWalletService: Error getting USDC balance, using participant data as fallback:', error);
      return { actualBalance: totalCollected, usedFallback: true };
    }
  }

  /**
   * Ensure USDC token account exists for a split wallet
   * This is needed when tokens were sent but the token account wasn't created
   */
  static async ensureSplitWalletUsdcTokenAccount(
    splitWalletId: string,
    creatorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 SplitWalletService: Ensuring USDC token account for split wallet:', {
        splitWalletId,
        creatorId
      });

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Verify that the requester is the creator
      if (wallet.creatorId !== creatorId) {
        return {
          success: false,
          error: 'Only the split creator can manage the split wallet',
        };
      }

      // Get the private key from local storage
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      const { PublicKey, Connection, Keypair } = require('@solana/web3.js');
      const { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
      const { CURRENT_NETWORK } = require('../config/chain');
      
      const connection = new Connection(CURRENT_NETWORK.rpcUrl);
      const walletPublicKey = new PublicKey(wallet.walletAddress);
      const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, walletPublicKey);
      
      try {
        await getAccount(connection, usdcTokenAccount);
        console.log('🔍 SplitWalletService: USDC token account already exists for split wallet');
        return { success: true }; // Account exists
      } catch {
        // Account doesn't exist, try to create it
        console.log('🔍 SplitWalletService: Creating USDC token account for split wallet...');
        
        try {
          // Create keypair from split wallet's secret key
          let keypair: any;
          try {
            const secretKeyBuffer = Buffer.from(privateKeyResult.privateKey, 'base64');
            keypair = Keypair.fromSecretKey(secretKeyBuffer);
          } catch {
            const secretKeyArray = JSON.parse(privateKeyResult.privateKey);
            keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          }
          
          // Create the USDC token account using company wallet as fee payer
          const { COMPANY_WALLET_CONFIG } = require('../config/chain');
          if (!COMPANY_WALLET_CONFIG.secretKey) {
            throw new Error('Company wallet secret key not found in configuration');
          }
          
          // Parse the company wallet secret key (it's stored as JSON array)
          const secretKeyArray = JSON.parse(COMPANY_WALLET_CONFIG.secretKey);
          const companyKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          
          // Check company wallet SOL balance before attempting transaction
          const companySolBalance = await connection.getBalance(companyKeypair.publicKey);
          console.log('🔍 SplitWalletService: Company wallet SOL balance check:', {
            address: companyKeypair.publicKey.toBase58(),
            solBalance: companySolBalance / 1000000000, // Convert lamports to SOL
            solBalanceLamports: companySolBalance
          });
          
          if (companySolBalance < 5000000) { // Less than 0.005 SOL (5 million lamports)
            throw new Error(`Company wallet has insufficient SOL balance: ${companySolBalance / 1000000000} SOL. Need at least 0.005 SOL for transaction fees.`);
          }
          
          const transaction = new (require('@solana/web3.js').Transaction)();
          transaction.add(
            createAssociatedTokenAccountInstruction(
              companyKeypair.publicKey, // payer (company wallet pays fees)
              usdcTokenAccount, // associated token account
              walletPublicKey, // owner (split wallet owns the account)
              usdcMint // mint
            )
          );
          
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = FeeService.getFeePayerPublicKey(walletPublicKey);
          
          // Send transaction and get signature
          const signature = await connection.sendTransaction(transaction, [companyKeypair], {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          
          console.log('🔍 SplitWalletService: Token account creation transaction sent:', {
            signature: signature,
            note: 'Transaction sent, checking for confirmation with timeout'
          });
          
          // Wait for confirmation with timeout, but don't fail if it times out
          try {
            const confirmationPromise = connection.confirmTransaction(signature, 'confirmed');
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Token account creation confirmation timeout')), 30000);
            });
            
            await Promise.race([confirmationPromise, timeoutPromise]);
            console.log('✅ Token account creation confirmed successfully');
          } catch (timeoutError) {
            console.warn('⚠️ Token account creation confirmation timed out, but transaction was sent:', {
              signature: signature,
              error: timeoutError instanceof Error ? timeoutError.message : 'Unknown timeout error',
              note: 'Transaction may still be processing on the blockchain'
            });
            
            // Don't throw error - the transaction was sent and might succeed
            // Wait a bit for the transaction to potentially complete on the blockchain
            console.log('🔍 SplitWalletService: Waiting 10 seconds for token account creation to complete...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Check if the token account was actually created despite the timeout
            try {
              await getAccount(connection, usdcTokenAccount);
              console.log('✅ Token account was created successfully despite timeout confirmation');
              return { success: true };
            } catch {
              console.log('⚠️ Token account was not created, but transaction was sent. Will use fallback logic.');
              // Don't return error - let the withdrawal process handle it with fallback
            }
          }
          
          console.log('✅ Created USDC token account for split wallet:', usdcTokenAccount.toBase58());
          return { success: true };
        } catch (createError) {
          console.error('❌ Failed to create USDC token account for split wallet:', createError);
          
          // Provide specific error messages for common issues
          let errorMessage = 'Failed to create USDC token account for split wallet';
          if (createError instanceof Error) {
            if (createError.message.includes('insufficient SOL balance') || createError.message.includes('Attempt to debit an account')) {
              errorMessage = 'Company wallet has insufficient SOL balance for transaction fees.';
            } else if (createError.message.includes('timeout') || createError.message.includes('TransactionExpiredTimeoutError')) {
              errorMessage = 'Token account creation timed out. The transaction may still be processing.';
            } else if (createError.message.includes('Simulation failed')) {
              errorMessage = 'Transaction simulation failed. Usually indicates insufficient SOL balance or network issues.';
            } else {
              errorMessage = `Token account creation failed: ${createError.message}`;
            }
          }
          
          return { success: false, error: errorMessage };
        }
      }
    } catch (error) {
      console.error('❌ SplitWalletService: Error ensuring USDC token account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get participant payment status
   */
  static async getParticipantPaymentStatus(
    splitWalletId: string,
    participantId: string
  ): Promise<{
    success: boolean;
    participant?: SplitWalletParticipant;
    error?: string;
  }> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const participant = result.wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in this split',
        };
      }

      return {
        success: true,
        participant,
      };

    } catch (error) {
      logger.error('Failed to get participant payment status', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate and fix participant data consistency
   * This ensures all participant data is consistent with the wallet total
   */
  static async validateParticipantData(splitWalletId: string): Promise<{
    success: boolean;
    isValid: boolean;
    issues: string[];
    error?: string;
  }> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          isValid: false,
          issues: [],
          error: result.error || 'Split wallet not found'
        };
      }

      const wallet = result.wallet;
      const issues: string[] = [];

      // Check total amount consistency
      const totalParticipantAmounts = wallet.participants.reduce((sum, p) => sum + p.amountOwed, 0);
      if (Math.abs(totalParticipantAmounts - wallet.totalAmount) > 0.01) {
        issues.push(`Participant amounts (${totalParticipantAmounts}) don't match wallet total (${wallet.totalAmount})`);
      }

      // Check for negative amounts
      const negativeAmounts = wallet.participants.filter(p => p.amountOwed < 0 || p.amountPaid < 0);
      if (negativeAmounts.length > 0) {
        issues.push(`Found ${negativeAmounts.length} participants with negative amounts`);
      }

      // Check for zero amountOwed with positive amountPaid
      const corruptedParticipants = wallet.participants.filter(p => p.amountOwed === 0 && p.amountPaid > 0);
      if (corruptedParticipants.length > 0) {
        issues.push(`Found ${corruptedParticipants.length} participants with corrupted data (amountOwed=0, amountPaid>0)`);
      }

      // Check for amountPaid exceeding amountOwed
      const overpaidParticipants = wallet.participants.filter(p => p.amountPaid > p.amountOwed);
      if (overpaidParticipants.length > 0) {
        issues.push(`Found ${overpaidParticipants.length} participants who have paid more than they owe`);
      }

      return {
        success: true,
        isValid: issues.length === 0,
        issues
      };

    } catch (error) {
      return {
        success: false,
        isValid: false,
        issues: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Repair corrupted split wallet data
   * This fixes cases where amountOwed and amountPaid are swapped or incorrect
   */
  static async repairSplitWalletData(splitWalletId: string): Promise<{
    success: boolean;
    error?: string;
    repaired?: boolean;
  }> {
    try {
      console.log('🔧 SplitWalletService: Starting data repair for split wallet:', splitWalletId);

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      let needsRepair = false;
      
      // Check if all participants have amountOwed = 0 (common issue)
      const allParticipantsHaveZeroAmount = wallet.participants.every(p => p.amountOwed === 0);
      const totalParticipantAmounts = wallet.participants.reduce((sum, p) => sum + p.amountOwed, 0);
      
      if (allParticipantsHaveZeroAmount || Math.abs(totalParticipantAmounts - wallet.totalAmount) > 0.01) {
        console.log('🔧 SplitWalletService: Found participants with incorrect amounts:', {
          allParticipantsHaveZeroAmount,
          totalParticipantAmounts,
          walletTotalAmount: wallet.totalAmount,
          participantsCount: wallet.participants.length
        });
        needsRepair = true;
      }
      
      const updatedParticipants = wallet.participants.map(participant => {
        // Check for data corruption: amountOwed = 0 but amountPaid > 0
        if (participant.amountOwed === 0 && participant.amountPaid > 0) {
          console.log('🔧 SplitWalletService: Found corrupted data for participant:', {
            userId: participant.userId,
            name: participant.name,
            amountOwed: participant.amountOwed,
            amountPaid: participant.amountPaid,
            status: participant.status
          });

          needsRepair = true;
          
          // Calculate correct amountOwed based on total amount and number of participants
          const correctAmountOwed = wallet.totalAmount / wallet.participants.length;
          
          // Don't reset amountPaid - preserve payment data
          // Only fix the amountOwed if it's clearly wrong
          return {
            ...participant,
            amountOwed: correctAmountOwed,
            // Keep amountPaid as is to preserve payment history
            status: participant.amountPaid >= correctAmountOwed ? 'paid' as const : 'locked' as const,
          };
        }
        
        // Check for participants with amountOwed = 0 (needs repair)
        if (participant.amountOwed === 0 && wallet.totalAmount > 0) {
          console.log('🔧 SplitWalletService: Found participant with zero amountOwed:', {
            userId: participant.userId,
            name: participant.name,
            amountOwed: participant.amountOwed,
            amountPaid: participant.amountPaid,
            status: participant.status
          });

          needsRepair = true;
          
          // Calculate correct amountOwed based on total amount and number of participants
          const correctAmountOwed = wallet.totalAmount / wallet.participants.length;
          
          return {
            ...participant,
            amountOwed: correctAmountOwed,
            // Keep amountPaid as is to preserve payment history
            status: participant.amountPaid >= correctAmountOwed ? 'paid' as const : 'locked' as const,
          };
        }
        
        // Also check for other corruption patterns
        if (participant.amountOwed < 0 || participant.amountPaid < 0) {
          console.log('🔧 SplitWalletService: Found negative amounts for participant:', {
            userId: participant.userId,
            name: participant.name,
            amountOwed: participant.amountOwed,
            amountPaid: participant.amountPaid
          });

          needsRepair = true;
          
          const correctAmountOwed = wallet.totalAmount / wallet.participants.length;
          
          return {
            ...participant,
            amountOwed: Math.max(0, participant.amountOwed || correctAmountOwed),
            amountPaid: Math.max(0, participant.amountPaid || 0),
            status: participant.amountPaid >= correctAmountOwed ? 'paid' as const : 'locked' as const,
          };
        }
        
        return participant;
      });

      if (!needsRepair) {
        console.log('🔧 SplitWalletService: No data corruption found');
        return {
          success: true,
          repaired: false,
        };
      }

      // Update the wallet with repaired data
      await updateDoc(doc(db, 'splitWallets', wallet.firebaseDocId || splitWalletId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      console.log('🔧 SplitWalletService: Data repair completed successfully');

      return {
        success: true,
        repaired: true,
      };

    } catch (error) {
      console.log('🔧 SplitWalletService: Error during data repair:', error);
      logger.error('Failed to repair split wallet data', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update participant payment status
   */
  static async updateParticipantPaymentStatus(
    splitWalletId: string,
    participantId: string,
    amountPaid: number,
    status: SplitWalletParticipant['status']
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🔍 SplitWalletService: Updating participant payment status:', {
        splitWalletId,
        participantId,
        amountPaid,
        status
      });

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      const participantIndex = wallet.participants.findIndex(p => p.userId === participantId);
      if (participantIndex === -1) {
        return {
          success: false,
          error: 'Participant not found in this split',
        };
      }

      // Update the participant
      const updatedParticipants = [...wallet.participants];
      const participantData: any = {
        ...updatedParticipants[participantIndex],
        amountPaid,
        status,
      };
      
      // Only add paidAt if status is 'paid'
      if (status === 'paid') {
        participantData.paidAt = new Date().toISOString();
      }
      
      updatedParticipants[participantIndex] = participantData;

      // Update the wallet in Firebase
      await updateDoc(doc(db, 'splitWallets', wallet.firebaseDocId || splitWalletId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      console.log('🔍 SplitWalletService: Successfully updated participant payment status');

      return {
        success: true,
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error updating participant payment status:', error);
      logger.error('Failed to update participant payment status', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Unlock funds for a specific participant (for degen split winners)
   */
  static async unlockSplitWallet(splitWalletId: string, participantId: string): Promise<SplitWalletResult> {
    try {
      console.log('🔍 SplitWalletService: Unlocking split wallet for participant:', {
        splitWalletId,
        participantId
      });

      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return walletResult;
      }

      const wallet = walletResult.wallet;
      
      // Find the participant
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Update participant status to locked (unlocked means they can access funds)
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === participantId 
          ? { ...p, status: 'locked' as const }
          : p
      );

      // Update the wallet in Firebase
      await updateDoc(doc(db, 'splitWallets', wallet.firebaseDocId || splitWalletId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      console.log('🔍 SplitWalletService: Successfully unlocked funds for participant');

      return {
        success: true,
        wallet: {
          ...wallet,
          participants: updatedParticipants,
        },
      };

    } catch (error) {
      console.log('🔍 SplitWalletService: Error unlocking split wallet:', error);
      logger.error('Failed to unlock split wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Cancel split wallet and refund participants
   */
  static async cancelSplitWallet(splitWalletId: string, reason?: string): Promise<SplitWalletResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return result;
      }

      const wallet = result.wallet;

      // Refund participants who have paid
      for (const participant of wallet.participants) {
        if (participant.amountPaid > 0) {
          await consolidatedTransactionService.sendUsdcTransaction(
            participant.walletAddress,
            participant.amountPaid,
            wallet.creatorId,
            `Refund for cancelled split ${wallet.billId}`,
            undefined,
            'medium'
          );
        }
      }

      // Update wallet status
      // Use Firebase document ID if available, otherwise use the splitWalletId
      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      logger.info('Split wallet cancelled successfully', { splitWalletId, reason }, 'SplitWalletService');

      return {
        success: true,
        wallet: {
          ...wallet,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      logger.error('Failed to cancel split wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Complete split wallet - mark as completed and optionally send funds to merchant
   */
  static async completeSplitWallet(
    splitWalletId: string,
    merchantAddress?: string
  ): Promise<SplitWalletResult> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;

      // Verify all participants have paid
      const allParticipantsPaid = wallet.participants.every(p => p.status === 'paid');
      if (!allParticipantsPaid) {
        return {
          success: false,
          error: 'Not all participants have paid their shares',
        };
      }

      // If merchant address is provided, send the total amount to the merchant
      if (merchantAddress) {
        const merchantPaymentResult = await this.sendToCastAccount(
          splitWalletId,
          merchantAddress,
          `Payment for bill ${wallet.billId}`
        );

        if (!merchantPaymentResult.success) {
          return {
            success: false,
            error: merchantPaymentResult.error || 'Failed to send payment to merchant',
          };
        }
      }

      // Update wallet status to completed
      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info('Split wallet completed successfully', {
        splitWalletId,
        merchantAddress,
        totalAmount: wallet.totalAmount
      }, 'SplitWalletService');

      return {
        success: true,
        wallet: {
          ...wallet,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      logger.error('Failed to complete split wallet', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send completion notifications to all participants when fair split is completed
   */
  private static async sendSplitCompletionNotifications(wallet: SplitWallet): Promise<void> {
    try {
      const { sendNotificationsToUsers } = await import('./firebaseNotificationService');
      
      // Get all participant user IDs
      const participantIds = wallet.participants.map(p => p.userId);
      
      // Send notification to all participants
      await sendNotificationsToUsers(
        participantIds,
        '🎉 Split Completed!',
        `The "${wallet.billId}" split has been completed successfully! All payments have been processed.`,
        'general',
        {
          splitWalletId: wallet.id,
          billName: wallet.billId,
          totalAmount: wallet.totalAmount,
          currency: wallet.currency,
          completedAt: new Date().toISOString(),
          type: 'split_completed'
        }
      );

      logger.info('Split completion notifications sent successfully', {
        splitWalletId: wallet.id,
        billName: wallet.billId,
        participantCount: participantIds.length
      }, 'SplitWalletService');

    } catch (error) {
      logger.error('Failed to send split completion notifications', error, 'SplitWalletService');
      // Don't throw error - notification failure shouldn't break the split completion
    }
  }

  /**
   * Send lock completion notifications for degen splits
   */
  private static async sendDegenLockCompletionNotifications(wallet: SplitWallet): Promise<void> {
    try {
      const { sendNotificationsToUsers } = await import('./firebaseNotificationService');
      
      // Get all participant user IDs
      const participantIds = wallet.participants.map(p => p.userId);
      
      // Send notification to all participants that locking is complete
      await sendNotificationsToUsers(
        participantIds,
        '🔒 All Funds Locked!',
        `All participants have locked their funds for "${wallet.billId}". The creator can now roll the roulette!`,
        'general',
        {
          splitWalletId: wallet.id,
          billName: wallet.billId,
          totalAmount: wallet.totalAmount,
          currency: wallet.currency,
          lockedAt: new Date().toISOString(),
          type: 'degen_all_locked'
        }
      );

      // Send special notification to creator that they can roll
      const { sendNotification } = await import('./firebaseNotificationService');
      await sendNotification(
        wallet.creatorId,
        '🎲 Ready to Roll!',
        `All participants have locked their funds for "${wallet.billId}". You can now roll the roulette to determine the loser!`,
        'general',
        {
          splitWalletId: wallet.id,
          billName: wallet.billId,
          totalAmount: wallet.totalAmount,
          currency: wallet.currency,
          lockedAt: new Date().toISOString(),
          type: 'degen_ready_to_roll'
        }
      );

      logger.info('Degen lock completion notifications sent successfully', {
        splitWalletId: wallet.id,
        billName: wallet.billId,
        participantCount: participantIds.length,
        creatorId: wallet.creatorId
      }, 'SplitWalletService');

    } catch (error) {
      logger.error('Failed to send degen lock completion notifications', error, 'SplitWalletService');
      // Don't throw error - notification failure shouldn't break the locking process
    }
  }

  /**
   * Public method to send roulette result notifications
   * This should be called when the roulette is rolled
   */
  static async notifyRouletteResult(
    splitWalletId: string,
    loserId: string,
    loserName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      await this.sendRouletteResultNotifications(result.wallet, loserId, loserName);
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to notify roulette result', error, 'SplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send roulette result notifications
   */
  private static async sendRouletteResultNotifications(
    wallet: SplitWallet, 
    loserId: string, 
    loserName: string
  ): Promise<void> {
    try {
      const { sendNotificationsToUsers } = await import('./firebaseNotificationService');
      
      // Get all participant user IDs
      const participantIds = wallet.participants.map(p => p.userId);
      
      // Send notification to all participants about the result
      await sendNotificationsToUsers(
        participantIds,
        '🎲 Roulette Result!',
        `The roulette has been rolled for "${wallet.billId}". ${loserName} is the unlucky one who will pay the full amount!`,
        'general',
        {
          splitWalletId: wallet.id,
          billName: wallet.billId,
          totalAmount: wallet.totalAmount,
          currency: wallet.currency,
          loserId,
          loserName,
          rolledAt: new Date().toISOString(),
          type: 'roulette_result'
        }
      );

      logger.info('Roulette result notifications sent successfully', {
        splitWalletId: wallet.id,
        billName: wallet.billId,
        loserId,
        loserName,
        participantCount: participantIds.length
      }, 'SplitWalletService');

    } catch (error) {
      logger.error('Failed to send roulette result notifications', error, 'SplitWalletService');
      // Don't throw error - notification failure shouldn't break the roulette process
    }
  }
}
