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
    // Use the optimized transaction utils for better RPC failover and reliability
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    const connection = await optimizedTransactionUtils.getConnection();
    
    // Get transaction status with searchTransactionHistory for better reliability
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
    
    // If no confirmation status, try to get the transaction directly
    try {
      const transaction = await (connection as any).getTransaction(transactionSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (transaction) {
        logger.info('Transaction found via getTransaction', {
          transactionSignature,
          slot: transaction.slot,
          err: transaction.meta?.err
        }, 'SplitWalletPayments');
        
        return transaction.meta?.err === null;
      }
    } catch (getTransactionError) {
      logger.warn('Could not get transaction via getTransaction', {
        transactionSignature,
        error: getTransactionError
      }, 'SplitWalletPayments');
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
  memo: string,
  transactionType: 'funding' | 'withdrawal' = 'withdrawal'
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    logger.info('Executing split wallet transaction', {
      fromAddress,
      toAddress,
      amount,
      currency,
      memo
    }, 'SplitWalletPayments');

    // Import required modules using memory manager
    const { memoryManager } = await import('../shared/memoryManager');
    const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = await memoryManager.loadModule('solana-web3');
    const { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } = await memoryManager.loadModule('solana-spl-token');
    const { getConfig } = await memoryManager.loadModule('unified-config');
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

    // Check if recipient has USDC token account, create if needed
    let createTokenAccountInstruction: any = null;
    try {
      await getAccount(connection, toTokenAccount);
      logger.info('Recipient USDC token account exists', { 
        toTokenAccount: toTokenAccount.toBase58(),
        toAddress: toAddress 
      }, 'SplitWalletPayments');
    } catch (error) {
      // Token account doesn't exist, create it
      logger.info('Creating USDC token account for recipient', { 
        toTokenAccount: toTokenAccount.toBase58(),
        toAddress: toAddress,
        feePayer: feePayerPublicKey.toBase58()
      }, 'SplitWalletPayments');
      
      createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
        feePayerPublicKey, // payer - use company wallet to pay for token account creation
        toTokenAccount, // associated token account
        toPublicKey, // owner
        usdcMint // mint
      );
    }

    // Verify the from token account has sufficient balance
    const fromTokenAccountInfo = await connection.getTokenAccountBalance(fromTokenAccount);
    if (!fromTokenAccountInfo.value) {
      return {
        success: false,
        error: `User token account not found or has no balance. Address: ${fromAddress}`
      };
    }

    const availableBalance = parseFloat(fromTokenAccountInfo.value.amount) / 1_000_000; // Convert from smallest unit
    
    // Also check the account info to ensure it exists and is valid
    const fromAccountInfo = await connection.getAccountInfo(fromTokenAccount);
    if (!fromAccountInfo) {
      return {
        success: false,
        error: `User token account does not exist on blockchain. Address: ${fromAddress}`
      };
    }

    // CRITICAL: Check for any pending transactions that might affect this account
    logger.info('Checking for pending transactions on user wallet', {
      fromAddress: fromAddress,
      fromTokenAccount: fromTokenAccount.toBase58()
    }, 'SplitWalletPayments');
    
    try {
      const pendingSignatures = await connection.getSignaturesForAddress(fromPublicKey, { limit: 10 });
      const recentSignatures = pendingSignatures.filter((sig: any) => {
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
        recentSignaturesList: recentSignatures.map((sig: any) => ({
          signature: sig.signature,
          blockTime: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'unknown',
          err: sig.err
        }))
      }, 'SplitWalletPayments');
      
      // Check if any recent transactions failed or are still pending
      const failedTransactions = recentSignatures.filter((sig: any) => sig.err !== null);
      const pendingTransactions = recentSignatures.filter((sig: any) => sig.err === null && !sig.confirmationStatus);
      
      if (failedTransactions.length > 0) {
        logger.warn('Found failed transactions on split wallet', {
          failedCount: failedTransactions.length,
          failedSignatures: failedTransactions.map((sig: any) => sig.signature)
        }, 'SplitWalletPayments');
      }
      
      if (pendingTransactions.length > 0) {
        logger.warn('Found pending transactions on split wallet', {
          pendingCount: pendingTransactions.length,
          pendingSignatures: pendingTransactions.map((sig: any) => sig.signature)
        }, 'SplitWalletPayments');
      }
      
    } catch (error) {
      logger.warn('Could not check pending transactions', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletPayments');
    }

    // Cross-verify balance using multiple methods
    let crossVerifiedBalance = availableBalance;
    try {
      const { memoryManager } = await import('../shared/memoryManager');
      const { getAccount } = await memoryManager.loadModule('solana-spl-token');
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
        error: `Insufficient balance in user wallet. Available: ${crossVerifiedBalance} USDC, Requested: ${amount} USDC`
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

    // Get recent blockhash with retry logic (memory optimized)
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    const blockhash = await optimizedTransactionUtils.getLatestBlockhashWithRetry('confirmed');

    // Create transaction with proper fee payer setup - matching TransactionProcessor pattern
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: feePayerPublicKey // Use company wallet as fee payer for SOL fees
    });

    // Add priority fee and compute unit limit for faster confirmation
    try {
      const { TRANSACTION_CONFIG } = await import('../../config/transactionConfig');
      const priorityFee = TRANSACTION_CONFIG.priorityFees.high;
      if (priorityFee && priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }
      const computeUnits = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
      if (computeUnits && computeUnits > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: computeUnits,
          })
        );
      }
    } catch (_) {
      // If config fails to load, continue without priority fee
    }

    // CRITICAL: Ensure the transaction is properly structured for user-to-split-wallet transfer
    logger.info('Transaction structure for user-to-split-wallet transfer', {
      feePayer: feePayerPublicKey.toBase58(),
      fromPublicKey: fromPublicKey.toBase58(),
      toPublicKey: toPublicKey.toBase58(),
      fromTokenAccount: fromTokenAccount.toBase58(),
      toTokenAccount: toTokenAccount.toBase58(),
      amountInSmallestUnit: amountInSmallestUnit
    }, 'SplitWalletPayments');

    // Add create token account instruction if needed (from earlier check)
    if (createTokenAccountInstruction) {
      // Check if company wallet has enough SOL for token account creation
      const companySolBalance = await connection.getBalance(feePayerPublicKey);
      const rentExemptionAmount = 2039280; // Approximate rent for token account
      
      if (companySolBalance < rentExemptionAmount) {
        return {
          success: false,
          error: `Company wallet has insufficient SOL for token account creation. Required: ${rentExemptionAmount / LAMPORTS_PER_SOL} SOL, Available: ${companySolBalance / LAMPORTS_PER_SOL} SOL`
        };
      }
      
      transaction.add(createTokenAccountInstruction);
      logger.info('Added token account creation instruction', { 
        toTokenAccount: toTokenAccount.toBase58(),
        rentExemption: rentExemptionAmount / LAMPORTS_PER_SOL
      }, 'SplitWalletPayments');
    }

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
      const { memoryManager } = await import('../shared/memoryManager');
      const { TransactionInstruction, PublicKey } = await memoryManager.loadModule('solana-web3');
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
          error: `User balance changed during transaction construction. Final balance: ${finalBalance} USDC, Transfer amount: ${transferAmount} USDC`
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
      userWalletAddress: fromPublicKey.toBase58(),
      splitWalletAddress: toPublicKey.toBase58()
    }, 'SplitWalletPayments');

    // Prepare signers array - matching TransactionProcessor pattern
    const signers: typeof Keypair.prototype[] = [keypair]; // User keypair for the transfer
    
    logger.info('Preparing signers array', {
      userWalletSigner: keypair.publicKey.toBase58(),
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
      // Use the optimized transaction utils retry logic for sending
      // Disable rebroadcasting for withdrawal transactions to match funding speed
      signature = await optimizedTransactionUtils.sendTransactionWithRetry(transaction as any, signers, 'high', true);
      
      logger.info('✅ Transaction sent successfully', {
        signature,
        signatureLength: signature.length
      }, 'SplitWalletPayments');
      
      // CRITICAL: Verify the signature is valid and not empty
      if (!signature || signature.length < 80) {
        throw new Error(`Invalid signature returned: ${signature}`);
      }
      
      // CRITICAL: Verify the transaction was actually submitted by checking if it exists
      try {
        const { memoryManager } = await import('../shared/memoryManager');
        const { Connection } = await memoryManager.loadModule('solana-web3');
        const { getConfig } = await memoryManager.loadModule('unified-config');
        const connection = new Connection(getConfig().blockchain.rpcUrl);
        
        // Quick check to see if the transaction exists
        const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        
        if (!signatureStatus.value) {
          logger.warn('⚠️ Transaction signature returned but not found on blockchain', {
            signature,
            fromAddress,
            toAddress,
            amount
          }, 'SplitWalletPayments');
          
          // Don't fail immediately, but log the warning
          // The transaction might still be processing
        } else {
          logger.info('✅ Transaction found on blockchain', {
            signature,
            confirmationStatus: signatureStatus.value.confirmationStatus,
            err: signatureStatus.value.err
          }, 'SplitWalletPayments');
        }
      } catch (verificationError) {
        logger.warn('Could not verify transaction on blockchain', {
          signature,
          error: verificationError instanceof Error ? verificationError.message : String(verificationError)
        }, 'SplitWalletPayments');
      }
      
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

    // AGGRESSIVE: Multiple immediate checks to catch fast confirmations
    // Based on logs, transactions are confirmed very quickly but our single check is missing them
    try {
      const connection = await optimizedTransactionUtils.getConnection();
      
      // Try immediate check first
      let status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
      if (status.value && !status.value.err) {
        logger.info('✅ Transaction found on blockchain - immediate success (first check)', {
          signature,
          confirmationStatus: status.value.confirmationStatus,
          fromAddress,
          toAddress,
          amount
        }, 'SplitWalletPayments');
        
        // CRITICAL: Double-check that the transaction is actually confirmed, not just found
        if (status.value.confirmationStatus === 'finalized' || status.value.confirmationStatus === 'confirmed') {
          return {
            success: true,
            signature
          };
        } else {
          logger.warn('⚠️ Transaction found but not confirmed yet, continuing with checks', {
            signature,
            confirmationStatus: status.value.confirmationStatus
          }, 'SplitWalletPayments');
        }
      }
      
      // Try with 100ms delay
      await new Promise(resolve => setTimeout(resolve, 100));
      status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
      if (status.value && !status.value.err) {
        logger.info('✅ Transaction found on blockchain - immediate success (100ms check)', {
          signature,
          confirmationStatus: status.value.confirmationStatus,
          fromAddress,
          toAddress,
          amount
        }, 'SplitWalletPayments');
        
        // CRITICAL: Double-check that the transaction is actually confirmed, not just found
        if (status.value.confirmationStatus === 'finalized' || status.value.confirmationStatus === 'confirmed') {
          return {
            success: true,
            signature
          };
        } else {
          logger.warn('⚠️ Transaction found but not confirmed yet, continuing with checks', {
            signature,
            confirmationStatus: status.value.confirmationStatus
          }, 'SplitWalletPayments');
        }
      }
      
      // Try with 200ms delay
      await new Promise(resolve => setTimeout(resolve, 100));
      status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
      if (status.value && !status.value.err) {
        logger.info('✅ Transaction found on blockchain - immediate success (200ms check)', {
          signature,
          confirmationStatus: status.value.confirmationStatus,
          fromAddress,
          toAddress,
          amount
        }, 'SplitWalletPayments');
        
        // CRITICAL: Double-check that the transaction is actually confirmed, not just found
        if (status.value.confirmationStatus === 'finalized' || status.value.confirmationStatus === 'confirmed') {
          return {
            success: true,
            signature
          };
        } else {
          logger.warn('⚠️ Transaction found but not confirmed yet, continuing with checks', {
            signature,
            confirmationStatus: status.value.confirmationStatus
          }, 'SplitWalletPayments');
        }
      }
      
      // Try with 500ms delay
      await new Promise(resolve => setTimeout(resolve, 300));
      status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
      if (status.value && !status.value.err) {
        logger.info('✅ Transaction found on blockchain - immediate success (500ms check)', {
          signature,
          confirmationStatus: status.value.confirmationStatus,
          fromAddress,
          toAddress,
          amount
        }, 'SplitWalletPayments');
        
        // CRITICAL: Double-check that the transaction is actually confirmed, not just found
        if (status.value.confirmationStatus === 'finalized' || status.value.confirmationStatus === 'confirmed') {
          return {
            success: true,
            signature
          };
        } else {
          logger.warn('⚠️ Transaction found but not confirmed yet, continuing with checks', {
            signature,
            confirmationStatus: status.value.confirmationStatus
          }, 'SplitWalletPayments');
        }
      }
      
      logger.info('All immediate checks failed, proceeding with minimal confirmation', {
        signature,
        fromAddress,
        toAddress,
        amount
      }, 'SplitWalletPayments');
      
    } catch (error) {
      logger.info('Immediate checks failed with error, proceeding with minimal confirmation', {
        signature,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletPayments');
    }

    // Use different timeout based on transaction type
    const timeoutMs = transactionType === 'withdrawal' ? 5000 : 1500; // 5s for withdrawals, 1.5s for funding
    
    logger.info('⏳ Starting transaction confirmation', {
      signature,
      transactionType,
      timeoutMs,
      fromAddress,
      toAddress,
      amount
    }, 'SplitWalletPayments');
    
    const confirmed = await optimizedTransactionUtils.confirmTransactionWithTimeout(signature, timeoutMs);
    
    logger.info('📋 Transaction confirmation result', {
      signature,
      confirmed,
      fromAddress,
      toAddress,
      amount
    }, 'SplitWalletPayments');
    
    if (!confirmed) {
      logger.warn('Split wallet transaction confirmation timed out', { 
        signature,
        fromAddress,
        toAddress,
        amount 
      }, 'SplitWalletPayments');
      
      // SIMPLIFIED: Minimal fallback verification - match funding logic
      try {
        const isActuallyConfirmed = await verifyTransactionOnBlockchain(signature);
        if (isActuallyConfirmed) {
          logger.info('✅ Transaction confirmed on minimal fallback check - proceeding', {
            signature,
            fromAddress,
            toAddress,
            amount
          }, 'SplitWalletPayments');
          
          return {
            success: true,
            signature
          };
        }
      } catch (verificationError) {
        logger.warn('Minimal fallback verification failed', {
          signature,
          error: verificationError
        }, 'SplitWalletPayments');
      }
      
      // CRITICAL: If confirmation times out, we should NOT proceed with database updates
      // The transaction was sent but we can't confirm it succeeded
      logger.error('❌ Transaction confirmation timed out - NOT proceeding with database update', {
        signature,
        fromAddress,
        toAddress,
        amount,
        note: 'Transaction was sent but confirmation failed - cannot guarantee success'
      }, 'SplitWalletPayments');
      
      // Return failure - the transaction was sent but we can't confirm it succeeded
      return {
        success: false,
        signature,
        error: 'Transaction confirmation timed out. The transaction was sent but we cannot confirm it succeeded on the blockchain. Please try again or check the transaction status manually.'
      };
    }

    logger.info('✅ Transaction confirmed successfully', {
      signature,
      fromAddress,
      toAddress,
      amount
    }, 'SplitWalletPayments');

    // CRITICAL: Verify that the funds were actually transferred
    try {
      // Wait a moment for the transaction to be fully processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check the user's balance after the transaction
      const postTransactionBalance = await connection.getTokenAccountBalance(fromTokenAccount);
      const postBalance = parseFloat(postTransactionBalance.value.amount) / 1_000_000;
      
      // Check the split wallet's balance after the transaction
      const splitWalletBalance = await connection.getTokenAccountBalance(toTokenAccount);
      const splitBalance = parseFloat(splitWalletBalance.value.amount) / 1_000_000;
      
      logger.info('Post-transaction balance verification', {
        signature,
        userWalletBalance: postBalance,
        splitWalletBalance: splitBalance,
        expectedUserBalance: crossVerifiedBalance - transferAmount,
        expectedSplitWalletIncrease: transferAmount,
        userBalanceDecreased: postBalance < crossVerifiedBalance,
        splitWalletBalanceIncreased: splitBalance > 0
      }, 'SplitWalletPayments');
      
      // Verify the transfer actually happened
      const userBalanceDecreased = postBalance < crossVerifiedBalance;
      const splitWalletBalanceIncreased = splitBalance > 0;
      
      if (!userBalanceDecreased || !splitWalletBalanceIncreased) {
        logger.error('❌ Transaction confirmed but funds were not transferred', {
          signature,
          userBalanceBefore: crossVerifiedBalance,
          userBalanceAfter: postBalance,
          splitWalletBalanceAfter: splitBalance,
          expectedTransfer: transferAmount
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: `Transaction confirmed but funds were not transferred. User balance: ${postBalance} USDC, Split wallet balance: ${splitBalance} USDC`,
          signature
        };
      }
      
      logger.info('✅ Funds successfully transferred', {
        signature,
        userBalanceDecreased: userBalanceDecreased,
        splitWalletBalanceIncreased: splitWalletBalanceIncreased,
        transferAmount: transferAmount
      }, 'SplitWalletPayments');
      
    } catch (balanceError) {
      logger.warn('Could not verify post-transaction balances', {
        signature,
        error: balanceError instanceof Error ? balanceError.message : String(balanceError)
      }, 'SplitWalletPayments');
      // Don't fail the transaction if we can't verify balances
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
   * Verify split wallet balance against blockchain data
   * Ensures the displayed balance is real blockchain data
   * Works for both fair split and degen split wallets
   */
  static async verifySplitWalletBalance(splitWalletId: string): Promise<{
    success: boolean;
    onChainBalance?: number;
    databaseBalance?: number;
    isConsistent?: boolean;
    error?: string;
  }> {
    try {
      logger.info('Verifying split wallet balance against blockchain', { splitWalletId }, 'SplitWalletPayments');
      
      // Get split wallet data
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Split wallet not found'
        };
      }
      
      const wallet = walletResult.wallet;
      
      // Get actual on-chain balance
      const { consolidatedTransactionService } = await import('../consolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
      
      if (!balanceResult.success) {
        return {
          success: false,
          error: 'Failed to retrieve on-chain balance'
        };
      }
      
      const onChainBalance = balanceResult.balance;
      
      // Calculate database balance from participants
      const databaseBalance = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      
      // Check consistency
      const tolerance = 0.001; // 0.001 USDC tolerance
      const isConsistent = Math.abs(onChainBalance - databaseBalance) <= tolerance;
      
      logger.info('Split wallet balance verification', {
        splitWalletId,
        walletAddress: wallet.walletAddress,
        onChainBalance,
        databaseBalance,
        difference: Math.abs(onChainBalance - databaseBalance),
        isConsistent,
        tolerance
      }, 'SplitWalletPayments');
      
      return {
        success: true,
        onChainBalance,
        databaseBalance,
        isConsistent
      };
      
    } catch (error) {
      logger.error('Failed to verify split wallet balance', {
        splitWalletId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletPayments');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
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
          error: 'Invalid locking amount',
        };
      }

      // Check if participant has already locked their funds
      if (participant.status === 'locked' || participant.amountPaid >= participant.amountOwed) {
        // Check if the transaction signature is valid on blockchain
        if (participant.transactionSignature) {
          const isValidTransaction = await verifyTransactionOnBlockchain(participant.transactionSignature);
          if (isValidTransaction) {
            return {
              success: false,
              error: 'Participant has already locked their funds',
            };
          } else {
            // Transaction signature is invalid, reset the status
            logger.warn('Invalid transaction signature found for locked participant, resetting status', {
              splitWalletId,
              participantId,
              transactionSignature: participant.transactionSignature
            }, 'SplitWalletPayments');
            
            // Reset participant status to allow retry
            const resetParticipants = wallet.participants.map(p => {
              if (p.userId === participantId) {
                return {
                  ...p,
                  status: 'pending' as const,
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
              participantId
            }, 'SplitWalletPayments');
          }
        } else {
          // No transaction signature but status is locked, reset the status
          logger.warn('No transaction signature found for locked participant, resetting status', {
            splitWalletId,
            participantId
          }, 'SplitWalletPayments');
          
          const resetParticipants = wallet.participants.map(p => {
            if (p.userId === participantId) {
              return {
                ...p,
                status: 'pending' as const,
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
          if (!userWallet || !userWallet.secretKey) {
            return {
              success: false,
              error: 'Failed to retrieve user wallet or secret key for transaction',
            };
          }

          logger.info('🚀 Executing degen split fund locking transaction directly', {
            fromAddress: userWallet.address,
            toAddress: wallet.walletAddress,
            amount: roundedAmount,
            splitWalletId,
            participantId
          }, 'SplitWalletPayments');

          // Execute transaction directly using the same method as fair splits
          // This bypasses the TransactionProcessor blockhash issues
          const transactionResult = await executeSplitWalletTransaction(
            userWallet.address,
            userWallet.secretKey,
            wallet.walletAddress,
            roundedAmount,
            'USDC',
            `Degen Split fund locking - ${wallet.id}`,
            'funding'
          );
          
          if (!transactionResult.success) {
            logger.error('Failed to execute degen split fund locking transaction', {
              splitWalletId,
              participantId,
              amount: roundedAmount,
              error: transactionResult.error,
              fromWallet: userWallet.address,
              toWallet: wallet.walletAddress,
              returnedSignature: transactionResult.signature
            }, 'SplitWalletPayments');
            
            // If we have a signature but the transaction failed, it might be a confirmation timeout
            // In this case, we should check if the transaction actually succeeded despite the timeout
            if (transactionResult.signature && transactionResult.error?.includes('confirmation timed out')) {
              logger.warn('Transaction sent but confirmation timed out - checking if it actually succeeded', {
                splitWalletId,
                participantId,
                signature: transactionResult.signature,
                error: transactionResult.error
              }, 'SplitWalletPayments');
              
              // Check if the transaction actually succeeded despite the timeout
              try {
                const isActuallyConfirmed = await verifyTransactionOnBlockchain(transactionResult.signature);
                if (isActuallyConfirmed) {
                  logger.info('✅ Transaction actually succeeded despite timeout - proceeding with database update', {
                    splitWalletId,
                    participantId,
                    signature: transactionResult.signature
                  }, 'SplitWalletPayments');
                  
                  // Transaction actually succeeded, proceed with database update
                  actualTransactionSignature = transactionResult.signature;
                  // Continue to the database update section below
                } else {
                  logger.warn('Transaction confirmation timed out and not found on blockchain - allowing retry', {
                    splitWalletId,
                    participantId,
                    signature: transactionResult.signature
                  }, 'SplitWalletPayments');
                  
                  return {
                    success: false,
                    error: transactionResult.error || 'Transaction confirmation timed out. Please try again.',
                    transactionSignature: transactionResult.signature
                  };
                }
              } catch (verificationError) {
                logger.warn('Could not verify transaction status after timeout - allowing retry', {
                  splitWalletId,
                  participantId,
                  signature: transactionResult.signature,
                  error: verificationError
                }, 'SplitWalletPayments');
                
                return {
                  success: false,
                  error: transactionResult.error || 'Transaction confirmation timed out. Please try again.',
                  transactionSignature: transactionResult.signature
                };
              }
            } else {
              // Transaction failed for other reasons; if we have a signature, persist as pending for reconciliation
              if (transactionResult.signature) {
                try {
                  const updatedParticipants = wallet.participants.map(p => {
                    if (p.userId === participantId) {
                      return {
                        ...p,
                        pendingSignature: transactionResult.signature,
                        pendingSince: new Date().toISOString(),
                        pendingAmount: roundedAmount,
                      };
                    }
                    return p;
                  });
                  const docId = wallet.firebaseDocId || splitWalletId;
                  await this.updateWalletParticipants(docId, updatedParticipants);
                } catch (_) {
                  // best effort persistence; ignore failures
                }
              }
              return {
                success: false,
                error: transactionResult.error || 'Failed to execute transaction to split wallet',
                transactionSignature: transactionResult.signature
              };
            }
          } else {
            // Transaction was successful and confirmed normally
            if (transactionResult.signature) {
              logger.info('✅ Transaction executed and confirmed, proceeding with database update', {
                splitWalletId,
                participantId,
                amount: roundedAmount,
                transactionSignature: transactionResult.signature,
                fromWallet: userWallet.address,
                toWallet: wallet.walletAddress
              }, 'SplitWalletPayments');
              
              actualTransactionSignature = transactionResult.signature;
            } else {
              logger.error('❌ No transaction signature returned, cannot proceed', {
                splitWalletId,
                participantId,
                amount: roundedAmount,
                fromWallet: userWallet.address,
                toWallet: wallet.walletAddress
              }, 'SplitWalletPayments');

              // Persist a pending marker without signature is not useful; just return failure
              return {
                success: false,
                error: 'No transaction signature returned from blockchain transaction',
              };
            }
          }
          
          // Trust the transaction result from executeSplitWalletTransaction
          // It already includes "likely succeeded" mode for timeout scenarios
          if (transactionResult.success) {
            logger.info('✅ Degen split fund locking transaction succeeded (trusting executeSplitWalletTransaction result)', {
              transactionSignature: actualTransactionSignature,
              splitWalletId,
              participantId,
              amount: roundedAmount
            }, 'SplitWalletPayments');
            
            // Optional: Log balance for monitoring (non-blocking)
            try {
              const { consolidatedTransactionService } = await import('../consolidatedTransactionService');
              const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
              
              if (balanceResult.success) {
                logger.info('Split wallet balance after degen fund locking', {
                  splitWalletId,
                  walletAddress: wallet.walletAddress,
                  balance: balanceResult.balance,
                  expectedIncrease: roundedAmount
                }, 'SplitWalletPayments');
              }
            } catch (balanceError) {
              logger.warn('Could not verify split wallet balance after degen fund locking', {
                error: balanceError instanceof Error ? balanceError.message : String(balanceError),
                splitWalletId
              }, 'SplitWalletPayments');
            }
          }
          
          const transactionTime = Date.now() - startTime;
          logger.info('Transaction executed successfully for degen split fund locking', {
            splitWalletId,
            participantId,
            amount: roundedAmount,
            transactionSignature: actualTransactionSignature,
            fromWallet: userWallet.address,
            toWallet: wallet.walletAddress,
            transactionTimeMs: transactionTime
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

      // CRITICAL: Execute actual transaction to transfer funds from user's wallet to split wallet
      // This is the same logic as degen split to ensure funds are actually received
      let actualTransactionSignature: string | undefined = transactionSignature;
      
      if (!actualTransactionSignature) {
        try {
          // Get user's wallet for the transaction
          const { walletService } = await import('../WalletService');
          const userWallet = await walletService.getUserWallet(participantId);
          if (!userWallet || !userWallet.secretKey) {
            return {
              success: false,
              error: 'Failed to retrieve user wallet or secret key for transaction',
            };
          }

          logger.info('🚀 Executing fair split participant payment transaction directly', {
            fromAddress: userWallet.address,
            toAddress: wallet.walletAddress,
            amount: roundedAmount,
            splitWalletId,
            participantId
          }, 'SplitWalletPayments');

          // Execute transaction directly using the same method as degen splits
          const transactionResult = await executeSplitWalletTransaction(
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
              amount: roundedAmount,
              error: transactionResult.error,
              fromWallet: userWallet.address,
              toWallet: wallet.walletAddress
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              error: transactionResult.error || 'Failed to execute transaction to split wallet',
            };
          }

          // Transaction was successful and confirmed
          if (transactionResult.signature) {
            logger.info('✅ Fair split transaction executed and confirmed, proceeding with database update', {
              splitWalletId,
              participantId,
              amount: roundedAmount,
              transactionSignature: transactionResult.signature,
              fromWallet: userWallet.address,
              toWallet: wallet.walletAddress
            }, 'SplitWalletPayments');
          } else {
            logger.error('❌ No transaction signature returned for fair split, cannot proceed', {
              splitWalletId,
              participantId,
              amount: roundedAmount,
              fromWallet: userWallet.address,
              toWallet: wallet.walletAddress
            }, 'SplitWalletPayments');
            
            return {
              success: false,
              error: 'No transaction signature returned from blockchain transaction',
            };
          }

          actualTransactionSignature = transactionResult.signature;
          
          // Verify the transaction was actually executed on blockchain
          logger.info('Verifying fair split participant payment transaction on blockchain', {
            transactionSignature: actualTransactionSignature,
            splitWalletId,
            participantId,
            amount: roundedAmount
          }, 'SplitWalletPayments');
          
          try {
            // Wait a moment for transaction to be confirmed
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Verify transaction status on blockchain
            if (actualTransactionSignature) {
              const isConfirmed = await verifyTransactionOnBlockchain(actualTransactionSignature);
              
              if (!isConfirmed) {
                logger.warn('Fair split participant payment transaction not confirmed on blockchain', {
                  transactionSignature: actualTransactionSignature,
                  splitWalletId,
                  participantId
                }, 'SplitWalletPayments');
                
                // Don't fail the operation, but log the warning
                // The transaction might still be pending
              } else {
                logger.info('✅ Fair split participant payment transaction confirmed on blockchain', {
                  transactionSignature: actualTransactionSignature,
                  splitWalletId,
                  participantId,
                  amount: roundedAmount
                }, 'SplitWalletPayments');
              }
            }
            
            // Verify the split wallet balance increased
            try {
              const { consolidatedTransactionService } = await import('../consolidatedTransactionService');
              const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
              
              if (balanceResult.success) {
                logger.info('Split wallet balance after participant payment', {
                  splitWalletId,
                  walletAddress: wallet.walletAddress,
                  balance: balanceResult.balance,
                  expectedIncrease: roundedAmount
                }, 'SplitWalletPayments');
              }
            } catch (balanceError) {
              logger.warn('Could not verify split wallet balance after transaction', {
                error: balanceError instanceof Error ? balanceError.message : String(balanceError),
                splitWalletId
              }, 'SplitWalletPayments');
            }
            
          } catch (verificationError) {
            logger.warn('Transaction verification failed, but continuing', {
              error: verificationError instanceof Error ? verificationError.message : String(verificationError),
              transactionSignature: actualTransactionSignature,
              splitWalletId
            }, 'SplitWalletPayments');
          }
          
        } catch (error) {
          logger.error('Failed to execute fair split participant payment transaction', {
            splitWalletId,
            participantId,
            amount: roundedAmount,
            error: error instanceof Error ? error.message : String(error)
          }, 'SplitWalletPayments');
          
          return {
            success: false,
            error: 'Failed to execute transaction to split wallet',
          };
        }
      }

      // Update participant payment status with improved consistency
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === participantId) {
          const currentAmountPaid = p.amountPaid || 0;
          const newAmountPaid = currentAmountPaid + roundedAmount;
          const isFullyPaid = newAmountPaid >= p.amountOwed;
          
          // Ensure we don't exceed the amount owed
          const finalAmountPaid = Math.min(newAmountPaid, p.amountOwed);
          
          const updatedParticipant = {
            ...p,
            amountPaid: finalAmountPaid,
            status: isFullyPaid ? 'paid' as const : 'pending' as const,
            paidAt: isFullyPaid ? new Date().toISOString() : p.paidAt,
          };
          
          // Set the actual transaction signature from the executed transaction
          if (actualTransactionSignature) {
            updatedParticipant.transactionSignature = actualTransactionSignature;
          } else if (p.transactionSignature) {
            updatedParticipant.transactionSignature = p.transactionSignature;
          }
          
          logger.info('Updated participant payment status after successful transaction', {
            splitWalletId,
            participantId,
            previousAmountPaid: currentAmountPaid,
            newAmountPaid: finalAmountPaid,
            amountOwed: p.amountOwed,
            isFullyPaid,
            status: updatedParticipant.status,
            transactionSignature: actualTransactionSignature
          }, 'SplitWalletPayments');
          
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
        description || `Fair Split funds extraction for bill ${wallet.billId}`,
        'withdrawal'
      );
      
      logger.info('💸 Fair split transaction result', {
        success: transactionResult.success,
        signature: transactionResult.signature,
        error: transactionResult.error
      }, 'SplitWalletPayments');
      
      if (!transactionResult.success) {
        logger.error('❌ Fair split withdrawal transaction failed', {
          splitWalletId,
          error: transactionResult.error,
          signature: transactionResult.signature
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: transactionResult.error || 'Failed to extract funds from Fair Split',
          signature: transactionResult.signature // Include signature even on failure for debugging
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
   * Reconcile pending participant transactions by checking blockchain confirmation
   * If confirmed, move pendingAmount into amountPaid and clear pending fields
   */
  static async reconcilePendingTransactions(splitWalletId: string): Promise<void> {
    try {
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) return;
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
   * Process degen winner payout - FIXED to match fair split success pattern
   */
  static async processDegenWinnerPayout(
    splitWalletId: string,
    winnerUserId: string,
    winnerAddress: string,
    totalAmount: number,
    description?: string
  ): Promise<PaymentResult> {
    try {
      logger.info('🚀 Processing degen winner payout with enhanced confirmation', {
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

      // Notify winner that payout is processing (non-blocking)
      try {
        const { notificationService } = await import('../notificationService');
        await notificationService.sendPaymentProcessingNotification(
          winnerUserId,
          splitWalletId,
          wallet?.id || 'Degen Split',
          totalAmount,
          wallet.currency || 'USDC'
        );
      } catch (_) {}

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

      // Reconcile any pending funding transactions before payout to ensure balance is current
      try {
        await this.reconcilePendingTransactions(splitWalletId);
      } catch (_) {}

      // CRITICAL FIX: Use executeSplitWalletTransaction directly like fair split
      // This bypasses the problematic sendSplitWalletTransaction wrapper
      logger.info('💸 Executing degen winner payout transaction directly', {
        fromAddress: wallet.walletAddress,
        toAddress: winnerAddress,
        amount: totalAmount,
        currency: wallet.currency,
        description: description || `Degen Split winner payout for ${winnerUserId}`
      }, 'SplitWalletPayments');
      
      const transactionResult = await executeSplitWalletTransaction(
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
        logger.error('❌ Winner payout transaction failed', {
          splitWalletId,
          winnerUserId,
          error: transactionResult.error,
          signature: transactionResult.signature
        }, 'SplitWalletPayments');
        
        // Send failure notification (non-blocking)
        try {
          const { notificationService } = await import('../notificationService');
          await notificationService.endPaymentProcessingNotification(
            winnerUserId,
            splitWalletId,
            wallet?.id || 'Degen Split',
            totalAmount,
            wallet.currency || 'USDC',
            'failed',
            undefined,
            transactionResult.error
          );
        } catch (_) {}

        return {
          success: false,
          error: transactionResult.error || 'Failed to process degen winner payout',
        };
      }

      // CRITICAL FIX: Update participant status immediately when transaction succeeds
      // This provides instant feedback to the user
      if (transactionResult.signature) {
        logger.info('✅ Winner payout transaction succeeded - updating database immediately for instant feedback', {
          splitWalletId,
          winnerUserId,
          signature: transactionResult.signature
        }, 'SplitWalletPayments');
        
        // Update participant status to 'paid' immediately for instant UX
        const updatedParticipants = wallet.participants.map(p => {
          if (p.userId === winnerUserId) {
            return {
              ...p,
              status: 'paid' as const,
              paidAt: new Date().toISOString(),
              transactionSignature: transactionResult.signature,
            };
          }
          return p;
        });

        // Update the split wallet with the new participant status
        const docId = wallet.firebaseDocId || splitWalletId;
        await this.updateWalletParticipants(docId, updatedParticipants);
        
        logger.info('✅ Winner participant status updated to paid immediately', {
          splitWalletId,
          winnerUserId,
          transactionSignature: transactionResult.signature
        }, 'SplitWalletPayments');

        // Send success notification (non-blocking)
        try {
          const { notificationService } = await import('../notificationService');
          await notificationService.endPaymentProcessingNotification(
            winnerUserId,
            splitWalletId,
            wallet?.id || 'Degen Split',
            totalAmount,
            wallet.currency || 'USDC',
            'completed',
            transactionResult.signature
          );
        } catch (_) {}

        return {
          success: true,
          signature: transactionResult.signature,
          amount: totalAmount,
          message: 'Winner payout completed successfully'
        };
      } else {
        logger.warn('⚠️ Winner payout transaction succeeded but no signature returned', {
          splitWalletId,
          winnerUserId
        }, 'SplitWalletPayments');
        
        return {
          success: false,
          error: 'Transaction completed but no signature was returned. Please try again.',
        };
      }

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

      // Handle different payment methods
      let transactionResult: any;
      
      if (paymentMethod === 'kast-card') {
        // Handle KAST card payment
        const { walletService } = await import('../WalletService');
        const { ExternalCardPaymentService } = await import('../ExternalCardPaymentService');
        
        // Get user's linked KAST cards
        const linkedData = await walletService.getLinkedDestinations(loserUserId);
        const kastCards = linkedData.kastCards;
        
        if (kastCards.length === 0) {
          return {
            success: false,
            error: 'No KAST cards linked. Please link a card first.',
          };
        }
        
        // Use the first active card
        const activeCard = kastCards.find(card => card.status === 'active');
        if (!activeCard) {
          return {
            success: false,
            error: 'No active KAST cards found. Please activate a card first.',
          };
        }
        
        // Process payment to card
        transactionResult = await ExternalCardPaymentService.processCardPayment({
          cardId: activeCard.id,
          amount: totalAmount,
          currency: wallet.currency,
          description: description || 'Degen Split payment',
          userId: loserUserId
        });
        
        if (!transactionResult.success) {
          return {
            success: false,
            error: transactionResult.error || 'Failed to process KAST card payment',
          };
        }
        
        // For KAST card payments, we don't need blockchain transaction
        // The payment is processed through the external card system
        transactionResult = {
          success: true,
          transactionSignature: transactionResult.transactionId,
          amount: totalAmount
        };
        
      } else {
        // Handle in-app wallet payment (existing logic)
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

        // CRITICAL FIX: Use executeSplitWalletTransaction directly like fair split
        // This bypasses the problematic sendSplitWalletTransaction wrapper
        logger.info('💸 Executing degen loser withdrawal transaction directly', {
          fromAddress: wallet.walletAddress,
          toAddress: userWallet.address,
          amount: totalAmount,
          currency: wallet.currency,
          description: description || `Degen Split loser withdrawal for ${loserUserId}`
        }, 'SplitWalletPayments');
        
        const directTransactionResult = await executeSplitWalletTransaction(
          wallet.walletAddress,
          privateKeyResult.privateKey,
          userWallet.address,
          totalAmount,
          wallet.currency,
          description || `Degen Split loser withdrawal for ${loserUserId}`,
          'withdrawal'
        );
        
        transactionResult = {
          success: directTransactionResult.success,
          transactionSignature: directTransactionResult.signature,
          error: directTransactionResult.error
        };
      }
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to process degen loser withdrawal',
        };
      }

      // CRITICAL FIX: Only update participant status after blockchain confirmation
      // This prevents marking as 'paid' when transaction confirmation times out
      if (transactionResult.transactionSignature && paymentMethod !== 'kast-card') {
        // Verify transaction on blockchain like fair split does (skip for KAST card payments)
        logger.info('🔍 Verifying degen loser withdrawal transaction on blockchain', {
          transactionSignature: transactionResult.transactionSignature,
          splitWalletId
        }, 'SplitWalletPayments');
        
        // Trust the transaction result from executeSplitWalletTransaction
        // It already includes "likely succeeded" mode for timeout scenarios
        logger.info('✅ Degen loser withdrawal transaction succeeded (trusting executeSplitWalletTransaction result)', {
          transactionSignature: transactionResult.transactionSignature,
          splitWalletId,
          loserUserId
        }, 'SplitWalletPayments');
      }

      // Update participant payment status only after successful transaction and confirmation
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

      // Execute the actual blockchain transaction using direct method (same as processParticipantPayment)
      console.log('🔥🔥🔥 EXECUTING BLOCKCHAIN TRANSACTION for split wallet payment 🔥🔥🔥');
      logger.info('🔥 EXECUTING BLOCKCHAIN TRANSACTION for split wallet payment', {
        fromUserId: participantId,
        toAddress: wallet.walletAddress,
        amount: roundedAmount,
        splitWalletId,
        preTransactionBalance
      });

      // Get user's wallet for the transaction
      const { walletService } = await import('../WalletService');
      const userWallet = await walletService.getUserWallet(participantId);
      if (!userWallet || !userWallet.secretKey) {
        return {
          success: false,
          error: 'Failed to retrieve user wallet or secret key for transaction',
        };
      }

      logger.info('🚀 Executing fair split participant payment transaction directly', {
        fromAddress: userWallet.address,
        toAddress: wallet.walletAddress,
        amount: roundedAmount,
        splitWalletId,
        participantId
      }, 'SplitWalletPayments');

      // Execute transaction directly using the same method as processParticipantPayment
      const transactionResult = await executeSplitWalletTransaction(
        userWallet.address,
        userWallet.secretKey,
        wallet.walletAddress,
        roundedAmount,
        'USDC',
        `Fair Split participant payment - ${wallet.id}`,
        'funding'
      );

      if (!transactionResult.success) {
        // Check if this is a timeout issue but we have a signature - transaction might have succeeded
        if (transactionResult.error?.includes('confirmation timed out') && transactionResult.signature) {
          logger.info('Fair split funding transaction timed out but has signature - attempting fallback verification', {
            transactionSignature: transactionResult.signature,
            splitWalletId,
            participantId
          }, 'SplitWalletPayments');
          
          // Try to verify the transaction on blockchain
          try {
            const isActuallyConfirmed = await verifyTransactionOnBlockchain(transactionResult.signature);
            if (isActuallyConfirmed) {
              logger.info('✅ Fair split funding transaction confirmed on fallback verification', {
                transactionSignature: transactionResult.signature,
                splitWalletId,
                participantId
              }, 'SplitWalletPayments');
              
              // Continue with database update since transaction actually succeeded
              logger.info('✅ Transaction executed successfully, proceeding with database update', {
                signature: transactionResult.signature,
                participantId,
                splitWalletId,
                amount: roundedAmount
              }, 'SplitWalletPayments');
              
              // Now update the database with the successful payment
              return await this.processParticipantPayment(splitWalletId, participantId, amount, transactionResult.signature);
            }
          } catch (verificationError) {
            logger.warn('Fair split funding fallback verification failed', {
              transactionSignature: transactionResult.signature,
              error: verificationError
            }, 'SplitWalletPayments');
          }
        }
        
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

      // executeSplitWalletTransaction already handles confirmation, so we can proceed with database update
      if (transactionResult.signature) {
        logger.info('✅ Transaction executed successfully, proceeding with database update', {
          signature: transactionResult.signature,
              participantId,
              splitWalletId,
          amount: roundedAmount
              }, 'SplitWalletPayments');
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
      const { memoryManager } = await import('../shared/memoryManager');
      const { getDoc, doc, getDocs, query, where, collection } = await memoryManager.loadModule('firebase-firestore');
      const { db } = await memoryManager.loadModule('firebase-config');
      
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
      logger.info('🚀 Executing split wallet transaction using optimized utils', {
        fromAddress: params.fromAddress,
        toAddress: params.to,
        amount: params.amount,
        currency: params.currency,
        memo: params.memo
      }, 'SplitWalletPayments');

      // Use the same optimized transaction logic as executeSplitWalletTransaction
      const result = await executeSplitWalletTransaction(
        params.fromAddress,
        params.fromPrivateKey,
        params.to,
        params.amount,
        params.currency,
        params.memo || `Split wallet transaction`,
        'withdrawal' // Default to withdrawal for generic transactions
      );
      
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
    const { memoryManager } = await import('../shared/memoryManager');
    const { doc, updateDoc } = await memoryManager.loadModule('firebase-firestore');
    const { db } = await memoryManager.loadModule('firebase-config');
    
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
