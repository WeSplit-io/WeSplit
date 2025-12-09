/**
 * Shared Wallet Funding Service
 * Handles funding operations for shared wallets from various sources
 * 
 * Best Practices:
 * - Single Responsibility: Only handles funding operations
 * - Error Handling: Comprehensive error handling with logging
 * - Transaction Tracking: Records all funding transactions
 */

import { logger } from '../core';
import type {
  FundSharedWalletParams,
  FundSharedWalletResult,
  SharedWalletTransaction,
} from './types';
import { SHARED_WALLET_CONSTANTS } from './index';
import { db } from '../../config/firebase/firebase';
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '../blockchain/secureTokenUtils';
import { USDC_CONFIG } from '../shared/walletConstants';

export class SharedWalletFunding {
  /**
   * Fund a shared wallet from various sources
   * 
   * Flow:
   * 1. Validate parameters
   * 2. Get shared wallet and verify user is a member
   * 3. Get source wallet private key based on source type
   * 4. Execute USDC transfer to shared wallet
   * 5. Update shared wallet balance
   * 6. Record transaction
   * 7. Update member contribution
   */
  static async fundSharedWallet(
    params: FundSharedWalletParams
  ): Promise<FundSharedWalletResult> {
    try {
      // Validate parameters
      if (!params.sharedWalletId || !params.userId || !params.amount || params.amount <= 0) {
        return {
          success: false,
          error: 'Invalid funding parameters',
        };
      }

      logger.info('Funding shared wallet', {
        sharedWalletId: params.sharedWalletId,
        userId: params.userId,
        amount: params.amount,
        source: params.source,
      }, 'SharedWalletFunding');

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
      const isMember = wallet.members?.some((m) => m.userId === params.userId);
      if (!isMember) {
        return {
          success: false,
          error: 'You must be a member to fund this wallet',
        };
      }

      // Get source wallet private key based on source type
      let sourcePrivateKey: string;
      let sourceAddress: string;

      if (params.source === 'in-app-wallet') {
        // Get user's app wallet private key
        const { walletService } = await import('../blockchain/wallet');
        const walletResult = await walletService.getWalletInfo(params.userId);
        if (!walletResult || !walletResult.secretKey) {
          return {
            success: false,
            error: 'App wallet not found. Please ensure your wallet is initialized.',
          };
        }
        sourcePrivateKey = walletResult.secretKey;
        sourceAddress = walletResult.address;
      } else if (params.source === 'external-wallet') {
        // For external wallet, we need the private key from the user
        // This should be handled via signature-based flow
        // For now, return error - this needs to be implemented via wallet connection
        return {
          success: false,
          error: 'External wallet funding requires wallet connection. Please use the wallet connection flow.',
        };
      } else {
        // MoonPay - funds should already be in the shared wallet
        // This is handled separately via MoonPay callback
        return {
          success: false,
          error: 'MoonPay funding is handled separately via the MoonPay widget.',
        };
      }

      // Execute USDC transfer
      const { createSolanaConnection } = await import('../blockchain/connection/connectionFactory');
      const connectionInstance = await createSolanaConnection();

      const fromPublicKey = new PublicKey(sourceAddress);
      const toPublicKey = new PublicKey(wallet.walletAddress);
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
      const keypairResult = KeypairUtils.createKeypairFromSecretKey(sourcePrivateKey);
      
      if (!keypairResult.success || !keypairResult.keypair) {
        logger.error('Failed to create keypair from private key', {
          error: keypairResult.error,
          sharedWalletId: params.sharedWalletId,
          userId: params.userId
        }, 'SharedWalletFunding');
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

      logger.info('Shared wallet funded successfully', {
        sharedWalletId: params.sharedWalletId,
        signature,
        amount: params.amount,
      }, 'SharedWalletFunding');

      // Calculate new balance
      const newBalance = (wallet.totalBalance || 0) + params.amount;

      // Update member contribution and balance in a single operation
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === params.userId) {
          return {
            ...m,
            totalContributed: (m.totalContributed || 0) + params.amount,
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
        type: 'funding',
        userId: params.userId,
        userName: wallet.members.find((m) => m.userId === params.userId)?.name || 'Unknown',
        amount: params.amount,
        currency: wallet.currency || SHARED_WALLET_CONSTANTS.DEFAULT_CURRENCY,
        transactionSignature: signature,
        status: 'confirmed',
        memo: params.memo,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        source: params.source,
      };

      await addDoc(collection(db, 'sharedWalletTransactions'), transactionData);

      return {
        success: true,
        transactionSignature: signature,
        newBalance,
        message: 'Shared wallet funded successfully',
      };

    } catch (error) {
      logger.error('Failed to fund shared wallet', error, 'SharedWalletFunding');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

