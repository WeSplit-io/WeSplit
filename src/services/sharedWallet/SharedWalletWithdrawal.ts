/**
 * Shared Wallet Withdrawal Service
 * Handles withdrawal operations from shared wallets to linked cards
 * 
 * Best Practices:
 * - Single Responsibility: Only handles withdrawal operations
 * - Error Handling: Comprehensive error handling with logging
 * - Transaction Tracking: Records all withdrawal transactions
 */

import { logger } from '../core';
import type {
  WithdrawFromSharedWalletParams,
  WithdrawFromSharedWalletResult,
  SharedWalletTransaction,
} from './types';
import { SHARED_WALLET_CONSTANTS } from './index';
import { db } from '../../config/firebase/firebase';
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Transaction, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '../blockchain/secureTokenUtils';
import { USDC_CONFIG } from '../shared/walletConstants';
import { ExternalCardService } from '../integrations/external/ExternalCardService';

export class SharedWalletWithdrawal {
  /**
   * Withdraw from a shared wallet to a linked card or personal wallet
   * 
   * Flow:
   * 1. Validate parameters
   * 2. Get shared wallet and verify user is a member
   * 3. Check user's available balance
   * 4. Get destination address (from linked card or personal wallet)
   * 5. Get shared wallet private key
   * 6. Execute USDC transfer from shared wallet to destination
   * 7. Update shared wallet balance
   * 8. Record transaction
   * 9. Update member withdrawal amount
   */
  static async withdrawFromSharedWallet(
    params: WithdrawFromSharedWalletParams
  ): Promise<WithdrawFromSharedWalletResult> {
    try {
      // Validate parameters
      if (!params.sharedWalletId || !params.userId || !params.amount || params.amount <= 0) {
        return {
          success: false,
          error: 'Invalid withdrawal parameters',
        };
      }

      logger.info('Withdrawing from shared wallet', {
        sharedWalletId: params.sharedWalletId,
        userId: params.userId,
        amount: params.amount,
        destination: params.destination,
        destinationId: params.destinationId,
      }, 'SharedWalletWithdrawal');

      // Get shared wallet
      const { getSharedWalletDocById } = await import('./utils');
      const result = await getSharedWalletDocById(params.sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;
      
      // Verify user is a member
      const userMember = wallet.members?.find((m) => m.userId === params.userId);
      if (!userMember) {
        return {
          success: false,
          error: 'You must be a member to withdraw from this wallet',
        };
      }

      // Check user's available balance
      const userContribution = userMember.totalContributed || 0;
      const userWithdrawn = userMember.totalWithdrawn || 0;
      const userAvailableBalance = userContribution - userWithdrawn;

      if (params.amount > userAvailableBalance) {
        return {
          success: false,
          error: `Insufficient balance. You can withdraw up to ${userAvailableBalance} ${wallet.currency || SHARED_WALLET_CONSTANTS.DEFAULT_CURRENCY}`,
        };
      }

      // Check shared wallet has enough balance
      if (params.amount > wallet.totalBalance) {
        return {
          success: false,
          error: 'Insufficient balance in shared wallet',
        };
      }

      // Get destination address
      let destinationAddress: string;

      if (params.destination === 'linked-card') {
        if (!params.destinationId) {
          return {
            success: false,
            error: 'Card ID is required for card withdrawal',
          };
        }

        // Get card info
        const cardInfo = await ExternalCardService.getCardInfo(params.destinationId);
        if (!cardInfo.success || !cardInfo.card) {
          return {
            success: false,
            error: 'Linked card not found. Please link a card first.',
          };
        }

        destinationAddress = cardInfo.card.identifier || cardInfo.card.address || '';
        if (!destinationAddress) {
          return {
            success: false,
            error: 'Card address not available',
          };
        }
      } else {
        // Personal wallet - get user's app wallet address
        const { walletService } = await import('../blockchain/wallet');
        const walletResult = await walletService.getWalletInfo(params.userId);
        if (!walletResult || !walletResult.address) {
          return {
            success: false,
            error: 'Personal wallet not found. Please ensure your wallet is initialized.',
          };
        }
        destinationAddress = walletResult.address;
      }

      // Get shared wallet private key
      const { SplitWalletSecurity } = await import('../split/SplitWalletSecurity');
      const privateKeyResult = await SplitWalletSecurity.getSplitWalletPrivateKey(
        params.sharedWalletId,
        params.userId
      );

      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to access shared wallet private key',
        };
      }

      // Execute USDC transfer
      const { createSolanaConnection } = await import('../blockchain/connection/connectionFactory');
      const connectionInstance = await createSolanaConnection();

      const fromPublicKey = new PublicKey(wallet.walletAddress);
      const toPublicKey = new PublicKey(destinationAddress);
      const mintPublicKey = new PublicKey(USDC_CONFIG.mintAddress);

      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Create transaction
      const transaction = new Transaction();

      // Check if destination token account exists
      try {
        await getAccount(connectionInstance, toTokenAccount);
      } catch {
        // Create associated token account if it doesn't exist
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        const companyPublicKey = new PublicKey(companyWalletAddress);
        
        transaction.add(
          createAssociatedTokenAccountInstruction(
            companyPublicKey,
            toTokenAccount,
            toPublicKey,
            mintPublicKey
          )
        );
      }

      // Calculate amount (USDC has 6 decimals)
      const transferAmount = Math.floor(params.amount * Math.pow(10, SHARED_WALLET_CONSTANTS.USDC_DECIMALS));

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount
        )
      );

      // Sign and send transaction
      // Use KeypairUtils to handle both base64 and JSON array formats
      const { KeypairUtils } = await import('../shared/keypairUtils');
      const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKeyResult.privateKey);
      
      if (!keypairResult.success || !keypairResult.keypair) {
        logger.error('Failed to create keypair from private key', {
          error: keypairResult.error,
          sharedWalletId: params.sharedWalletId,
          userId: params.userId
        }, 'SharedWalletWithdrawal');
        return {
          success: false,
          error: keypairResult.error || 'Failed to create keypair from private key'
        };
      }
      
      const fromKeypair = keypairResult.keypair;

      transaction.feePayer = fromPublicKey;
      const latestBlockhash = await connectionInstance.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      // Sign transaction
      transaction.sign(fromKeypair);

      // Send transaction
      const signature = await connectionInstance.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false }
      );

      // Wait for confirmation
      await connectionInstance.confirmTransaction(signature, 'confirmed');

      logger.info('Shared wallet withdrawal successful', {
        sharedWalletId: params.sharedWalletId,
        signature,
        amount: params.amount,
        destination: destinationAddress,
      }, 'SharedWalletWithdrawal');

      // Calculate new balance
      const newBalance = (wallet.totalBalance || 0) - params.amount;

      // Update member withdrawal amount and balance in a single operation
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === params.userId) {
          return {
            ...m,
            totalWithdrawn: (m.totalWithdrawn || 0) + params.amount,
          };
        }
        return m;
      });

      // Update both balance and members in a single operation
      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        totalBalance: newBalance,
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      // Record transaction
      const { generateUniqueId } = await import('./utils');
      const transactionData: Omit<SharedWalletTransaction, 'firebaseDocId'> = {
        id: generateUniqueId('tx'),
        sharedWalletId: params.sharedWalletId,
        type: 'withdrawal',
        userId: params.userId,
        userName: userMember.name || 'Unknown',
        amount: params.amount,
        currency: wallet.currency || SHARED_WALLET_CONSTANTS.DEFAULT_CURRENCY,
        transactionSignature: signature,
        status: 'confirmed',
        memo: params.memo,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        destination: destinationAddress,
      };

      await addDoc(collection(db, 'sharedWalletTransactions'), transactionData);

      return {
        success: true,
        transactionSignature: signature,
        newBalance,
        message: `Successfully withdrew ${params.amount} ${wallet.currency || SHARED_WALLET_CONSTANTS.DEFAULT_CURRENCY} to ${params.destination === 'linked-card' ? 'your linked card' : 'your personal wallet'}`,
      };

    } catch (error) {
      logger.error('Failed to withdraw from shared wallet', error, 'SharedWalletWithdrawal');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

