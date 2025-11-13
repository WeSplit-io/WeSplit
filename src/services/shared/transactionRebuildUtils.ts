/**
 * Shared Transaction Rebuild Utilities
 * Centralized transaction rebuilding logic to eliminate duplication
 * Handles blockhash refresh and transaction rebuilding before Firebase submission
 */

import { 
  Connection, 
  Transaction, 
  VersionedTransaction, 
  Keypair,
  PublicKey
} from '@solana/web3.js';
import { getFreshBlockhash, verifyBlockhashInTransaction, BLOCKHASH_MAX_AGE_MS } from './blockhashUtils';
import { logger } from '../analytics/loggingService';

/**
 * Rebuild transaction with fresh blockhash right before Firebase submission
 * This is critical for mainnet reliability - Firebase processing takes 4-5 seconds
 * 
 * @param originalTransaction - The original transaction with instructions
 * @param connection - Solana connection
 * @param feePayerPublicKey - Fee payer public key
 * @param userKeypair - User keypair for signing
 * @param currentBlockhashTimestamp - Current blockhash timestamp
 * @returns Rebuilt transaction as Uint8Array and new blockhash timestamp
 */
export async function rebuildTransactionBeforeFirebase(
  originalTransaction: Transaction,
  connection: Connection,
  feePayerPublicKey: PublicKey,
  userKeypair: Keypair,
  currentBlockhashTimestamp: number
): Promise<{ 
  serializedTransaction: Uint8Array; 
  blockhashTimestamp: number;
  blockhash: string;
}> {
  // CRITICAL: Get a fresh blockhash RIGHT BEFORE sending to Firebase
  // Firebase takes 4-5 seconds to process, so we need the freshest possible blockhash
  // Even if the current blockhash is only 1-2 seconds old, we rebuild to ensure it's fresh
  logger.info('Getting fresh blockhash right before Firebase call', {
    currentBlockhashAge: Date.now() - currentBlockhashTimestamp,
    note: 'Firebase takes 4-5 seconds, so we need the freshest blockhash possible'
  }, 'TransactionRebuildUtils');
  
  const preFirebaseBlockhashData = await getFreshBlockhash(connection, 'confirmed');
  const preFirebaseBlockhash = preFirebaseBlockhashData.blockhash;
  const preFirebaseBlockhashTimestamp = preFirebaseBlockhashData.timestamp;
  
  logger.info('Got fresh blockhash for pre-Firebase rebuild', {
    blockhash: preFirebaseBlockhash.substring(0, 8) + '...',
    blockhashFull: preFirebaseBlockhash, // Log full blockhash for verification
    blockhashTimestamp: preFirebaseBlockhashTimestamp,
    blockhashAge: Date.now() - preFirebaseBlockhashTimestamp,
    note: 'This blockhash will be embedded in the transaction'
  }, 'TransactionRebuildUtils');
  
  // Rebuild transaction with fresh blockhash right before Firebase
  const preFirebaseTransaction = new Transaction({
    recentBlockhash: preFirebaseBlockhash,
    feePayer: feePayerPublicKey
  });
  
  // CRITICAL: Verify the blockhash is set correctly in the Transaction
  verifyBlockhashInTransaction(preFirebaseTransaction, preFirebaseBlockhash, 'Transaction');
  
  // Re-add all instructions from original transaction
  originalTransaction.instructions.forEach(ix => preFirebaseTransaction.add(ix));
  
  // CRITICAL: Compile message and verify blockhash is in the compiled message
  const compiledMessage = preFirebaseTransaction.compileMessage();
  verifyBlockhashInTransaction(compiledMessage, preFirebaseBlockhash, 'CompiledMessage');
  
  // Re-sign with fresh transaction
  const preFirebaseVersionedTransaction = new VersionedTransaction(compiledMessage);
  preFirebaseVersionedTransaction.sign([userKeypair]);
  
  // CRITICAL: Verify blockhash is in the VersionedTransaction before serialization
  verifyBlockhashInTransaction(preFirebaseVersionedTransaction, preFirebaseBlockhash, 'VersionedTransaction');
  
  const serializedTransaction = preFirebaseVersionedTransaction.serialize();
  
  // CRITICAL: Verify blockhash is in the serialized transaction by deserializing it
  verifyBlockhashInTransaction(serializedTransaction, preFirebaseBlockhash, 'SerializedTransaction');
  
  logger.info('Transaction rebuilt with fresh blockhash right before Firebase (VERIFIED)', {
    transactionSize: serializedTransaction.length,
    blockhashAge: Date.now() - preFirebaseBlockhashTimestamp,
    blockhash: preFirebaseBlockhash.substring(0, 8) + '...',
    blockhashFull: preFirebaseBlockhash, // Log full blockhash for verification
    verifiedInTransaction: true,
    verifiedInCompiledMessage: true,
    verifiedInVersionedTransaction: true,
    verifiedInSerializedTransaction: true,
    note: 'Blockhash verified at every step - this is the blockhash Firebase will receive'
  }, 'TransactionRebuildUtils');

  return {
    serializedTransaction,
    blockhashTimestamp: preFirebaseBlockhashTimestamp,
    blockhash: preFirebaseBlockhash
  };
}

/**
 * Rebuild transaction with fresh blockhash (generic rebuild for retries)
 * Used when blockhash expires during retry attempts
 * 
 * @param originalTransaction - The original transaction with instructions
 * @param connection - Solana connection
 * @param feePayerPublicKey - Fee payer public key
 * @param userKeypair - User keypair for signing
 * @returns Rebuilt transaction as Uint8Array and new blockhash timestamp
 */
export async function rebuildTransactionWithFreshBlockhash(
  originalTransaction: Transaction,
  connection: Connection,
  feePayerPublicKey: PublicKey,
  userKeypair: Keypair
): Promise<{ 
  serializedTransaction: Uint8Array; 
  blockhashTimestamp: number;
  blockhash: string;
}> {
  // Get fresh blockhash
  const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
  const freshBlockhash = freshBlockhashData.blockhash;
  const freshBlockhashTimestamp = freshBlockhashData.timestamp;
  
  logger.info('Got fresh blockhash for transaction rebuild', {
    blockhash: freshBlockhash.substring(0, 8) + '...',
    blockhashFull: freshBlockhash,
    blockhashTimestamp: freshBlockhashTimestamp,
    blockhashAge: Date.now() - freshBlockhashTimestamp,
    note: 'This blockhash will be embedded in the retry transaction'
  }, 'TransactionRebuildUtils');
  
  // Rebuild transaction with fresh blockhash
  const freshTransaction = new Transaction({
    recentBlockhash: freshBlockhash,
    feePayer: feePayerPublicKey
  });
  
  // Verify the blockhash is set correctly
  verifyBlockhashInTransaction(freshTransaction, freshBlockhash, 'Transaction');
  
  // Re-add all instructions from original transaction
  originalTransaction.instructions.forEach(ix => freshTransaction.add(ix));
  
  // Compile and verify blockhash
  const compiledMessage = freshTransaction.compileMessage();
  verifyBlockhashInTransaction(compiledMessage, freshBlockhash, 'CompiledMessage');
  
  // Re-sign with fresh transaction
  const freshVersionedTransaction = new VersionedTransaction(compiledMessage);
  freshVersionedTransaction.sign([userKeypair]);
  
  // Verify blockhash in VersionedTransaction
  verifyBlockhashInTransaction(freshVersionedTransaction, freshBlockhash, 'VersionedTransaction');
  
  const serializedTransaction = freshVersionedTransaction.serialize();
  
  // Verify blockhash in serialized transaction
  verifyBlockhashInTransaction(serializedTransaction, freshBlockhash, 'SerializedTransaction');
  
  logger.info('Transaction rebuilt with fresh blockhash for retry (VERIFIED)', {
    transactionSize: serializedTransaction.length,
    newBlockhashTimestamp: freshBlockhashTimestamp,
    timeSinceNewBlockhash: Date.now() - freshBlockhashTimestamp,
    blockhash: freshBlockhash.substring(0, 8) + '...',
    blockhashFull: freshBlockhash,
    verifiedAtAllSteps: true,
    note: 'Blockhash verified at every step - this is the blockhash Firebase will receive'
  }, 'TransactionRebuildUtils');

  return {
    serializedTransaction,
    blockhashTimestamp: freshBlockhashTimestamp,
    blockhash: freshBlockhash
  };
}

