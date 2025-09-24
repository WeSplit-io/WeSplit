/**
 * USDC Transfer Builder with Company Fee Payer
 * Handles USDC transfers with company paying all fees
 * Auto-creates ATAs when missing
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { logger } from '../services/loggingService';
import { CURRENT_NETWORK, COMPANY_WALLET_CONFIG, TRANSACTION_CONFIG } from '../config/chain';

export interface UsdcTransferParams {
  fromOwnerPubkey: PublicKey;
  toOwnerPubkey: PublicKey;
  amountUi: number; // Amount in USDC (not raw units)
  cluster: 'mainnet' | 'devnet';
  memo?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UsdcTransferResult {
  transaction: VersionedTransaction;
  fromTokenAccount: PublicKey;
  toTokenAccount: PublicKey;
  transferAmount: number;
  estimatedFees: number;
  needsAtaCreation: boolean;
}

export interface AtaCreationResult {
  ata: PublicKey;
  instructions: TransactionInstruction[];
  needsCreation: boolean;
}

/**
 * Ensure ATA exists for given owner and mint
 * Returns creation instructions if needed
 */
export async function ensureAtaIx({
  owner,
  mint,
  payer,
  connection
}: { 
  owner: PublicKey; 
  mint: PublicKey; 
  payer: PublicKey;
  connection: Connection;
}): Promise<AtaCreationResult> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner, true);
    const instructions: TransactionInstruction[] = [];
    let needsCreation = false;

    try {
      // Try to fetch the account to see if it exists
      await getAccount(connection, ata);
      logger.info('ATA already exists', { 
        ata: ata.toBase58(),
        owner: owner.toBase58(),
        mint: mint.toBase58()
      }, 'UsdcTransfer');
    } catch (error) {
      // Account doesn't exist, need to create it
      needsCreation = true;
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer, // Company pays for ATA creation
          ata,   // Associated token account
          owner, // Owner of the ATA
          mint   // USDC mint
        )
      );
      
      logger.info('ATA creation instruction added', { 
        ata: ata.toBase58(),
        owner: owner.toBase58(),
        mint: mint.toBase58(),
        payer: payer.toBase58()
      }, 'UsdcTransfer');
    }

    return {
      ata,
      instructions,
      needsCreation
    };
  } catch (error) {
    logger.error('Failed to ensure ATA', error, 'UsdcTransfer');
    throw new Error(`Failed to ensure ATA: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build USDC transfer transaction with company fee payer
 */
export async function buildUsdcTransfer({
  fromOwnerPubkey,
  toOwnerPubkey,
  amountUi,
  cluster,
  memo,
  priority = 'medium'
}: UsdcTransferParams): Promise<UsdcTransferResult> {
  try {
    // Validate cluster matches current network
    if (cluster !== CURRENT_NETWORK.name && cluster !== 'mainnet' && cluster !== 'devnet') {
      throw new Error(`Invalid cluster: ${cluster}. Must be mainnet or devnet.`);
    }

    // Get USDC mint address for current network
    const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);
    
    // Get company wallet public key (fee payer)
    const companyPublicKey = new PublicKey(COMPANY_WALLET_CONFIG.address);
    
    // Validate company wallet is configured
    if (!COMPANY_WALLET_CONFIG.address) {
      throw new Error('Company wallet address not configured');
    }

    // Create connection
    const connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
      confirmTransactionInitialTimeout: CURRENT_NETWORK.timeout,
    });

    // Get associated token addresses
    const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromOwnerPubkey);
    const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toOwnerPubkey);

    // Convert amount to raw units (USDC has 6 decimals)
    const transferAmount = Math.floor(amountUi * Math.pow(10, 6));
    
    if (transferAmount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transaction with company as fee payer
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: companyPublicKey // Company pays all fees
    });

    // Add priority fee instruction
    const priorityFee = TRANSACTION_CONFIG.priorityFees[priority];
    if (priorityFee > 0) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
        })
      );
    }

    // Ensure destination ATA exists (company pays creation fee)
    const toAtaResult = await ensureAtaIx({
      owner: toOwnerPubkey,
      mint: usdcMint,
      payer: companyPublicKey, // Company pays
      connection
    });

    // Add ATA creation instructions if needed
    transaction.add(...toAtaResult.instructions);

    // Add USDC transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromOwnerPubkey, // User signs as owner of source tokens
        transferAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Add memo if provided
    if (memo) {
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
        data: Buffer.from(memo, 'utf8'),
      });
      transaction.add(memoInstruction);
    }

    // Convert to versioned transaction
    const versionedTransaction = new VersionedTransaction(transaction.compileMessage());

    // Estimate fees (company pays all)
    const estimatedFees = await connection.getFeeForMessage(transaction.compileMessage());
    const estimatedFeesSol = estimatedFees.value ? estimatedFees.value / LAMPORTS_PER_SOL : 0;

    logger.info('USDC transfer transaction built', {
      from: fromOwnerPubkey.toBase58(),
      to: toOwnerPubkey.toBase58(),
      amount: amountUi,
      transferAmount,
      fromTokenAccount: fromTokenAccount.toBase58(),
      toTokenAccount: toTokenAccount.toBase58(),
      needsAtaCreation: toAtaResult.needsCreation,
      estimatedFees: estimatedFeesSol,
      feePayer: companyPublicKey.toBase58(),
      cluster
    }, 'UsdcTransfer');

    return {
      transaction: versionedTransaction,
      fromTokenAccount,
      toTokenAccount,
      transferAmount,
      estimatedFees: estimatedFeesSol,
      needsAtaCreation: toAtaResult.needsCreation
    };
  } catch (error) {
    logger.error('Failed to build USDC transfer', error, 'UsdcTransfer');
    throw new Error(`Failed to build USDC transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate transfer parameters
 */
export function validateTransferParams(params: UsdcTransferParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate amount
  if (params.amountUi <= 0) {
    errors.push('Transfer amount must be greater than 0');
  }

  if (params.amountUi > 1000000) { // 1M USDC limit
    errors.push('Transfer amount exceeds maximum limit');
  }

  // Validate public keys
  try {
    new PublicKey(params.fromOwnerPubkey);
  } catch {
    errors.push('Invalid from owner public key');
  }

  try {
    new PublicKey(params.toOwnerPubkey);
  } catch {
    errors.push('Invalid to owner public key');
  }

  // Validate cluster
  if (!['mainnet', 'devnet'].includes(params.cluster)) {
    errors.push('Invalid cluster. Must be mainnet or devnet');
  }

  // Validate priority
  if (params.priority && !['low', 'medium', 'high'].includes(params.priority)) {
    errors.push('Invalid priority. Must be low, medium, or high');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get transfer preview information
 */
export async function getTransferPreview(params: UsdcTransferParams): Promise<{
  fromTokenAccount: string;
  toTokenAccount: string;
  transferAmount: number;
  estimatedFees: number;
  needsAtaCreation: boolean;
  companyFeePayer: string;
  usdcMint: string;
}> {
  try {
    const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);
    const companyPublicKey = new PublicKey(COMPANY_WALLET_CONFIG.address);
    
    const connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
    });

    const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, params.fromOwnerPubkey);
    const toTokenAccount = await getAssociatedTokenAddress(usdcMint, params.toOwnerPubkey);

    // Check if destination ATA exists
    let needsAtaCreation = false;
    try {
      await getAccount(connection, toTokenAccount);
    } catch {
      needsAtaCreation = true;
    }

    const transferAmount = Math.floor(params.amountUi * Math.pow(10, 6));
    const estimatedFees = 0.001; // Rough estimate, will be calculated during build

    return {
      fromTokenAccount: fromTokenAccount.toBase58(),
      toTokenAccount: toTokenAccount.toBase58(),
      transferAmount,
      estimatedFees,
      needsAtaCreation,
      companyFeePayer: companyPublicKey.toBase58(),
      usdcMint: usdcMint.toBase58()
    };
  } catch (error) {
    logger.error('Failed to get transfer preview', error, 'UsdcTransfer');
    throw new Error(`Failed to get transfer preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export default functions
export default {
  buildUsdcTransfer,
  ensureAtaIx,
  validateTransferParams,
  getTransferPreview
};
