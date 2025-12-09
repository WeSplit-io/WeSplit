/**
 * Consolidated Transaction Utilities
 * Unified service combining optimized utils, rebuild logic, and verification
 * Reduces code duplication and simplifies transaction handling
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  Keypair,
  PublicKey,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { getConfig } from '../../config/unified';
import { logger } from '../analytics/loggingService';
import { getFreshBlockhash, isBlockhashTooOld, BLOCKHASH_MAX_AGE_MS, shouldRebuildTransaction } from './blockhashUtils';

// ===== TYPES =====

export interface TransactionOptions {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  confirmationStatus?: 'confirmed' | 'finalized' | 'pending';
  confirmations?: number;
  slot?: number;
  note?: string;
}

export interface VerificationOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  useDelayedCheck?: boolean;
  delayedCheckWaitMs?: number;
}

// ===== CONNECTION MANAGEMENT (from transactionUtilsOptimized) =====

class TransactionUtils {
  private static instance: TransactionUtils;
  private connection: Connection | null = null;
  private currentEndpointIndex = 0;
  private readonly endpoints: string[];

  private constructor() {
    // Initialize with RPC endpoints from config
    this.endpoints = [
      getConfig().blockchain.rpcUrl,
      // Add fallback endpoints if available
      ...(getConfig().blockchain.fallbackRpcUrls || [])
    ];
  }

  public static getInstance(): TransactionUtils {
    if (!TransactionUtils.instance) {
      TransactionUtils.instance = new TransactionUtils();
    }
    return TransactionUtils.instance;
  }

  /**
   * Get optimized connection with endpoint rotation
   */
  public async getConnection(): Promise<Connection> {
    if (!this.connection) {
      await this.createConnection();
    }
    return this.connection!;
  }

  /**
   * Create connection with current endpoint
   */
  private async createConnection(): Promise<void> {
    const endpoint = this.endpoints[this.currentEndpointIndex];
    this.connection = new Connection(endpoint, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeoutMs: 60000,
    });

    logger.debug('Created transaction connection', {
      endpoint: endpoint.replace(/\/[^\/]*@/, '/***:***@'), // Hide credentials in logs
      commitment: getConfig().blockchain.commitment
    }, 'TransactionUtils');
  }

  /**
   * Switch to next RPC endpoint for failover
   */
  public async switchToNextEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
    this.connection = null; // Force recreation
    await this.createConnection();

    logger.info('Switched to next RPC endpoint', {
      newEndpointIndex: this.currentEndpointIndex,
      totalEndpoints: this.endpoints.length
    }, 'TransactionUtils');
  }

  // ===== BLOCKHASH MANAGEMENT (from transactionUtilsOptimized) =====

  /**
   * Get latest blockhash with retry logic
   */
  public async getLatestBlockhashWithRetry(commitment: 'confirmed' | 'finalized' = 'confirmed'): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connection = await this.getConnection();
        const { blockhash } = await connection.getLatestBlockhash({
          commitment: commitment as any
        });

        logger.debug('Retrieved blockhash', {
          blockhash: blockhash.substring(0, 8) + '...',
          commitment,
          attempt
        }, 'TransactionUtils');

        return blockhash;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Blockhash retrieval attempt ${attempt} failed`, {
          error: lastError.message,
          commitment,
          attempt,
          maxRetries
        }, 'TransactionUtils');

        if (attempt < maxRetries) {
          // Switch endpoints on failure
          await this.switchToNextEndpoint();
        }
      }
    }

    throw new Error(`Failed to get blockhash after ${maxRetries} attempts: ${lastError?.message}`);
  }

  // ===== TRANSACTION SENDING (from transactionUtilsOptimized) =====

  /**
   * Send transaction with retry logic and endpoint rotation
   */
  public async sendTransactionWithRetry(
    transaction: Transaction | VersionedTransaction,
    signers: Keypair[],
    options: TransactionOptions = {}
  ): Promise<string> {
    const maxRetries = options.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connection = await this.getConnection();

        // Sign transaction if not already signed
        if (transaction instanceof Transaction && signers.length > 0) {
          transaction.sign(...signers);
        }

        // Serialize for sending
        const serialized = transaction.serialize();
        const signature = await connection.sendRawTransaction(serialized, {
          skipPreflight: options.skipPreflight ?? true,
          preflightCommitment: options.preflightCommitment ?? 'confirmed',
          maxRetries: 0 // We handle retries ourselves
        });

        logger.info('Transaction sent successfully', {
          signature: signature.substring(0, 16) + '...',
          attempt,
          endpointIndex: this.currentEndpointIndex
        }, 'TransactionUtils');

        return signature;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transaction send attempt ${attempt} failed`, {
          error: lastError.message,
          attempt,
          maxRetries,
          endpointIndex: this.currentEndpointIndex
        }, 'TransactionUtils');

        if (attempt < maxRetries) {
          // Switch endpoints on failure
          await this.switchToNextEndpoint();
        }
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  // ===== TRANSACTION CONFIRMATION (from transactionUtilsOptimized) =====

  /**
   * Confirm transaction with timeout
   */
  public async confirmTransactionWithTimeout(
    signature: string,
    customTimeout: number = 60000
  ): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      const startTime = Date.now();

      while (Date.now() - startTime < customTimeout) {
        try {
          const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true
          });

          if (status.value?.confirmationStatus === 'confirmed' ||
              status.value?.confirmationStatus === 'finalized') {
            logger.debug('Transaction confirmed', {
              signature: signature.substring(0, 16) + '...',
              status: status.value.confirmationStatus,
              confirmations: status.value.confirmations,
              slot: status.value.slot
            }, 'TransactionUtils');
            return true;
          }

          if (status.value?.err) {
            logger.error('Transaction failed', {
              signature: signature.substring(0, 16) + '...',
              error: status.value.err
            }, 'TransactionUtils');
            return false;
          }

          // Wait before checking again
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.warn('Error checking transaction status', {
            signature: signature.substring(0, 16) + '...',
            error: (error as Error).message
          }, 'TransactionUtils');
        }
      }

      logger.warn('Transaction confirmation timeout', {
        signature: signature.substring(0, 16) + '...',
        timeout: customTimeout
      }, 'TransactionUtils');

      return false;
    } catch (error) {
      logger.error('Transaction confirmation failed', {
        signature: signature.substring(0, 16) + '...',
        error: (error as Error).message
      }, 'TransactionUtils');
      return false;
    }
  }
}

// ===== TRANSACTION REBUILD UTILITIES (from transactionRebuildUtils) =====

/**
 * Rebuild transaction with fresh blockhash right before Firebase submission
 * This is critical for mainnet reliability - Firebase processing takes 4-5 seconds
 * Returns serialized VersionedTransaction ready for Firebase Functions
 */
export async function rebuildTransactionBeforeFirebase(
  originalTransaction: Transaction,
  connection: Connection,
  feePayerPublicKey: PublicKey,
  userKeypair: Keypair,
  currentBlockhashTimestamp: number
): Promise<{ serializedTransaction: Uint8Array; newBlockhashTimestamp: number }> {
  try {
    logger.debug('Rebuilding transaction before Firebase submission', {
      originalRecentBlockhash: originalTransaction.recentBlockhash?.substring(0, 8) + '...',
      currentBlockhashTimestamp,
      feePayer: feePayerPublicKey.toBase58().substring(0, 8) + '...'
    }, 'TransactionRebuild');

    // ✅ CRITICAL: Get fresh blockhash RIGHT BEFORE rebuilding
    // Firebase processing takes 4-5 seconds, blockhashes expire after ~60 seconds
    const blockhashData = await getFreshBlockhash(connection, 'confirmed');
    const freshBlockhash = blockhashData.blockhash;
    const newBlockhashTimestamp = blockhashData.timestamp;

    // Verify blockhash is still valid
    if (isBlockhashTooOld(newBlockhashTimestamp)) {
      logger.warn('Fresh blockhash is already too old, transaction may fail', {
        newBlockhashTimestamp,
        age: Date.now() - newBlockhashTimestamp
      }, 'TransactionRebuild');
    }

    // Create new transaction with company wallet as fee payer
    // CRITICAL: The company wallet signature will be added by Firebase Functions
    // We only sign with the user keypair here
    const rebuiltTransaction = new Transaction({
      recentBlockhash: freshBlockhash,
      feePayer: feePayerPublicKey
    });

    // Copy all instructions from original transaction
    rebuiltTransaction.instructions = [...originalTransaction.instructions];

    // CRITICAL: Convert to VersionedTransaction BEFORE signing
    // This ensures proper signature array initialization and allows partial signing
    // Transaction.serialize() would verify all signatures, but VersionedTransaction allows partial signing
    const compiledMessage = rebuiltTransaction.compileMessage();
    const versionedTransaction = new VersionedTransaction(compiledMessage);

    // Sign with user keypair only (company wallet will sign in Firebase Functions)
    // CRITICAL: VersionedTransaction.sign() automatically places signatures at correct indices
    // This allows us to have a partially signed transaction (user only)
    versionedTransaction.sign([userKeypair]);

    // Serialize the partially signed transaction (user signed, company not yet)
    const serializedTransaction = versionedTransaction.serialize();

    logger.info('Transaction rebuilt successfully for Firebase', {
      freshBlockhash: freshBlockhash.substring(0, 8) + '...',
      newBlockhashTimestamp,
      serializedSize: serializedTransaction.length,
      instructionCount: rebuiltTransaction.instructions.length,
      feePayer: feePayerPublicKey.toBase58().substring(0, 8) + '...',
      userAddress: userKeypair.publicKey.toBase58().substring(0, 8) + '...',
      note: 'Transaction is partially signed (user only). Company signature will be added by Firebase Functions.'
    }, 'TransactionRebuild');

    return {
      serializedTransaction,
      newBlockhashTimestamp
    };
  } catch (error) {
    logger.error('Failed to rebuild transaction for Firebase', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      currentBlockhashTimestamp,
      feePayer: feePayerPublicKey.toBase58().substring(0, 8) + '...',
      userAddress: userKeypair.publicKey.toBase58().substring(0, 8) + '...'
    }, 'TransactionRebuild');
    throw error;
  }
}

/**
 * Rebuild transaction with fresh blockhash and new signature
 * Returns serialized VersionedTransaction ready for Firebase Functions
 */
export async function rebuildTransactionWithFreshBlockhash(
  originalTransaction: Transaction,
  connection: Connection,
  feePayerPublicKey: PublicKey,
  userKeypair: Keypair
): Promise<{ serializedTransaction: Uint8Array; blockhashTimestamp: number }> {
  try {
    logger.debug('Rebuilding transaction before Firebase submission', {
      originalRecentBlockhash: originalTransaction.recentBlockhash?.substring(0, 8) + '...',
      feePayer: feePayerPublicKey.toBase58().substring(0, 8) + '...'
    }, 'TransactionRebuild');

    // Get fresh blockhash
    const blockhashData = await getFreshBlockhash(connection, 'confirmed');
    const freshBlockhash = blockhashData.blockhash;

    // Create new transaction with company wallet as fee payer
    // CRITICAL: The company wallet signature will be added by Firebase Functions
    // We only sign with the user keypair here
    const rebuiltTransaction = new Transaction({
      recentBlockhash: freshBlockhash,
      feePayer: feePayerPublicKey
    });

    // Copy instructions
    rebuiltTransaction.instructions = [...originalTransaction.instructions];

    // CRITICAL: Convert to VersionedTransaction BEFORE signing
    // This ensures proper signature array initialization
    const compiledMessage = rebuiltTransaction.compileMessage();
    const versionedTransaction = new VersionedTransaction(compiledMessage);

    // Sign with user keypair only (company wallet will sign in Firebase Functions)
    // CRITICAL: VersionedTransaction.sign() automatically places signatures at correct indices
    versionedTransaction.sign([userKeypair]);

    // Serialize the partially signed transaction (user signed, company not yet)
    const serializedTransaction = versionedTransaction.serialize();

    logger.info('Transaction rebuilt successfully for Firebase', {
      newBlockhash: freshBlockhash.substring(0, 8) + '...',
      blockhashTimestamp: blockhashData.timestamp,
      transactionSize: serializedTransaction.length,
      feePayer: feePayerPublicKey.toBase58().substring(0, 8) + '...',
      userAddress: userKeypair.publicKey.toBase58().substring(0, 8) + '...',
      note: 'Transaction is partially signed (user only). Company signature will be added by Firebase Functions.'
    }, 'TransactionRebuild');

    return {
      serializedTransaction,
      blockhashTimestamp: blockhashData.timestamp
    };
  } catch (error) {
    logger.error('Failed to rebuild transaction for Firebase', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      feePayer: feePayerPublicKey.toBase58().substring(0, 8) + '...',
      userAddress: userKeypair.publicKey.toBase58().substring(0, 8) + '...'
    }, 'TransactionRebuild');
    throw error;
  }
}

// ===== TRANSACTION VERIFICATION (from transactionVerificationUtils) =====

/**
 * Verify transaction on blockchain with comprehensive error handling
 */
export async function verifyTransactionOnBlockchain(
  signature: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const {
    maxAttempts = 30,
    baseDelayMs = 2000,
    useDelayedCheck = true,
    delayedCheckWaitMs = 10000
  } = options;

  let attempt = 0;
  let delayedCheckPerformed = false;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const utils = TransactionUtils.getInstance();
      const connection = await utils.getConnection();

      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      if (!status.value) {
        // Transaction not found yet
        if (attempt >= maxAttempts) {
          return {
            success: false,
            error: 'Transaction not found after maximum attempts',
            confirmationStatus: 'pending'
          };
        }
      } else if (status.value.err) {
        // Transaction failed
        return {
          success: false,
          error: `Transaction failed: ${JSON.stringify(status.value.err)}`,
          confirmationStatus: status.value.confirmationStatus || 'pending'
        };
      } else if (status.value.confirmationStatus === 'confirmed' ||
                 status.value.confirmationStatus === 'finalized') {
        // Transaction successful
        return {
          success: true,
          confirmationStatus: status.value.confirmationStatus,
          confirmations: status.value.confirmations || 0,
          slot: status.value.slot,
          note: `Confirmed on attempt ${attempt}`
        };
      }

      // Special delayed check for mainnet reliability
      if (useDelayedCheck && !delayedCheckPerformed && attempt > 5) {
        logger.debug('Performing delayed verification check', {
          signature: signature.substring(0, 16) + '...',
          attempt,
          delayedCheckWaitMs
        }, 'TransactionVerification');

        await new Promise(resolve => setTimeout(resolve, delayedCheckWaitMs));
        delayedCheckPerformed = true;
        continue; // Skip normal delay after delayed check
      }

      // Wait before next attempt
      const delay = baseDelayMs + (attempt * 500); // Increasing delay
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));

    } catch (error) {
      logger.warn(`Verification attempt ${attempt} failed`, {
        signature: signature.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : String(error),
        attempt,
        maxAttempts
      }, 'TransactionVerification');

      // Continue to next attempt
    }
  }

  return {
    success: false,
    error: 'Verification timeout - transaction may still be processing',
    confirmationStatus: 'pending'
  };
}

// ===== EXPORTS =====

export const transactionUtils = TransactionUtils.getInstance();
