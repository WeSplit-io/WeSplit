/**
 * Split Wallet Payments Service - CLEAN VERSION
 * Handles all payment operations for split wallets with clear separation between fair and degen splits
 * Part of the modularized SplitWalletService
 */

import { Platform } from 'react-native';
import { consolidatedTransactionService } from '../transaction';
import { logger } from '../core';
import { FeeService } from '../../config/constants/feeConfig';
import { roundUsdcAmount } from '../../utils/ui/format';
import { doc, updateDoc, collection, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult, PaymentResult } from './types';
import { KeypairUtils } from '../shared/keypairUtils';
import { ValidationUtils } from '../shared/validationUtils';
import { BalanceUtils } from '../shared/balanceUtils';

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
      const mintPublicKey = new PublicKey(currency === 'USDC' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : currency);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Check if destination token account exists
    try {
      await getAccount(connection, toTokenAccount);
    } catch (error) {
        // Create associated token account if it doesn't exist
        // Use company wallet as payer since it's the fee payer
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyPublicKey = new PublicKey(COMPANY_WALLET_CONFIG.address);
        
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
      // Collect 1.5% company fee for funding splits
      const { FeeService } = await import('../../config/constants/feeConfig');
      const { fee: companyFee } = FeeService.calculateCompanyFee(amount, 'split_payment');
      companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
      
      // Add company fee transfer instruction to company wallet
      if (companyFeeAmount > 0) {
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(COMPANY_WALLET_CONFIG.address));
        
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
        
        // Reduce transfer amount by company fee (recipient gets less)
        transferAmount = transferAmount - companyFeeAmount;
        
        logger.info('Added company fee for split funding', {
          amount,
          companyFee,
          companyFeeAmount,
          transferAmount
        }, 'SplitWalletPayments');
      }
    }

    // Add transfer instruction (recipient gets the amount minus company fee for funding)
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

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    
    // Use company wallet as fee payer
    const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
    const companyWalletAddress = COMPANY_WALLET_CONFIG.address;
    const companyWalletSecretKey = COMPANY_WALLET_CONFIG.secretKey;
    
    if (!companyWalletAddress || !companyWalletSecretKey) {
      return {
        success: false,
        error: 'Company wallet not configured for fee payment'
      };
    }
    
    const companyPublicKey = new PublicKey(companyWalletAddress);
    transaction.feePayer = companyPublicKey;
    
    // Create company keypair for signing
    const companyKeypairResult = KeypairUtils.createKeypairFromSecretKey(companyWalletSecretKey);
    if (!companyKeypairResult.success || !companyKeypairResult.keypair) {
      return {
        success: false,
        error: 'Failed to create company wallet keypair for fee payment'
      };
    }
    const companyKeypair = companyKeypairResult.keypair;

    // Sign with both keypairs (user for USDC transfer, company for fees)
    transaction.sign(keypair, companyKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'processed', // Use 'processed' for faster confirmation
      maxRetries: 2 // Reduced retries for faster processing
    });

    logger.info('Fair split transaction sent successfully', {
      signature,
            fromAddress,
            toAddress,
            amount,
      currency,
      transactionType
    }, 'SplitWalletPayments');
    
    // For fair splits, use fast confirmation strategy
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 5; // Reduced attempts for faster processing
    const waitTime = 500; // Reduced wait time to 500ms

    while (!confirmed && attempts < maxAttempts) {
      try {
        const status = await connection.getSignatureStatus(signature, { 
          searchTransactionHistory: true 
        });
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          confirmed = true;
          logger.info('Fair split transaction confirmed', {
            signature,
            confirmationStatus: status.value.confirmationStatus,
            attempts
          }, 'SplitWalletPayments');
        } else if (status.value?.err) {
          logger.error('Fair split transaction failed', {
                signature,
            error: status.value.err
              }, 'SplitWalletPayments');
            return {
              success: false,
                  signature,
            error: `Transaction failed: ${JSON.stringify(status.value.err)}`
          };
        }
      } catch (error) {
        logger.warn('Error checking fair split transaction status', {
                signature,
          attempt: attempts + 1,
          error
              }, 'SplitWalletPayments');
            }
      
      if (!confirmed) {
        await new Promise(resolve => setTimeout(resolve, waitTime)); // Wait 500ms
        attempts++;
      }
    }

    if (!confirmed) {
      logger.warn('Fair split transaction confirmation timed out - using likely succeeded mode', {
              signature,
        attempts
            }, 'SplitWalletPayments');
            
      // For fair splits, if the transaction was sent successfully, assume it succeeded
            return {
            success: true,
              signature,
        error: 'Transaction confirmation timed out but likely succeeded'
      };
    }

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
      const mintPublicKey = new PublicKey(currency === 'USDC' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : currency);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Check if destination token account exists
      try {
        await getAccount(connection, toTokenAccount);
      } catch (error) {
        // Create associated token account if it doesn't exist
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyPublicKey = new PublicKey(COMPANY_WALLET_CONFIG.address);
        
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
        // Collect 1.5% company fee for funding splits
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount, 'split_payment');
        companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
        
        // Add company fee transfer instruction to company wallet
        if (companyFeeAmount > 0) {
          const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
          const companyTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(COMPANY_WALLET_CONFIG.address));
          
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
          
          // Reduce transfer amount by company fee (recipient gets less)
          transferAmount = transferAmount - companyFeeAmount;
          
          logger.info('Added company fee for split funding (fast)', {
            amount,
            companyFee,
            companyFeeAmount,
            transferAmount
          }, 'SplitWalletPayments');
        }
      }

      // Add transfer instruction (recipient gets the amount minus company fee for funding)
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
      }
    }

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('processed'); // Use 'processed' for speed
    transaction.recentBlockhash = blockhash;
    
    // Use company wallet as fee payer
    const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
    const companyWalletAddress = COMPANY_WALLET_CONFIG.address;
    const companyWalletSecretKey = COMPANY_WALLET_CONFIG.secretKey;
    
    if (!companyWalletAddress || !companyWalletSecretKey) {
      return {
        success: false,
        error: 'Company wallet not configured for fee payment'
      };
    }
    
    const companyPublicKey = new PublicKey(companyWalletAddress);
    transaction.feePayer = companyPublicKey;
    
    // Create company keypair for signing
    const companyKeypairResult = KeypairUtils.createKeypairFromSecretKey(companyWalletSecretKey);
    if (!companyKeypairResult.success || !companyKeypairResult.keypair) {
      return {
        success: false,
        error: 'Failed to create company wallet keypair for fee payment'
      };
    }
    const companyKeypair = companyKeypairResult.keypair;

    // Sign with both keypairs (user for USDC transfer, company for fees)
    transaction.sign(keypair, companyKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'processed', // Use 'processed' for fastest confirmation
      maxRetries: 1 // Minimal retries for speed
    });

    logger.info('Fast transaction sent successfully', {
      signature,
      fromAddress,
      toAddress,
      amount,
      currency,
      transactionType
    }, 'SplitWalletPayments');

    // For fast transactions, use minimal confirmation strategy
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 3; // Very few attempts for speed
    const waitTime = 300; // Very short wait time

    while (!confirmed && attempts < maxAttempts) {
      try {
        const status = await connection.getSignatureStatus(signature, { 
          searchTransactionHistory: true 
        });
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          confirmed = true;
          logger.info('Fast transaction confirmed', {
            signature,
            confirmationStatus: status.value.confirmationStatus,
            attempts
          }, 'SplitWalletPayments');
        } else if (status.value?.err) {
          logger.error('Fast transaction failed', {
            signature,
            error: status.value.err
          }, 'SplitWalletPayments');
          return {
            success: false,
            signature,
            error: `Transaction failed: ${JSON.stringify(status.value.err)}`
          };
        }
      } catch (error) {
        logger.warn('Error checking fast transaction status', {
          signature,
          attempt: attempts + 1,
          error
        }, 'SplitWalletPayments');
      }
          
      if (!confirmed) {
        await new Promise(resolve => setTimeout(resolve, waitTime)); // Wait 300ms
        attempts++;
      }
    }

    if (!confirmed) {
      logger.warn('Fast transaction confirmation timed out - using likely succeeded mode', {
        signature,
        attempts
      }, 'SplitWalletPayments');
        
      // For fast transactions, if sent successfully, assume it succeeded
      return {
        success: true,
        signature,
        error: 'Transaction confirmation timed out but likely succeeded'
      };
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
    logger.info('Executing degen split transaction', {
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
      const mintPublicKey = new PublicKey(currency === 'USDC' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : currency);
      
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Check if destination token account exists
      try {
        await getAccount(connection, toTokenAccount);
    } catch (error) {
        // Create associated token account if it doesn't exist
        // Use company wallet as payer since it's the fee payer
        const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
        const companyPublicKey = new PublicKey(COMPANY_WALLET_CONFIG.address);
        
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
        // Collect 1.5% company fee for funding splits
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount, 'split_payment');
        companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
        
        // Add company fee transfer instruction to company wallet
        if (companyFeeAmount > 0) {
          const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
          const companyTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(COMPANY_WALLET_CONFIG.address));
          
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
          
          // Reduce transfer amount by company fee (recipient gets less)
          transferAmount = transferAmount - companyFeeAmount;
          
          logger.info('Added company fee for split funding (degen)', {
            amount,
            companyFee,
            companyFeeAmount,
            transferAmount
          }, 'SplitWalletPayments');
        }
      }

      // Add transfer instruction (recipient gets the amount minus company fee for funding)
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

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    
    // Use company wallet as fee payer
    const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
    const companyWalletAddress = COMPANY_WALLET_CONFIG.address;
    const companyWalletSecretKey = COMPANY_WALLET_CONFIG.secretKey;
    
    if (!companyWalletAddress || !companyWalletSecretKey) {
            return {
        success: false,
        error: 'Company wallet not configured for fee payment'
      };
    }
    
    const companyPublicKey = new PublicKey(companyWalletAddress);
    transaction.feePayer = companyPublicKey;
    
    // Create company keypair for signing
    const companyKeypairResult = KeypairUtils.createKeypairFromSecretKey(companyWalletSecretKey);
    if (!companyKeypairResult.success || !companyKeypairResult.keypair) {
        return {
        success: false,
        error: 'Failed to create company wallet keypair for fee payment'
      };
    }
    const companyKeypair = companyKeypairResult.keypair;

    // Sign with both keypairs (user for USDC transfer, company for fees)
    transaction.sign(keypair, companyKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'processed', // Use 'processed' for faster confirmation
      maxRetries: 2 // Reduced retries for faster processing
    });

    logger.info('Degen split transaction sent successfully', {
            signature,
            fromAddress,
            toAddress,
            amount,
      currency,
              transactionType
          }, 'SplitWalletPayments');

    // For degen splits, use fast confirmation strategy
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 5; // Reduced attempts for faster processing
    const waitTime = 500; // Reduced wait time to 500ms

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
        }
      } catch (error) {
        logger.warn('Error checking degen split transaction status', {
          signature,
          attempt: attempts + 1,
          error
        }, 'SplitWalletPayments');
          }
          
      if (!confirmed) {
        await new Promise(resolve => setTimeout(resolve, waitTime)); // Wait 500ms
        attempts++;
      }
    }

    if (!confirmed) {
      logger.warn('Degen split transaction confirmation timed out - using likely succeeded mode', {
          signature,
        attempts
        }, 'SplitWalletPayments');
        
      // For degen splits, if the transaction was sent successfully, assume it succeeded
        return {
          success: true,
          signature,
        error: 'Transaction confirmation timed out but likely succeeded'
      };
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
          const { walletService } = await import('../wallet');
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
        const { balanceUtils } = await import('../shared/balanceUtils');
        const { PublicKey } = await import('@solana/web3.js');
        const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const userBalance = await balanceUtils.getUsdcBalance(new PublicKey(userWallet.address), usdcMint);
        logger.info('User USDC balance check for degen split funding', {
          splitWalletId,
          participantId,
          userWalletAddress: userWallet.address,
          userUsdcBalance: userBalance.balance,
          requiredAmount: roundedAmount,
          hasSufficientBalance: userBalance.balance >= roundedAmount
        }, 'SplitWalletPayments');

        if (userBalance.balance < roundedAmount) {
          return {
            success: false,
            error: `Insufficient USDC balance. You have ${userBalance.balance.toFixed(6)} USDC but need ${roundedAmount.toFixed(6)} USDC.`
          };
        }
      } catch (balanceError) {
        logger.warn('Failed to check user USDC balance, proceeding with transaction', {
          splitWalletId,
          participantId,
          error: balanceError instanceof Error ? balanceError.message : String(balanceError)
        }, 'SplitWalletPayments');
        // Continue with transaction even if balance check fails
      }

      // Execute transaction using degen split specific method
      logger.info('Starting degen split fund locking transaction', {
        splitWalletId,
        participantId,
        fromAddress: userWallet.address,
        toAddress: wallet.walletAddress,
        amount: roundedAmount,
        currency: 'USDC'
      }, 'SplitWalletPayments');

      const transactionResult = await executeDegenSplitTransaction(
            userWallet.address,
        userWallet.secretKey || '',
            wallet.walletAddress,
            roundedAmount,
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
          
          // CRITICAL FIX: For funding transactions, use "likely succeeded" mode when not found on blockchain
          // This matches the behavior of fair split funding for consistency
          if (!transactionResult.success) {
            if (transactionResult.error?.includes('not found on blockchain') || 
                transactionResult.error?.includes('likely rejected')) {
              logger.warn('⚠️ Degen split funding transaction not found on blockchain - using "likely succeeded" mode', {
                splitWalletId,
                participantId,
                error: transactionResult.error,
                signature: transactionResult.signature
              }, 'SplitWalletPayments');
              
              // Use "likely succeeded" mode for degen split funding when not found on blockchain
              // Continue to the database update section below
            } else {
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

      // Update wallet in database using Firebase document ID
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString()
      });

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
      console.error('🔍 SplitWalletPayments: Error processing degen split fund locking:', error);
      logger.error('Failed to process degen split fund locking', error, 'SplitWalletPayments');
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
      const { walletService } = await import('../wallet');
      const userWallet = await walletService.getWalletInfo(participantId);
      if (!userWallet || !userWallet.secretKey) {
        return {
          success: false,
          error: 'User wallet not found or missing private key. Please ensure you have a wallet set up.',
        };
      }

      // Check user's USDC balance before attempting transaction
      try {
        const { BalanceUtils } = await import('../shared/balanceUtils');
        const { PublicKey } = await import('@solana/web3.js');
        const { getConfig } = await import('../../config/unified');
        
        const userPublicKey = new PublicKey(userWallet.address);
        const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
        
        const balanceResult = await BalanceUtils.getUsdcBalance(userPublicKey, usdcMint);
        const userUsdcBalance = balanceResult.balance;
        
        logger.info('User USDC balance check', {
          participantId,
          userAddress: userWallet.address,
          userUsdcBalance,
          paymentAmount: roundedAmount
        }, 'SplitWalletPayments');
        
        if (userUsdcBalance < roundedAmount) {
            return {
              success: false,
            error: `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${roundedAmount.toFixed(6)} USDC to make this payment. Please add USDC to your wallet first.`,
          };
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

      // Update wallet in database using Firebase document ID
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString()
      });

      logger.info('Fair split participant payment completed successfully', {
        splitWalletId,
        participantId,
        amount: roundedAmount,
        transactionSignature: transactionResult.signature
        }, 'SplitWalletPayments');

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
      if (!balanceResult.success || !balanceResult.balance) {
        return {
          success: false,
          error: 'Failed to get split wallet balance',
        };
      }

      const availableBalance = balanceResult.balance;
      
      // For fair split withdrawals, leave a small buffer to prevent transaction rejection
      const minimumBuffer = 0.000001; // 0.000001 USDC buffer
      const withdrawalAmount = Math.max(0, availableBalance - minimumBuffer);
      
      if (withdrawalAmount <= 0) {
        return {
          success: false,
          error: 'Insufficient balance for withdrawal',
        };
      }

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
        error: transactionResult.error
      }, 'SplitWalletPayments');
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Transaction failed',
        };
      }

      // Update wallet status to 'completed'
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
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
            totalAmount,
            wallet.currency,
            description || `Degen Split winner payout for ${winnerUserId}`,
            'withdrawal'
          )
        : await executeDegenSplitTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            winnerAddress,
            totalAmount,
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

      // Update winner participant status to 'paid'
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === winnerUserId 
          ? { 
              ...p,
              status: 'paid' as const,
              amountPaid: totalAmount,
              transactionSignature: transactionResult.signature,
              paidAt: new Date().toISOString()
            }
          : p
      );

      // Update wallet status to 'completed'
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        participants: updatedParticipants,
        status: 'completed',
        completedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      logger.info('✅ Degen winner payout completed successfully', {
          splitWalletId,
          winnerUserId,
        winnerAddress,
        amount: totalAmount,
          transactionSignature: transactionResult.signature
        }, 'SplitWalletPayments');

        return {
          success: true,
        transactionSignature: transactionResult.signature,
        amount: totalAmount
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
   * Process degen loser payment (refund) - Fast Mode
   */
  static async processDegenLoserPayment(
    splitWalletId: string,
    loserUserId: string,
    totalAmount: number,
    description?: string,
    fastMode: boolean = true
  ): Promise<PaymentResult> {
    try {
      logger.info('🚀 Processing degen loser payment', {
        splitWalletId,
        loserUserId,
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

      // Find loser participant
      const loserParticipant = wallet.participants.find(p => p.userId === loserUserId);
      if (!loserParticipant) {
        return {
          success: false,
          error: 'Loser not found in split wallet participants',
        };
      }

      if (loserParticipant.status === 'paid') {
        return {
          success: false,
          error: 'Loser has already received their refund',
        };
      }

      // Get user wallet
        const { walletService } = await import('../wallet');
        const userWallet = await walletService.getWalletInfo(loserUserId);
        if (!userWallet) {
          return {
            success: false,
          error: 'User wallet not found. Please ensure you have a wallet set up.',
        };
      }

      // Get the private key using degen split specific logic
      const privateKeyResult = await this.getSplitWalletPrivateKeyPrivate(splitWalletId, loserUserId);
      
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
            userWallet.address,
            totalAmount,
            wallet.currency,
            description || `Degen Split loser refund for ${loserUserId}`,
            'withdrawal'
          )
        : await executeDegenSplitTransaction(
            wallet.walletAddress,
            privateKeyResult.privateKey,
            userWallet.address,
            totalAmount,
            wallet.currency,
            description || `Degen Split loser refund for ${loserUserId}`,
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

      // Update loser participant status to 'paid'
      const updatedParticipants = wallet.participants.map(p => 
        p.userId === loserUserId 
          ? { 
            ...p,
            status: 'paid' as const,
              amountPaid: totalAmount,
              transactionSignature: transactionResult.signature,
              paidAt: new Date().toISOString()
            }
          : p
      );

      // Update wallet in database using Firebase document ID
      const firebaseDocId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString()
      });

      logger.info('✅ Degen loser payment completed successfully', {
        splitWalletId,
        loserUserId,
        amount: totalAmount,
        transactionSignature: transactionResult.signature
      }, 'SplitWalletPayments');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: totalAmount
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
      const { walletService } = await import('../wallet');
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
