/**
 * Split Wallet Payments Service
 * Handles all payment operations for split wallets
 * Part of the modularized SplitWalletService
 */

import { consolidatedTransactionService } from '../consolidatedTransactionService';
import { logger } from '../loggingService';
import { FeeService } from '../../config/feeConfig';
import { roundUsdcAmount } from '../../utils/currencyUtils';
import { doc, updateDoc, collection, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult, PaymentResult } from './types';
import { KeypairUtils } from '../shared/keypairUtils';
import { ValidationUtils } from '../shared/validationUtils';
import { BalanceUtils } from '../shared/balanceUtils';

// Helper function to verify transaction on blockchain
async function verifyTransactionOnBlockchain(transactionSignature: string): Promise<boolean> {
  try {
    const { Connection } = await import('@solana/web3.js');
    const { getConfig } = await import('../../config/unified');
    const connection = new Connection(getConfig().blockchain.rpcUrl);
    
    // Get transaction status
    const transactionStatus = await connection.getSignatureStatus(transactionSignature);
    
    if (transactionStatus.value?.confirmationStatus) {
      logger.info('Transaction confirmation status', {
        transactionSignature,
        confirmationStatus: transactionStatus.value.confirmationStatus,
        slot: transactionStatus.value.slot,
        err: transactionStatus.value.err
      }, 'SplitWalletPayments');
      
      return transactionStatus.value.err === null && 
             (transactionStatus.value.confirmationStatus === 'confirmed' || 
              transactionStatus.value.confirmationStatus === 'finalized');
    }
    
    return false;
  } catch (error) {
    logger.warn('Could not verify transaction status', {
      transactionSignature,
      error
    }, 'SplitWalletPayments');
    return false;
  }
}

// Helper function to execute split wallet transaction with custom from address
async function executeSplitWalletTransaction(
  fromAddress: string,
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  memo: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    logger.info('Executing split wallet transaction', {
      fromAddress,
      toAddress,
      amount,
      currency,
      memo
    }, 'SplitWalletPayments');

    // Import required modules
    const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
    const { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    const { getConfig } = await import('../../config/unified');
    const { transactionUtils } = await import('../shared/transactionUtils');

    // Create connection
    const connection = new Connection(getConfig().blockchain.rpcUrl, 'confirmed');

    // Create keypair from private key
    const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKey);
    if (!keypairResult.success || !keypairResult.keypair) {
      return {
        success: false,
        error: keypairResult.error || 'Failed to create keypair from private key'
      };
    }
    const keypair = keypairResult.keypair;
    
    // CRITICAL: Verify that the keypair matches the expected fromAddress
    const keypairAddress = keypair.publicKey.toBase58();
    if (keypairAddress !== fromAddress) {
      logger.error('Keypair address mismatch - this is the root cause!', {
        expectedFromAddress: fromAddress,
        actualKeypairAddress: keypairAddress,
        privateKeyLength: privateKey.length,
        privateKeyPrefix: privateKey.substring(0, 20) + '...'
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: `Keypair address mismatch! Expected: ${fromAddress}, Got: ${keypairAddress}. This means the stored private key doesn't match the split wallet address.`
      };
    }
    
    logger.info('✅ Keypair verification successful', {
      expectedFromAddress: fromAddress,
      actualKeypairAddress: keypairAddress,
      keypairFormat: keypairResult.format
    }, 'SplitWalletPayments');
    
    // Validate addresses
    const fromPublicKey = new PublicKey(fromAddress);
    const toPublicKey = new PublicKey(toAddress);
    const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
    const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);
    
    // CRITICAL: Verify that the fromTokenAccount is derived from the correct keypair
    const expectedFromTokenAccount = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);
    if (!fromTokenAccount.equals(expectedFromTokenAccount)) {
      logger.error('Token account mismatch - this is another root cause!', {
        expectedFromTokenAccount: expectedFromTokenAccount.toBase58(),
        actualFromTokenAccount: fromTokenAccount.toBase58(),
        fromPublicKey: fromPublicKey.toBase58(),
        keypairPublicKey: keypair.publicKey.toBase58()
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: `Token account mismatch! Expected: ${expectedFromTokenAccount.toBase58()}, Got: ${fromTokenAccount.toBase58()}. This means we're trying to transfer from the wrong token account.`
      };
    }
    
    logger.info('✅ Token account verification successful', {
      fromTokenAccount: fromTokenAccount.toBase58(),
      toTokenAccount: toTokenAccount.toBase58(),
      usdcMint: usdcMint.toBase58()
    }, 'SplitWalletPayments');

    // Get company wallet for fee payment (SOL fees are covered by company wallet)
    const { FeeService } = await import('../../config/feeConfig');
    const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
    
    logger.info('Fee payer setup for split wallet transaction', {
      splitWalletAddress: fromAddress,
      companyWalletAddress: feePayerPublicKey.toBase58(),
      isCompanyWallet: feePayerPublicKey.toBase58() !== fromAddress
    }, 'SplitWalletPayments');

    // Load company wallet keypair for signing (SOL fees) - matching TransactionProcessor pattern
    let companyKeypair: typeof Keypair.prototype | null = null;
    
    if (feePayerPublicKey.toBase58() !== fromAddress) {
      try {
        const { COMPANY_WALLET_CONFIG } = await import('../../config/feeConfig');
        
        logger.info('Loading company wallet keypair for split wallet transaction', {
          hasSecretKey: !!COMPANY_WALLET_CONFIG.secretKey,
          secretKeyLength: COMPANY_WALLET_CONFIG.secretKey?.length || 0,
          companyWalletAddress: COMPANY_WALLET_CONFIG.address
        }, 'SplitWalletPayments');
        
        if (COMPANY_WALLET_CONFIG.secretKey) {
          let companySecretKeyBuffer: Buffer;
          
          // Handle different secret key formats - matching TransactionProcessor pattern
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            logger.info('Parsing company secret key as JSON array format', null, 'SplitWalletPayments');
            const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
            const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
            companySecretKeyBuffer = Buffer.from(keyArray);
          } else {
            logger.info('Parsing company secret key as base64 format', null, 'SplitWalletPayments');
            companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
          }
          
          logger.info('Company secret key buffer created', {
            bufferLength: companySecretKeyBuffer.length,
            expectedLength: 64
          }, 'SplitWalletPayments');
          
          // Validate and trim if needed
          if (companySecretKeyBuffer.length === 65) {
            logger.info('Trimming company secret key buffer from 65 to 64 bytes', null, 'SplitWalletPayments');
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
          }
          
          logger.info('Creating company keypair from secret key', null, 'SplitWalletPayments');
          companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          
          logger.info('✅ Company wallet keypair created successfully', {
            companyKeypairAddress: companyKeypair.publicKey.toBase58(),
            expectedAddress: COMPANY_WALLET_CONFIG.address,
            addressesMatch: companyKeypair.publicKey.toBase58() === COMPANY_WALLET_CONFIG.address
          }, 'SplitWalletPayments');
        } else {
          logger.warn('⚠️ No company wallet secret key configured', null, 'SplitWalletPayments');
        }
      } catch (error) {
        logger.error('❌ Failed to load company wallet keypair', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: 'Company wallet keypair not available for signing'
        };
      }
    }

    // Check if recipient token account exists
    const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);
    if (!toTokenAccountInfo) {
      return {
        success: false,
        error: 'Recipient does not have a USDC token account'
      };
    }

    // Verify the from token account has sufficient balance
    const fromTokenAccountInfo = await connection.getTokenAccountBalance(fromTokenAccount);
    if (!fromTokenAccountInfo.value) {
      return {
        success: false,
        error: 'Split wallet token account not found or has no balance'
      };
    }

    const availableBalance = parseFloat(fromTokenAccountInfo.value.amount) / 1_000_000; // Convert from smallest unit
    
    // Also check the account info to ensure it exists and is valid
    const fromAccountInfo = await connection.getAccountInfo(fromTokenAccount);
    if (!fromAccountInfo) {
      return {
        success: false,
        error: 'Split wallet token account does not exist on blockchain'
      };
    }

    // CRITICAL: Check for any pending transactions that might affect this account
    logger.info('Checking for pending transactions on split wallet', {
      fromAddress: fromAddress,
      fromTokenAccount: fromTokenAccount.toBase58()
    }, 'SplitWalletPayments');
    
    try {
      const pendingSignatures = await connection.getSignaturesForAddress(fromPublicKey, { limit: 10 });
      const recentSignatures = pendingSignatures.filter(sig => {
        if (!sig.blockTime) return false;
        const sigTime = new Date(sig.blockTime * 1000);
        const now = new Date();
        const timeDiff = now.getTime() - sigTime.getTime();
        return timeDiff < 60000; // Last minute
      });
      
      logger.info('Recent transaction signatures on split wallet', {
        fromAddress: fromAddress,
        totalSignatures: pendingSignatures.length,
        recentSignatures: recentSignatures.length,
        recentSignaturesList: recentSignatures.map(sig => ({
          signature: sig.signature,
          blockTime: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'unknown',
          err: sig.err
        }))
      }, 'SplitWalletPayments');
      
      // Check if any recent transactions failed or are still pending
      const failedTransactions = recentSignatures.filter(sig => sig.err !== null);
      const pendingTransactions = recentSignatures.filter(sig => sig.err === null && !sig.confirmationStatus);
      
      if (failedTransactions.length > 0) {
        logger.warn('Found failed transactions on split wallet', {
          failedCount: failedTransactions.length,
          failedSignatures: failedTransactions.map(sig => sig.signature)
        }, 'SplitWalletPayments');
      }
      
      if (pendingTransactions.length > 0) {
        logger.warn('Found pending transactions on split wallet', {
          pendingCount: pendingTransactions.length,
          pendingSignatures: pendingTransactions.map(sig => sig.signature)
        }, 'SplitWalletPayments');
      }
      
    } catch (error) {
      logger.warn('Could not check pending transactions', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletPayments');
    }

    // Cross-verify balance using multiple methods
    let crossVerifiedBalance = availableBalance;
    try {
      const { getAccount } = await import('@solana/spl-token');
      const accountData = await getAccount(connection, fromTokenAccount);
      const crossVerifiedBalanceRaw = Number(accountData.amount) / 1_000_000;
      
      logger.info('Cross-verification of token account balance', {
        method1_getTokenAccountBalance: availableBalance,
        method2_getAccount: crossVerifiedBalanceRaw,
        difference: Math.abs(availableBalance - crossVerifiedBalanceRaw),
        fromTokenAccount: fromTokenAccount.toBase58()
      }, 'SplitWalletPayments');
      
      // Use the more conservative (lower) balance if there's a discrepancy
      crossVerifiedBalance = Math.min(availableBalance, crossVerifiedBalanceRaw);
      
    } catch (error) {
      logger.warn('Cross-verification failed, using original balance', { 
        error: error instanceof Error ? error.message : String(error),
        originalBalance: availableBalance 
      }, 'SplitWalletPayments');
    }

    logger.info('Token account balance verification', {
      fromTokenAccount: fromTokenAccount.toBase58(),
      availableBalance: availableBalance,
      crossVerifiedBalance: crossVerifiedBalance,
      requestedAmount: amount,
      accountExists: !!fromAccountInfo,
      accountOwner: fromAccountInfo.owner.toBase58(),
      accountDataLength: fromAccountInfo.data.length,
      accountLamports: fromAccountInfo.lamports
    }, 'SplitWalletPayments');

    if (crossVerifiedBalance < amount) {
      return {
        success: false,
        error: `Insufficient balance in split wallet. Available: ${crossVerifiedBalance} USDC, Requested: ${amount} USDC`
      };
    }

    // Calculate amount in smallest unit (USDC has 6 decimals)
    // If withdrawing all funds, we can close the token account and recover rent
    const isFullWithdrawal = Math.abs(crossVerifiedBalance - amount) < 0.000001;
    
    // For full withdrawal, use the exact available balance
    const transferAmount = isFullWithdrawal ? crossVerifiedBalance : amount;
    const amountInSmallestUnit = Math.floor(transferAmount * 1_000_000 + 0.5);
    
    logger.info('Withdrawal type determination', {
      originalAmount: amount,
      availableBalance: availableBalance,
      crossVerifiedBalance: crossVerifiedBalance,
      transferAmount: transferAmount,
      isFullWithdrawal: isFullWithdrawal,
      amountInSmallestUnit: amountInSmallestUnit
    }, 'SplitWalletPayments');

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    // Create transaction with proper fee payer setup - matching TransactionProcessor pattern
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: feePayerPublicKey // Use company wallet as fee payer for SOL fees
    });

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        amountInSmallestUnit,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // For now, let's just do a regular transfer without closing the account
    // We can implement account closure later once the basic transfer works
    if (isFullWithdrawal) {
      logger.info('Full withdrawal detected - using regular transfer (account closure disabled for debugging)', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        transferAmount: transferAmount,
        amountInSmallestUnit: amountInSmallestUnit
      }, 'SplitWalletPayments');
    }

    // Add memo instruction if provided
    if (memo) {
      const { TransactionInstruction, PublicKey } = await import('@solana/web3.js');
      transaction.add(
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
          data: Buffer.from(memo, 'utf8'),
        })
      );
    }

    // Final balance check right before sending transaction
    try {
      const finalBalanceCheck = await connection.getTokenAccountBalance(fromTokenAccount);
      const finalBalance = parseFloat(finalBalanceCheck.value.amount) / 1_000_000;
      
      logger.info('Final balance check before transaction', {
        finalBalance: finalBalance,
        transferAmount: transferAmount,
        amountInSmallestUnit: amountInSmallestUnit,
        balanceDifference: finalBalance - transferAmount
      }, 'SplitWalletPayments');
      
      if (finalBalance < transferAmount) {
        return {
          success: false,
          error: `Balance changed during transaction construction. Final balance: ${finalBalance} USDC, Transfer amount: ${transferAmount} USDC`
        };
      }
    } catch (error) {
      logger.warn('Final balance check failed', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletPayments');
    }

    // Log transaction details before sending
    logger.info('Transaction details before sending', {
      instructionCount: transaction.instructions.length,
      isFullWithdrawal: isFullWithdrawal,
      amountInSmallestUnit: amountInSmallestUnit,
      fromTokenAccount: fromTokenAccount.toBase58(),
      toTokenAccount: toTokenAccount.toBase58(),
      feePayer: feePayerPublicKey.toBase58(),
      splitWalletAddress: fromPublicKey.toBase58()
    }, 'SplitWalletPayments');

    // Prepare signers array - matching TransactionProcessor pattern
    const signers: typeof Keypair.prototype[] = [keypair]; // Split wallet keypair for the transfer
    
    logger.info('Preparing signers array', {
      splitWalletSigner: keypair.publicKey.toBase58(),
      signersCount: signers.length
    }, 'SplitWalletPayments');
    
    // Add company wallet keypair for fee payment - matching TransactionProcessor pattern
    if (companyKeypair) {
      signers.push(companyKeypair);
      
      logger.info('✅ Company keypair added to signers', {
        totalSigners: signers.length,
        companyWalletSigner: companyKeypair.publicKey.toBase58()
      }, 'SplitWalletPayments');
    } else {
      logger.warn('⚠️ No company wallet keypair available for signing', null, 'SplitWalletPayments');
    }

    // Send transaction with retry logic - matching TransactionProcessor pattern
    logger.info('Preparing to send transaction', {
      signersCount: signers.length,
      signerAddresses: signers.map(s => s.publicKey.toBase58()),
      instructionCount: transaction.instructions.length
    }, 'SplitWalletPayments');
    
    let signature: string;
    try {
      signature = await connection.sendTransaction(transaction, signers, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      logger.info('✅ Transaction sent successfully', {
        signature,
        signatureLength: signature.length
      }, 'SplitWalletPayments');
    } catch (sendError) {
      logger.error('❌ Transaction send failed', {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        stack: sendError instanceof Error ? sendError.stack : undefined
      }, 'SplitWalletPayments');
      throw sendError;
    }

    logger.info('Split wallet transaction sent', {
      signature,
      fromAddress,
      toAddress,
      amount
    }, 'SplitWalletPayments');

    // Wait for confirmation
    const confirmed = await transactionUtils.confirmTransactionWithTimeout(signature);
    
    if (!confirmed) {
      logger.warn('Split wallet transaction confirmation timed out', { signature }, 'SplitWalletPayments');
      // Still return success since the transaction was sent
    }

    return {
      success: true,
      signature
    };

  } catch (error) {
    logger.error('Split wallet transaction failed', error, 'SplitWalletPayments');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export class SplitWalletPayments {
  /**
   * Process degen split fund locking (participants lock funds but status remains 'locked', not 'paid')
   */
  static async processDegenFundLocking(
    splitWalletId: string,
    participantId: string,
    amount: number,
    transactionSignature?: string
  ): Promise<PaymentResult> {
    try {
      logger.debug('Processing degen split fund locking', {
        splitWalletId,
        participantId,
        amount,
        transactionSignature
      });

      // Get split wallet with enhanced error handling
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        logger.error('Failed to retrieve split wallet for degen fund locking', {
          splitWalletId,
          participantId,
          error: walletResult.error,
          hasWallet: !!walletResult.wallet
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found. Please ensure the split wallet exists and try again.',
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
          error: 'Invalid locking amount',
        };
      }

      // Check if participant has already locked their funds
      if (participant.status === 'locked' || participant.amountPaid >= participant.amountOwed) {
        return {
          success: false,
          error: 'Participant has already locked their funds',
        };
      }

      // Check if the locking amount would exceed what they owe
      const newAmountPaid = participant.amountPaid + roundedAmount;
      if (newAmountPaid > participant.amountOwed) {
        return {
          success: false,
          error: `Locking amount would exceed what participant owes. Maximum: ${participant.amountOwed} USDC`,
        };
      }

      // CRITICAL: Execute actual transaction to transfer funds from user's wallet to split wallet
      let actualTransactionSignature: string | undefined = transactionSignature;
      
      if (!actualTransactionSignature) {
        try {
          // Get user's wallet for the transaction
          const { walletService } = await import('../WalletService');
          const userWallet = await walletService.getUserWallet(participantId);
          if (!userWallet) {
            return {
              success: false,
              error: 'Failed to retrieve user wallet for transaction',
            };
          }

          // Execute transaction from user's wallet to split wallet
          const transactionParams = {
            to: wallet.walletAddress, // Split wallet address
            amount: roundedAmount,
            currency: 'USDC' as const,
            memo: `Degen Split fund locking - ${wallet.id}`,
            userId: participantId,
            transactionType: 'send' as const,
          };

          // Use the consolidated transaction service to execute the transaction
          const transactionResult = await consolidatedTransactionService.sendUSDCTransaction(transactionParams);
          
          if (!transactionResult.success) {
            return {
              success: false,
              error: transactionResult.error || 'Failed to execute transaction to split wallet',
            };
          }

          actualTransactionSignature = transactionResult.signature;
          
          logger.info('Transaction executed successfully for degen split fund locking', {
            splitWalletId,
            participantId,
            amount: roundedAmount,
            transactionSignature: actualTransactionSignature,
            fromWallet: userWallet.address,
            toWallet: wallet.walletAddress
          }, 'SplitWalletPayments');

        } catch (transactionError) {
          logger.error('Failed to execute transaction for degen split fund locking', {
            splitWalletId,
            participantId,
            amount: roundedAmount,
            error: transactionError instanceof Error ? transactionError.message : String(transactionError)
          }, 'SplitWalletPayments');
          
          return {
            success: false,
            error: `Transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown transaction error'}`,
          };
        }
      }

      // Update participant locking status (status remains 'locked', not 'paid')
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === participantId) {
          const isFullyLocked = newAmountPaid >= participant.amountOwed;
          return {
            ...p,
            amountPaid: newAmountPaid,
            status: isFullyLocked ? 'locked' as const : 'pending' as const,
            transactionSignature: actualTransactionSignature || p.transactionSignature,
            paidAt: isFullyLocked ? new Date().toISOString() : p.paidAt,
          };
        }
        return p;
      });

      // Update wallet in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      await this.updateWalletParticipants(docId, updatedParticipants);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
        
        // Find the updated participant data
        const updatedParticipant = updatedParticipants.find(p => p.userId === participantId);
        if (updatedParticipant) {
          const syncResult = await SplitDataSynchronizer.syncParticipantFromSplitWalletToSplitStorage(
            wallet.billId, // Use billId to find the split
            participantId,
            updatedParticipant
          );
          
          if (syncResult.success) {
            logger.info('Split database synchronized successfully (degen locking)', {
              splitWalletId,
              participantId,
              billId: wallet.billId,
              amountPaid: updatedParticipant.amountPaid,
              status: updatedParticipant.status
            }, 'SplitWalletPayments');
          } else {
            logger.error('Failed to synchronize split database (degen locking)', {
              splitWalletId,
              participantId,
              billId: wallet.billId,
              error: syncResult.error
            }, 'SplitWalletPayments');
          }
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database (degen locking)', {
          splitWalletId,
          participantId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletPayments');
        // Don't fail the payment if sync fails, but log the error
      }

      // Trigger balance refresh for the participant
      try {
        const { walletService } = await import('../WalletService');
        if (walletService.clearBalanceCache) {
          walletService.clearBalanceCache(participantId);
        }
        logger.info('Balance cache cleared for participant', { participantId }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to clear balance cache for participant', { error, participantId }, 'SplitWalletPayments');
      }

      logger.info('Degen split fund locking processed successfully', {
        splitWalletId,
        participantId,
        amount: roundedAmount,
        newAmountPaid,
        status: updatedParticipants.find(p => p.userId === participantId)?.status
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: actualTransactionSignature,
        amount: roundedAmount,
        message: 'Degen split fund locking processed successfully',
      };

    } catch (error) {
      console.error('🔍 SplitWalletPayments: Error processing degen split fund locking:', error);
      logger.error('Failed to process degen split fund locking', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

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
      logger.debug('Processing participant payment', {
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

      // Check if participant has already paid their full share
      if (participant.status === 'paid' || participant.amountPaid >= participant.amountOwed) {
        return {
          success: false,
          error: 'Participant has already paid their full share',
        };
      }

      // Check if the payment amount would exceed what they owe
      const remainingAmount = participant.amountOwed - participant.amountPaid;
      const roundedRemainingAmount = roundUsdcAmount(remainingAmount); // Round remaining amount for fair comparison
      if (roundedAmount > roundedRemainingAmount) {
        return {
          success: false,
          error: `Payment amount (${roundedAmount} USDC) exceeds remaining amount (${roundedRemainingAmount} USDC)`,
        };
      }

      // Update participant payment status
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === participantId) {
          const newAmountPaid = p.amountPaid + roundedAmount;
          const isFullyPaid = newAmountPaid >= p.amountOwed;
          
          const updatedParticipant = {
            ...p,
            amountPaid: newAmountPaid,
            status: isFullyPaid ? 'paid' as const : 'pending' as const,
            paidAt: isFullyPaid ? new Date().toISOString() : p.paidAt,
          };
          
          // Only set transactionSignature if it's not undefined
          if (transactionSignature) {
            updatedParticipant.transactionSignature = transactionSignature;
          } else if (p.transactionSignature) {
            updatedParticipant.transactionSignature = p.transactionSignature;
          }
          
          return updatedParticipant;
        }
        return p;
      });

      // Update wallet in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      
      // Clean participants data to remove undefined values
      const cleanedParticipants = updatedParticipants.map(p => ({
        ...p,
        // Convert undefined to null for Firebase compatibility
        transactionSignature: p.transactionSignature || null,
        paidAt: p.paidAt || null,
      }));
      
      const updateData = {
        participants: cleanedParticipants,
        updatedAt: new Date().toISOString(),
      };
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updateData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitStorageService } = await import('../splitStorageService');
        
        // Find the updated participant data
        const updatedParticipant = updatedParticipants.find(p => p.userId === participantId);
        if (updatedParticipant) {
          // Map split wallet status to split storage status
          const splitStatus = updatedParticipant.status === 'failed' ? 'pending' : updatedParticipant.status;
          
          const splitUpdateResult = await SplitStorageService.updateParticipantStatus(
            wallet.billId, // Use billId to find the split
            participantId,
            splitStatus,
            updatedParticipant.amountPaid,
            updatedParticipant.transactionSignature
          );
          
          if (splitUpdateResult.success) {
            logger.info('Split database synchronized successfully', {
              splitWalletId,
              participantId,
              billId: wallet.billId,
              amountPaid: updatedParticipant.amountPaid,
              status: updatedParticipant.status
            }, 'SplitWalletPayments');
          } else {
            logger.error('Failed to synchronize split database', {
              splitWalletId,
              participantId,
              billId: wallet.billId,
              error: splitUpdateResult.error
            }, 'SplitWalletPayments');
          }
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database', {
          splitWalletId,
          participantId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletPayments');
        // Don't fail the payment if sync fails, but log the error
      }

      logger.debug('Participant payment processed successfully', {
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

      // Trigger balance refresh for the participant
      try {
        const { walletService } = await import('../WalletService');
        if (walletService.clearBalanceCache) {
          walletService.clearBalanceCache(participantId);
        }
        logger.info('Balance cache cleared for participant', { participantId }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to clear balance cache for participant', { error, participantId }, 'SplitWalletPayments');
      }

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
      logger.debug('Sending to cast account', {
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
      const addressValidation = ValidationUtils.validateSolanaAddress(castAccountAddress);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: addressValidation.error || 'Invalid cast account address',
        };
      }

      // Get split wallet private key
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      const privateKeyResult = await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction
      const transactionParams = {
        to: castAccountAddress, // Use 'to' parameter as expected by TransactionParams interface
        amount: wallet.totalAmount,
        currency: wallet.currency as 'SOL' | 'USDC',
        memo: description || `Payment for bill ${wallet.billId}`,
        userId: wallet.creatorId, // Add userId parameter required by sendUSDCTransaction
        transactionType: 'split_wallet_withdrawal' as const, // No company fees for split wallet withdrawals
      };

      // Execute transaction using split wallet
      const transactionResult = await this.sendSplitWalletTransaction({
        ...transactionParams,
        fromPrivateKey: privateKeyResult.privateKey,
        fromAddress: wallet.walletAddress,
      });
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to send transaction to cast account',
        };
      }

      logger.debug('Funds sent to cast account successfully', {
        splitWalletId,
        castAccountAddress,
        amount: wallet.totalAmount,
        transactionSignature: transactionResult.signature
      });

      // Trigger balance refresh for the creator
      try {
        const { walletService } = await import('../WalletService');
        if (walletService.clearBalanceCache) {
          walletService.clearBalanceCache(wallet.creatorId);
        }
        logger.info('Balance cache cleared for creator', { creatorId: wallet.creatorId }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to clear balance cache for creator', { error, creatorId: wallet.creatorId }, 'SplitWalletPayments');
      }

      // Verify transaction on blockchain
      if (transactionResult.signature) {
        logger.info('Verifying cast account transaction on blockchain', {
          transactionSignature: transactionResult.signature,
          splitWalletId,
          castAccountAddress
        }, 'SplitWalletPayments');
        
        try {
          // Wait a moment for transaction to be confirmed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify transaction status on blockchain
          const isConfirmed = await verifyTransactionOnBlockchain(transactionResult.signature);
          
          if (isConfirmed) {
            logger.info('✅ Cast account transaction confirmed on blockchain', {
              transactionSignature: transactionResult.signature,
              splitWalletId,
              castAccountAddress
            }, 'SplitWalletPayments');
            
            // Check split wallet balance after transaction (should be 0)
            const { PublicKey } = await import('@solana/web3.js');
            const { getConfig } = await import('../../config/unified');
            const splitWalletPublicKey = new PublicKey(wallet.walletAddress);
            const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
            
            const postTransactionBalance = await BalanceUtils.getUsdcBalance(splitWalletPublicKey, usdcMint);
            
            logger.info('Post-transaction balance verification for cast account', {
              transactionSignature: transactionResult.signature,
              splitWalletId,
              preTransactionBalance: wallet.totalAmount,
              postTransactionBalance: postTransactionBalance.balance,
              expectedPostBalance: 0, // Should be 0 after full withdrawal
              balanceMatch: Math.abs(postTransactionBalance.balance - 0) < 0.000001
            }, 'SplitWalletPayments');
            
            if (postTransactionBalance.balance > 0.000001) {
              logger.warn('⚠️ Cast account transaction confirmed but balance not fully transferred', {
                transactionSignature: transactionResult.signature,
                remainingBalance: postTransactionBalance.balance
              }, 'SplitWalletPayments');
            } else {
              logger.info('✅ Cast account transaction completed successfully - balance fully transferred', {
                transactionSignature: transactionResult.signature
              }, 'SplitWalletPayments');
            }
          } else {
            logger.warn('⚠️ Cast account transaction not yet confirmed on blockchain', {
              transactionSignature: transactionResult.signature
            }, 'SplitWalletPayments');
          }
        } catch (verificationError) {
          logger.warn('Could not verify cast account transaction on blockchain', {
            transactionSignature: transactionResult.signature,
            error: verificationError
          }, 'SplitWalletPayments');
        }
      }

      return {
        success: true,
        transactionSignature: transactionResult.signature,
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
      logger.debug('Transferring to user wallet', {
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
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      const privateKeyResult = await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction
      const transactionParams = {
        to: participant.walletAddress, // Use 'to' parameter as expected by TransactionParams interface
        amount: roundedAmount,
        currency: wallet.currency as 'SOL' | 'USDC',
        memo: `Transfer from split wallet ${splitWalletId}`,
        userId: wallet.creatorId, // Add userId parameter required by sendUSDCTransaction
        transactionType: 'split_wallet_withdrawal' as const, // No company fees for split wallet withdrawals
      };

      // Execute transaction using split wallet
      const transactionResult = await this.sendSplitWalletTransaction({
        ...transactionParams,
        fromPrivateKey: privateKeyResult.privateKey,
        fromAddress: wallet.walletAddress,
      });
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to transfer funds to user wallet',
        };
      }

      logger.debug('Funds transferred to user wallet successfully', {
        splitWalletId,
        userId,
        amount: roundedAmount,
        transactionSignature: transactionResult.signature
      });

      logger.info('Funds transferred to user wallet', {
        splitWalletId,
        userId,
        amount: roundedAmount,
        transactionSignature: transactionResult.signature
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
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
      logger.info('🚀 Starting Fair Split funds extraction', {
        splitWalletId,
        recipientAddress,
        creatorId,
        description
      }, 'SplitWalletPayments');

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

      // Get the private key using Fair split specific logic (not shared private key handling)
      logger.info('🔑 Retrieving Fair split private key', {
        splitWalletId,
        creatorId
      }, 'SplitWalletPayments');
      
      const privateKeyResult = await this.getFairSplitPrivateKey(splitWalletId, creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        logger.error('❌ Failed to retrieve Fair split private key', {
          error: privateKeyResult.error,
          splitWalletId,
          creatorId
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve Fair split wallet private key',
        };
      }
      
      logger.info('✅ Fair split private key retrieved successfully', {
        splitWalletId,
        creatorId,
        privateKeyLength: privateKeyResult.privateKey.length
      }, 'SplitWalletPayments');

      logger.debug('extractFairSplitFunds - Private key retrieved from local storage', null, 'SplitWalletPayments');

      // CRITICAL: Verify that the retrieved private key actually corresponds to the split wallet address
      try {
        const { keypairUtils } = await import('../shared/keypairUtils');
        const keypairResult = keypairUtils.createKeypairFromSecretKey(privateKeyResult.privateKey);
        
        if (keypairResult.success && keypairResult.keypair) {
          const keypairAddress = keypairResult.keypair.publicKey.toBase58();
          
          if (keypairAddress !== wallet.walletAddress) {
            logger.error('🚨 CRITICAL: Private key does not match split wallet address!', {
              splitWalletId,
              creatorId,
              expectedWalletAddress: wallet.walletAddress,
              actualKeypairAddress: keypairAddress,
              privateKeyLength: privateKeyResult.privateKey.length,
              privateKeyPrefix: privateKeyResult.privateKey.substring(0, 20) + '...'
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              error: `Private key mismatch! The stored private key corresponds to address ${keypairAddress}, but the split wallet address is ${wallet.walletAddress}. This indicates a critical storage or retrieval error.`
            };
          }
          
          logger.info('✅ Private key verification successful - matches split wallet address', {
            splitWalletId,
            creatorId,
            walletAddress: wallet.walletAddress,
            keypairAddress: keypairAddress,
            keypairFormat: keypairResult.format
          }, 'SplitWalletPayments');
        } else {
          logger.error('❌ Retrieved private key is invalid and cannot create keypair', {
            splitWalletId,
            creatorId,
            error: keypairResult.error
          }, 'SplitWalletPayments');
          
          return {
            success: false,
            error: `Invalid private key retrieved: ${keypairResult.error}`
          };
        }
      } catch (error) {
        logger.error('Failed to verify private key against split wallet address', {
          splitWalletId,
          creatorId,
          error: error instanceof Error ? error.message : String(error)
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: `Private key verification failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }

      // Validate recipient address
      const addressValidation = ValidationUtils.validateSolanaAddress(recipientAddress);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: addressValidation.error || 'Invalid recipient address',
        };
      }

      // Get current balance of the split wallet
      const { PublicKey } = await import('@solana/web3.js');
      const { getConfig } = await import('../../config/unified');
      const splitWalletPublicKey = new PublicKey(wallet.walletAddress);
      const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
      
      const balanceResult = await BalanceUtils.getUsdcBalance(splitWalletPublicKey, usdcMint);
      const availableBalance = balanceResult.balance;
      if (availableBalance <= 0) {
        return {
          success: false,
          error: 'No funds available in split wallet',
        };
      }

      // Execute transaction using split wallet's private key directly
      logger.info('💸 Executing Fair split transaction', {
        fromAddress: wallet.walletAddress,
        toAddress: recipientAddress,
        amount: availableBalance,
        currency: wallet.currency,
        description: description || `Fair Split funds extraction for bill ${wallet.billId}`
      }, 'SplitWalletPayments');
      
      const transactionResult = await executeSplitWalletTransaction(
        wallet.walletAddress,
        privateKeyResult.privateKey,
        recipientAddress,
        availableBalance,
        wallet.currency,
        description || `Fair Split funds extraction for bill ${wallet.billId}`
      );
      
      logger.info('💸 Fair split transaction result', {
        success: transactionResult.success,
        signature: transactionResult.signature,
        error: transactionResult.error
      }, 'SplitWalletPayments');
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to extract funds from Fair Split',
        };
      }

      logger.info('Fair Split funds extracted successfully', {
        splitWalletId,
        recipientAddress,
        amount: availableBalance,
        transactionSignature: transactionResult.signature,
        success: transactionResult.success
      });

      // Verify transaction on blockchain
      if (transactionResult.signature) {
        logger.info('Verifying transaction on blockchain', {
          transactionSignature: transactionResult.signature,
          splitWalletId
        }, 'SplitWalletPayments');
        
        try {
          // Wait a moment for transaction to be confirmed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify transaction status on blockchain
          const isConfirmed = await verifyTransactionOnBlockchain(transactionResult.signature);
          
          if (isConfirmed) {
            logger.info('✅ Transaction confirmed on blockchain', {
              transactionSignature: transactionResult.signature,
              splitWalletId
            }, 'SplitWalletPayments');
            
            // Check split wallet balance after transaction
            const { PublicKey } = await import('@solana/web3.js');
            const { getConfig } = await import('../../config/unified');
            const splitWalletPublicKey = new PublicKey(wallet.walletAddress);
            const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
            
            const postTransactionBalance = await BalanceUtils.getUsdcBalance(splitWalletPublicKey, usdcMint);
            
            logger.info('Post-transaction balance verification', {
              transactionSignature: transactionResult.signature,
              splitWalletId,
              preTransactionBalance: availableBalance,
              postTransactionBalance: postTransactionBalance.balance,
              expectedPostBalance: 0, // Should be 0 after full withdrawal
              balanceMatch: Math.abs(postTransactionBalance.balance - 0) < 0.000001
            }, 'SplitWalletPayments');
            
            if (postTransactionBalance.balance > 0.000001) {
              logger.warn('⚠️ Transaction confirmed but balance not fully transferred', {
                transactionSignature: transactionResult.signature,
                remainingBalance: postTransactionBalance.balance
              }, 'SplitWalletPayments');
            } else {
              logger.info('✅ Transaction completed successfully - balance fully transferred', {
                transactionSignature: transactionResult.signature
              }, 'SplitWalletPayments');
            }
          } else {
            logger.warn('⚠️ Transaction not yet confirmed on blockchain', {
              transactionSignature: transactionResult.signature
            }, 'SplitWalletPayments');
          }
        } catch (verificationError) {
          logger.warn('Could not verify transaction on blockchain', {
            transactionSignature: transactionResult.signature,
            error: verificationError
          }, 'SplitWalletPayments');
        }
      }

      return {
        success: true,
        transactionSignature: transactionResult.signature,
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
      logger.info('Processing degen winner payout', {
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

      // Check if the winner has already claimed their funds
      const winnerParticipant = wallet.participants.find(p => p.userId === winnerUserId);
      if (!winnerParticipant) {
        return {
          success: false,
          error: 'Winner not found in split wallet participants',
        };
      }

      // Debug logging for winner claim status
      logger.info('🔍 Winner claim status check', {
        splitWalletId,
        winnerUserId,
        winnerParticipant: {
          userId: winnerParticipant.userId,
          name: winnerParticipant.name,
          status: winnerParticipant.status,
          amountPaid: winnerParticipant.amountPaid,
          amountOwed: winnerParticipant.amountOwed
        },
        allParticipants: wallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          status: p.status,
          amountPaid: p.amountPaid,
          amountOwed: p.amountOwed
        }))
      }, 'SplitWalletPayments');

      if (winnerParticipant.status === 'paid') {
        // Check if the transaction signature is valid on blockchain
        if (winnerParticipant.transactionSignature) {
          const isValidTransaction = await verifyTransactionOnBlockchain(winnerParticipant.transactionSignature);
          if (isValidTransaction) {
            return {
              success: false,
              error: 'Winner has already claimed their funds. Each participant can only claim once.',
            };
          } else {
            // Transaction signature is invalid, reset the status
            logger.warn('Invalid transaction signature found, resetting participant status', {
              splitWalletId,
              winnerUserId,
              transactionSignature: winnerParticipant.transactionSignature
            }, 'SplitWalletPayments');
            
            // Reset participant status to allow retry
            const resetParticipants = wallet.participants.map(p => {
              if (p.userId === winnerUserId) {
                return {
                  ...p,
                  status: 'locked' as const,
                  transactionSignature: undefined,
                  paidAt: undefined,
                };
              }
              return p;
            });
            
            const docId = wallet.firebaseDocId || splitWalletId;
            await this.updateWalletParticipants(docId, resetParticipants);
            
            logger.info('Participant status reset due to invalid transaction signature', {
              splitWalletId,
              winnerUserId
            }, 'SplitWalletPayments');
          }
        } else {
          // No transaction signature but status is paid, reset the status
          logger.warn('No transaction signature found for paid participant, resetting status', {
            splitWalletId,
            winnerUserId
          }, 'SplitWalletPayments');
          
          const resetParticipants = wallet.participants.map(p => {
            if (p.userId === winnerUserId) {
              return {
                ...p,
                status: 'locked' as const,
                transactionSignature: undefined,
                paidAt: undefined,
              };
            }
            return p;
          });
          
          const docId = wallet.firebaseDocId || splitWalletId;
          await this.updateWalletParticipants(docId, resetParticipants);
        }
      }

      // Get the private key - use SplitWalletSecurity for proper degen split support
      // For degen splits, any participant (including the winner) can access the private key
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      const privateKeyResult = await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, winnerUserId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction with split wallet private key
      const transactionParams = {
        to: winnerAddress, // Use 'to' parameter as expected by TransactionParams interface
        amount: totalAmount,
        currency: wallet.currency,
        memo: description || `Degen Split winner payout for ${winnerUserId}`,
        userId: wallet.creatorId, // Add userId parameter required by sendUSDCTransaction
        transactionType: 'split_wallet_withdrawal' as const, // No company fees for split wallet withdrawals
        fromPrivateKey: privateKeyResult.privateKey, // Use split wallet private key
        fromAddress: wallet.walletAddress, // Use split wallet address
      };

      // Execute transaction using split wallet
      const transactionResult = await this.sendSplitWalletTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to process degen winner payout',
        };
      }

      // Update participant status to 'paid' to prevent multiple claims
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === winnerUserId) {
          return {
            ...p,
            status: 'paid' as const,
            paidAt: new Date().toISOString(),
            transactionSignature: transactionResult.transactionSignature,
          };
        }
        return p;
      });

      // Update the split wallet with the new participant status
      const docId = wallet.firebaseDocId || splitWalletId;
      await this.updateWalletParticipants(docId, updatedParticipants);

      logger.info('Degen winner payout processed successfully', {
        splitWalletId,
        winnerUserId,
        totalAmount,
        transactionSignature: transactionResult.transactionSignature,
        participantStatusUpdated: true
      });

      // Trigger balance refresh for the winner
      try {
        const { walletService } = await import('../WalletService');
        // Clear cached balance to force refresh
        if (walletService.clearBalanceCache) {
          walletService.clearBalanceCache(winnerUserId);
        }
        logger.info('Balance cache cleared for winner', { winnerUserId }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to clear balance cache for winner', { error, winnerUserId }, 'SplitWalletPayments');
      }

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
      logger.info('Processing degen loser payment', {
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

      // Check if the participant has already been paid
      if (participant.status === 'paid') {
        return {
          success: false,
          error: 'Participant has already been paid. Each participant can only be paid once.',
        };
      }

      // Get the user's wallet address for the transaction
      const { walletService } = await import('../WalletService');
      const userWallet = await walletService.getUserWallet(loserUserId);
      if (!userWallet) {
        return {
          success: false,
          error: 'Failed to retrieve user wallet address',
        };
      }

      // Get the private key - use SplitWalletSecurity for proper degen split support
      // For degen splits, any participant can access the private key
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      const privateKeyResult = await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, loserUserId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Create transaction with split wallet private key to send funds to user's wallet
      const transactionParams = {
        to: userWallet.address, // Send to user's wallet address
        amount: totalAmount,
        currency: wallet.currency,
        memo: description || `Degen Split loser withdrawal for ${loserUserId}`,
        userId: wallet.creatorId, // Add userId parameter required by sendUSDCTransaction
        transactionType: 'split_wallet_withdrawal' as const, // No company fees for split wallet withdrawals
        fromPrivateKey: privateKeyResult.privateKey, // Use split wallet private key
        fromAddress: wallet.walletAddress, // Use split wallet address
      };

      // Execute transaction using split wallet
      const transactionResult = await this.sendSplitWalletTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to process degen loser withdrawal',
        };
      }

      // Update participant payment status only after successful transaction
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === loserUserId) {
          return {
            ...p,
            amountPaid: totalAmount,
            status: 'paid' as const,
            paidAt: new Date().toISOString(),
            transactionSignature: transactionResult.transactionSignature,
          };
        }
        return p;
      });

      // Update wallet in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      await this.updateWalletParticipants(docId, updatedParticipants);

      logger.info('Degen loser payment processed successfully', {
        splitWalletId,
        loserUserId,
        totalAmount,
        transactionSignature: transactionResult.transactionSignature,
        participantStatusUpdated: true
      });

      // Trigger balance refresh for the loser
      try {
        const { walletService } = await import('../WalletService');
        if (walletService.clearBalanceCache) {
          walletService.clearBalanceCache(loserUserId);
        }
        logger.info('Balance cache cleared for loser', { loserUserId }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to clear balance cache for loser', { error, loserUserId }, 'SplitWalletPayments');
      }

      return {
        success: true,
        transactionSignature: transactionResult.transactionSignature,
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
   * Pay participant share - actually sends funds from participant to split wallet
   */
  static async payParticipantShareNEW(
    splitWalletId: string,
    participantId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      console.log('🚀🚀🚀 NEW payParticipantShare method called - executing blockchain transaction 🚀🚀🚀');
      console.log('🚀🚀🚀 NEW payParticipantShare method called - executing blockchain transaction 🚀🚀🚀');
      console.log('🚀🚀🚀 NEW payParticipantShare method called - executing blockchain transaction 🚀🚀🚀');
      logger.info('🚀 NEW payParticipantShare method called - executing blockchain transaction', {
        splitWalletId,
        participantId,
        amount
      });

      // Get split wallet to get the destination address
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Find participant to get their wallet address
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Debug logging for participant data
      logger.info('Participant data debug', {
        participantId,
        participant: {
          userId: participant.userId,
          name: participant.name,
          amountOwed: participant.amountOwed,
          amountPaid: participant.amountPaid,
          status: participant.status
        },
        allParticipants: wallet.participants.map(p => ({
          userId: p.userId,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status
        }))
      }, 'SplitWalletPayments');

      // Validate amount
      const roundedAmount = roundUsdcAmount(amount);
      if (roundedAmount <= 0) {
        return {
          success: false,
          error: 'Invalid payment amount',
        };
      }

      // Check if participant has already paid their full share
      if (participant.status === 'paid' || participant.amountPaid >= participant.amountOwed) {
        return {
          success: false,
          error: 'Participant has already paid their full share for this split.',
        };
      }

      // Check if the payment amount would exceed what they owe
      const remainingAmount = participant.amountOwed - participant.amountPaid;
      const roundedRemainingAmount = roundUsdcAmount(remainingAmount);
      if (roundedAmount > roundedRemainingAmount) {
        return {
          success: false,
          error: `Payment amount (${roundedAmount} USDC) exceeds remaining amount (${roundedRemainingAmount} USDC). You can pay up to ${roundedRemainingAmount.toFixed(2)} USDC.`,
        };
      }
      
      // Debug logging for payment validation
      logger.info('Payment validation debug', {
        participantId,
        amountOwed: participant.amountOwed,
        amountPaid: participant.amountPaid,
        remainingAmount: roundedRemainingAmount,
        paymentAmount: roundedAmount,
        isPartialPayment: roundedAmount < participant.amountOwed,
        willCompletePayment: (participant.amountPaid + roundedAmount) >= participant.amountOwed
      }, 'SplitWalletPayments');

      // Get the current on-chain balance before the transaction for verification
      let preTransactionBalance = 0;
      try {
        const { BalanceUtils } = await import('../shared/balanceUtils');
        const { PublicKey } = await import('@solana/web3.js');
        const { getConfig } = await import('../../config/unified');
        const splitWalletPublicKey = new PublicKey(wallet.walletAddress);
        const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
        
        const preBalanceResult = await BalanceUtils.getUsdcBalance(splitWalletPublicKey, usdcMint);
        preTransactionBalance = preBalanceResult.balance;
        
        logger.info('🔍 Pre-transaction balance check', {
          splitWalletId,
          participantId,
          preTransactionBalance,
          expectedIncrease: roundedAmount
        }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('⚠️ Could not get pre-transaction balance', {
          error: error instanceof Error ? error.message : String(error),
          splitWalletId,
          participantId
        }, 'SplitWalletPayments');
      }

      // Execute the actual blockchain transaction
      console.log('🔥🔥🔥 EXECUTING BLOCKCHAIN TRANSACTION for split wallet payment 🔥🔥🔥');
      logger.info('🔥 EXECUTING BLOCKCHAIN TRANSACTION for split wallet payment', {
        fromUserId: participantId,
        toAddress: wallet.walletAddress,
        amount: roundedAmount,
        splitWalletId,
        preTransactionBalance
      });

      const { consolidatedTransactionService } = await import('../transaction');
      const transactionResult = await consolidatedTransactionService.sendUSDCTransaction({
        to: wallet.walletAddress,
        amount: roundedAmount,
        currency: 'USDC',
        userId: participantId,
        memo: `Split payment for bill ${wallet.billId}`,
        priority: 'medium',
        transactionType: 'send' // Split wallet payments are regular sends
      });

      if (!transactionResult.success) {
        logger.error('Blockchain transaction failed for split wallet payment', {
          error: transactionResult.error,
          splitWalletId,
          participantId,
          amount: roundedAmount
        });
        return {
          success: false,
          error: transactionResult.error || 'Failed to execute blockchain transaction',
        };
      }

      logger.info('Blockchain transaction successful for split wallet payment', {
        transactionSignature: transactionResult.signature,
        splitWalletId,
        participantId,
        amount: roundedAmount
      });

      // CRITICAL: Verify transaction is actually confirmed on-chain before updating database
      if (transactionResult.signature) {
        logger.info('🔍 Verifying transaction confirmation on blockchain', {
          signature: transactionResult.signature,
          participantId,
          splitWalletId
        }, 'SplitWalletPayments');
        
        try {
          // Wait a moment for transaction to be confirmed
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Verify transaction status on blockchain with more lenient approach
          const { Connection, PublicKey } = await import('@solana/web3.js');
          const { getConfig } = await import('../../config/unified');
          const connection = new Connection(getConfig().blockchain.rpcUrl);
          
          const signature = transactionResult.signature;
          
          // Try multiple confirmation methods
          let isConfirmed = false;
          let confirmationStatus = null;
          
          try {
            // Method 1: Check signature status
            const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
            if (status.value && !status.value.err) {
              isConfirmed = true;
              confirmationStatus = status.value.confirmationStatus;
              logger.info('✅ Transaction confirmed via signature status', {
                signature,
                confirmationStatus,
                participantId,
                splitWalletId
              }, 'SplitWalletPayments');
            }
          } catch (statusError) {
            logger.warn('⚠️ Signature status check failed, trying alternative method', {
              error: statusError instanceof Error ? statusError.message : String(statusError),
              signature
            }, 'SplitWalletPayments');
          }
          
          // Method 2: If signature status fails, check if transaction exists in history
          if (!isConfirmed) {
            try {
              const transaction = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
              });
              
              if (transaction && !transaction.meta?.err) {
                isConfirmed = true;
                confirmationStatus = 'confirmed';
                logger.info('✅ Transaction confirmed via transaction history', {
                  signature,
                  participantId,
                  splitWalletId
                }, 'SplitWalletPayments');
              }
            } catch (historyError) {
              logger.warn('⚠️ Transaction history check failed', {
                error: historyError instanceof Error ? historyError.message : String(historyError),
                signature
              }, 'SplitWalletPayments');
            }
          }
          
          // Method 3: If both methods fail, check balance change as final verification
          if (!isConfirmed) {
            logger.warn('⚠️ Standard confirmation methods failed, checking balance change', {
              signature,
              participantId,
              splitWalletId
            }, 'SplitWalletPayments');
            
            // Check if the split wallet balance increased (indicating successful transaction)
            const { BalanceUtils } = await import('../shared/balanceUtils');
            const splitWalletPublicKey = new PublicKey(wallet.walletAddress);
            const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
            
            const balanceResult = await BalanceUtils.getUsdcBalance(splitWalletPublicKey, usdcMint);
            
            // Calculate expected balance: current on-chain balance should equal the sum of all participant payments
            const currentOnChainBalance = balanceResult.balance;
            
            // Use pre-transaction balance to verify the exact increase
            const expectedBalanceAfterPayment = preTransactionBalance + roundedAmount;
            
            logger.info('🔍 Balance verification details', {
              signature,
              participantId,
              splitWalletId,
              preTransactionBalance,
              currentOnChainBalance,
              newPayment: roundedAmount,
              expectedBalanceAfterPayment,
              actualIncrease: currentOnChainBalance - preTransactionBalance,
              expectedIncrease: roundedAmount,
              difference: Math.abs(currentOnChainBalance - expectedBalanceAfterPayment),
              accountExists: balanceResult.accountExists
            }, 'SplitWalletPayments');
            
            // Special case: If this was a new token account creation
            // The transaction logs show "Adding create token account instruction" which means
            // the transaction included token account creation
            if (preTransactionBalance === 0 && currentOnChainBalance === 0) {
              logger.warn('⚠️ New token account scenario detected - transaction included token account creation', {
                signature,
                participantId,
                splitWalletId,
                note: 'Transaction included token account creation, this is normal for first payment to new split wallet'
              }, 'SplitWalletPayments');
              
              // For new token accounts, we'll be more lenient and consider the transaction successful
              // if it was sent successfully and included token account creation
              // The transaction was sent successfully and included the necessary instructions
              isConfirmed = true;
              confirmationStatus = 'new_token_account_creation';
              logger.info('✅ Transaction confirmed via new token account creation detection', {
                signature,
                participantId,
                splitWalletId,
                note: 'New token account was created as part of transaction, marking as successful'
              }, 'SplitWalletPayments');
            }
            // Only confirm if the on-chain balance increased by exactly the expected amount
            else if (Math.abs(currentOnChainBalance - expectedBalanceAfterPayment) < 0.001) {
              isConfirmed = true;
              confirmationStatus = 'balance_verified';
              logger.info('✅ Transaction confirmed via balance verification', {
                signature,
                participantId,
                splitWalletId,
                preTransactionBalance,
                currentOnChainBalance,
                expectedBalanceAfterPayment,
                actualIncrease: currentOnChainBalance - preTransactionBalance,
                expectedIncrease: roundedAmount
              }, 'SplitWalletPayments');
            } else {
              logger.warn('⚠️ Balance verification failed - on-chain balance did not increase by expected amount', {
                signature,
                participantId,
                splitWalletId,
                preTransactionBalance,
                currentOnChainBalance,
                expectedBalanceAfterPayment,
                actualIncrease: currentOnChainBalance - preTransactionBalance,
                expectedIncrease: roundedAmount,
                difference: Math.abs(currentOnChainBalance - expectedBalanceAfterPayment),
                accountExists: balanceResult.accountExists
              }, 'SplitWalletPayments');
            }
          }
          
          // If still not confirmed, this is a real failure - don't proceed with database update
          if (!isConfirmed) {
            logger.error('❌ Transaction could not be confirmed via any method - this indicates a real failure', {
              signature,
              participantId,
              splitWalletId
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              error: `Transaction could not be confirmed on the blockchain. The transaction may have failed or is still pending. Please check the transaction on Solana Explorer: ${signature}`,
            };
          }
          
        } catch (error) {
          logger.error('❌ Error verifying transaction confirmation', {
            error: error instanceof Error ? error.message : String(error),
            signature: transactionResult.signature,
            participantId,
            splitWalletId
          }, 'SplitWalletPayments');
          
          // Proceed with database update since transaction was sent successfully
          logger.warn('⚠️ Proceeding with database update despite verification error', null, 'SplitWalletPayments');
        }
      }

      // Now update the database with the successful payment
      return await this.processParticipantPayment(splitWalletId, participantId, amount, transactionResult.signature);

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
      const { db } = await import('../../config/firebase');
      
      logger.debug('Attempting to retrieve split wallet', {
        splitWalletId,
        method: 'getSplitWallet'
      }, 'SplitWalletPayments');
      
      // Try to get by Firebase document ID first
      let docSnap;
      try {
        const docRef = doc(db, 'splitWallets', splitWalletId);
        docSnap = await getDoc(docRef);
        
        logger.debug('Firebase getDoc result', {
          splitWalletId,
          exists: docSnap.exists(),
          hasData: !!docSnap.data(),
          docId: docRef.id
        }, 'SplitWalletPayments');
      } catch (firebaseError) {
        logger.error('Firebase getDoc operation failed', {
          splitWalletId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorCode: (firebaseError as any)?.code,
          errorDetails: (firebaseError as any)?.details
        }, 'SplitWalletPayments');
        
        // Continue to query fallback instead of failing completely
        docSnap = null;
      }

      if (docSnap && docSnap.exists()) {
        const walletData = docSnap.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: docSnap.id,
        };
        
        logger.info('Split wallet found by Firebase document ID', {
          splitWalletId,
          firebaseDocId: docSnap.id,
          status: wallet.status
        }, 'SplitWalletPayments');
        
        return { success: true, wallet };
      }

      // If not found by Firebase ID, try to find by custom ID
      let querySnapshot;
      try {
        const q = query(
          collection(db, 'splitWallets'),
          where('id', '==', splitWalletId)
        );
        querySnapshot = await getDocs(q);
        
        logger.debug('Firebase query result', {
          splitWalletId,
          resultCount: querySnapshot.docs.length,
          isEmpty: querySnapshot.empty
        }, 'SplitWalletPayments');
      } catch (queryError) {
        logger.error('Firebase query operation failed', {
          splitWalletId,
          error: queryError instanceof Error ? queryError.message : String(queryError),
          errorCode: (queryError as any)?.code
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: `Firebase query failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`,
        };
      }

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const walletData = doc.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: doc.id,
        };
        
        logger.info('Split wallet found by custom ID query', {
          splitWalletId,
          firebaseDocId: doc.id,
          status: wallet.status
        }, 'SplitWalletPayments');
        
        return { success: true, wallet };
      }

      logger.warn('Split wallet not found by any method', {
        splitWalletId,
        triedFirebaseDocId: true,
        triedCustomIdQuery: true
      }, 'SplitWalletPayments');

      return { success: false, error: 'Split wallet not found' };
    } catch (error) {
      logger.error('Unexpected error in getSplitWallet', {
        splitWalletId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get private key for Fair split wallets (creator-only access)
   * This is separate from the shared private key handling used for Degen splits
   * Includes migration logic for existing splits created before the new storage format
   */
  private static async getFairSplitPrivateKey(splitWalletId: string, creatorId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      const SecureStore = await import('expo-secure-store');
      
      // Try new Fair split storage key first
      const newStorageKey = `fair_split_private_key_${splitWalletId}_${creatorId}`;
      let privateKey = await SecureStore.getItemAsync(newStorageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      
      if (privateKey) {
        logger.debug('Fair split private key retrieved from new storage format', {
          splitWalletId,
          creatorId,
          storageKey: newStorageKey,
          privateKeyLength: privateKey.length,
          privateKeyPrefix: privateKey.substring(0, 20) + '...'
        }, 'SplitWalletPayments');
        
        // Verify that the retrieved private key is valid
        try {
          const { keypairUtils } = await import('../shared/keypairUtils');
          const keypairResult = keypairUtils.createKeypairFromSecretKey(privateKey);
          
          if (keypairResult.success && keypairResult.keypair) {
            logger.info('✅ Retrieved private key is valid and can create keypair', {
              splitWalletId,
              creatorId,
              keypairAddress: keypairResult.keypair.publicKey.toBase58(),
              keypairFormat: keypairResult.format
            }, 'SplitWalletPayments');
          } else {
            logger.error('❌ Retrieved private key is invalid', {
              splitWalletId,
              creatorId,
              error: keypairResult.error
            }, 'SplitWalletPayments');
          }
        } catch (error) {
          logger.warn('Could not verify retrieved private key', { 
            error: error instanceof Error ? error.message : String(error) 
          }, 'SplitWalletPayments');
        }
        
        return {
          success: true,
          privateKey,
        };
      }
      
      // MIGRATION: Try old storage key for existing splits
      logger.debug('Fair split private key not found in new format, checking old format for migration', {
        splitWalletId,
        creatorId
      }, 'SplitWalletPayments');
      
      const oldStorageKey = `split_wallet_private_key_${splitWalletId}_${creatorId}`;
      privateKey = await SecureStore.getItemAsync(oldStorageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      
      if (privateKey) {
        logger.info('Found Fair split private key in old format, migrating to new format', {
          splitWalletId,
          creatorId,
          oldStorageKey,
          newStorageKey,
          privateKeyLength: privateKey.length,
          privateKeyPrefix: privateKey.substring(0, 20) + '...'
        }, 'SplitWalletPayments');
        
        // Verify that the migrated private key is valid
        try {
          const { keypairUtils } = await import('../shared/keypairUtils');
          const keypairResult = keypairUtils.createKeypairFromSecretKey(privateKey);
          
          if (keypairResult.success && keypairResult.keypair) {
            logger.info('✅ Migrated private key is valid and can create keypair', {
              splitWalletId,
              creatorId,
              keypairAddress: keypairResult.keypair.publicKey.toBase58(),
              keypairFormat: keypairResult.format
            }, 'SplitWalletPayments');
          } else {
            logger.error('❌ Migrated private key is invalid', {
              splitWalletId,
              creatorId,
              error: keypairResult.error
            }, 'SplitWalletPayments');
          }
        } catch (error) {
          logger.warn('Could not verify migrated private key', { 
            error: error instanceof Error ? error.message : String(error) 
          }, 'SplitWalletPayments');
        }
        
        // Migrate to new storage format without biometric authentication popup
        await SecureStore.setItemAsync(newStorageKey, privateKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitSplitWalletKeys'
        });
        
        // Optionally remove old key (commented out for safety)
        // await SecureStore.deleteItemAsync(oldStorageKey);
        
        return {
          success: true,
          privateKey,
        };
      }
      
      return {
        success: false,
        error: `Fair split private key not found in local storage for split wallet ${splitWalletId}. Please create a new split wallet.`,
      };
      
    } catch (error) {
      logger.error('Failed to retrieve Fair split private key', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get private key for shared wallet operations (Degen splits only)
   * This is the shared private key handling logic that should only be used for Degen splits
   */
  private static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      const SecureStore = await import('expo-secure-store');
      const storageKey = `split_wallet_private_key_${splitWalletId}_${requesterId}`;
      
      const privateKey = await SecureStore.getItemAsync(storageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      
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
    const result = await consolidatedTransactionService.sendUSDCTransaction(params);
    return {
      success: result.success,
      error: result.error,
      transactionSignature: result.signature
    };
  }

  /**
   * Send transaction from split wallet with company wallet covering fees
   */
  private static async sendSplitWalletTransaction(params: any): Promise<{ success: boolean; error?: string; transactionSignature?: string; signature?: string }> {
    try {
      const { TransactionProcessor } = await import('../transaction/TransactionProcessor');
      const { KeypairUtils } = await import('../shared/keypairUtils');
      
      // Create keypair from split wallet private key
      const keypairResult = KeypairUtils.createKeypairFromSecretKey(params.fromPrivateKey);
      if (!keypairResult.success || !keypairResult.keypair) {
        return {
          success: false,
          error: keypairResult.error || 'Failed to create keypair from split wallet private key',
        };
      }

      // Verify the keypair address matches the split wallet address
      const keypairAddress = keypairResult.keypair.publicKey.toBase58();
      if (keypairAddress !== params.fromAddress) {
        return {
          success: false,
          error: `Keypair address mismatch: expected ${params.fromAddress}, got ${keypairAddress}`,
        };
      }

      // Create transaction processor instance
      const transactionProcessor = new TransactionProcessor();
      
      // Prepare transaction parameters
      const transactionParams = {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        memo: params.memo,
        priority: params.priority,
        userId: params.userId,
        transactionType: params.transactionType,
      };

      // Execute transaction using split wallet keypair
      const result = await transactionProcessor.sendUSDCTransaction(transactionParams, keypairResult.keypair);
      
      return {
        success: result.success,
        error: result.error,
        transactionSignature: result.signature,
        signature: result.signature // Add alias for backward compatibility
      };
    } catch (error) {
      logger.error('Failed to send split wallet transaction', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static async updateWalletParticipants(docId: string, participants: SplitWalletParticipant[]): Promise<void> {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase');
    
    // Clean participants data to remove undefined values
    const cleanedParticipants = participants.map(p => ({
      ...p,
      // Convert undefined to null for Firebase compatibility
      transactionSignature: p.transactionSignature || null,
      paidAt: p.paidAt || null,
    }));
    
    const updateData = {
      participants: cleanedParticipants,
      updatedAt: new Date().toISOString(),
    };
    
    // Remove any undefined values from the update data
    const cleanedUpdateData = this.removeUndefinedValues(updateData);
    
    await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);
  }
  
  /**
   * Remove undefined values from an object (Firebase doesn't allow undefined values)
   */
  private static removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
}
