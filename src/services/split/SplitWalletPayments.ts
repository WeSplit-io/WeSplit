/**
 * Split Wallet Payments Service
 * Handles all payment operations for split wallets
 * Part of the modularized SplitWalletService
 */

import { consolidatedTransactionService } from '../consolidatedTransactionService';
import { logger } from '../loggingService';
import { FeeService } from '../../config/feeConfig';
import { roundUsdcAmount } from '../../utils/currencyUtils';
import { transactionUtils } from '../shared/transactionUtils';
import { keypairUtils } from '../shared/keypairUtils';
import { balanceUtils } from '../shared/balanceUtils';
import { validationUtils } from '../shared/validationUtils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult, PaymentResult } from './types';

export class SplitWalletPayments {
  /**
   * Process participant payment to split wallet
   */
  static async processParticipantPayment(
    splitWalletId: string,
    participantId: string,
    amount: number,
    transactionSignature?: string
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Processing participant payment:', {
        splitWalletId,
        participantId,
        amount,
        transactionSignature
      });

      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Find participant
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Validate amount
      const roundedAmount = roundUsdcAmount(amount);
      if (roundedAmount <= 0) {
        return {
          success: false,
          error: 'Invalid payment amount',
        };
      }

      // Check if participant has already paid
      if (participant.status === 'paid') {
        return {
          success: false,
          error: 'Participant has already paid their share',
        };
      }

      // Update participant payment status
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === participantId) {
          return {
            ...p,
            amountPaid: roundedAmount,
            status: 'paid' as const,
            transactionSignature: transactionSignature || p.transactionSignature,
            paidAt: new Date().toISOString(),
          };
        }
        return p;
      });

      // Update wallet in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ SplitWalletPayments: Participant payment processed successfully:', {
        splitWalletId,
        participantId,
        amount: roundedAmount
      });

      logger.info('Participant payment processed', {
        splitWalletId,
        participantId,
        amount: roundedAmount,
        transactionSignature
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature,
        amount: roundedAmount,
        message: 'Payment processed successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error processing participant payment:', error);
      logger.error('Failed to process participant payment', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send funds to cast account (merchant)
   */
  static async sendToCastAccount(
    splitWalletId: string,
    castAccountAddress: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Sending to cast account:', {
        splitWalletId,
        castAccountAddress,
        description
      });

      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Validate cast account address
      if (!validationUtils.isValidSolanaAddress(castAccountAddress)) {
        return {
          success: false,
          error: 'Invalid cast account address',
        };
      }

      // Get split wallet private key
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction
      const transactionParams = {
        fromAddress: wallet.walletAddress,
        toAddress: castAccountAddress,
        amount: wallet.totalAmount,
        currency: wallet.currency,
        description: description || `Payment for bill ${wallet.billId}`,
        privateKey: privateKeyResult.privateKey,
      };

      // Execute transaction
      const transactionResult = await consolidatedTransactionService.sendTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to send transaction to cast account',
        };
      }

      console.log('✅ SplitWalletPayments: Funds sent to cast account successfully:', {
        splitWalletId,
        castAccountAddress,
        amount: wallet.totalAmount,
        transactionSignature: transactionResult.transactionSignature
      });

      logger.info('Funds sent to cast account', {
        splitWalletId,
        castAccountAddress,
        amount: wallet.totalAmount,
        transactionSignature: transactionResult.transactionSignature
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.transactionSignature,
        amount: wallet.totalAmount,
        message: 'Funds sent to cast account successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error sending to cast account:', error);
      logger.error('Failed to send funds to cast account', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Transfer funds to user wallet
   */
  static async transferToUserWallet(
    splitWalletId: string,
    userId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Transferring to user wallet:', {
        splitWalletId,
        userId,
        amount
      });

      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Find participant
      const participant = wallet.participants.find(p => p.userId === userId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Validate amount
      const roundedAmount = roundUsdcAmount(amount);
      if (roundedAmount <= 0) {
        return {
          success: false,
          error: 'Invalid transfer amount',
        };
      }

      // Get split wallet private key
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction
      const transactionParams = {
        fromAddress: wallet.walletAddress,
        toAddress: participant.walletAddress,
        amount: roundedAmount,
        currency: wallet.currency,
        description: `Transfer from split wallet ${splitWalletId}`,
        privateKey: privateKeyResult.privateKey,
      };

      // Execute transaction
      const transactionResult = await consolidatedTransactionService.sendTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to transfer funds to user wallet',
        };
      }

      console.log('✅ SplitWalletPayments: Funds transferred to user wallet successfully:', {
        splitWalletId,
        userId,
        amount: roundedAmount,
        transactionSignature: transactionResult.transactionSignature
      });

      logger.info('Funds transferred to user wallet', {
        splitWalletId,
        userId,
        amount: roundedAmount,
        transactionSignature: transactionResult.transactionSignature
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.transactionSignature,
        amount: roundedAmount,
        message: 'Funds transferred to user wallet successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error transferring to user wallet:', error);
      logger.error('Failed to transfer funds to user wallet', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Extract funds from Fair Split wallet (Creator only)
   */
  static async extractFairSplitFunds(
    splitWalletId: string,
    recipientAddress: string,
    creatorId: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Extracting Fair Split funds:', {
        splitWalletId,
        recipientAddress,
        creatorId,
        description
      });

      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

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
        console.log('🔍 SplitWalletPayments: Private key not found in local storage, checking for migration...');
        
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

      console.log('🔍 SplitWalletPayments: extractFairSplitFunds - Private key retrieved from local storage');

      // Validate recipient address
      if (!validationUtils.isValidSolanaAddress(recipientAddress)) {
        return {
          success: false,
          error: 'Invalid recipient address',
        };
      }

      // Get current balance of the split wallet
      const balanceResult = await balanceUtils.getWalletBalance(wallet.walletAddress);
      if (!balanceResult.success) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to get split wallet balance',
        };
      }

      const availableBalance = balanceResult.balance?.usdcBalance || 0;
      if (availableBalance <= 0) {
        return {
          success: false,
          error: 'No funds available in split wallet',
        };
      }

      // Create transaction
      const transactionParams = {
        fromAddress: wallet.walletAddress,
        toAddress: recipientAddress,
        amount: availableBalance,
        currency: wallet.currency,
        description: description || `Fair Split funds extraction for bill ${wallet.billId}`,
        privateKey: privateKeyResult.privateKey,
      };

      // Execute transaction
      const transactionResult = await consolidatedTransactionService.sendTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to extract funds from Fair Split',
        };
      }

      console.log('✅ SplitWalletPayments: Fair Split funds extracted successfully:', {
        splitWalletId,
        recipientAddress,
        amount: availableBalance,
        transactionSignature: transactionResult.transactionSignature
      });

      logger.info('Fair Split funds extracted', {
        splitWalletId,
        recipientAddress,
        amount: availableBalance,
        transactionSignature: transactionResult.transactionSignature
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.transactionSignature,
        amount: availableBalance,
        message: 'Fair Split funds extracted successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error extracting Fair Split funds:', error);
      logger.error('Failed to extract Fair Split funds', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process degen winner payout
   */
  static async processDegenWinnerPayout(
    splitWalletId: string,
    winnerUserId: string,
    winnerAddress: string,
    totalAmount: number,
    description?: string
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Processing degen winner payout:', {
        splitWalletId,
        winnerUserId,
        winnerAddress,
        totalAmount,
        description
      });

      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Get the private key
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction
      const transactionParams = {
        fromAddress: wallet.walletAddress,
        toAddress: winnerAddress,
        amount: totalAmount,
        currency: wallet.currency,
        description: description || `Degen Split winner payout for ${winnerUserId}`,
        privateKey: privateKeyResult.privateKey,
      };

      // Execute transaction
      const transactionResult = await this.sendTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to process degen winner payout',
        };
      }

      console.log('✅ SplitWalletPayments: Degen winner payout processed successfully:', {
        splitWalletId,
        winnerUserId,
        totalAmount,
        transactionSignature: transactionResult.transactionSignature
      });

      return {
        success: true,
        transactionSignature: transactionResult.transactionSignature,
        amount: totalAmount,
        message: 'Degen winner payout processed successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error processing degen winner payout:', error);
      logger.error('Failed to process degen winner payout', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process degen loser payment
   */
  static async processDegenLoserPayment(
    splitWalletId: string,
    loserUserId: string,
    paymentMethod: 'in-app' | 'external' | 'kast-card',
    totalAmount: number,
    description?: string
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Processing degen loser payment:', {
        splitWalletId,
        loserUserId,
        paymentMethod,
        totalAmount,
        description
      });

      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Find participant
      const participant = wallet.participants.find(p => p.userId === loserUserId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Update participant payment status
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === loserUserId) {
          return {
            ...p,
            amountPaid: totalAmount,
            status: 'paid' as const,
            paidAt: new Date().toISOString(),
          };
        }
        return p;
      });

      // Update wallet in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      await this.updateWalletParticipants(docId, updatedParticipants);

      console.log('✅ SplitWalletPayments: Degen loser payment processed successfully:', {
        splitWalletId,
        loserUserId,
        totalAmount
      });

      return {
        success: true,
        amount: totalAmount,
        message: 'Degen loser payment processed successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error processing degen loser payment:', error);
      logger.error('Failed to process degen loser payment', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Pay participant share
   */
  static async payParticipantShare(
    splitWalletId: string,
    participantId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      console.log('🔍 SplitWalletPayments: Paying participant share:', {
        splitWalletId,
        participantId,
        amount
      });

      // This is essentially the same as processParticipantPayment
      return await this.processParticipantPayment(splitWalletId, participantId, amount);

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error paying participant share:', error);
      logger.error('Failed to pay participant share', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper methods (direct implementations to avoid circular imports)
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

  private static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      const SecureStore = await import('expo-secure-store');
      const storageKey = `split_wallet_private_key_${splitWalletId}_${requesterId}`;
      
      const privateKey = await SecureStore.getItemAsync(storageKey);
      
      if (!privateKey) {
        return {
          success: false,
          error: `Private key not found in local storage for split wallet ${splitWalletId}`,
        };
      }

      return { success: true, privateKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static async sendTransaction(params: any): Promise<{ success: boolean; error?: string; transactionSignature?: string }> {
    const { consolidatedTransactionService } = await import('../consolidatedTransactionService');
    return consolidatedTransactionService.sendTransaction(params);
  }

  private static async updateWalletParticipants(docId: string, participants: SplitWalletParticipant[]): Promise<void> {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase');
    await updateDoc(doc(db, 'splitWallets', docId), {
      participants,
      updatedAt: new Date().toISOString(),
    });
  }
}
