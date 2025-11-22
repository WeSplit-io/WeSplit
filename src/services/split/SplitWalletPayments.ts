/**
 * Split Wallet Payments Service - CLEAN VERSION
 * Handles all payment operations for split wallets with clear separation between fair and degen splits
 * Part of the modularized SplitWalletService
 */

import { consolidatedTransactionService } from '../blockchain/transaction';
import { logger } from '../core';
import { FeeService } from '../../config/constants/feeConfig';
import { roundUsdcAmount } from '../../utils/ui/format';
import { doc, updateDoc, collection, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult, PaymentResult } from './types';
import { KeypairUtils } from '../shared/keypairUtils';
import { ValidationUtils } from '../shared/validationUtils';
import { BalanceUtils } from '../shared/balanceUtils';
import { USDC_CONFIG } from '../shared/walletConstants';
import { processUsdcTransfer } from '../blockchain/transaction/transactionSigningService';
import { VersionedTransaction } from '@solana/web3.js';
import { getFreshBlockhash, isBlockhashTooOld, BLOCKHASH_MAX_AGE_MS } from '../shared/blockhashUtils';
import { NetworkValidator } from '../blockchain/network/networkValidator';

// Helper function to verify transaction on blockchain
async function verifyTransactionOnBlockchain(transactionSignature: string): Promise<boolean> {
  try {
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    const connection = await optimizedTransactionUtils.getConnection();
    
    const transactionStatus = await connection.getSignatureStatus(transactionSignature, { 
      searchTransactionHistory: true 
    });
    
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

// Helper function to execute fair split transaction
async function executeFairSplitTransaction(
  fromAddress: string,
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  memo: string,
  transactionType: 'funding' | 'withdrawal'
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    logger.info('Executing fair split transaction', {
      fromAddress,
      toAddress,
      amount,
      currency,
      memo,
      transactionType
    }, 'SplitWalletPayments');

    // Import required modules using memory manager
    const { memoryManager } = await import('../shared/memoryManager');
    const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = await memoryManager.loadModule('solana-web3');
    const { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } = await memoryManager.loadModule('solana-spl-token');

    // Get connection with optimized RPC failover
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    const connection = await optimizedTransactionUtils.getConnection();

    // Create keypair from private key using KeypairUtils
    const { KeypairUtils } = await memoryManager.loadModule('keypair-utils');
    const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKey);
    if (!keypairResult.success || !keypairResult.keypair) {
      return {
        success: false,
        error: keypairResult.error || 'Failed to create keypair from private key'
      };
    }
    const keypair = keypairResult.keypair;
    
    // Validate addresses
    const fromPublicKey = new PublicKey(fromAddress);
    const toPublicKey = new PublicKey(toAddress);

    // Create transaction
    const transaction = new Transaction();

    // Add compute budget instructions for faster transaction processing
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }), // Reduced for faster processing
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }) // Higher priority for faster processing
    );

    if (currency === 'SOL') {
      // SOL transfer
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports
        })
      );
          } else {
      // Token transfer (USDC, etc.)
      const mintPublicKey = new PublicKey(currency === 'USDC' ? USDC_CONFIG.mintAddress : currency);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Check if destination token account exists
    try {
      await getAccount(connection, toTokenAccount);
    } catch (error) {
        // Create associated token account if it doesn't exist
        // Use company wallet as payer since it's the fee payer
        // Get company wallet address from Firebase Secrets (not EAS secrets)
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        const companyPublicKey = new PublicKey(companyWalletAddress);
        
        transaction.add(
          createAssociatedTokenAccountInstruction(
            companyPublicKey, // payer (company wallet)
        toTokenAccount, // associated token account
        toPublicKey, // owner
            mintPublicKey // mint
          )
        );
      }

    // Calculate company fee for funding transactions (1.5% fee for money going INTO splits)
    let transferAmount = Math.floor(amount * Math.pow(10, 6)); // USDC has 6 decimals
    let companyFeeAmount = 0;
    
    if (transactionType === 'funding') {
      // Calculate company fee for funding splits
      const { FeeService } = await import('../../config/constants/feeConfig');
      const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(amount, 'split_payment');
      companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
      
      // Add company fee transfer instruction to company wallet
      if (companyFeeAmount > 0) {
        // Get company wallet address from Firebase Secrets (not EAS secrets)
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        const companyTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(companyWalletAddress));
        
        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey,
            companyFeeAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        // Recipient gets the full amount they expect (no deduction)
        transferAmount = Math.floor(recipientAmount * Math.pow(10, 6)); // USDC has 6 decimals
        
        logger.info('Added company fee for split funding', {
          amount,
          companyFee,
          companyFeeAmount,
          recipientAmount,
          transferAmount
        }, 'SplitWalletPayments');
      }
    }

    // Add transfer instruction (recipient gets the full amount they expect)
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        transferAmount
      )
    );
    }

    // Add memo instruction
    if (memo) {
      try {
        const { createMemoInstruction } = await memoryManager.loadModule('solana-memo');
        transaction.add(createMemoInstruction(memo));
    } catch (error) {
        logger.warn('Memo instruction not available, proceeding without memo', {
          memo,
          error: error instanceof Error ? error.message : String(error)
    }, 'SplitWalletPayments');
        // Continue without memo - it's not essential for the transaction
      }
    }

    // IMPORTANT: Get fresh blockhash RIGHT BEFORE finalizing the transaction
    // Blockhashes expire after ~60 seconds, so we get it as late as possible
    // to minimize the time between creation and submission
    // Best practice: Use shared utility for consistent blockhash handling
    const blockhashData = await getFreshBlockhash(connection, 'confirmed');
    const blockhash = blockhashData.blockhash;
    const blockhashTimestamp = blockhashData.timestamp;
    transaction.recentBlockhash = blockhash;
    
    // Use company wallet as fee payer
    // SECURITY: Company wallet secret key is not available in client-side code
    // All secret key operations must be performed on backend services
    // Get company wallet address from Firebase Secrets (not EAS secrets)
    const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
    const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
    
    if (!companyWalletAddress) {
      return {
        success: false,
        error: 'Company wallet address is not available from Firebase Secrets'
      };
    }
    
    const companyPublicKey = new PublicKey(companyWalletAddress);
    transaction.feePayer = companyPublicKey;
    
    // Convert Transaction to VersionedTransaction for Firebase Functions
    // Firebase Functions expect VersionedTransaction format
    // NOTE: We don't sign the Transaction object first - we'll sign the VersionedTransaction directly
    // This avoids double signing and ensures clean signature handling
    let versionedTransaction: VersionedTransaction;
    try {
      versionedTransaction = new VersionedTransaction(transaction.compileMessage());
      // Sign the versioned transaction with user keypair (only sign once)
      versionedTransaction.sign([keypair]);
      logger.info('Transaction converted to VersionedTransaction and signed', {
        userAddress: keypair.publicKey.toBase58(),
        feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
      }, 'SplitWalletPayments');
    } catch (versionError) {
      logger.error('Failed to convert transaction to VersionedTransaction', {
        error: versionError,
        errorMessage: versionError instanceof Error ? versionError.message : String(versionError)
      }, 'SplitWalletPayments');
      return {
        success: false,
        error: `Failed to convert transaction to VersionedTransaction: ${versionError instanceof Error ? versionError.message : String(versionError)}`
      };
    }

    // Serialize the partially signed transaction
    const serializedTransaction = versionedTransaction.serialize();

    // Ensure we have a proper Uint8Array
    const txArray = serializedTransaction instanceof Uint8Array 
      ? serializedTransaction 
      : new Uint8Array(serializedTransaction);

    // CRITICAL: Check blockhash age before sending to Firebase
    // Mainnet is slower, so we need aggressive refresh (10 seconds threshold)
    // Best practice: Use shared utility for consistent blockhash age checking
    const blockhashAge = Date.now() - blockhashTimestamp;
    let currentTxArray = txArray;
    let currentBlockhashTimestamp = blockhashTimestamp;
    
    if (isBlockhashTooOld(blockhashTimestamp)) {
      logger.warn('Blockhash too old before Firebase call, rebuilding transaction', {
        blockhashAge,
        maxAge: BLOCKHASH_MAX_AGE_MS,
        note: 'Rebuilding to ensure blockhash is fresh when Firebase submits'
      }, 'SplitWalletPayments');
      
      // Get fresh blockhash using shared utility
      const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
      const freshBlockhash = freshBlockhashData.blockhash;
      const freshBlockhashTimestamp = freshBlockhashData.timestamp;
      
      // Rebuild transaction with fresh blockhash
      const freshTransaction = new Transaction({
        recentBlockhash: freshBlockhash,
        feePayer: companyPublicKey
      });
      
      // Re-add all instructions
      transaction.instructions.forEach(ix => freshTransaction.add(ix));
      
      // Re-sign with fresh transaction
      const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
      freshVersionedTransaction.sign([keypair]);
      currentTxArray = freshVersionedTransaction.serialize();
      
      logger.info('Transaction rebuilt with fresh blockhash before Firebase call', {
        transactionSize: currentTxArray.length,
        blockhashAge,
        newBlockhashTimestamp: freshBlockhashTimestamp,
        timeSinceNewBlockhash: Date.now() - freshBlockhashTimestamp
      }, 'SplitWalletPayments');
      
      currentBlockhashTimestamp = freshBlockhashTimestamp;
    } else {
      // CRITICAL: Also check if blockhash is actually valid on-chain
      // Even if age is OK, the blockhash might have expired based on slot height
      try {
        const isValid = await connection.isBlockhashValid(blockhash, { commitment: 'confirmed' });
        const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
        
        if (!isValidValue) {
          logger.warn('Blockhash is no longer valid on-chain, rebuilding transaction', {
            blockhash: blockhash.substring(0, 8) + '...',
            blockhashAge,
            note: 'Blockhash expired based on slot height, not just time'
          }, 'SplitWalletPayments');
          
          // Get fresh blockhash and rebuild
          const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
          const freshBlockhash = freshBlockhashData.blockhash;
          const freshBlockhashTimestamp = freshBlockhashData.timestamp;
          
          const freshTransaction = new Transaction({
            recentBlockhash: freshBlockhash,
            feePayer: companyPublicKey
          });
          
          transaction.instructions.forEach(ix => freshTransaction.add(ix));
          
          const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
          freshVersionedTransaction.sign([keypair]);
          currentTxArray = freshVersionedTransaction.serialize();
          currentBlockhashTimestamp = freshBlockhashTimestamp;
        }
      } catch (validationError) {
        // If validation fails (network error), log but proceed
        logger.warn('Failed to validate blockhash on-chain, proceeding anyway', {
          error: validationError instanceof Error ? validationError.message : String(validationError),
          blockhash: blockhash.substring(0, 8) + '...'
        }, 'SplitWalletPayments');
      }
      
      logger.info('Blockhash is still fresh, using existing transaction', {
        blockhashAge,
        maxAge: BLOCKHASH_MAX_AGE_MS,
        note: 'Blockhash is within acceptable age, proceeding without rebuild'
      }, 'SplitWalletPayments');
    }

    // CRITICAL: Log blockhash age right before sending to Firebase
    const finalBlockhashAge = Date.now() - currentBlockhashTimestamp;
    logger.info('Transaction serialized, requesting company wallet signature', {
      transactionSize: currentTxArray.length,
      transactionType: typeof currentTxArray,
      isUint8Array: currentTxArray instanceof Uint8Array,
      blockhashAge: finalBlockhashAge,
      blockhashAgeMs: finalBlockhashAge,
      maxAgeMs: BLOCKHASH_MAX_AGE_MS,
      isBlockhashFresh: finalBlockhashAge < BLOCKHASH_MAX_AGE_MS,
      warning: finalBlockhashAge > 5000 ? 'Blockhash age is high - may expire during Firebase processing' : 'Blockhash is fresh',
      note: 'Sending to Firebase immediately to minimize blockhash expiration risk'
    }, 'SplitWalletPayments');
    
    // For withdrawals, capture balance BEFORE transaction for verification
    let fromBalanceBefore: number | null = null;
    let toBalanceBefore: number | null = null;
    
    if (transactionType === 'withdrawal') {
      try {
        const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
        const fromBalanceResult = await consolidatedTransactionService.getUsdcBalance(fromAddress);
        const toBalanceResult = await consolidatedTransactionService.getUsdcBalance(toAddress);
        fromBalanceBefore = fromBalanceResult.balance;
        toBalanceBefore = toBalanceResult.balance;
        
        logger.info('Captured balances before fair split withdrawal transaction', {
          fromBalanceBefore,
          toBalanceBefore,
          expectedAmount: amount
        }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to capture balances before transaction, proceeding without balance verification', {
          error: error instanceof Error ? error.message : String(error)
        }, 'SplitWalletPayments');
      }
    }

    // Use processUsdcTransfer which combines signing and submission in one Firebase call
    // This minimizes blockhash expiration risk and reduces network round trips
    let signature: string;
    try {
      logger.info('Processing USDC transfer (sign and submit)', {
        transactionSize: currentTxArray.length
          }, 'SplitWalletPayments');
      
      const result = await processUsdcTransfer(currentTxArray);
      signature = result.signature;
      logger.info('Transaction processed successfully', { signature }, 'SplitWalletPayments');
    } catch (submissionError) {
      logger.error('Transaction submission failed', { 
        error: submissionError,
        errorMessage: submissionError instanceof Error ? submissionError.message : String(submissionError)
            }, 'SplitWalletPayments');
            return {
              success: false,
        error: `Failed to submit transaction: ${submissionError instanceof Error ? submissionError.message : String(submissionError)}`
      };
    }

    // For withdrawals, use optimized confirmation strategy with timeout handling
    // Mainnet-aware: Use longer timeouts for mainnet since it's slower
    if (transactionType === 'withdrawal') {
      const { getConfig } = await import('../../config/unified');
      const config = getConfig();
      const isMainnet = config.blockchain.network === 'mainnet';
      
      let confirmed = false;
      let attempts = 0;
      // Mainnet needs more time - transactions can take 30+ seconds
      const maxAttempts = isMainnet ? 30 : 15; // 30 attempts for mainnet (60 seconds), 15 for devnet (30 seconds)
      const waitTime = isMainnet ? 2000 : 2000; // 2 seconds for both

      logger.info('Starting fair split withdrawal transaction confirmation', {
        signature,
        maxAttempts,
        waitTime
      }, 'SplitWalletPayments');

      // Use Promise.race for faster confirmation with timeout
      const confirmationPromise = new Promise<boolean>((resolve) => {
        const checkStatus = async () => {
          try {
            const status = await connection.getSignatureStatus(signature, { 
              searchTransactionHistory: true 
            });
            
            logger.debug('Transaction status check', {
              signature,
              attempt: attempts + 1,
              status: status.value,
              confirmationStatus: status.value?.confirmationStatus,
              err: status.value?.err
            }, 'SplitWalletPayments');
            
            if (status.value?.confirmationStatus === 'confirmed' || 
                status.value?.confirmationStatus === 'finalized') {
              logger.info('Fair split withdrawal transaction confirmed', {
                signature,
                confirmationStatus: status.value.confirmationStatus,
                attempts
              }, 'SplitWalletPayments');
              resolve(true);
              return;
            } else if (status.value?.err) {
              logger.error('Fair split withdrawal transaction failed', {
                signature,
                error: status.value.err
              }, 'SplitWalletPayments');
              resolve(false);
              return;
            } else if (status.value === null && attempts < maxAttempts) {
              // Transaction not found yet - continue checking
              logger.debug('Transaction not found in blockchain yet', {
                signature,
                attempt: attempts + 1
              }, 'SplitWalletPayments');
              attempts++;
              setTimeout(checkStatus, waitTime);
            } else {
              // Max attempts reached or other condition
              resolve(false);
            }
          } catch (error) {
            logger.warn('Error checking fair split withdrawal transaction status', {
              signature,
              attempt: attempts + 1,
              error
            }, 'SplitWalletPayments');
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, waitTime);
            } else {
              resolve(false);
            }
          }
        };
        
        checkStatus();
      });

      // Wait for confirmation with a maximum timeout
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), maxAttempts * waitTime);
      });

      confirmed = await Promise.race([confirmationPromise, timeoutPromise]);

      if (!confirmed) {
        logger.warn('Fair split withdrawal transaction confirmation timed out - verifying balance change', {
          signature,
          attempts
        }, 'SplitWalletPayments');
          
        // For withdrawals, verify the balance actually changed before declaring success
        try {
          const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
          
          // Use Promise.all for parallel balance checks
          const [fromBalanceResult, toBalanceResult] = await Promise.all([
            consolidatedTransactionService.getUsdcBalance(fromAddress),
            consolidatedTransactionService.getUsdcBalance(toAddress)
          ]);
          
          const fromBalance = fromBalanceResult.balance;
          const toBalance = toBalanceResult.balance;
          
          logger.info('Balance verification after timeout', {
            signature,
            fromAddress,
            fromBalance,
            toAddress,
            toBalance,
            expectedAmount: amount
          }, 'SplitWalletPayments');
          
          // Check if the sender balance decreased by approximately the expected amount
          // This is a more reliable indicator that the transaction actually occurred
          const tolerance = 0.001; // 0.001 USDC tolerance
          
          // If we captured balances before the transaction, use them for verification
          if (fromBalanceBefore !== null && toBalanceBefore !== null) {
            const fromBalanceDecrease = fromBalanceBefore - fromBalance;
            const toBalanceIncrease = toBalance - toBalanceBefore;
            
            logger.info('Balance change verification', {
              signature,
              fromBalanceBefore,
              fromBalanceAfter: fromBalance,
              fromBalanceDecrease,
              toBalanceBefore,
              toBalanceAfter: toBalance,
              toBalanceIncrease,
              expectedAmount: amount,
              tolerance
            }, 'SplitWalletPayments');
            
            // Check if the sender's balance decreased by approximately the expected amount
            // and the recipient's balance increased by approximately the expected amount
            const fromBalanceCorrect = Math.abs(fromBalanceDecrease - amount) <= tolerance;
            const toBalanceCorrect = Math.abs(toBalanceIncrease - amount) <= tolerance;
            
            if (fromBalanceCorrect && toBalanceCorrect) {
              logger.info('Fair split withdrawal verified by balance change', {
                signature,
                fromBalanceDecrease,
                toBalanceIncrease,
                expectedAmount: amount
              }, 'SplitWalletPayments');
              return {
                success: true,
                signature
              };
            } else {
              logger.error('Fair split withdrawal verification failed - balance change mismatch', {
                signature,
                fromBalanceDecrease,
                toBalanceIncrease,
                expectedAmount: amount,
                fromBalanceCorrect,
                toBalanceCorrect
              }, 'SplitWalletPayments');
              return {
                success: false,
                signature,
                error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
              };
            }
          } else {
            // Fallback to blockchain verification if we don't have previous balances
            const transactionConfirmed = await verifyTransactionOnBlockchain(signature);
            
            if (transactionConfirmed) {
              logger.info('Fair split withdrawal verified by blockchain confirmation', {
                signature,
                expectedAmount: amount
              }, 'SplitWalletPayments');
              return {
                success: true,
                signature
              };
            } else {
              logger.error('Fair split withdrawal verification failed - transaction not confirmed on blockchain', {
                signature,
                expectedAmount: amount
              }, 'SplitWalletPayments');
              return {
                success: false,
                signature,
                error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
              };
            }
          }
        } catch (balanceError) {
          logger.error('Failed to verify fair split withdrawal balance', {
            signature,
            error: balanceError instanceof Error ? balanceError.message : String(balanceError)
          }, 'SplitWalletPayments');
          return {
            success: false,
            signature,
            error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
          };
        }
      }
    }

    // For funding transactions, return success immediately (no confirmation needed)
    // Funding transactions are typically faster and don't require the same level of verification
    return {
      success: true,
      signature
    };
  } catch (error) {
    logger.error('Fair split transaction failed', error, 'SplitWalletPayments');
            return {
              success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Helper function to execute fast transaction (for withdrawals)
async function executeFastTransaction(
  fromAddress: string,
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  memo: string,
  transactionType: 'funding' | 'withdrawal'
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    logger.info('Executing fast transaction', {
      fromAddress,
      toAddress,
      amount,
      currency,
      memo,
      transactionType
    }, 'SplitWalletPayments');
        
    // Import required modules using memory manager
    const { memoryManager } = await import('../shared/memoryManager');
    const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = await memoryManager.loadModule('solana-web3');
    const { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } = await memoryManager.loadModule('solana-spl-token');

    // Get connection with optimized RPC failover
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    const connection = await optimizedTransactionUtils.getConnection();

    // Create keypair from private key using KeypairUtils
    const { KeypairUtils } = await memoryManager.loadModule('keypair-utils');
    const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKey);
    if (!keypairResult.success || !keypairResult.keypair) {
      return {
        success: false,
        error: keypairResult.error || 'Failed to create keypair from private key'
      };
    }
    const keypair = keypairResult.keypair;
    
    // Validate addresses
    const fromPublicKey = new PublicKey(fromAddress);
    const toPublicKey = new PublicKey(toAddress);

    // For withdrawals, capture balance BEFORE transaction for verification
    let fromBalanceBefore: number | null = null;
    let toBalanceBefore: number | null = null;
    
    if (transactionType === 'withdrawal') {
      try {
        const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
        const fromBalanceResult = await consolidatedTransactionService.getUsdcBalance(fromAddress);
        const toBalanceResult = await consolidatedTransactionService.getUsdcBalance(toAddress);
        fromBalanceBefore = fromBalanceResult.balance;
        toBalanceBefore = toBalanceResult.balance;
        
        logger.info('Captured balances before withdrawal transaction', {
          fromBalanceBefore,
          toBalanceBefore,
          expectedAmount: amount
        }, 'SplitWalletPayments');
      } catch (error) {
        logger.warn('Failed to capture balances before transaction, proceeding without balance verification', {
          error: error instanceof Error ? error.message : String(error)
        }, 'SplitWalletPayments');
      }
    }

    // Create transaction
    const transaction = new Transaction();

    // Add compute budget instructions for fastest transaction processing
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }), // Minimal compute units
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }) // High priority for fastest processing
    );

    if (currency === 'SOL') {
      // SOL transfer
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports
        })
      );
    } else {
      // Token transfer (USDC, etc.)
      const mintPublicKey = new PublicKey(currency === 'USDC' ? USDC_CONFIG.mintAddress : currency);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Validate source token account exists and get actual balance
      // CRITICAL: Use fallback method if getAccount fails (account might exist but getAccount throws)
      let actualAccountBalance: number | null = null;
      let fromAccount: any = null;
      let actualFromTokenAccount = fromTokenAccount;
      
      try {
        // Try primary method: getAccount with associated token address
        fromAccount = await getAccount(connection, fromTokenAccount);
        actualAccountBalance = fromAccount.amount / Math.pow(10, 6); // Convert to USDC (6 decimals)
        
        logger.info('Source token account validated (primary method)', {
          fromTokenAccount: fromTokenAccount.toString(),
          owner: fromAccount.owner.toString(),
          mint: fromAccount.mint.toString(),
          actualBalance: actualAccountBalance,
          requestedAmount: amount,
          rawAmount: fromAccount.amount.toString()
        }, 'SplitWalletPayments');
      } catch (primaryError) {
        // Fallback: Try to find USDC account using getTokenAccountsByOwner
        logger.warn('Primary token account validation failed, trying fallback method', {
          fromTokenAccount: fromTokenAccount.toString(),
          fromAddress,
          error: primaryError instanceof Error ? primaryError.message : String(primaryError)
        }, 'SplitWalletPayments');
        
        try {
          const { TOKEN_PROGRAM_ID } = await memoryManager.loadModule('solana-spl-token');
          const tokenAccounts = await connection.getTokenAccountsByOwner(
            fromPublicKey,
            { mint: mintPublicKey },
            { commitment: 'confirmed' }
          );
          
          if (tokenAccounts.value.length > 0) {
            // Found USDC account using fallback method
            const usdcAccount = tokenAccounts.value[0];
            fromAccount = await getAccount(connection, usdcAccount.pubkey);
            actualAccountBalance = Number(fromAccount.amount) / Math.pow(10, 6);
            
            // Update to use the found account
            actualFromTokenAccount = usdcAccount.pubkey;
            
            logger.info('Source token account found using fallback method', {
              originalTokenAccount: fromTokenAccount.toString(),
              foundTokenAccount: actualFromTokenAccount.toString(),
              actualBalance: actualAccountBalance,
              rawAmount: fromAccount.amount.toString()
            }, 'SplitWalletPayments');
          } else {
            throw new Error('No USDC token account found using fallback method');
          }
        } catch (fallbackError) {
          logger.error('Source token account validation failed (both methods)', {
            fromTokenAccount: fromTokenAccount.toString(),
            fromPublicKey: fromPublicKey.toString(),
            fromAddress,
            mintPublicKey: mintPublicKey.toString(),
            primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }, 'SplitWalletPayments');
          
          return {
            success: false,
            error: 'Source wallet does not have a USDC token account. Please ensure your wallet is properly set up.'
          };
        }
      }
      
      // Validate balance for withdrawals and funding
      if (transactionType === 'withdrawal') {
        // For withdrawals, use the actual balance from the account to withdraw everything
        if (!fromAccount || fromAccount.amount <= 0) {
          return {
            success: false,
            error: `Split wallet has no USDC balance available`
          };
        }
      } else {
        // For funding, check if we have sufficient balance
        if (!fromAccount || fromAccount.amount < Math.floor(amount * Math.pow(10, 6))) {
          return {
            success: false,
            error: `Insufficient USDC balance. Available: ${actualAccountBalance || 0} USDC, Required: ${amount} USDC`
          };
        }
      }

      // Check if destination token account exists
      let toTokenAccountExists = false;
      try {
        const toAccount = await getAccount(connection, toTokenAccount);
        toTokenAccountExists = true;
        logger.info('Destination token account exists', {
          toTokenAccount: toTokenAccount.toString(),
          owner: toAccount.owner.toString(),
          mint: toAccount.mint.toString(),
          amount: toAccount.amount.toString()
        }, 'SplitWalletPayments');
      } catch (error) {
        logger.info('Destination token account does not exist, will create it', {
          toTokenAccount: toTokenAccount.toString(),
          toPublicKey: toPublicKey.toString(),
          mintPublicKey: mintPublicKey.toString(),
          error: error instanceof Error ? error.message : String(error)
        }, 'SplitWalletPayments');
        
        // Create associated token account if it doesn't exist
        // Get company wallet address from Firebase Secrets (not EAS secrets)
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        const companyPublicKey = new PublicKey(companyWalletAddress);
        
        transaction.add(
          createAssociatedTokenAccountInstruction(
            companyPublicKey, // payer (company wallet)
            toTokenAccount, // associated token account
            toPublicKey, // owner
            mintPublicKey // mint
          )
        );
      }

      // Calculate company fee for funding transactions (1.5% fee for money going INTO splits)
      // For withdrawals, use the actual balance from the account to withdraw everything
      const amountToUse = transactionType === 'withdrawal' && actualAccountBalance !== null 
        ? actualAccountBalance 
        : amount;
      let transferAmount = Math.floor(amountToUse * Math.pow(10, 6)); // USDC has 6 decimals
      let companyFeeAmount = 0;
      
      logger.info('Transfer amount calculation', {
        originalAmount: amount,
        amountToUse: amountToUse,
        actualAccountBalance: actualAccountBalance,
        transferAmount,
        transactionType,
        fromTokenAccount: actualFromTokenAccount.toString(),
        toTokenAccount: toTokenAccount.toString()
      }, 'SplitWalletPayments');
      
      if (transactionType === 'funding') {
        // Calculate company fee for funding splits
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(amount, 'split_payment');
        companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
        
        // Add company fee transfer instruction to company wallet
        if (companyFeeAmount > 0) {
          // Get company wallet address from Firebase Secrets (not EAS secrets)
          const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
          const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
          const companyTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(companyWalletAddress));
          
          // CRITICAL: Use actualFromTokenAccount (might be different if fallback method was used)
          transaction.add(
            createTransferInstruction(
              actualFromTokenAccount,
              companyTokenAccount,
              fromPublicKey,
              companyFeeAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
          
          // Recipient gets the full amount they expect (no deduction)
          transferAmount = Math.floor(recipientAmount * Math.pow(10, 6)); // USDC has 6 decimals
          
          logger.info('Added company fee for split funding (fast)', {
            amount,
            companyFee,
            companyFeeAmount,
            recipientAmount,
            transferAmount,
            fromTokenAccount: actualFromTokenAccount.toString()
          }, 'SplitWalletPayments');
        }
      }

      // For withdrawals, use the exact raw amount from the account to withdraw everything
      // This ensures no residual balance is left (0.000001 USDC or similar)
      let finalTransferAmount = transferAmount;
      if (transactionType === 'withdrawal' && fromAccount) {
        // Use the exact raw amount from the account we already fetched
        finalTransferAmount = fromAccount.amount; // Use exact raw amount (already in 6 decimal format)
        logger.info('Using exact account balance for withdrawal (no residual)', {
          actualBalance: actualAccountBalance,
          rawAmount: fromAccount.amount.toString(),
          finalTransferAmount: finalTransferAmount.toString(),
          tokenAccount: actualFromTokenAccount.toString()
        }, 'SplitWalletPayments');
      }
      
      // Add transfer instruction (recipient gets the full amount they expect)
      // CRITICAL: Use actualFromTokenAccount (might be different if fallback method was used)
      transaction.add(
        createTransferInstruction(
          actualFromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          finalTransferAmount
        )
      );
    }

    // Add memo instruction
    if (memo) {
      try {
        const { createMemoInstruction } = await memoryManager.loadModule('solana-memo');
        transaction.add(createMemoInstruction(memo));
      } catch (error) {
        logger.warn('Memo instruction not available, proceeding without memo', {
          memo,
          error: error instanceof Error ? error.message : String(error)
        }, 'SplitWalletPayments');
      }
    }

    // IMPORTANT: Get fresh blockhash RIGHT BEFORE finalizing the transaction
    // Blockhashes expire after ~60 seconds, so we get it as late as possible
    // to minimize the time between creation and submission
    // Best practice: Use shared utility for consistent blockhash handling
    const blockhashData = await getFreshBlockhash(connection, 'confirmed');
    const blockhash = blockhashData.blockhash;
    const blockhashTimestamp = blockhashData.timestamp;
    transaction.recentBlockhash = blockhash;
    
    // Use company wallet as fee payer
    // SECURITY: Company wallet secret key is not available in client-side code
    // All secret key operations must be performed on backend services
    // Get company wallet address from Firebase Secrets (not EAS secrets)
    const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
    const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
    
    if (!companyWalletAddress) {
      return {
        success: false,
        error: 'Company wallet address is not available from Firebase Secrets'
      };
    }
    
    const companyPublicKey = new PublicKey(companyWalletAddress);
    transaction.feePayer = companyPublicKey;
    
    // Convert Transaction to VersionedTransaction for Firebase Functions
    // Firebase Functions expect VersionedTransaction format
    // NOTE: We don't sign the Transaction object first - we'll sign the VersionedTransaction directly
    // This avoids double signing and ensures clean signature handling
    let versionedTransaction: VersionedTransaction;
    try {
      versionedTransaction = new VersionedTransaction(transaction.compileMessage());
      // Sign the versioned transaction with user keypair (only sign once)
      versionedTransaction.sign([keypair]);
      logger.info('Transaction converted to VersionedTransaction and signed', {
        userAddress: keypair.publicKey.toBase58(),
        feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
      }, 'SplitWalletPayments');
    } catch (versionError) {
      logger.error('Failed to convert transaction to VersionedTransaction', {
        error: versionError,
        errorMessage: versionError instanceof Error ? versionError.message : String(versionError)
      }, 'SplitWalletPayments');
      return {
        success: false,
        error: `Failed to convert transaction to VersionedTransaction: ${versionError instanceof Error ? versionError.message : String(versionError)}`
      };
    }

    // Serialize the partially signed transaction
    const serializedTransaction = versionedTransaction.serialize();

    // Ensure we have a proper Uint8Array
    const txArray = serializedTransaction instanceof Uint8Array 
      ? serializedTransaction 
      : new Uint8Array(serializedTransaction);

    // CRITICAL: Check blockhash age before sending to Firebase
    // Mainnet is slower, so we need aggressive refresh (10 seconds threshold)
    // Best practice: Use shared utility for consistent blockhash age checking
    const blockhashAge = Date.now() - blockhashTimestamp;
    let currentTxArray = txArray;
    let currentBlockhashTimestamp = blockhashTimestamp;
    
    if (isBlockhashTooOld(blockhashTimestamp)) {
      logger.warn('Blockhash too old before Firebase call, rebuilding transaction', {
        blockhashAge,
        maxAge: BLOCKHASH_MAX_AGE_MS,
        note: 'Rebuilding to ensure blockhash is fresh when Firebase submits'
      }, 'SplitWalletPayments');
      
      // Get fresh blockhash using shared utility
      const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
      const freshBlockhash = freshBlockhashData.blockhash;
      const freshBlockhashTimestamp = freshBlockhashData.timestamp;
      
      // Rebuild transaction with fresh blockhash
      const freshTransaction = new Transaction({
        recentBlockhash: freshBlockhash,
        feePayer: companyPublicKey
      });
      
      // Re-add all instructions
      transaction.instructions.forEach(ix => freshTransaction.add(ix));
      
      // Re-sign with fresh transaction
      const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
      freshVersionedTransaction.sign([keypair]);
      currentTxArray = freshVersionedTransaction.serialize();
      
      logger.info('Transaction rebuilt with fresh blockhash before Firebase call', {
        transactionSize: currentTxArray.length,
        blockhashAge,
        newBlockhashTimestamp: freshBlockhashTimestamp,
        timeSinceNewBlockhash: Date.now() - freshBlockhashTimestamp
      }, 'SplitWalletPayments');
      
      currentBlockhashTimestamp = freshBlockhashTimestamp;
    } else {
      // CRITICAL: Also check if blockhash is actually valid on-chain
      // Even if age is OK, the blockhash might have expired based on slot height
      try {
        const isValid = await connection.isBlockhashValid(blockhash, { commitment: 'confirmed' });
        const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
        
        if (!isValidValue) {
          logger.warn('Blockhash is no longer valid on-chain, rebuilding transaction', {
            blockhash: blockhash.substring(0, 8) + '...',
            blockhashAge,
            note: 'Blockhash expired based on slot height, not just time'
          }, 'SplitWalletPayments');
          
          // Get fresh blockhash and rebuild
          const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
          const freshBlockhash = freshBlockhashData.blockhash;
          const freshBlockhashTimestamp = freshBlockhashData.timestamp;
          
          const freshTransaction = new Transaction({
            recentBlockhash: freshBlockhash,
            feePayer: companyPublicKey
          });
          
          transaction.instructions.forEach(ix => freshTransaction.add(ix));
          
          const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
          freshVersionedTransaction.sign([keypair]);
          currentTxArray = freshVersionedTransaction.serialize();
          currentBlockhashTimestamp = freshBlockhashTimestamp;
        }
      } catch (validationError) {
        // If validation fails (network error), log but proceed
        logger.warn('Failed to validate blockhash on-chain, proceeding anyway', {
          error: validationError instanceof Error ? validationError.message : String(validationError),
          blockhash: blockhash.substring(0, 8) + '...'
        }, 'SplitWalletPayments');
      }
      
      logger.info('Blockhash is still fresh, using existing transaction', {
        blockhashAge,
        maxAge: BLOCKHASH_MAX_AGE_MS,
        note: 'Blockhash is within acceptable age, proceeding without rebuild'
      }, 'SplitWalletPayments');
    }

    // CRITICAL: Log blockhash age right before sending to Firebase
    const finalBlockhashAge = Date.now() - currentBlockhashTimestamp;
    logger.info('Transaction serialized, requesting company wallet signature', {
      transactionSize: currentTxArray.length,
      transactionType: typeof currentTxArray,
      isUint8Array: currentTxArray instanceof Uint8Array,
      blockhashAge: finalBlockhashAge,
      blockhashAgeMs: finalBlockhashAge,
      maxAgeMs: BLOCKHASH_MAX_AGE_MS,
      isBlockhashFresh: finalBlockhashAge < BLOCKHASH_MAX_AGE_MS,
      warning: finalBlockhashAge > 5000 ? 'Blockhash age is high - may expire during Firebase processing' : 'Blockhash is fresh',
      note: 'Sending to Firebase immediately to minimize blockhash expiration risk'
    }, 'SplitWalletPayments');

    // Use processUsdcTransfer which combines signing and submission in one Firebase call
    // This minimizes blockhash expiration risk and reduces network round trips
    let signature: string;
    try {
      logger.info('Processing USDC transfer (sign and submit)', {
        transactionSize: currentTxArray.length
      }, 'SplitWalletPayments');
      
      const result = await processUsdcTransfer(currentTxArray);
      signature = result.signature;
      logger.info('Transaction processed successfully', { signature }, 'SplitWalletPayments');
    } catch (submissionError) {
      logger.error('Transaction submission failed', { 
        error: submissionError,
        errorMessage: submissionError instanceof Error ? submissionError.message : String(submissionError)
      }, 'SplitWalletPayments');
      return {
        success: false,
        error: `Failed to submit transaction: ${submissionError instanceof Error ? submissionError.message : String(submissionError)}`
      };
    }

    logger.info('Fast transaction sent successfully', {
      signature,
      fromAddress,
      toAddress,
      amount,
      currency,
      transactionType
    }, 'SplitWalletPayments');

    // Balance capture moved to before transaction execution

    // For withdrawals, use optimized confirmation strategy
    // Mainnet-aware: Use longer timeouts for mainnet since it's slower
    const { getConfig } = await import('../../config/unified');
    const config = getConfig();
    const isMainnet = config.blockchain.network === 'mainnet';
    
    // Validate network for payment operations
    NetworkValidator.validateNetworkForOperation('Split wallet payment', isMainnet);
    
    let confirmed = false;
    let attempts = 0;
    // Mainnet needs more time - transactions can take 30+ seconds
    const maxAttempts = isMainnet ? 30 : 15; // 30 attempts for mainnet (60 seconds), 15 for devnet (30 seconds)
    const waitTime = isMainnet ? 2000 : 2000; // 2 seconds for both (mainnet needs more attempts, not longer waits)

    logger.info('Starting withdrawal transaction confirmation', {
      signature,
      maxAttempts,
      waitTime
    }, 'SplitWalletPayments');

    // Use Promise.race for faster confirmation with timeout
    const confirmationPromise = new Promise<boolean>((resolve) => {
      const checkStatus = async () => {
        try {
          const status = await connection.getSignatureStatus(signature, { 
            searchTransactionHistory: true 
          });
          
          logger.debug('Transaction status check', {
            signature,
            attempt: attempts + 1,
            status: status.value,
            confirmationStatus: status.value?.confirmationStatus,
            err: status.value?.err
          }, 'SplitWalletPayments');
          
          if (status.value?.confirmationStatus === 'confirmed' || 
              status.value?.confirmationStatus === 'finalized') {
            logger.info('Withdrawal transaction confirmed', {
              signature,
              confirmationStatus: status.value.confirmationStatus,
              attempts
            }, 'SplitWalletPayments');
            resolve(true);
            return;
          } else if (status.value?.err) {
            logger.error('Withdrawal transaction failed', {
              signature,
              error: status.value.err
            }, 'SplitWalletPayments');
            resolve(false);
            return;
          } else if (status.value === null && attempts < maxAttempts) {
            // Transaction not found yet - continue checking
            logger.debug('Transaction not found in blockchain yet', {
              signature,
              attempt: attempts + 1
            }, 'SplitWalletPayments');
            attempts++;
            setTimeout(checkStatus, waitTime);
          } else {
            // Max attempts reached or other condition
            resolve(false);
          }
        } catch (error) {
          logger.warn('Error checking withdrawal transaction status', {
            signature,
            attempt: attempts + 1,
            error
          }, 'SplitWalletPayments');
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, waitTime);
          } else {
            resolve(false);
          }
        }
      };
      
      checkStatus();
    });

    // Wait for confirmation with a maximum timeout
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), maxAttempts * waitTime);
    });

    confirmed = await Promise.race([confirmationPromise, timeoutPromise]);

    if (!confirmed) {
      logger.warn('Withdrawal transaction confirmation timed out - verifying balance change', {
        signature,
        attempts
      }, 'SplitWalletPayments');
        
      // For withdrawals, verify the balance actually changed before declaring success
      try {
        const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
        
        // Use Promise.all for parallel balance checks
        const [fromBalanceResult, toBalanceResult] = await Promise.all([
          consolidatedTransactionService.getUsdcBalance(fromAddress),
          consolidatedTransactionService.getUsdcBalance(toAddress)
        ]);
        
        const fromBalance = fromBalanceResult.balance;
        const toBalance = toBalanceResult.balance;
        
        logger.info('Balance verification after timeout', {
          signature,
          fromAddress,
          fromBalance,
          toAddress,
          toBalance,
          expectedAmount: amount
        }, 'SplitWalletPayments');
        
        // Check if the sender balance decreased by approximately the expected amount
        // This is a more reliable indicator that the transaction actually occurred
        const tolerance = 0.001; // 0.001 USDC tolerance
        
        // If we captured balances before the transaction, use them for verification
        if (fromBalanceBefore !== null && toBalanceBefore !== null) {
          const fromBalanceDecrease = fromBalanceBefore - fromBalance;
          const toBalanceIncrease = toBalance - toBalanceBefore;
          
          logger.info('Balance change verification', {
            signature,
            fromBalanceBefore,
            fromBalanceAfter: fromBalance,
            fromBalanceDecrease,
            toBalanceBefore,
            toBalanceAfter: toBalance,
            toBalanceIncrease,
            expectedAmount: amount,
            tolerance
          }, 'SplitWalletPayments');
          
          // Check if the sender's balance decreased by approximately the expected amount
          // and the recipient's balance increased by approximately the expected amount
          const fromBalanceCorrect = Math.abs(fromBalanceDecrease - amount) <= tolerance;
          const toBalanceCorrect = Math.abs(toBalanceIncrease - amount) <= tolerance;
          
          if (fromBalanceCorrect && toBalanceCorrect) {
            logger.info('Withdrawal verified by balance change', {
              signature,
              fromBalanceDecrease,
              toBalanceIncrease,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            return {
              success: true,
              signature
            };
          } else {
            logger.error('Withdrawal verification failed - balance change mismatch', {
              signature,
              fromBalanceDecrease,
              toBalanceIncrease,
              expectedAmount: amount,
              fromBalanceCorrect,
              toBalanceCorrect
            }, 'SplitWalletPayments');
            return {
              success: false,
              signature,
              error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
            };
          }
        } else {
          // Fallback to blockchain verification if we don't have previous balances
          const transactionConfirmed = await verifyTransactionOnBlockchain(signature);
          
          if (transactionConfirmed) {
            logger.info('Withdrawal verified by blockchain confirmation', {
              signature,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            return {
              success: true,
              signature
            };
          } else {
            logger.error('Withdrawal verification failed - transaction not confirmed on blockchain', {
              signature,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            return {
              success: false,
              signature,
              error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
            };
          }
        }
      } catch (balanceError) {
        logger.error('Failed to verify withdrawal balance', {
          signature,
          error: balanceError instanceof Error ? balanceError.message : String(balanceError)
        }, 'SplitWalletPayments');
        return {
          success: false,
          signature,
          error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
        };
      }
    }

    return {
      success: true,
      signature
    };

  } catch (error) {
    logger.error('Fast transaction failed', error, 'SplitWalletPayments');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Helper function to execute degen split transaction
async function executeDegenSplitTransaction(
  fromAddress: string,
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  memo: string,
  transactionType: 'funding' | 'withdrawal'
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // Executing degen split transaction
        
    // Validate inputs
    if (!fromAddress || !toAddress || !privateKey) {
      return {
        success: false,
        error: 'Missing required transaction parameters'
      };
    }
    
    if (amount <= 0) {
      return {
        success: false,
        error: 'Invalid transaction amount'
      };
    }
        
    // Import required modules using memory manager
    const { memoryManager } = await import('../shared/memoryManager');
    const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = await memoryManager.loadModule('solana-web3');
    const { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } = await memoryManager.loadModule('solana-spl-token');

    // Get connection with optimized RPC failover
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    let connection;
    try {
      connection = await optimizedTransactionUtils.getConnection();
    } catch (connectionError) {
      logger.error('Failed to get Solana connection', {
        error: connectionError instanceof Error ? connectionError.message : String(connectionError)
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: 'Failed to connect to Solana network. Please check your internet connection and try again.'
      };
    }

    // Create keypair from private key using KeypairUtils with enhanced error handling
    const { KeypairUtils } = await memoryManager.loadModule('keypair-utils');
    const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKey);
    if (!keypairResult.success || !keypairResult.keypair) {
      logger.error('Failed to create keypair from private key', {
        fromAddress,
        toAddress,
        amount,
        currency,
        privateKeyLength: privateKey.length,
        privateKeyPreview: privateKey.substring(0, 20) + '...',
        error: keypairResult.error
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: `Failed to create keypair from private key: ${keypairResult.error || 'Unknown error'}`
      };
    }
    const keypair = keypairResult.keypair;
    
    // Validate that the keypair matches the expected from address
    if (keypair.publicKey.toBase58() !== fromAddress) {
      logger.error('Keypair address mismatch', {
        expectedAddress: fromAddress,
        actualAddress: keypair.publicKey.toBase58()
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: `Keypair address mismatch. Expected: ${fromAddress}, Got: ${keypair.publicKey.toBase58()}`
      };
    }
    
    // Validate addresses
    const fromPublicKey = new PublicKey(fromAddress);
    const toPublicKey = new PublicKey(toAddress);

    // Create transaction
    const transaction = new Transaction();

    // Add compute budget instructions for faster transaction processing
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }), // Reduced for faster processing
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }) // Higher priority for faster processing
    );

    if (currency === 'SOL') {
      // SOL transfer
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports
        })
      );
        } else {
      // Token transfer (USDC, etc.)
      const mintPublicKey = new PublicKey(currency === 'USDC' ? USDC_CONFIG.mintAddress : currency);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Check if destination token account exists
      let toTokenAccountExists = false;
      try {
        await getAccount(connection, toTokenAccount);
        toTokenAccountExists = true;
        logger.info('Destination token account exists for degen split', {
          toTokenAccount: toTokenAccount.toString(),
          toPublicKey: toPublicKey.toString(),
          mintPublicKey: mintPublicKey.toString()
        }, 'SplitWalletPayments');
      } catch (error) {
      // Create associated token account if it doesn't exist
      const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
      // Get company wallet address from Firebase Secrets (not EAS secrets)
      const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
      const companyPublicKey = new PublicKey(companyWalletAddress);
      
      transaction.add(
        createAssociatedTokenAccountInstruction(
          companyPublicKey, // payer (company wallet)
          toTokenAccount, // associated token account
          toPublicKey, // owner
          mintPublicKey // mint
        )
      );
      }

      // Calculate company fee for funding transactions
      let transferAmount = Math.floor(amount * Math.pow(10, 6)); // USDC has 6 decimals
      let companyFeeAmount = 0;
      
      if (transactionType === 'funding') {
        // Calculate company fee for funding splits
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(amount, 'split_payment');
        companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
        
        // Add company fee transfer instruction to company wallet
        if (companyFeeAmount > 0) {
          // Get company wallet address from Firebase Secrets (not EAS secrets)
          const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
          const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
          const companyTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(companyWalletAddress));
          
          transaction.add(
            createTransferInstruction(
              fromTokenAccount,
              companyTokenAccount,
              fromPublicKey,
              companyFeeAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
          
          // Recipient gets the full amount they expect (no deduction)
          transferAmount = Math.floor(recipientAmount * Math.pow(10, 6)); // USDC has 6 decimals
          
          logger.info('Added company fee for split funding (degen)', {
            amount,
            companyFee,
            companyFeeAmount,
            recipientAmount,
            transferAmount
          }, 'SplitWalletPayments');
        }
      }

      // Add transfer instruction (recipient gets the full amount they expect)
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount
        )
      );
    }

    // Add memo instruction
    if (memo) {
      try {
        const { createMemoInstruction } = await memoryManager.loadModule('solana-memo');
        transaction.add(createMemoInstruction(memo));
      } catch (error) {
        logger.warn('Memo instruction not available, proceeding without memo', {
          memo,
          error: error instanceof Error ? error.message : String(error)
          }, 'SplitWalletPayments');
        // Continue without memo - it's not essential for the transaction
      }
    }

    // IMPORTANT: Get fresh blockhash RIGHT BEFORE finalizing the transaction
    // Blockhashes expire after ~60 seconds, so we get it as late as possible
    // to minimize the time between creation and submission
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const blockhashTimestamp = Date.now(); // Track when we got the blockhash
    transaction.recentBlockhash = blockhash;
    
    // Use company wallet as fee payer
    // SECURITY: Company wallet secret key is not available in client-side code
    // All secret key operations must be performed on backend services
    const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
    // Get company wallet address from Firebase Secrets (not EAS secrets)
    const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
    
    if (!companyWalletAddress) {
            return {
        success: false,
        error: 'Company wallet address is not configured'
      };
    }
    
    const companyPublicKey = new PublicKey(companyWalletAddress);
    transaction.feePayer = companyPublicKey;
    
    // Convert Transaction to VersionedTransaction for Firebase Functions
    // Firebase Functions expect VersionedTransaction format
    // NOTE: We don't sign the Transaction object first - we'll sign the VersionedTransaction directly
    // This avoids double signing and ensures clean signature handling
    let versionedTransaction: VersionedTransaction;
    try {
      versionedTransaction = new VersionedTransaction(transaction.compileMessage());
      // Sign the versioned transaction with user keypair (only sign once)
      versionedTransaction.sign([keypair]);
      logger.info('Transaction converted to VersionedTransaction and signed', {
        userAddress: keypair.publicKey.toBase58(),
        feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
      }, 'SplitWalletPayments');
    } catch (versionError) {
      logger.error('Failed to convert transaction to VersionedTransaction', {
        error: versionError,
        errorMessage: versionError instanceof Error ? versionError.message : String(versionError)
      }, 'SplitWalletPayments');
      return {
        success: false,
        error: `Failed to convert transaction to VersionedTransaction: ${versionError instanceof Error ? versionError.message : String(versionError)}`
      };
    }

    // Serialize the partially signed transaction
    const serializedTransaction = versionedTransaction.serialize();

    // Ensure we have a proper Uint8Array
    const txArray = serializedTransaction instanceof Uint8Array 
      ? serializedTransaction 
      : new Uint8Array(serializedTransaction);

    // CRITICAL: Check blockhash age before sending to Firebase
    // Mainnet is slower, so we need aggressive refresh (10 seconds threshold)
    // Best practice: Use shared utility for consistent blockhash age checking
    const blockhashAge = Date.now() - blockhashTimestamp;
    let currentTxArray = txArray;
    let currentBlockhashTimestamp = blockhashTimestamp;
    
    if (isBlockhashTooOld(blockhashTimestamp)) {
      logger.warn('Blockhash too old before Firebase call, rebuilding transaction', {
        blockhashAge,
        maxAge: BLOCKHASH_MAX_AGE_MS,
        note: 'Rebuilding to ensure blockhash is fresh when Firebase submits'
      }, 'SplitWalletPayments');
      
      // Get fresh blockhash using shared utility
      const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
      const freshBlockhash = freshBlockhashData.blockhash;
      const freshBlockhashTimestamp = freshBlockhashData.timestamp;
      
      // Rebuild transaction with fresh blockhash
      const freshTransaction = new Transaction({
        recentBlockhash: freshBlockhash,
        feePayer: companyPublicKey
      });
      
      // Re-add all instructions
      transaction.instructions.forEach(ix => freshTransaction.add(ix));
      
      // Re-sign with fresh transaction
      const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
      freshVersionedTransaction.sign([keypair]);
      currentTxArray = freshVersionedTransaction.serialize();
      
      logger.info('Transaction rebuilt with fresh blockhash before Firebase call', {
        transactionSize: currentTxArray.length,
        blockhashAge,
        newBlockhashTimestamp: freshBlockhashTimestamp,
        timeSinceNewBlockhash: Date.now() - freshBlockhashTimestamp
      }, 'SplitWalletPayments');
      
      currentBlockhashTimestamp = freshBlockhashTimestamp;
    } else {
      // CRITICAL: Also check if blockhash is actually valid on-chain
      // Even if age is OK, the blockhash might have expired based on slot height
      try {
        const isValid = await connection.isBlockhashValid(blockhash, { commitment: 'confirmed' });
        const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
        
        if (!isValidValue) {
          logger.warn('Blockhash is no longer valid on-chain, rebuilding transaction', {
            blockhash: blockhash.substring(0, 8) + '...',
            blockhashAge,
            note: 'Blockhash expired based on slot height, not just time'
          }, 'SplitWalletPayments');
          
          // Get fresh blockhash and rebuild
          const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
          const freshBlockhash = freshBlockhashData.blockhash;
          const freshBlockhashTimestamp = freshBlockhashData.timestamp;
          
          const freshTransaction = new Transaction({
            recentBlockhash: freshBlockhash,
            feePayer: companyPublicKey
          });
          
          transaction.instructions.forEach(ix => freshTransaction.add(ix));
          
          const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
          freshVersionedTransaction.sign([keypair]);
          currentTxArray = freshVersionedTransaction.serialize();
          currentBlockhashTimestamp = freshBlockhashTimestamp;
        }
      } catch (validationError) {
        // If validation fails (network error), log but proceed
        logger.warn('Failed to validate blockhash on-chain, proceeding anyway', {
          error: validationError instanceof Error ? validationError.message : String(validationError),
          blockhash: blockhash.substring(0, 8) + '...'
        }, 'SplitWalletPayments');
      }
      
      logger.info('Blockhash is still fresh, using existing transaction', {
        blockhashAge,
        maxAge: BLOCKHASH_MAX_AGE_MS,
        note: 'Blockhash is within acceptable age, proceeding without rebuild'
      }, 'SplitWalletPayments');
    }

    // CRITICAL: Log blockhash age right before sending to Firebase
    const finalBlockhashAge = Date.now() - currentBlockhashTimestamp;
    logger.info('Transaction serialized, requesting company wallet signature', {
      transactionSize: currentTxArray.length,
      transactionType: typeof currentTxArray,
      isUint8Array: currentTxArray instanceof Uint8Array,
      blockhashAge: finalBlockhashAge,
      blockhashAgeMs: finalBlockhashAge,
      maxAgeMs: BLOCKHASH_MAX_AGE_MS,
      isBlockhashFresh: finalBlockhashAge < BLOCKHASH_MAX_AGE_MS,
      warning: finalBlockhashAge > 5000 ? 'Blockhash age is high - may expire during Firebase processing' : 'Blockhash is fresh',
      note: 'Sending to Firebase immediately to minimize blockhash expiration risk'
    }, 'SplitWalletPayments');

    // Use processUsdcTransfer which combines signing and submission in one Firebase call
    // This minimizes blockhash expiration risk and reduces network round trips
    let signature: string;
    try {
      logger.info('Processing USDC transfer (sign and submit)', {
        transactionSize: currentTxArray.length
      }, 'SplitWalletPayments');
      
      const result = await processUsdcTransfer(currentTxArray);
      signature = result.signature;
      logger.info('Transaction processed successfully', { signature }, 'SplitWalletPayments');
    } catch (submissionError) {
      logger.error('Transaction submission failed', { 
        error: submissionError,
        errorMessage: submissionError instanceof Error ? submissionError.message : String(submissionError)
      }, 'SplitWalletPayments');
      return {
        success: false,
        error: `Failed to submit transaction: ${submissionError instanceof Error ? submissionError.message : String(submissionError)}`
      };
    }

    logger.info('Degen split transaction sent successfully', {
            signature,
            fromAddress,
            toAddress,
            amount,
      currency,
              transactionType
          }, 'SplitWalletPayments');

    // For degen splits, use enhanced confirmation strategy
    let confirmed = false;
    let attempts = 0;
    // Mainnet-aware: Use longer timeouts for mainnet since it's slower
    const { getConfig: getConfigForDegen } = await import('../../config/unified');
    const degenConfig = getConfigForDegen();
    const isMainnetDegen = degenConfig.blockchain.network === 'mainnet';
    
        // Validate network for degen split operations
        NetworkValidator.validateNetworkForOperation('Degen split payment', isMainnetDegen);
    
    const maxAttempts = isMainnetDegen ? 40 : 30; // 40 attempts for mainnet (40 seconds), 30 for devnet (30 seconds)
    const waitTime = isMainnetDegen ? 2000 : 1000; // 2 seconds for mainnet, 1 second for devnet

    while (!confirmed && attempts < maxAttempts) {
      try {
        const status = await connection.getSignatureStatus(signature, { 
          searchTransactionHistory: true 
        });
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          confirmed = true;
          logger.info('Degen split transaction confirmed', {
                signature,
            confirmationStatus: status.value.confirmationStatus,
            attempts
              }, 'SplitWalletPayments');
        } else if (status.value?.err) {
          logger.error('Degen split transaction failed', {
              signature,
            error: status.value.err
            }, 'SplitWalletPayments');
          return {
            success: false,
            signature,
            error: `Transaction failed: ${JSON.stringify(status.value.err)}`
          };
        } else if (status.value === null) {
          // Transaction not found yet - this is common and not necessarily an error
          logger.debug('Degen split transaction not found in blockchain yet', {
            signature,
            attempt: attempts + 1
          }, 'SplitWalletPayments');
        }
      } catch (error) {
        logger.warn('Error checking degen split transaction status', {
          signature,
          attempt: attempts + 1,
          error
        }, 'SplitWalletPayments');
          }
          
      if (!confirmed) {
        await new Promise(resolve => setTimeout(resolve, waitTime)); // Wait 1 second
        attempts++;
      }
    }

    if (!confirmed) {
      logger.warn('Degen split transaction confirmation timed out - using likely succeeded mode', {
          signature,
        attempts,
        transactionType
        }, 'SplitWalletPayments');
        
      // For funding transactions, verify the transaction actually succeeded by checking balances
      if (transactionType === 'funding') {
        logger.info('Verifying degen split funding transaction by checking balances', {
          signature,
          toAddress,
          expectedAmount: amount
        }, 'SplitWalletPayments');
        
        try {
          // Wait a bit more for the transaction to potentially complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if the destination wallet now has the expected balance
          const { balanceUtils } = await import('../shared/balanceUtils');
          const usdcMint = new PublicKey(USDC_CONFIG.mintAddress);
          const balanceResult = await balanceUtils.getUsdcBalance(new PublicKey(toAddress), usdcMint);
          
          if (balanceResult.balance >= amount) {
            logger.info('Degen split funding verified by balance check', {
              signature,
              toAddress,
              actualBalance: balanceResult.balance,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            
            return {
              success: true,
              signature
            };
          } else {
            logger.error('Degen split funding verification failed - insufficient balance', {
              signature,
              toAddress,
              actualBalance: balanceResult.balance,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              signature,
              error: 'Transaction verification failed - insufficient balance in destination wallet'
            };
          }
        } catch (balanceError) {
          logger.error('Failed to verify degen split funding by balance check', {
            signature,
            toAddress,
            error: balanceError instanceof Error ? balanceError.message : String(balanceError)
          }, 'SplitWalletPayments');
          
          return {
            success: false,
            signature,
            error: 'Transaction verification failed - unable to check destination balance'
          };
        }
      } else {
        // For withdrawal transactions, verify by checking balance changes
        logger.info('Verifying degen split withdrawal transaction by checking balances', {
          signature,
          fromAddress,
          toAddress,
          expectedAmount: amount
        }, 'SplitWalletPayments');
        
        try {
          // Wait a bit more for the transaction to potentially complete
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check if the destination wallet now has more balance
          const { consolidatedTransactionService } = await import('../blockchain/transaction/ConsolidatedTransactionService');
          const fromBalance = await consolidatedTransactionService.getUsdcBalance(fromAddress);
          const toBalance = await consolidatedTransactionService.getUsdcBalance(toAddress);
          
          logger.info('Degen split withdrawal balance verification', {
            signature,
            fromAddress,
            fromBalance: fromBalance.balance,
            toAddress,
            toBalance: toBalance.balance,
            expectedAmount: amount
          }, 'SplitWalletPayments');
          
          // For withdrawals, we expect the destination balance to increase
          // We'll be more lenient here since the transaction might still be processing
          if (toBalance.success && toBalance.balance > 0) {
            logger.info('Degen split withdrawal verified by balance check', {
              signature,
              toAddress,
              actualBalance: toBalance.balance,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            
            return {
              success: true,
              signature
            };
          } else {
            logger.error('Degen split withdrawal verification failed - insufficient balance', {
              signature,
              toAddress,
              actualBalance: toBalance.balance,
              expectedAmount: amount
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              signature,
              error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
            };
          }
        } catch (balanceError) {
          logger.error('Failed to verify degen split withdrawal by balance check', {
            signature,
            error: balanceError instanceof Error ? balanceError.message : String(balanceError)
          }, 'SplitWalletPayments');
          return {
            success: false,
            signature,
            error: 'Transaction is taking longer than expected to confirm. Please check your wallet in a few minutes - the transaction may still be processing.'
          };
        }
      }
    }

    return {
      success: true,
      signature
    };

  } catch (error) {
    logger.error('Degen split transaction failed', error, 'SplitWalletPayments');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export class SplitWalletPayments {
  /**
   * Verify split wallet balance against blockchain data
   * Ensures the displayed balance is real blockchain data
   * Works for both fair split and degen split wallets
   */
  static async verifySplitWalletBalance(splitWalletId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      logger.info('Verifying split wallet balance', { splitWalletId }, 'SplitWalletPayments');
      
      // Get split wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found'
        };
      }
      
      const wallet = walletResult.wallet;
      
      // Get connection
      const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
      const connection = await optimizedTransactionUtils.getConnection();

      // Get balance from blockchain
      try {
        const { PublicKey } = await import('@solana/web3.js');
        const { getConfig } = await import('../../config/unified');
        
        const walletPublicKey = new PublicKey(wallet.walletAddress);
        const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
        
        // Check USDC balance for split wallets (they contain USDC, not SOL)
        const balanceResult = await BalanceUtils.getUsdcBalance(walletPublicKey, usdcMint);
        const balance = balanceResult.balance;

        logger.info('Split wallet balance verified', {
        splitWalletId,
          balance: balance,
          currency: wallet.currency,
          accountExists: balanceResult.accountExists
      }, 'SplitWalletPayments');
      
      return {
        success: true,
          balance: balance
      };
    } catch (error) {
        logger.error('Failed to get USDC balance from blockchain', error, 'SplitWalletPayments');
        return {
          success: false,
          error: 'Failed to get USDC balance from blockchain'
        };
      }

    } catch (error) {
      logger.error('Failed to verify split wallet balance', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }


  /**
   * Process degen split fund locking (participants lock funds but status remains 'locked', not 'paid')
   * Optimized for faster transaction processing
   */
  static async processDegenFundLocking(
    splitWalletId: string,
    participantId: string,
    amount: number,
    transactionSignature?: string
  ): Promise<PaymentResult> {
    const startTime = Date.now();
    try {
      logger.info('Processing degen split fund locking', {
        splitWalletId,
        participantId,
        amount,
        hasTransactionSignature: !!transactionSignature
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
          error: 'Invalid payment amount',
        };
      }

      // Check if participant has already locked their funds
      if (participant.status === 'locked' || participant.amountPaid >= participant.amountOwed) {
            return {
              success: false,
              error: 'Participant has already locked their funds',
        };
      }

      // Get user wallet
          const { walletService } = await import('../blockchain/wallet');
          const userWallet = await walletService.getWalletInfo(participantId);
      if (!userWallet) {
            logger.error('User wallet not found for degen split funding', {
              splitWalletId,
              participantId
            }, 'SplitWalletPayments');
            return {
              success: false,
          error: 'User wallet not found. Please ensure you have a wallet set up.',
        };
      }

      logger.info('User wallet found for degen split funding', {
        splitWalletId,
        participantId,
        userWalletAddress: userWallet.address,
        hasSecretKey: !!userWallet.secretKey
      }, 'SplitWalletPayments');

      // Check user's USDC balance before attempting transaction
      try {
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { getUserBalanceWithFallback } = await import('../shared/balanceCheckUtils');
        
        // Use centralized balance check utility with intelligent fallback
        const balanceResult = await getUserBalanceWithFallback(participantId, {
          useLiveBalance: true,
          walletAddress: userWallet.address
        });
        
        const userUsdcBalance = balanceResult.usdcBalance;
        
        // Calculate total amount user needs to pay (share + fees)
        const { totalAmount: totalPaymentAmount } = FeeService.calculateCompanyFee(roundedAmount, 'split_payment');
        
        logger.info('User USDC balance check for degen split funding', {
          splitWalletId,
          participantId,
          userWalletAddress: userWallet.address,
          userUsdcBalance,
          shareAmount: roundedAmount,
          totalPaymentAmount,
          feeAmount: totalPaymentAmount - roundedAmount,
          source: balanceResult.source,
          isReliable: balanceResult.isReliable
        }, 'SplitWalletPayments');

        // Only block if we have a reliable balance check and it's insufficient
        if (balanceResult.isReliable && userUsdcBalance < totalPaymentAmount) {
          return {
            success: false,
            error: `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${totalPaymentAmount.toFixed(6)} USDC to make this payment (${roundedAmount.toFixed(6)} USDC for your share + ${(totalPaymentAmount - roundedAmount).toFixed(6)} USDC in fees). Please add USDC to your wallet first.`
          };
        }
        
        // If balance check is unreliable but we got a balance, still check if insufficient
        if (!balanceResult.isReliable && userUsdcBalance > 0 && userUsdcBalance < totalPaymentAmount) {
          logger.warn('Balance check unreliable but shows insufficient balance, blocking transaction', {
            userUsdcBalance,
            totalPaymentAmount,
            source: balanceResult.source
          }, 'SplitWalletPayments');
          return {
            success: false,
            error: `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${totalPaymentAmount.toFixed(6)} USDC to make this payment (${roundedAmount.toFixed(6)} USDC for your share + ${(totalPaymentAmount - roundedAmount).toFixed(6)} USDC in fees). Please add USDC to your wallet first.`
          };
        }
        
        // If balance check unavailable, allow transaction to proceed (will fail at blockchain if insufficient)
        if (!balanceResult.isReliable && userUsdcBalance === 0) {
          logger.warn('Balance check unavailable, allowing transaction to proceed (will fail at blockchain if insufficient)', {
            walletAddress: userWallet.address,
            source: balanceResult.source
          }, 'SplitWalletPayments');
        }
      } catch (balanceError) {
        logger.warn('Failed to check user USDC balance, proceeding with transaction', {
          splitWalletId,
          participantId,
          error: balanceError instanceof Error ? balanceError.message : String(balanceError)
        }, 'SplitWalletPayments');
        // Continue with transaction even if balance check fails
      }

      // Calculate total amount user needs to pay (share + fees) for transaction
      const { FeeService } = await import('../../config/constants/feeConfig');
      const { totalAmount: totalPaymentAmount } = FeeService.calculateCompanyFee(roundedAmount, 'split_payment');

      // Execute transaction using degen split specific method
      logger.info('Starting degen split fund locking transaction', {
        splitWalletId,
        participantId,
        fromAddress: userWallet.address,
        toAddress: wallet.walletAddress,
        shareAmount: roundedAmount,
        totalPaymentAmount,
        feeAmount: totalPaymentAmount - roundedAmount,
        currency: 'USDC',
        hasSecretKey: !!userWallet.secretKey
      }, 'SplitWalletPayments');

      // Validate secret key before attempting transaction
      if (!userWallet.secretKey) {
        logger.error('User wallet secret key is missing', {
          splitWalletId,
          participantId,
          userWalletAddress: userWallet.address
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: 'User wallet secret key is missing. Please ensure your wallet is properly set up.'
        };
      }

      const transactionResult = await executeDegenSplitTransaction(
            userWallet.address,
        userWallet.secretKey,
            wallet.walletAddress,
            roundedAmount, // Use only the share amount - executeDegenSplitTransaction will calculate fees
            'USDC',
            `Degen Split fund locking - ${wallet.id}`,
            'funding'
          );

      logger.info('Degen split fund locking transaction result', {
        splitWalletId,
        participantId,
        success: transactionResult.success,
        signature: transactionResult.signature,
        error: transactionResult.error
      }, 'SplitWalletPayments');
          
          // CRITICAL: Only proceed if transaction actually succeeded
          if (!transactionResult.success) {
            logger.error('Failed to execute degen split fund locking transaction', {
              splitWalletId,
              participantId,
              error: transactionResult.error,
              signature: transactionResult.signature
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              error: transactionResult.error || 'Transaction failed',
            };
          }

      // Save transaction to database and award points using centralized helper
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        const { FeeService } = await import('../../config/constants/feeConfig');
        
        // Calculate company fee for split payment
        const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(roundedAmount, 'split_payment');
        
        await saveTransactionAndAwardPoints({
          userId: participantId,
          toAddress: wallet.walletAddress,
          amount: roundedAmount,
          signature: transactionResult.signature!,
          transactionType: 'split_payment',
          companyFee: companyFee,
          netAmount: recipientAmount,
          memo: `Degen Split fund locking - ${wallet.id}`,
          currency: 'USDC'
        });
        
        logger.info('✅ Degen split funding transaction saved and points awarded', {
          signature: transactionResult.signature,
          participantId,
          splitWalletId,
          amount: roundedAmount
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save degen split funding transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      // Update participant status to 'locked' (not 'paid' for degen splits)
      // Use transaction signature from result, or fallback to provided signature
      const finalTransactionSignature = transactionResult.signature || transactionSignature;
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === participantId 
          ? { 
            ...p,
              status: 'locked' as const,
              amountPaid: roundedAmount,
              transactionSignature: finalTransactionSignature,
              paidAt: new Date().toISOString()
            }
          : p
      );

      // CRITICAL: Single atomic database update for both collections
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      const updatedParticipant = updatedParticipants.find(p => p.userId === participantId);
      
      if (!updatedParticipant) {
        logger.error('Updated participant not found after payment processing', {
          splitWalletId,
          participantId
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: 'Updated participant data not found'
        };
      }

      // Use centralized atomic database update service
      const { SplitWalletAtomicUpdates } = await import('./SplitWalletAtomicUpdates');
      const dbUpdateResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
        firebaseDocId,
        wallet.billId,
        updatedParticipants,
        updatedParticipant,
        participantId,
        true // isDegenSplit = true
      );

      if (!dbUpdateResult.success) {
        logger.error('Failed to update databases atomically', {
          splitWalletId,
          participantId,
          error: dbUpdateResult.error
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: dbUpdateResult.error || 'Database update failed'
        };
      }

      const transactionTime = Date.now() - startTime;
      logger.info('Degen split fund locking completed successfully', {
        splitWalletId,
        participantId,
        amount: roundedAmount,
        transactionSignature: finalTransactionSignature,
        transactionTime,
        usedLikelySucceededMode: !transactionResult.success
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: finalTransactionSignature,
        amount: roundedAmount
      };

    } catch (error) {
      logger.error('Failed to process degen split fund locking', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process participant payment to split wallet (Fair Split)
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

      // Get user wallet
      const { walletService } = await import('../blockchain/wallet');
      const userWallet = await walletService.getWalletInfo(participantId);
      if (!userWallet || !userWallet.secretKey) {
        return {
          success: false,
          error: 'User wallet not found or missing private key. Please ensure you have a wallet set up.',
        };
      }

      // Check user's USDC balance before attempting transaction
      try {
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { getUserBalanceWithFallback } = await import('../shared/balanceCheckUtils');
        
        // Use centralized balance check utility with intelligent fallback
        const balanceResult = await getUserBalanceWithFallback(participantId, {
          useLiveBalance: true,
          walletAddress: userWallet.address
        });
        
        const userUsdcBalance = balanceResult.usdcBalance;
        
        // Calculate total amount user needs to pay (share + fees)
        const { totalAmount: totalPaymentAmount } = FeeService.calculateCompanyFee(roundedAmount, 'split_payment');
        
        logger.info('User USDC balance check for fair split funding', {
          participantId,
          userAddress: userWallet.address,
          userUsdcBalance,
          shareAmount: roundedAmount,
          totalPaymentAmount,
          feeAmount: totalPaymentAmount - roundedAmount,
          source: balanceResult.source,
          isReliable: balanceResult.isReliable
        }, 'SplitWalletPayments');
        
        // Only block if we have a reliable balance check and it's insufficient
        if (balanceResult.isReliable && userUsdcBalance < totalPaymentAmount) {
          return {
            success: false,
            error: `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${totalPaymentAmount.toFixed(6)} USDC to make this payment (${roundedAmount.toFixed(6)} USDC for your share + ${(totalPaymentAmount - roundedAmount).toFixed(6)} USDC in fees). Please add USDC to your wallet first.`,
          };
        }
        
        // If balance check is unreliable but we got a balance, still check if insufficient
        if (!balanceResult.isReliable && userUsdcBalance > 0 && userUsdcBalance < totalPaymentAmount) {
          logger.warn('Balance check unreliable but shows insufficient balance, blocking transaction', {
            userUsdcBalance,
            totalPaymentAmount,
            source: balanceResult.source
          }, 'SplitWalletPayments');
          return {
            success: false,
            error: `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${totalPaymentAmount.toFixed(6)} USDC to make this payment (${roundedAmount.toFixed(6)} USDC for your share + ${(totalPaymentAmount - roundedAmount).toFixed(6)} USDC in fees). Please add USDC to your wallet first.`,
          };
        }
        
        // If balance check unavailable, allow transaction to proceed (will fail at blockchain if insufficient)
        if (!balanceResult.isReliable && userUsdcBalance === 0) {
          logger.warn('Balance check unavailable, allowing transaction to proceed (will fail at blockchain if insufficient)', {
            walletAddress: userWallet.address,
            source: balanceResult.source
          }, 'SplitWalletPayments');
        }
      } catch (error) {
        logger.warn('Could not check user USDC balance, proceeding with transaction', {
          error: error instanceof Error ? error.message : String(error),
          participantId
        }, 'SplitWalletPayments');
        // Continue with transaction - balance check is not critical
      }

      // Execute transaction using fair split specific method
      const transactionResult = await executeFairSplitTransaction(
            userWallet.address,
            userWallet.secretKey,
            wallet.walletAddress,
            roundedAmount,
            'USDC',
            `Fair Split participant payment - ${wallet.id}`,
            'funding'
          );
          
          if (!transactionResult.success) {
            logger.error('Failed to execute fair split participant payment transaction', {
              splitWalletId,
              participantId,
              error: transactionResult.error,
          signature: transactionResult.signature
            }, 'SplitWalletPayments');
            
        // Provide more specific error messages based on the error type
        let userFriendlyError = transactionResult.error || 'Transaction failed';
        
        if (transactionResult.error?.includes('Attempt to debit an account but found no record of a prior credit')) {
          userFriendlyError = 'Insufficient USDC balance. Please add USDC to your wallet before making this payment.';
        } else if (transactionResult.error?.includes('Simulation failed')) {
          userFriendlyError = 'Transaction simulation failed. This usually means insufficient balance or network issues. Please check your USDC balance and try again.';
        }
          
          return {
            success: false,
          error: userFriendlyError,
        };
      }

      // Save transaction to database and award points using centralized helper
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        const { FeeService } = await import('../../config/constants/feeConfig');
        
        // Calculate company fee for split payment
        const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(roundedAmount, 'split_payment');
        
        await saveTransactionAndAwardPoints({
          userId: participantId,
          toAddress: wallet.walletAddress,
          amount: roundedAmount,
          signature: transactionResult.signature!,
          transactionType: 'split_payment',
          companyFee: companyFee,
          netAmount: recipientAmount,
          memo: `Fair Split participant payment - ${wallet.id}`,
          currency: 'USDC'
        });
        
        logger.info('✅ Fair split funding transaction saved and points awarded', {
          signature: transactionResult.signature,
          participantId,
          splitWalletId,
          amount: roundedAmount
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save fair split funding transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      // Update participant status to 'paid'
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === participantId 
          ? { 
            ...p,
              status: 'paid' as const,
              amountPaid: roundedAmount,
              transactionSignature: transactionResult.signature,
              paidAt: new Date().toISOString()
            }
          : p
      );

      // Award Fair Split participation reward (non-blocking)
      try {
        const { splitRewardsService } = await import('../../services/rewards/splitRewardsService');
        const { SplitStorageService } = await import('../splits/splitStorageService');
        
        // Get split data to determine split type and amount
        const splitResult = await SplitStorageService.getSplitByBillId(wallet.billId);
        if (splitResult.success && splitResult.split) {
          const split = splitResult.split;
          
          if (split.splitType === 'fair') {
            // Award participant reward (non-owner)
            await splitRewardsService.awardFairSplitParticipation({
              userId: participantId,
              splitId: split.id,
              splitType: 'fair',
              splitAmount: roundedAmount,
              isOwner: false
            });
          }
        }
      } catch (rewardError) {
        logger.error('Failed to award Fair Split participation reward', {
          participantId,
          splitWalletId,
          rewardError
        }, 'SplitWalletPayments');
        // Don't fail payment if reward fails
      }

      // CRITICAL: Single atomic database update for both collections
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      const updatedParticipant = updatedParticipants.find(p => p.userId === participantId);
      
      if (!updatedParticipant) {
        logger.error('Updated participant not found after fair split payment processing', {
          splitWalletId,
          participantId
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: 'Updated participant data not found'
        };
      }

      // Use centralized atomic database update service
      const { SplitWalletAtomicUpdates } = await import('./SplitWalletAtomicUpdates');
      const dbUpdateResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
        firebaseDocId,
        wallet.billId,
        updatedParticipants,
        updatedParticipant,
        participantId,
        false // isDegenSplit = false
      );

      if (!dbUpdateResult.success) {
        logger.error('Failed to update databases atomically for fair split', {
          splitWalletId,
          participantId,
          error: dbUpdateResult.error
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: dbUpdateResult.error || 'Database update failed'
        };
      }

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: roundedAmount
      };

    } catch (error) {
      logger.error('Failed to process participant payment', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Extract funds from Fair Split wallet (Creator only) - Fast Mode
   */
  static async extractFairSplitFunds(
    splitWalletId: string,
    recipientAddress: string,
    creatorId: string,
    description?: string,
    fastMode: boolean = true
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

      // CRITICAL: Check if withdrawal has already been completed
      if (wallet.status === 'completed') {
        logger.warn('Fair split withdrawal already completed', {
          splitWalletId,
          creatorId,
          status: wallet.status,
          completedAt: wallet.completedAt
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: 'Withdrawal has already been completed. You cannot withdraw funds from this split again.',
        };
      }

      // Get the private key using Fair split specific logic
      const privateKeyResult = await this.getFairSplitPrivateKeyPrivate(splitWalletId, creatorId);
      
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve private key for fair split withdrawal',
        };
      }

      // Get current balance
      const balanceResult = await this.verifySplitWalletBalance(splitWalletId);
      
      logger.info('Balance verification result for withdrawal', {
        splitWalletId,
        success: balanceResult.success,
        balance: balanceResult.balance,
        error: balanceResult.error,
        walletAddress: wallet.walletAddress
      }, 'SplitWalletPayments');
      
      if (!balanceResult.success) {
        return {
          success: false,
          error: `Failed to get split wallet balance: ${balanceResult.error || 'Unknown error'}`,
        };
      }
      
      if (!balanceResult.balance || balanceResult.balance <= 0) {
        return {
          success: false,
          error: `Split wallet has no funds available (balance: ${balanceResult.balance || 0} USDC)`,
        };
      }

      const availableBalance = balanceResult.balance;
      
      // CRITICAL: Withdraw the FULL balance - no buffer needed for USDC token transfers
      // Transaction fees are paid in SOL, not USDC, so we can withdraw the entire USDC balance
      // Round to 6 decimal places to match USDC precision
      const withdrawalAmount = Math.floor(availableBalance * Math.pow(10, 6)) / Math.pow(10, 6);
      
      if (withdrawalAmount <= 0) {
        return {
          success: false,
          error: 'Insufficient balance for withdrawal',
        };
      }
      
      logger.info('Withdrawing full balance from split wallet', {
        splitWalletId,
        availableBalance,
        withdrawalAmount,
        walletAddress: wallet.walletAddress
      }, 'SplitWalletPayments');

      // Execute transaction using fast or standard method based on fastMode
      const transactionResult = fastMode 
        ? await executeFastTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            recipientAddress,
            withdrawalAmount,
            wallet.currency,
            description || `Fair Split funds extraction for bill ${wallet.billId}`,
            'withdrawal'
          )
        : await executeFairSplitTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            recipientAddress,
            withdrawalAmount,
            wallet.currency,
            description || `Fair Split funds extraction for bill ${wallet.billId}`,
            'withdrawal'
          );
      
      logger.info('💸 Fair split transaction result', {
        success: transactionResult.success,
        signature: transactionResult.signature,
        error: transactionResult.error,
        withdrawalAmount,
        walletAddress: wallet.walletAddress,
        recipientAddress
      }, 'SplitWalletPayments');
      
      if (!transactionResult.success) {
        logger.error('Fair split withdrawal transaction failed', {
          splitWalletId,
          error: transactionResult.error,
          signature: transactionResult.signature,
          withdrawalAmount,
          walletAddress: wallet.walletAddress,
          recipientAddress
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Save transaction to database using centralized helper
      // Note: Split withdrawals don't award points (they're money out of splits, not user-to-user transfers)
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        
        await saveTransactionAndAwardPoints({
          userId: creatorId,
          toAddress: recipientAddress,
          amount: withdrawalAmount,
          signature: transactionResult.signature!,
          transactionType: 'split_wallet_withdrawal',
          companyFee: 0, // No fee for withdrawals
          netAmount: withdrawalAmount,
          memo: description || `Fair Split funds extraction for bill ${wallet.billId}`,
          currency: wallet.currency as 'USDC' | 'SOL'
        });
        
        logger.info('✅ Fair split withdrawal transaction saved', {
          signature: transactionResult.signature,
          creatorId,
          splitWalletId,
          amount: withdrawalAmount
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save fair split withdrawal transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      // Update wallet status to completed
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        finalTransactionSignature: transactionResult.signature
      });

      logger.info('✅ Fair split funds extraction completed successfully', {
              splitWalletId,
        recipientAddress,
        amount: withdrawalAmount,
              transactionSignature: transactionResult.signature
            }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: withdrawalAmount
      };

    } catch (error) {
      logger.error('Failed to extract fair split funds', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process degen winner payout - Fast Mode
   */
  static async processDegenWinnerPayout(
    splitWalletId: string,
    winnerUserId: string,
    winnerAddress: string,
    totalAmount: number,
    description?: string,
    fastMode: boolean = true
  ): Promise<PaymentResult> {
    try {
      logger.info('🚀 Processing degen winner payout', {
        splitWalletId,
        winnerUserId,
        winnerAddress,
        totalAmount,
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

      // CRITICAL: Validate that degenLoser exists (the selected participant is the LOSER)
      // Winners are all participants EXCEPT the degenLoser
      // Check degenLoser first, fallback to degenWinner for backward compatibility
      const loserInfo = wallet.degenLoser || wallet.degenWinner;
      
      if (!loserInfo) {
        return {
          success: false,
          error: 'No loser has been selected for this degen split yet. Please wait for the roulette to complete.',
        };
      }

      // CRITICAL: If the user is the loser, they cannot claim winner payout
      if (loserInfo.userId === winnerUserId) {
        logger.warn('Attempted winner payout by loser participant', {
          splitWalletId,
          attemptedWinnerUserId: winnerUserId,
          loserUserId: loserInfo.userId,
          loserName: loserInfo.name
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: `You are the loser of this degen split. Please use the "Transfer to External Card" option to transfer your funds.`,
        };
      }

      // CRITICAL: Validate that the user is actually a participant
      const userParticipant = wallet.participants.find(p => p.userId === winnerUserId);
      if (!userParticipant) {
        return {
          success: false,
          error: 'You are not a participant in this degen split.',
        };
      }

      // CRITICAL FIX: Check if any participant is already marked as paid (winner)
      // This prevents multiple winners from being processed
      const existingPaidParticipants = wallet.participants.filter(p => p.status === 'paid');
      if (existingPaidParticipants.length > 0) {
        const paidParticipant = existingPaidParticipants[0];
        if (!paidParticipant) {
          // This shouldn't happen, but handle it gracefully
          logger.warn('Found paid participants array but first element is undefined', {
            splitWalletId,
            existingPaidParticipantsLength: existingPaidParticipants.length
          }, 'SplitWalletPayments');
        } else if (paidParticipant.userId !== winnerUserId) {
          return {
            success: false,
            error: `Another participant (${paidParticipant.name}) has already been marked as the winner.`,
          };
        } else {
          // If it's the same user, they've already claimed
          return {
            success: false,
            error: 'Winner has already claimed their funds',
          };
        }
      }

      // Reconcile any pending funding transactions before payout to ensure balance is current
      try {
        await this.reconcilePendingTransactions(splitWalletId);
      } catch (_) {}

      // Check if the winner has already claimed their funds
      const winnerParticipant = wallet.participants.find(p => p.userId === winnerUserId);
      if (!winnerParticipant) {
        return {
          success: false,
          error: 'Winner not found in split wallet participants',
        };
      }

      if (winnerParticipant.status === 'paid') {
        return {
          success: false,
          error: 'Winner has already claimed their funds',
        };
      }

      // Calculate the actual total amount from all participants' locked funds
      // For degen splits, the winner gets all the money that was locked by all participants
      const actualTotalAmount = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      
      // Award Degen Split completion rewards (non-blocking)
      try {
        const { splitRewardsService } = await import('../../services/rewards/splitRewardsService');
        const { SplitStorageService } = await import('../splits/splitStorageService');
        
        // Get split data
        const splitResult = await SplitStorageService.getSplitByBillId(wallet.billId);
        if (splitResult.success && splitResult.split) {
          const split = splitResult.split;
          
          // Award rewards for all participants (winner and loser)
          // CRITICAL: Get the actual loser ID from degenLoser (or degenWinner for backward compatibility)
          const actualLoserId = wallet.degenLoser?.userId || wallet.degenWinner?.userId;
          
          for (const participant of wallet.participants) {
            // CRITICAL: isWinner = true if participant is NOT the loser
            const isWinner = actualLoserId ? participant.userId !== actualLoserId : participant.userId === winnerUserId;
            await splitRewardsService.awardDegenSplitParticipation({
              userId: participant.userId,
              splitId: split.id,
              splitType: 'degen',
              splitAmount: participant.amountPaid || 0,
              isOwner: false,
              isWinner
            });
          }
        }
      } catch (rewardError) {
        logger.error('Failed to award Degen Split completion rewards', {
          winnerUserId,
          splitWalletId,
          rewardError
        }, 'SplitWalletPayments');
        // Don't fail payout if rewards fail
      }
      
      logger.info('Degen winner payout amount calculation', {
        splitWalletId,
        winnerUserId,
        passedTotalAmount: totalAmount,
        actualTotalAmount,
        participantAmounts: wallet.participants.map(p => ({ userId: p.userId, amountPaid: p.amountPaid }))
      }, 'SplitWalletPayments');

      // Get the private key using degen split specific logic
      const privateKeyResult = await this.getSplitWalletPrivateKeyPrivate(splitWalletId, winnerUserId);
      
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve private key for degen split withdrawal',
        };
      }

      // Execute transaction using fast or standard method based on fastMode
      const transactionResult = fastMode 
        ? await executeFastTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            winnerAddress,
            actualTotalAmount, // Use actual total amount from all participants
            wallet.currency,
            description || `Degen Split winner payout for ${winnerUserId}`,
            'withdrawal'
          )
        : await executeDegenSplitTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            winnerAddress,
            actualTotalAmount, // Use actual total amount from all participants
            wallet.currency,
            description || `Degen Split winner payout for ${winnerUserId}`,
            'withdrawal'
          );
      
      logger.info('💸 Degen winner payout transaction result', {
        success: transactionResult.success,
        signature: transactionResult.signature,
        error: transactionResult.error
      }, 'SplitWalletPayments');
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Save transaction to database using centralized helper
      // Note: Degen winner payouts are withdrawals, so no points awarded
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        
        await saveTransactionAndAwardPoints({
          userId: winnerUserId,
          toAddress: winnerAddress,
          amount: actualTotalAmount,
          signature: transactionResult.signature!,
          transactionType: 'split_wallet_withdrawal',
          companyFee: 0, // No fee for withdrawals
          netAmount: actualTotalAmount,
          memo: description || `Degen Split winner payout for ${winnerUserId}`,
          currency: wallet.currency as 'USDC' | 'SOL'
        });
        
        logger.info('✅ Degen winner payout transaction saved', {
          signature: transactionResult.signature,
          winnerUserId,
          splitWalletId,
          amount: actualTotalAmount
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save degen winner payout transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      // CRITICAL FIX: Update winner participant status to 'paid' and ensure all others remain as 'locked' (losers)
      // This ensures there is always exactly 1 winner and all others are losers
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === winnerUserId) {
          // Winner gets paid status
          return { 
            ...p,
            status: 'paid' as const,
            amountPaid: actualTotalAmount, // Winner gets the total amount from all participants
            transactionSignature: transactionResult.signature,
            paidAt: new Date().toISOString()
          };
        } else {
          // CRITICAL: All non-winners must remain as 'locked' (losers)
          // They will need to claim their refund separately via processDegenLoserPayment
          // Ensure their status is 'locked' and not 'paid'
          return {
            ...p,
            status: p.status === 'paid' ? 'locked' as const : p.status, // Force non-winners to be 'locked'
            // Don't change amountPaid for losers - they keep their locked amount
          };
        }
      });

      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      
      // Check if wallet is empty after this withdrawal and close it if needed
      const balanceResult = await this.verifySplitWalletBalance(splitWalletId);
      const shouldCloseWallet = balanceResult.success && 
        (balanceResult.balance === 0 || (balanceResult.balance && balanceResult.balance < 0.000001)) &&
        wallet.status === 'spinning_completed';
      
      const updateData: any = {
        participants: updatedParticipants,
        status: shouldCloseWallet ? 'closed' : 'completed',
        completedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        finalTransactionSignature: transactionResult.signature
      };
      
      if (shouldCloseWallet) {
        logger.info('🔄 Closing degen split wallet - balance is empty after winner payout', {
          splitWalletId,
          balance: balanceResult.balance,
          previousStatus: wallet.status
        }, 'SplitWalletPayments');
      }
      
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), updateData);

      // CRITICAL: Sync split storage status when wallet is closed
      if (shouldCloseWallet) {
        try {
          const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
          await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
            wallet.billId,
            'closed',
            updateData.completedAt
          );
          logger.info('✅ Split storage synchronized with closed wallet status', {
            splitWalletId,
            billId: wallet.billId
          }, 'SplitWalletPayments');
        } catch (syncError) {
          logger.error('❌ Failed to sync split storage when closing wallet', {
            splitWalletId,
            billId: wallet.billId,
            error: syncError instanceof Error ? syncError.message : String(syncError)
          }, 'SplitWalletPayments');
          // Don't fail the transaction if sync fails
        }
      }

      await this.cleanupSharedPrivateKeyIfAllSettled(splitWalletId, updatedParticipants);

      logger.info('✅ Degen winner payout completed successfully', {
          splitWalletId,
          winnerUserId,
        winnerAddress,
        amount: actualTotalAmount,
          transactionSignature: transactionResult.signature,
          walletClosed: shouldCloseWallet,
          finalBalance: balanceResult.balance
        }, 'SplitWalletPayments');

        return {
          success: true,
        transactionSignature: transactionResult.signature,
        amount: actualTotalAmount
      };

    } catch (error) {
      logger.error('Failed to process degen winner payout', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process degen loser payment - Sends funds directly to external linked card or wallet
   * CRITICAL: Losers withdraw to external cards/wallets (not in-app wallet)
   * Winners withdraw to in-app wallet
   */
  static async processDegenLoserPayment(
    splitWalletId: string,
    loserUserId: string,
    totalAmount: number,
    description?: string,
    cardId?: string, // Optional: KAST card ID to send funds to
    fastMode: boolean = true
  ): Promise<PaymentResult> {
    try {
      logger.info('🚀 Processing degen loser payment to external card/wallet', {
        splitWalletId,
        loserUserId,
        totalAmount,
        description,
        cardId
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

      // CRITICAL: Validate that degenLoser exists and matches the loserUserId
      // This ensures only the actual loser can transfer to external card
      const loserInfo = wallet.degenLoser || wallet.degenWinner; // Fallback for backward compatibility
      
      if (!loserInfo) {
        return {
          success: false,
          error: 'No loser has been selected for this degen split yet. Please wait for the roulette to complete.',
        };
      }

      // CRITICAL: Validate that the requesting user is actually the loser
      if (loserInfo.userId !== loserUserId) {
        logger.warn('Attempted loser payment by non-loser participant', {
          splitWalletId,
          attemptedLoserUserId: loserUserId,
          actualLoserUserId: loserInfo.userId,
          loserName: loserInfo.name
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: `You are not the loser of this degen split. The loser is ${loserInfo.name}. Winners should use the "Claim" option to withdraw funds to their in-app wallet.`,
        };
      }

      // Find loser participant
      const loserParticipant = wallet.participants.find(p => p.userId === loserUserId);
      if (!loserParticipant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      if (loserParticipant.status === 'paid') {
        return {
          success: false,
          error: 'You have already transferred your funds to your external card or wallet',
        };
      }

      // CRITICAL: Loser gets back their own locked amount, not the total bill amount
      // The loser only receives what they originally locked (their contribution)
      const loserLockedAmount = loserParticipant.amountPaid || loserParticipant.amountOwed || totalAmount;
      
      logger.info('Loser payment amount calculation', {
        splitWalletId,
        loserUserId,
        passedTotalAmount: totalAmount,
        loserLockedAmount,
        participantAmountPaid: loserParticipant.amountPaid,
        participantAmountOwed: loserParticipant.amountOwed
      }, 'SplitWalletPayments');

      // CRITICAL: Get user's linked external destination (KAST card or external wallet)
      // Funds must go to external card/wallet, not in-app wallet
      let destinationAddress: string;
      
      if (cardId) {
        // Use provided card ID
        const { ExternalCardService } = await import('../integrations/external/ExternalCardService');
        const cardInfo = await ExternalCardService.getCardInfo(cardId);
        
        if (!cardInfo.success || !cardInfo.card) {
          return {
            success: false,
            error: 'External card not found. Please link a KAST card first.',
          };
        }
        
        destinationAddress = cardInfo.card.identifier; // KAST card wallet address
      } else {
        // CRITICAL: Get user's linked external destinations (KAST cards OR external wallets)
        // Losers can withdraw to either external cards or external wallets
        const { LinkedWalletService } = await import('../blockchain/wallet/LinkedWalletService');
        const linkedDestinations = await LinkedWalletService.getLinkedDestinations(loserUserId);
        
        // Prefer KAST cards, but fallback to external wallets if no cards available
        let selectedDestination: { address: string; id: string; type: string; name?: string } | null = null;
        
        if (linkedDestinations.kastCards.length > 0) {
          // Use first KAST card if available
          const firstCard = linkedDestinations.kastCards[0];
          if (firstCard) {
            const cardAddress = firstCard.address || firstCard.identifier;
            if (cardAddress) {
              selectedDestination = {
                address: cardAddress,
                id: firstCard.id,
                type: 'kast',
                name: firstCard.label || 'KAST Card'
              };
              logger.info('Using first linked KAST card for loser payment', {
                cardId: firstCard.id,
                cardAddress: cardAddress
              }, 'SplitWalletPayments');
            }
          }
        } else if (linkedDestinations.externalWallets.length > 0) {
          // Fallback to external wallet if no KAST cards
          const firstWallet = linkedDestinations.externalWallets[0];
          if (firstWallet) {
            const walletAddress = firstWallet.address || firstWallet.identifier;
            if (walletAddress) {
              selectedDestination = {
                address: walletAddress,
                id: firstWallet.id,
                type: 'external',
                name: firstWallet.label || 'External Wallet'
              };
              logger.info('Using first linked external wallet for loser payment', {
                walletId: firstWallet.id,
                walletAddress: walletAddress
              }, 'SplitWalletPayments');
            }
          }
        }
        
        if (!selectedDestination) {
          return {
            success: false,
            error: 'No external card or wallet linked. Please link a KAST card or external wallet in Settings to transfer your funds.',
          };
        }
        
        destinationAddress = selectedDestination.address;
        
        logger.info('Selected destination for loser payment', {
          destinationType: selectedDestination.type,
          destinationId: selectedDestination.id,
          destinationName: selectedDestination.name,
          destinationAddress: destinationAddress
        }, 'SplitWalletPayments');
      }

      // Get the private key using degen split specific logic
      const privateKeyResult = await this.getSplitWalletPrivateKeyPrivate(splitWalletId, loserUserId);
      
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve private key for degen split withdrawal',
        };
      }

      // CRITICAL: Execute transaction to external card/wallet address (not in-app wallet)
      // Loser gets their own locked amount, not the total
      const transactionResult = fastMode 
        ? await executeFastTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            destinationAddress, // Send to external card/wallet, not in-app wallet
            loserLockedAmount, // Loser gets their own locked amount
            wallet.currency,
            description || `Degen Split loser transfer to external card/wallet for ${loserUserId}`,
            'withdrawal'
          )
        : await executeDegenSplitTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            destinationAddress, // Send to external card/wallet, not in-app wallet
            loserLockedAmount, // Loser gets their own locked amount
            wallet.currency,
            description || `Degen Split loser transfer to external card/wallet for ${loserUserId}`,
            'withdrawal'
          );
      
      logger.info('💸 Degen loser payment transaction result', {
        success: transactionResult.success,
        signature: transactionResult.signature,
        error: transactionResult.error
        }, 'SplitWalletPayments');
        
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Save transaction to database using centralized helper
      // Note: Degen loser refunds are withdrawals, so no points awarded
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        
        await saveTransactionAndAwardPoints({
          userId: loserUserId,
          toAddress: destinationAddress, // External card/wallet address, not in-app wallet
          amount: loserLockedAmount, // Loser gets their own locked amount
          signature: transactionResult.signature!,
          transactionType: 'external_payment', // Use external_payment type for external transfers
          companyFee: 0, // Fee handled by external transfer service
          netAmount: loserLockedAmount, // Loser gets their own locked amount
          memo: description || `Degen Split loser transfer to external card/wallet for ${loserUserId}`,
          currency: wallet.currency as 'USDC' | 'SOL'
        });
        
        logger.info('✅ Degen loser refund transaction saved', {
          signature: transactionResult.signature,
          loserUserId,
          splitWalletId,
          amount: loserLockedAmount
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save degen loser refund transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      // Update loser participant status to 'paid'
      // CRITICAL: Keep amountPaid as their original locked amount (don't change it)
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === loserUserId 
          ? { 
            ...p,
            status: 'paid' as const,
            // Keep amountPaid as their original locked amount (loserLockedAmount)
            // Don't change amountPaid - it represents what they locked
            transactionSignature: transactionResult.signature,
            paidAt: new Date().toISOString()
            }
          : p
      );

      // Update wallet in database using Firebase document ID
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      
      // Check if wallet is empty after this withdrawal and close it if needed
      const balanceResult = await this.verifySplitWalletBalance(splitWalletId);
      const shouldCloseWallet = balanceResult.success && 
        (balanceResult.balance === 0 || (balanceResult.balance && balanceResult.balance < 0.000001)) &&
        wallet.status === 'spinning_completed';
      
      const updateData: any = {
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString(),
        finalTransactionSignature: transactionResult.signature
      };
      
      if (shouldCloseWallet) {
        updateData.status = 'closed';
        updateData.completedAt = new Date().toISOString();
        logger.info('🔄 Closing degen split wallet - balance is empty after loser withdrawal', {
          splitWalletId,
          balance: balanceResult.balance,
          previousStatus: wallet.status
        }, 'SplitWalletPayments');
      }
      
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), updateData);

      // CRITICAL: Sync split storage status when wallet is closed
      if (shouldCloseWallet) {
        try {
          const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
          await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
            wallet.billId,
            'closed',
            updateData.completedAt
          );
          logger.info('✅ Split storage synchronized with closed wallet status', {
            splitWalletId,
            billId: wallet.billId
          }, 'SplitWalletPayments');
        } catch (syncError) {
          logger.error('❌ Failed to sync split storage when closing wallet', {
            splitWalletId,
            billId: wallet.billId,
            error: syncError instanceof Error ? syncError.message : String(syncError)
          }, 'SplitWalletPayments');
          // Don't fail the transaction if sync fails
        }
      }

      await this.cleanupSharedPrivateKeyIfAllSettled(splitWalletId, updatedParticipants);

      logger.info('✅ Degen loser payment completed successfully', {
        splitWalletId,
        loserUserId,
        amount: loserLockedAmount, // Loser gets their own locked amount
        transactionSignature: transactionResult.signature,
        walletClosed: shouldCloseWallet,
        finalBalance: balanceResult.balance
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: loserLockedAmount // Return the actual amount transferred (loser's locked amount)
      };

    } catch (error) {
      logger.error('Failed to process degen loser payment', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Pay participant share - wrapper method for backward compatibility
   * This method is called by the FairSplitScreen and delegates to processParticipantPayment
   */
  static async payParticipantShareNEW(
    splitWalletId: string,
    participantId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      logger.info('🚀 payParticipantShareNEW called - delegating to processParticipantPayment', {
        splitWalletId,
        participantId,
        amount
      }, 'SplitWalletPayments');

      // Delegate to the clean processParticipantPayment method
      return await this.processParticipantPayment(splitWalletId, participantId, amount);
    } catch (error) {
      logger.error('Failed in payParticipantShareNEW', error, 'SplitWalletPayments');
        return {
          success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send funds to Cast account
   */
  static async sendToCastAccount(
    splitWalletId: string,
    castAccountAddress: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      logger.info('🚀 Sending funds to Cast account', {
        splitWalletId,
        castAccountAddress,
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

      // Get current balance
      const balanceResult = await this.verifySplitWalletBalance(splitWalletId);
      if (!balanceResult.success || !balanceResult.balance) {
        return {
          success: false,
          error: 'Failed to get split wallet balance',
        };
      }

      const availableBalance = balanceResult.balance;
      if (availableBalance <= 0) {
        return {
          success: false,
          error: 'Insufficient balance for transfer',
        };
      }

      // Get the private key
      const privateKeyResult = await this.getFairSplitPrivateKeyPrivate(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve private key',
        };
      }

      // Execute transaction using fair split specific method
      const transactionResult = await executeFairSplitTransaction(
        wallet.walletAddress,
        privateKeyResult.privateKey,
        castAccountAddress,
        availableBalance,
        wallet.currency,
        description || `Cast account transfer for ${wallet.id}`,
        'withdrawal'
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Save transaction to database using centralized helper
      // Note: Cast account transfers are withdrawals, so no points awarded
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        
        await saveTransactionAndAwardPoints({
          userId: wallet.creatorId,
          toAddress: castAccountAddress,
          amount: availableBalance,
          signature: transactionResult.signature!,
          transactionType: 'split_wallet_withdrawal',
          companyFee: 0, // No fee for withdrawals
          netAmount: availableBalance,
          memo: description || `Cast account transfer for ${wallet.id}`,
          currency: wallet.currency as 'USDC' | 'SOL'
        });
        
        logger.info('✅ Cast account transfer transaction saved', {
          signature: transactionResult.signature,
          creatorId: wallet.creatorId,
          splitWalletId,
          amount: availableBalance
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save cast account transfer transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      logger.info('✅ Cast account transfer completed successfully', {
        splitWalletId,
        castAccountAddress,
        amount: availableBalance,
        transactionSignature: transactionResult.signature
              }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: availableBalance
      };

    } catch (error) {
      logger.error('Failed to send funds to Cast account', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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
      logger.info('🚀 Transferring funds to user wallet', {
        splitWalletId,
        userId,
        amount
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

      // Get user wallet
      const { walletService } = await import('../blockchain/wallet');
      const userWallet = await walletService.getWalletInfo(userId);
      if (!userWallet) {
        return {
          success: false,
          error: 'User wallet not found',
        };
      }

      // Get the private key
      const privateKeyResult = await this.getFairSplitPrivateKeyPrivate(splitWalletId, wallet.creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve private key',
        };
      }

      // Execute transaction using fair split specific method
      const transactionResult = await executeFairSplitTransaction(
        wallet.walletAddress,
        privateKeyResult.privateKey,
        userWallet.address,
        amount,
        wallet.currency,
        `User wallet transfer for ${wallet.id}`,
        'withdrawal'
      );

      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Save transaction to database using centralized helper
      // Note: User wallet transfers are withdrawals, so no points awarded
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        
        await saveTransactionAndAwardPoints({
          userId: wallet.creatorId,
          toAddress: userWallet.address,
          amount: amount,
          signature: transactionResult.signature!,
          transactionType: 'split_wallet_withdrawal',
          companyFee: 0, // No fee for withdrawals
          netAmount: amount,
          memo: `User wallet transfer for ${wallet.id}`,
          currency: wallet.currency as 'USDC' | 'SOL'
        });
        
        logger.info('✅ User wallet transfer transaction saved', {
          signature: transactionResult.signature,
          creatorId: wallet.creatorId,
          splitWalletId,
          amount: amount
        }, 'SplitWalletPayments');
      } catch (saveError) {
        logger.error('❌ Failed to save user wallet transfer transaction', saveError, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }

      logger.info('✅ User wallet transfer completed successfully', {
          splitWalletId,
        userId,
        amount,
        transactionSignature: transactionResult.signature
        }, 'SplitWalletPayments');
        
      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount
      };

    } catch (error) {
      logger.error('Failed to transfer funds to user wallet', error, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Public helper methods (needed by other services)
  static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    return this.getSplitWalletPrivate(splitWalletId);
  }

  static async getFairSplitPrivateKey(splitWalletId: string, creatorId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    return this.getFairSplitPrivateKeyPrivate(splitWalletId, creatorId);
  }

  private static async cleanupSharedPrivateKeyIfAllSettled(
    splitWalletId: string,
    participants: SplitWalletParticipant[]
  ): Promise<void> {
    const allParticipantsSettled = participants.length > 0 && participants.every(
      participant => participant.status === 'paid'
    );

    if (!allParticipantsSettled) {
      return;
    }

    try {
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      await SplitWalletSecurity.deleteSplitWalletPrivateKeyForAllParticipants(
        splitWalletId,
        participants.map(participant => ({
          userId: participant.userId,
          name: participant.name || 'Participant'
        }))
      );

      logger.info('Shared private key cleaned up after settlement', {
        splitWalletId,
        participantsCount: participants.length
      }, 'SplitWalletPayments');
    } catch (error) {
      logger.warn('Failed to cleanup shared private key after settlement', {
        splitWalletId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletPayments');
    }
  }

  static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    return this.getSplitWalletPrivateKeyPrivate(splitWalletId, requesterId);
  }

  /**
   * Reconcile pending transactions - moves confirmed pending transactions to confirmed status
   */
  static async reconcilePendingTransactions(splitWalletId: string): Promise<void> {
    try {
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {return;}
      const wallet = walletResult.wallet;

      const updatedParticipants = [...wallet.participants];
      let changed = false;

      for (let i = 0; i < updatedParticipants.length; i++) {
        const p = updatedParticipants[i] as any;
        if (p.pendingSignature && typeof p.pendingAmount === 'number' && p.pendingAmount > 0) {
          try {
            const confirmed = await verifyTransactionOnBlockchain(p.pendingSignature);
            if (confirmed) {
              const newAmountPaid = (p.amountPaid || 0) + p.pendingAmount;
              updatedParticipants[i] = {
                ...p,
                amountPaid: newAmountPaid,
                pendingSignature: undefined,
                pendingAmount: undefined,
                pendingSince: undefined,
                status: newAmountPaid >= p.amountOwed ? 'locked' : p.status
              };
              changed = true;
            }
          } catch (_) {
            // ignore, will reconcile later
          }
        }
      }

      if (changed) {
        const docId = wallet.firebaseDocId || splitWalletId;
        await this.updateWalletParticipants(docId, updatedParticipants);
      }
    } catch (_) {
      // best effort; ignore errors
    }
  }

  /**
   * Update wallet participants in database
   */
  private static async updateWalletParticipants(docId: string, participants: SplitWalletParticipant[]): Promise<void> {
    try {
      await updateDoc(doc(db, 'splitWallets', docId), {
        participants: participants,
        lastUpdated: new Date().toISOString()
      });
        } catch (error) {
      logger.error('Failed to update wallet participants', error, 'SplitWalletPayments');
      throw error;
    }
  }

  // DEPRECATED: These atomic methods have been moved to SplitWalletAtomicUpdates service
  // Keeping for backward compatibility but should be replaced with SplitWalletAtomicUpdates calls

  // Private helper methods
  private static async getSplitWalletPrivate(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      // First try to get by Firebase document ID
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

      // If not found by Firebase ID, try to find by custom ID
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
      logger.error('Failed to get split wallet', error, 'SplitWalletPayments');
        return {
          success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static async getFairSplitPrivateKeyPrivate(splitWalletId: string, creatorId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      // For fair splits, only the creator can access the private key
      // Use the correct Fair split storage key format
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      return await SplitWalletSecurity.getFairSplitPrivateKey(splitWalletId, creatorId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static async getSplitWalletPrivateKeyPrivate(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      // For degen splits, any participant can access the private key
      // Use the correct SplitWalletSecurity method
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      return await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, requesterId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
