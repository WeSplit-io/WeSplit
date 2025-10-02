/**
 * Split Wallet Service
 * Manages wallet creation and operations for bill splits
 * The creator of the split owns the wallet and has custody
 */

import { consolidatedWalletService } from './consolidatedWalletService';
import { consolidatedTransactionService } from './consolidatedTransactionService';
import { logger } from './loggingService';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SplitWallet {
  id: string;
  billId: string;
  creatorId: string;
  walletAddress: string;
  publicKey: string;
  secretKey: string; // Encrypted and stored securely
  totalAmount: number;
  currency: string;
  status: 'active' | 'locked' | 'completed' | 'cancelled';
  participants: SplitWalletParticipant[];
  createdAt: string;
  updatedAt: string;
  firebaseDocId?: string; // Firebase document ID for direct access
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
}

export class SplitWalletService {
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

      // Create split wallet record
      const splitWallet: SplitWallet = {
        id: `split_wallet_${billId}_${Date.now()}`,
        billId,
        creatorId,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        secretKey: wallet.secretKey || '', // This should be encrypted in production
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
        console.warn('🔍 SplitWalletService: Participant amounts do not match total amount:', {
          totalParticipantAmounts,
          totalAmount: splitWallet.totalAmount,
          difference: Math.abs(totalParticipantAmounts - splitWallet.totalAmount)
        });
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
      
      // Update participants list
      const updatedParticipants = participants.map(p => ({
        ...p,
        amountPaid: 0,
        status: 'pending' as const,
      }));

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
   * Get split wallet private key for the creator
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

      console.log('🔍 SplitWalletService: Private key access granted to creator');

      return {
        success: true,
        privateKey: wallet.secretKey,
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
      console.log('🔍 SplitWalletService: Getting split wallet with ID:', splitWalletId);
      
      // First, try to get by Firebase document ID (if it looks like a Firebase doc ID)
      if (splitWalletId.length > 20 && !splitWalletId.startsWith('split_wallet_')) {
        console.log('🔍 SplitWalletService: Trying to get by Firebase document ID');
        const walletDoc = await getDoc(doc(db, 'splitWallets', splitWalletId));
        
        if (walletDoc.exists()) {
          console.log('🔍 SplitWalletService: Found wallet by Firebase document ID');
          return {
            success: true,
            wallet: walletDoc.data() as SplitWallet,
          };
        }
      }
      
      // If not found by document ID, try to find by internal ID
      console.log('🔍 SplitWalletService: Trying to get by internal ID');
      const walletsRef = collection(db, 'splitWallets');
      const q = query(walletsRef, where('id', '==', splitWalletId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('🔍 SplitWalletService: Found wallet by internal ID');
        const walletData = querySnapshot.docs[0].data() as SplitWallet;
        // Add the Firebase document ID to the wallet data
        walletData.firebaseDocId = querySnapshot.docs[0].id;
        return {
          success: true,
          wallet: walletData,
        };
      }
      
      console.log('🔍 SplitWalletService: Split wallet not found');
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
      
      // Find the participant
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Update participant status to locked
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === participantId 
          ? { ...p, status: 'locked' as const, amountPaid: amount }
          : p
      );

      // Update the wallet in Firebase
      await updateDoc(doc(db, 'splitWallets', wallet.firebaseDocId || splitWalletId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      console.log('🔍 SplitWalletService: Successfully locked participant amount');

      return {
        success: true,
        wallet: {
          ...wallet,
          participants: updatedParticipants,
        },
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
      if (amount > remainingAmount) {
        return {
          success: false,
          error: `Payment amount (${amount}) exceeds remaining amount (${remainingAmount})`,
        };
      }

      // Send transaction from participant's wallet to split wallet
      // Note: The participantId should be the actual user ID, and the transaction service
      // will look up the user's wallet information from the database
      console.log('🔍 SplitWalletService: Sending USDC transaction:', {
        toAddress: wallet.walletAddress,
        amount,
        fromUserId: participantId,
        memo: `Split payment for bill ${wallet.billId}`,
        participantWalletAddress: participant.walletAddress,
        participantName: participant.name
      });
      
      const transactionResult = await consolidatedTransactionService.sendUsdcTransaction(
        wallet.walletAddress, // Send TO the split wallet
        amount,
        participantId, // The participant is the sender (user ID)
        `Split payment for bill ${wallet.billId}`,
        undefined,
        'medium'
      );
      
      console.log('🔍 SplitWalletService: Transaction result:', transactionResult);

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Update participant payment status
      const updatedAmountPaid = participant.amountPaid + amount;
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
        amount,
        transactionSignature: transactionResult.signature,
      }, 'SplitWalletService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount,
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
   * Send payment from split wallet to Cast account
   * This is called when all participants have paid
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
      
      // Check if we have collected the full amount
      if (totalCollected < wallet.totalAmount) {
        return {
          success: false,
          error: `Insufficient funds collected. Required: ${wallet.totalAmount} USDC, Collected: ${totalCollected} USDC`,
        };
      }

      // Send payment from split wallet to Cast account
      // The creator has custody of the split wallet, so they initiate the transaction
      const transactionResult = await consolidatedTransactionService.sendUsdcTransaction(
        castAccountAddress,
        wallet.totalAmount,
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
        amount: wallet.totalAmount,
        transactionSignature: transactionResult.signature,
      }, 'SplitWalletService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: wallet.totalAmount,
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
      logger.info('Processing participant share payment', {
        splitWalletId,
        participantId,
        amount
      }, 'SplitWalletService');

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
      if (amount > remainingAmount) {
        return {
          success: false,
          error: `Payment amount (${amount}) exceeds your remaining amount (${remainingAmount})`,
        };
      }

      // Check if amount is valid (greater than 0)
      if (amount <= 0) {
        return {
          success: false,
          error: 'Payment amount must be greater than 0',
        };
      }

      // Check if participant has a valid wallet address
      if (!participant.walletAddress || participant.walletAddress === 'No wallet address' || participant.walletAddress === 'Unknown wallet') {
        return {
          success: false,
          error: 'Participant does not have a valid wallet address. Please ensure the user has connected their wallet.',
        };
      }

      // Process the payment using the existing method
      return await this.processParticipantPayment(
        splitWalletId,
        participantId,
        amount,
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
      updatedParticipants[participantIndex] = {
        ...updatedParticipants[participantIndex],
        amountPaid,
        status,
        paidAt: status === 'paid' ? new Date().toISOString() : undefined,
      };

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
}
