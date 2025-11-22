/**
 * External Transfer Service - Real On-Chain Transactions
 * Handles transfers to linked external wallets
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Keypair
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConfig } from '../../../config/unified';
import { TRANSACTION_CONFIG } from '../../../config/constants/transactionConfig';
import { FeeService, COMPANY_FEE_CONFIG, COMPANY_WALLET_CONFIG, TransactionType } from '../../../config/constants/feeConfig';
import { solanaWalletService } from '../wallet';
import { logger } from '../../analytics/loggingService';
import { optimizedTransactionUtils } from '../../shared/transactionUtilsOptimized';
import type { LinkedWallet } from '../wallet/LinkedWalletService';
import { processUsdcTransfer } from './transactionSigningService';
import { getFreshBlockhash, isBlockhashTooOld, BLOCKHASH_MAX_AGE_MS, type BlockhashWithTimestamp } from '../../shared/blockhashUtils';
import { verifyTransactionOnBlockchain } from '../../shared/transactionVerificationUtils';

export interface ExternalTransferParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  transactionType?: TransactionType; // Add transaction type for fee calculation
}

export interface ExternalTransferResult {
  success: boolean;
  signature?: string;
  txId?: string;
  companyFee?: number;
  netAmount?: number;
  blockchainFee?: number;
  error?: string;
}

// Re-export LinkedWallet type for external use
export type { LinkedWallet };

class ExternalTransferService {
  constructor() {
    // Connection management now handled by shared transactionUtils (same as internal transfers)
  }

  /**
   * Send external transfer to linked wallet
   */
  async sendExternalTransfer(params: ExternalTransferParams): Promise<ExternalTransferResult> {
    try {
      logger.info('Starting external transfer', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId
      }, 'ExternalTransferService');

      // ✅ CRITICAL: Create placeholder promise IMMEDIATELY for atomic check-and-register
      let resolveTransaction: (result: ExternalTransferResult) => void;
      let rejectTransaction: (error: any) => void;
      
      const placeholderPromise = new Promise<ExternalTransferResult>((resolve, reject) => {
        resolveTransaction = resolve;
        rejectTransaction = reject;
      });
      
      // ✅ CRITICAL: Atomic check-and-register to prevent race conditions
      // External transfers bypass ConsolidatedTransactionService, so we need deduplication here too
      const { transactionDeduplicationService } = await import('./TransactionDeduplicationService');
      const { existing: existingPromise, cleanup: dedupCleanup } = transactionDeduplicationService.checkAndRegisterInFlight(
        params.userId,
        params.to,
        params.amount,
        placeholderPromise
      );
      
      if (existingPromise) {
        logger.warn('⚠️ Duplicate external transfer detected (atomic) - returning existing promise', {
          userId: params.userId,
          to: params.to.substring(0, 8) + '...',
          amount: params.amount
        }, 'ExternalTransferService');
        
        // Wait for existing transaction to complete
        try {
          const existingResult = await existingPromise;
          return existingResult;
        } catch (existingError) {
          // If existing transaction failed, allow new attempt
          logger.warn('Existing external transfer failed, allowing new attempt', {
            error: existingError instanceof Error ? existingError.message : String(existingError)
          }, 'ExternalTransferService');
        }
      }

      // Validate recipient address
      const recipientValidation = this.validateRecipientAddress(params.to);
      if (!recipientValidation.isValid) {
        return {
          success: false,
          error: recipientValidation.error
        };
      }

      // Note: External transfers can send to any valid Solana address
      // Wallet linking is optional for security/verification but not required
      logger.info('External transfer to any valid Solana address', {
        recipientAddress: params.to,
        userId: params.userId
      }, 'ExternalTransferService');

      // Check balance before proceeding
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${balanceCheck.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'external_payment';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      // Ensure user's wallet is loaded
      const { walletService } = await import('../wallet');
      logger.info('Ensuring app wallet is loaded', { userId: params.userId }, 'ExternalTransferService');
      const walletResult = await walletService.ensureUserWallet(params.userId);
      if (!walletResult.success) {
        logger.error('Failed to ensure app wallet', { 
          userId: params.userId, 
          error: walletResult.error 
        }, 'ExternalTransferService');
        return {
          success: false,
          error: walletResult.error || 'Failed to load user wallet'
        };
      }
      logger.info('App wallet ensured successfully', { 
        userId: params.userId, 
        walletAddress: walletResult.wallet?.address 
      }, 'ExternalTransferService');

      // Wallet is already loaded from walletService.ensureUserWallet()
      // We can use it directly for transaction signing
      const expectedWalletAddress = walletResult.wallet?.address;
      if (!expectedWalletAddress || !walletResult.wallet?.secretKey) {
        logger.error('No wallet address or secret key available for transaction signing', { 
          userId: params.userId,
          hasAddress: !!expectedWalletAddress,
          hasSecretKey: !!walletResult.wallet?.secretKey
        }, 'ExternalTransferService');
        return {
          success: false,
          error: 'Wallet credentials not available for transaction signing'
        };
      }
      logger.info('Wallet ready for transaction signing', { 
        userId: params.userId, 
        walletAddress: expectedWalletAddress 
      }, 'ExternalTransferService');

      // ✅ CRITICAL: Execute actual transaction and resolve placeholder promise
      // This ensures all waiting calls get the same result
      const actualTransactionPromise = (async () => {
        // Build and send transaction - WeSplit only supports USDC transfers
        if (params.currency === 'USDC') {
          return await this.sendUsdcTransfer(params, recipientAmount, companyFee, expectedWalletAddress, walletResult.wallet.secretKey);
        } else {
          return {
            success: false,
            error: `Currency ${params.currency} is not supported. Only USDC transfers are supported.`,
            signature: '',
            txId: ''
          };
        }
      })();
      
      // Execute transaction and resolve/reject placeholder
      actualTransactionPromise
        .then((result) => {
          resolveTransaction!(result);
        })
        .catch((error) => {
          rejectTransaction!(error);
        });

      // Execute transaction with cleanup on completion
      let result: ExternalTransferResult;
      try {
        result = await placeholderPromise;
        
        // Update deduplication service with signature if successful
        if (result.success && result.signature) {
          transactionDeduplicationService.updateTransactionSignature(
            params.userId,
            params.to,
            params.amount,
            result.signature
          );
        }
        
        // ✅ CRITICAL: Only cleanup on SUCCESS
        // Failed transactions stay in deduplication service to prevent retries
        // This ensures that if a transaction fails, retries within 60s are blocked
        if (result.success) {
          dedupCleanup();
        }
      } catch (error) {
        // ✅ CRITICAL: Don't cleanup on error immediately
        // Keep failed transaction in deduplication service to prevent immediate retries
        // This prevents duplicates when transaction fails/times out and user retries
        // Cleanup will happen automatically after timeout (60s) or on success
        logger.warn('External transfer failed - keeping in deduplication service to prevent retries', {
          userId: params.userId,
          to: params.to.substring(0, 8) + '...',
          amount: params.amount,
          error: error instanceof Error ? error.message : String(error),
          note: 'Transaction will be cleaned up automatically after 60s timeout. Retries within 60s will be blocked.'
        }, 'ExternalTransferService');
        // Don't cleanup - let it expire naturally (60s timeout) to prevent retries
        throw error;
      }

      if (result.success) {
        // Update last used timestamp for linked wallet
        await this.updateLinkedWalletLastUsed(params.to, params.userId);
        
        // Save transaction to database and award points (if applicable) using centralized helper
        try {
          const { saveTransactionAndAwardPoints } = await import('../../shared/transactionPostProcessing');
          
          // Get user's wallet address for transaction record
          const { walletService } = await import('../wallet');
          const walletResult = await walletService.ensureUserWallet(params.userId);
          const fromWalletAddress = walletResult.success && walletResult.wallet 
            ? walletResult.wallet.address 
            : expectedWalletAddress;
          
          await saveTransactionAndAwardPoints({
            userId: params.userId,
            toAddress: params.to,
            amount: params.amount,
            signature: result.signature!,
            transactionType: params.transactionType || 'external_payment',
            companyFee: result.companyFee,
            netAmount: result.netAmount,
            memo: params.memo || 'External wallet transfer',
            currency: params.currency
          });
          
          logger.info('✅ External transfer post-processing completed', {
            signature: result.signature,
            userId: params.userId,
            amount: params.amount
          }, 'ExternalTransferService');
          
        } catch (saveError) {
          logger.error('❌ Failed to save external transfer to database', saveError, 'ExternalTransferService');
          // Don't fail the transaction if database save fails
        }
        
        logger.info('External transfer completed successfully', {
          signature: result.signature,
          amount: params.amount,
          netAmount: result.netAmount,
          companyFee: result.companyFee
        }, 'ExternalTransferService');
      }

      return result;
    } catch (error) {
      logger.error('External transfer failed', {
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        params: {
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          userId: params.userId
        }
      }, 'ExternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if wallet is linked and verified
   */
  async isWalletLinked(address: string, userId: string): Promise<boolean> {
    try {
      logger.debug('Checking if wallet is linked', { address, userId }, 'ExternalTransferService');
      
      const linkedWallets = await this.getLinkedWallets(userId);
      const isLinked = linkedWallets.some(wallet => 
        wallet.address === address && 
        wallet.type === 'external' && 
        wallet.status === 'active'
      );
      
      logger.debug('Wallet link status', { 
        address, 
        userId, 
        isLinked, 
        totalLinkedWallets: linkedWallets.length,
        matchingWallets: linkedWallets.filter(w => w.address === address).length
      }, 'ExternalTransferService');
      
      return isLinked;
    } catch (error) {
      logger.error('Failed to check if wallet is linked', error, 'ExternalTransferService');
      return false;
    }
  }

  /**
   * Get linked wallets for user
   */
  async getLinkedWallets(userId: string): Promise<LinkedWallet[]> {
    try {
      const { LinkedWalletService } = await import('../wallet/LinkedWalletService');
      return await LinkedWalletService.getLinkedWallets(userId);
    } catch (error) {
      logger.error('Failed to get linked wallets', error, 'ExternalTransferService');
      return [];
    }
  }

  /**
   * Update last used timestamp for linked wallet
   */
  private async updateLinkedWalletLastUsed(address: string, userId: string): Promise<void> {
    try {
      // In a real implementation, this would update a database
      logger.info('Updated last used timestamp for linked wallet', {
        address,
        userId,
        timestamp: new Date().toISOString()
      }, 'ExternalTransferService');
    } catch (error) {
      logger.error('Failed to update linked wallet last used', error, 'ExternalTransferService');
    }
  }

  /**
   * Check user balance
   */
  private async checkBalance(userId: string, amount: number, currency: 'SOL' | 'USDC'): Promise<{
    hasSufficientBalance: boolean;
    currentBalance: number;
    requiredAmount: number;
    shortfall?: number;
  }> {
    try {
      // Use the user's wallet balance instead of the currently loaded wallet
      const { walletService } = await import('../wallet');
      const balance = await walletService.getUserWalletBalance(userId);
      const currentBalance = balance?.usdcBalance || 0; // WeSplit only supports USDC
      
      // Calculate total required amount (including company fee)
      // Use 'external_payment' transaction type for external transfers (2% fee)
      const transactionType = 'external_payment';
      const { fee: companyFee } = FeeService.calculateCompanyFee(amount, transactionType);
      const requiredAmount = amount + companyFee;

      logger.info('Balance check completed', {
        userId,
        currency,
        currentBalance,
        requiredAmount,
        hasSufficientBalance: currentBalance >= requiredAmount
      }, 'ExternalTransferService');

      return {
        hasSufficientBalance: currentBalance >= requiredAmount,
        currentBalance,
        requiredAmount,
        shortfall: currentBalance < requiredAmount ? requiredAmount - currentBalance : undefined
      };
    } catch (error) {
      logger.error('Failed to check balance', error, 'ExternalTransferService');
      return {
        hasSufficientBalance: false,
        currentBalance: 0,
        requiredAmount: amount
      };
    }
  }

  /**
   * SOL transfers are not supported in WeSplit app
   * Only USDC transfers are allowed within the app
   */
  private async sendSolTransfer(
    params: ExternalTransferParams, 
    recipientAmount: number, 
    companyFee: number
  ): Promise<ExternalTransferResult> {
    logger.error('SOL transfer attempted - not supported in WeSplit app', { 
      currency: params.currency 
    }, 'ExternalTransferService');
    
    return {
      success: false,
      error: 'SOL transfers are not supported within WeSplit app. Only USDC transfers are allowed.'
    };
  }

  /**
   * Send USDC transfer
   */
  private async sendUsdcTransfer(
    params: ExternalTransferParams, 
    recipientAmount: number, 
    companyFee: number,
    fromWalletAddress: string,
    fromWalletSecretKey: string
  ): Promise<ExternalTransferResult> {
    try {
      logger.info('Starting USDC transfer', {
        recipientAmount,
        companyFee,
        to: params.to
      }, 'ExternalTransferService');

      // Use wallet address from parameter (already loaded)
      const fromPublicKey = new PublicKey(fromWalletAddress);
      const toPublicKey = new PublicKey(params.to);
      const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);

      logger.info('Public keys created', {
        from: fromPublicKey.toBase58(),
        to: toPublicKey.toBase58(),
        usdcMint: usdcMint.toBase58()
      }, 'ExternalTransferService');

      // Company wallet configuration will be validated by FeeService.getFeePayerPublicKey

      // Use centralized fee payer logic - Company pays SOL gas fees (same as internal transfers)
      // Fetch from Firebase Secrets (not EAS secrets)
      const feePayerPublicKey = await FeeService.getFeePayerPublicKey(fromPublicKey);
      logger.info('Using company wallet as fee payer', { 
        feePayerAddress: feePayerPublicKey.toBase58() 
      }, 'ExternalTransferService');

      // Get token accounts
      logger.info('Getting token accounts', {}, 'ExternalTransferService');
      const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

      logger.info('Token accounts derived', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58()
      }, 'ExternalTransferService');

      // Check if recipient has USDC token account, create if needed
      let needsTokenAccountCreation = false;
      const connection = await optimizedTransactionUtils.getConnection();
      try {
        await getAccount(connection, toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'ExternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.warn('Recipient USDC token account does not exist, will create it', { 
          toTokenAccount: toTokenAccount.toBase58(),
          error: error instanceof Error ? error.message : String(error)
        }, 'ExternalTransferService');
        needsTokenAccountCreation = true;
      }

      // IMPORTANT: Get fresh blockhash RIGHT BEFORE creating the transaction
      // Blockhashes expire after ~60 seconds, so we get it as late as possible
      // to minimize the time between creation and submission
      // Use 'confirmed' commitment for faster response and better reliability
      // CRITICAL: Get blockhash immediately before transaction creation to minimize expiration risk
      // Best practice: Use shared utility for consistent blockhash handling
      // NOTE: Connection already retrieved above for getAccount check
      const blockhashData = await getFreshBlockhash(connection, 'confirmed');
      const blockhash = blockhashData.blockhash;
      const blockhashTimestamp = blockhashData.timestamp;
      logger.info('Got fresh blockhash right before transaction creation', {
        blockhash: blockhash.substring(0, 8) + '...',
        lastValidBlockHeight: blockhashData.lastValidBlockHeight,
        blockhashTimestamp,
        note: 'Blockhash will expire after approximately 60 seconds'
      }, 'ExternalTransferService');

      // Create transaction with proper fee payer (using fresh blockhash)
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // Company pays SOL gas fees, user pays company fees
      });

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

      // Add token account creation instruction if needed (must be before transfer)
      if (needsTokenAccountCreation) {
        logger.info('Adding token account creation instruction', { 
          toTokenAccount: toTokenAccount.toBase58(),
          feePayer: feePayerPublicKey.toBase58()
        }, 'ExternalTransferService');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            feePayerPublicKey, // Fee payer (company wallet) pays for ATA creation
            toTokenAccount, // associated token account
            toPublicKey, // owner
            usdcMint // mint
          )
        );
      }

      // Add USDC transfer instruction for recipient (full amount)
      const transferAmount = Math.floor(recipientAmount * Math.pow(10, 6) + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Add company fee transfer instruction to admin wallet (required - same as internal transfers)
      if (companyFee > 0) {
        const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6) + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
        
        // Get company wallet address from Firebase Secrets (not EAS secrets)
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        
        // Debug company wallet config
        logger.info('Company wallet config debug', {
          hasCompanyWalletAddress: !!companyWalletAddress,
          companyWalletAddress: companyWalletAddress
        }, 'ExternalTransferService');
        
        if (!companyWalletAddress) {
          logger.error('Company wallet address is missing', {
            hasAddress: !!companyWalletAddress
          }, 'ExternalTransferService');
          return {
            success: false,
            error: 'Company wallet address is not available from Firebase Secrets'
          };
        }
        
        // Get company wallet's USDC token account - following internal transfer pattern
        const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(companyWalletAddress));
        
        logger.info('Adding company fee transfer instruction', { 
          companyFeeAmount, 
          companyFee,
          fromTokenAccount: fromTokenAccount.toBase58(),
          companyTokenAccount: companyTokenAccount.toBase58(),
          companyWalletAddress: companyWalletAddress
        }, 'ExternalTransferService');
        
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
      }

      // Add memo if provided
      if (params.memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(params.memo, 'utf8'),
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
          })
        );
      }

      // Prepare signers array
      const signers: Keypair[] = [];
      
      // Get wallet keypair for signing (same as internal transfers)
      // Use wallet secret key from parameter
      if (!fromWalletSecretKey) {
        logger.error('Wallet keypair not available for signing', {}, 'ExternalTransferService');
        return {
          success: false,
          error: 'User wallet keypair not available for transaction signing'
        };
      }

      // Handle different secret key formats (same as sendInternal)
      let userKeypair: Keypair;
      try {
        // Try base64 format first
        const secretKeyBuffer = Buffer.from(fromWalletSecretKey, 'base64');
        userKeypair = Keypair.fromSecretKey(secretKeyBuffer);
        logger.debug('Successfully created keypair from base64 secret key', null, 'ExternalTransferService');
      } catch (base64Error) {
        try {
          // Try JSON array format (stored in secure storage)
          const secretKeyArray = JSON.parse(fromWalletSecretKey);
          userKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          logger.debug('Successfully created keypair from JSON array secret key', null, 'ExternalTransferService');
        } catch (jsonError) {
          logger.error('Failed to create keypair from secret key', {
            base64Error: (base64Error as Error).message,
            jsonError: (jsonError as Error).message
            // SECURITY: Do not log secret key metadata (length, previews, etc.)
          }, 'ExternalTransferService');
          return {
            success: false,
            error: 'Invalid user wallet secret key format'
          };
        }
      }
      
      signers.push(userKeypair);
      logger.info('User keypair added to signers', { 
        userAddress: userKeypair.publicKey.toBase58() 
      }, 'ExternalTransferService');

      // Company wallet always pays SOL fees
      // SECURITY: Secret key operations must be performed on backend services via Firebase Functions
      // Get company wallet address from Firebase Secrets (not EAS secrets) for logging
      const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
      logger.info('Company wallet configuration check', {
        companyWalletRequired: true,
        companyWalletAddress: companyWalletAddress,
        feePayerAddress: feePayerPublicKey.toBase58()
      }, 'ExternalTransferService');

      // Convert Transaction to VersionedTransaction for Firebase Functions
      // Firebase Functions expect VersionedTransaction format
      // NOTE: We don't sign the Transaction object first - we'll sign the VersionedTransaction directly
      // This avoids double signing and ensures clean signature handling
      const { VersionedTransaction } = await import('@solana/web3.js');
      let versionedTransaction: VersionedTransaction;
      try {
        versionedTransaction = new VersionedTransaction(transaction.compileMessage());
        // Sign the versioned transaction with user keypair (only sign once)
        versionedTransaction.sign([userKeypair]);
        logger.info('Transaction converted to VersionedTransaction and signed', {
          userAddress: userKeypair.publicKey.toBase58(),
          feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
        }, 'ExternalTransferService');
      } catch (versionError) {
        logger.error('Failed to convert transaction to VersionedTransaction', {
          error: versionError,
          errorMessage: versionError instanceof Error ? versionError.message : String(versionError)
        }, 'ExternalTransferService');
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
      
      // CRITICAL: Check blockhash age AND validity before sending to Firebase
      // Best practice: Use shared utility for consistent blockhash age checking
      // CRITICAL: Also validate the blockhash is actually valid on-chain
      // Blockhashes expire based on slot height, not just time
      const blockhashAge = Date.now() - blockhashTimestamp;
      let needsRebuild = isBlockhashTooOld(blockhashTimestamp);
      
      // CRITICAL: Also check if blockhash is actually valid on-chain
      // Even if age is OK, the blockhash might have expired based on slot height
      if (!needsRebuild) {
        try {
          const isValid = await (await optimizedTransactionUtils.getConnection()).isBlockhashValid(blockhash, { commitment: 'confirmed' });
          const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
          
          if (!isValidValue) {
            logger.warn('Blockhash is no longer valid on-chain, rebuilding transaction', {
              blockhash: blockhash.substring(0, 8) + '...',
              blockhashAge,
              note: 'Blockhash expired based on slot height, not just time'
            }, 'ExternalTransferService');
            needsRebuild = true;
          }
        } catch (validationError) {
          // If validation fails (network error), log but proceed
          // The actual submission will catch if it's expired
          logger.warn('Failed to validate blockhash on-chain, proceeding anyway', {
            error: validationError instanceof Error ? validationError.message : String(validationError),
            blockhash: blockhash.substring(0, 8) + '...'
          }, 'ExternalTransferService');
        }
      }
      
      let currentTxArray = txArray;
      let currentBlockhashTimestamp = blockhashTimestamp;
      
      if (needsRebuild) {
        logger.info('Blockhash is too old, rebuilding transaction with fresh blockhash before Firebase call', {
          oldBlockhash: blockhash.substring(0, 8) + '...',
          blockhashAge,
          maxAge: BLOCKHASH_MAX_AGE_MS,
          note: 'Rebuilding to ensure blockhash is fresh when Firebase submits'
        }, 'ExternalTransferService');
        
        // Get fresh blockhash
        const freshBlockhashData = await getFreshBlockhash(await optimizedTransactionUtils.getConnection(), 'confirmed');
        const freshBlockhash = freshBlockhashData.blockhash;
        currentBlockhashTimestamp = freshBlockhashData.timestamp;
        
        // Rebuild transaction with fresh blockhash
        const freshTransaction = new Transaction({
          recentBlockhash: freshBlockhash,
          feePayer: feePayerPublicKey
        });
        
        // Re-add all instructions
        const priorityFee = this.getPriorityFee(params.priority || 'medium');
        if (priorityFee > 0) {
          freshTransaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: priorityFee,
            })
          );
        }
        
        if (needsTokenAccountCreation) {
          freshTransaction.add(
            createAssociatedTokenAccountInstruction(
              feePayerPublicKey,
              toTokenAccount,
              toPublicKey,
              usdcMint
            )
          );
        }
        
        const transferAmount = Math.floor(recipientAmount * Math.pow(10, 6) + 0.5);
        freshTransaction.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPublicKey,
            transferAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        if (companyFee > 0) {
          const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6) + 0.5);
          const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, feePayerPublicKey);
          freshTransaction.add(
            createTransferInstruction(
              fromTokenAccount,
              companyTokenAccount,
              fromPublicKey,
              companyFeeAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }
        
        if (params.memo) {
          freshTransaction.add(
            new TransactionInstruction({
              keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
              data: Buffer.from(params.memo, 'utf8'),
              programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
            })
          );
        }
        
        // Re-sign with fresh transaction
        const { VersionedTransaction } = await import('@solana/web3.js');
        let userKeypair: Keypair;
        try {
          const secretKeyBuffer = Buffer.from(fromWalletSecretKey, 'base64');
          userKeypair = Keypair.fromSecretKey(secretKeyBuffer);
        } catch {
          const secretKeyArray = JSON.parse(fromWalletSecretKey);
          userKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
        }
        
        const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
        freshVersionedTransaction.sign([userKeypair]);
        currentTxArray = freshVersionedTransaction.serialize();
        
        logger.info('Transaction rebuilt with fresh blockhash before Firebase call', {
          transactionSize: currentTxArray.length,
          newBlockhashTimestamp: currentBlockhashTimestamp,
          timeSinceNewBlockhash: Date.now() - currentBlockhashTimestamp,
          blockhashChanged: freshBlockhash !== blockhash
        }, 'ExternalTransferService');
      } else {
        logger.info('Blockhash is still fresh, using existing transaction', {
          blockhashAge,
          maxAge: BLOCKHASH_MAX_AGE_MS,
          note: 'Blockhash is within acceptable age, proceeding without rebuild'
        }, 'ExternalTransferService');
      }
            
      // CRITICAL: Log blockhash age right before sending to Firebase
      const finalBlockhashAge = Date.now() - currentBlockhashTimestamp;
      logger.info('Transaction serialized, requesting company wallet signature', {
        transactionSize: currentTxArray.length,
        transactionType: typeof currentTxArray,
        isUint8Array: currentTxArray instanceof Uint8Array,
        from: fromPublicKey.toBase58(),
        to: toPublicKey.toBase58(),
        amount: recipientAmount,
        companyFee,
        totalAmount: params.amount,
        blockhashAge: finalBlockhashAge,
        blockhashAgeMs: finalBlockhashAge,
        maxAgeMs: BLOCKHASH_MAX_AGE_MS,
        isBlockhashFresh: finalBlockhashAge < BLOCKHASH_MAX_AGE_MS,
        warning: finalBlockhashAge > 5000 ? 'Blockhash age is high - may expire during Firebase processing' : 'Blockhash is fresh'
            }, 'ExternalTransferService');
            
      // Use processUsdcTransfer which combines signing and submission in one Firebase call
      // This minimizes the time between getting blockhash and submission
      // If blockhash expires, we'll rebuild and retry
      let signature: string;
      let submissionAttempts = 0;
      const maxSubmissionAttempts = 3; // Increased to 3 attempts for better reliability
      
      while (submissionAttempts < maxSubmissionAttempts) {
        try {
          const currentConnection = await optimizedTransactionUtils.getConnection();
          logger.info('Processing USDC transfer (sign and submit)', {
            connectionEndpoint: currentConnection.rpcEndpoint,
            commitment: getConfig().blockchain.commitment,
            attempt: submissionAttempts + 1,
            transactionSize: currentTxArray.length
          }, 'ExternalTransferService');
            
          // Use processUsdcTransfer which does both signing and submission in one call
          // This minimizes delay and reduces chance of blockhash expiration
          const result = await processUsdcTransfer(currentTxArray);
          signature = result.signature;
          
          logger.info('Transaction processed successfully', { signature }, 'ExternalTransferService');
          break; // Success, exit retry loop
        } catch (submissionError) {
          const errorMessage = submissionError instanceof Error ? submissionError.message : String(submissionError);
          const isBlockhashExpired = 
            errorMessage.includes('blockhash has expired') ||
            errorMessage.includes('blockhash expired') ||
            errorMessage.includes('Blockhash not found');
          
          if (isBlockhashExpired && submissionAttempts < maxSubmissionAttempts - 1) {
            // Blockhash expired - rebuild the entire transaction with fresh blockhash
            logger.warn('Transaction blockhash expired, rebuilding transaction with fresh blockhash', {
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts
            }, 'ExternalTransferService');
            
            try {
              // Get fresh blockhash RIGHT before rebuilding using shared utility
              // Best practice: Use shared utility for consistent blockhash handling
              const rebuildConnection = await optimizedTransactionUtils.getConnection();
              const freshBlockhashData = await getFreshBlockhash(rebuildConnection, 'confirmed');
              const freshBlockhash = freshBlockhashData.blockhash;
              const freshBlockhashTimestamp = freshBlockhashData.timestamp;
              logger.info('Got fresh blockhash for transaction rebuild', {
                blockhash: freshBlockhash.substring(0, 8) + '...',
                timestamp: freshBlockhashTimestamp
              }, 'ExternalTransferService');
              
              // Recreate transaction with fresh blockhash
              const freshTransaction = new Transaction({
                recentBlockhash: freshBlockhash,
                feePayer: feePayerPublicKey
              });
              
              // Re-add all instructions in the same order
              const priorityFee = this.getPriorityFee(params.priority || 'medium');
              if (priorityFee > 0) {
                freshTransaction.add(
                  ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: priorityFee,
                  })
                );
              }
              
              if (needsTokenAccountCreation) {
                freshTransaction.add(
                  createAssociatedTokenAccountInstruction(
                    feePayerPublicKey,
                    toTokenAccount,
                    toPublicKey,
                    usdcMint
                  )
                );
              }
              
              // Add USDC transfer for recipient
              const transferAmount = Math.floor(recipientAmount * Math.pow(10, 6) + 0.5);
              freshTransaction.add(
                createTransferInstruction(
                  fromTokenAccount,
                  toTokenAccount,
                  fromPublicKey,
                  transferAmount,
                  [],
                  TOKEN_PROGRAM_ID
                )
              );
              
              // Add company fee transfer
              if (companyFee > 0) {
                const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6) + 0.5);
                const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, feePayerPublicKey);
                freshTransaction.add(
                  createTransferInstruction(
                    fromTokenAccount,
                    companyTokenAccount,
                    fromPublicKey,
                    companyFeeAmount,
                    [],
                    TOKEN_PROGRAM_ID
                  )
                );
              }
              
              // Add memo if provided
              if (params.memo) {
                freshTransaction.add(
                  new TransactionInstruction({
                    keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
                    data: Buffer.from(params.memo, 'utf8'),
                    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
                  })
                );
              }
              
              // Convert to VersionedTransaction and sign with user
              const { VersionedTransaction } = await import('@solana/web3.js');
              const secretKeyBuffer = Buffer.from(fromWalletSecretKey, 'base64');
              const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);
              
              const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
              freshVersionedTransaction.sign([userKeypair]);
              
              // Serialize for processUsdcTransfer (which will sign and submit)
              const freshTxArray = freshVersionedTransaction.serialize();
              
              logger.info('Transaction rebuilt with fresh blockhash', {
                transactionSize: freshTxArray.length,
                blockhashTimestamp: freshBlockhashTimestamp,
                timeSinceBlockhash: Date.now() - freshBlockhashTimestamp
              }, 'ExternalTransferService');
              
              // Use the rebuilt transaction for next attempt
              currentTxArray = freshTxArray;
              currentBlockhashTimestamp = freshBlockhashTimestamp;
              submissionAttempts++;
              continue; // Retry with fresh transaction
            } catch (rebuildError) {
              logger.error('Failed to rebuild transaction', {
                error: rebuildError instanceof Error ? rebuildError.message : String(rebuildError)
              }, 'ExternalTransferService');
              return {
                success: false,
                error: 'Transaction blockhash expired and could not be rebuilt. Please try again.'
              };
            }
          } else {
            // Other error or max attempts reached
            logger.error('Transaction submission failed', { 
              error: submissionError,
              errorMessage,
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts
            }, 'ExternalTransferService');
            return {
              success: false,
              error: `Failed to submit transaction: ${errorMessage}`
            };
          }
        }
        
        submissionAttempts++;
      }
      
      if (!signature) {
        return {
          success: false,
          error: 'Failed to submit transaction after multiple attempts'
        };
      }

      // Enhanced verification using shared utility
      // CRITICAL: Don't return success until transaction is actually confirmed
      // Best practice: Use shared verification utility for consistent behavior
      const verificationResult = await verifyTransactionOnBlockchain(await optimizedTransactionUtils.getConnection(), signature);
      if (!verificationResult.success) {
        const errorMessage = verificationResult.error || '';
        const isTimeout = 
          errorMessage.includes('timeout') ||
          errorMessage.includes('verification timeout') ||
          errorMessage.includes('not found on blockchain') ||
          errorMessage.includes('RPC indexing delay');
        
        // If timeout, verify on-chain using balance checks before returning error
        if (isTimeout) {
          logger.warn('External transfer verification timed out - verifying on-chain before returning error', {
            signature,
            error: errorMessage,
            to: params.to.substring(0, 8) + '...',
            amount: recipientAmount,
            note: 'Transaction may have succeeded. Verifying on-chain before returning error.'
          }, 'ExternalTransferService');
          
          try {
            // Wait a moment for blockchain to update
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check balances to verify transaction
            const { consolidatedTransactionService } = await import('./ConsolidatedTransactionService');
            const recipientBalanceResult = await consolidatedTransactionService.getUsdcBalance(params.to);
            
            logger.info('On-chain balance verification after timeout', {
              recipientBalance: recipientBalanceResult.balance,
              expectedAmount: recipientAmount,
              note: 'Checking if transaction actually succeeded despite timeout'
            }, 'ExternalTransferService');
            
            // If recipient balance increased significantly, transaction likely succeeded
            // We can't definitively verify without knowing the previous balance,
            // but if the balance is high enough, it's likely the transaction succeeded
            // The user should check transaction history for definitive confirmation
            
            logger.info('Timeout occurred but transaction may have succeeded - returning error with guidance', {
              signature,
              to: params.to.substring(0, 8) + '...',
              amount: recipientAmount,
              note: 'User should check transaction history to verify if transaction succeeded'
            }, 'ExternalTransferService');
            
            // Return error but include signature so user can verify on Solana Explorer
            return {
              success: false,
              signature, // Include signature so user can check on Solana Explorer
              error: `Transaction verification timed out. The transaction may have succeeded on the blockchain. Please check your transaction history or Solana Explorer (signature: ${signature.substring(0, 8)}...) to verify.`,
              txId: signature
            };
          } catch (verificationError) {
            logger.warn('Failed to verify transaction on-chain after timeout', {
              error: verificationError instanceof Error ? verificationError.message : String(verificationError),
              signature,
              to: params.to.substring(0, 8) + '...',
              amount: recipientAmount
            }, 'ExternalTransferService');
            
            // Fallback to original error message if verification fails
            return {
              success: false,
              signature, // Include signature so user can check on Solana Explorer
              error: verificationResult.error || 'Transaction verification failed. Please check transaction status on Solana Explorer.',
              txId: signature
            };
          }
        } else {
          // Actual failure (not timeout) - return error immediately
          logger.error('External transfer verification failed', {
            signature,
            error: verificationResult.error,
            note: 'Transaction was submitted but not confirmed. It may have failed or expired.'
          }, 'ExternalTransferService');
          return {
            success: false,
            signature, // Include signature so user can check on Solana Explorer
            error: verificationResult.error || 'Transaction verification failed. Please check transaction status on Solana Explorer.',
            txId: signature
          };
        }
      }

      logger.info('USDC transfer transaction confirmed', {
        signature,
        amount: recipientAmount,
        companyFee,
        netAmount: recipientAmount
      }, 'ExternalTransferService');

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount: recipientAmount,
        blockchainFee: this.estimateBlockchainFee(transaction)
      };
    } catch (error) {
      logger.error('USDC transfer failed', {
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        params: {
          to: params.to,
          amount: params.amount,
          recipientAmount,
          companyFee
        }
      }, 'ExternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'USDC transfer failed'
      };
    }
  }

  /**
   * Validate recipient address
   */
  private validateRecipientAddress(address: string): { isValid: boolean; error?: string } {
    try {
      // Check if it's a valid Solana address
      new PublicKey(address);
      
      // Check address length and format
      if (address.length < 32 || address.length > 44) {
        return {
          isValid: false,
          error: 'Invalid address length'
        };
      }

      // Check if it's a valid base58 string
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      if (!base58Regex.test(address)) {
        return {
          isValid: false,
          error: 'Invalid address format'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid Solana address'
      };
    }
  }

  // Fee calculation now handled by centralized FeeService

  /**
   * Get priority fee
   */
  private getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Estimate blockchain fee
   */
  private estimateBlockchainFee(transaction: Transaction): number {
    // Rough estimate: 5000 lamports per signature + compute units
    const signatureCount = transaction.signatures.length;
    const computeUnits = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
    const feePerComputeUnit = 0.000001; // 1 micro-lamport per compute unit
    
    return (signatureCount * 5000 + computeUnits * feePerComputeUnit) / LAMPORTS_PER_SOL;
  }

  /**
   * @deprecated Use shared verifyTransactionOnBlockchain from transactionVerificationUtils instead
   * This method is kept for backward compatibility but will be removed
   */
  private async verifyTransactionOnBlockchain(signature: string): Promise<{ success: boolean; error?: string }> {
    // Use shared verification utility for consistent behavior
    const result = await verifyTransactionOnBlockchain(await optimizedTransactionUtils.getConnection(), signature);
              return {
      success: result.success,
      error: result.error
    };
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<{
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations?: number;
    error?: string;
  }> {
    try {
      const connection = await optimizedTransactionUtils.getConnection();
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      if (!status.value) {
        return { status: 'pending' };
      }

      if (status.value.err) {
        return { 
          status: 'failed', 
          error: status.value.err.toString() 
        };
      }

      const confirmations = status.value.confirmations || 0;
      if (confirmations >= 32) {
        return { status: 'finalized', confirmations };
      } else if (confirmations > 0) {
        return { status: 'confirmed', confirmations };
      } else {
        return { status: 'pending' };
      }
    } catch (error) {
      logger.error('Failed to get transaction status', error, 'ExternalTransferService');
      return { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _externalTransferService: ExternalTransferService | null = null;

export const externalTransferService = {
  get instance() {
    if (!_externalTransferService) {
      _externalTransferService = new ExternalTransferService();
    }
    return _externalTransferService;
  }
};
