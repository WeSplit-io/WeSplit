/**
 * Internal P2P Send Flow - Real On-Chain Transactions
 * Handles user-to-user transfers within the app
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
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
import { FeeService, COMPANY_WALLET_CONFIG, TransactionType } from '../../../config/constants/feeConfig';
import { solanaWalletService } from '../wallet';
import { logger } from '../../analytics/loggingService';
import { optimizedTransactionUtils } from '../../shared/transactionUtilsOptimized';
import { TransactionUtils as transactionUtils } from '../../shared/transactionUtils';
import { notificationUtils } from '../../shared/notificationUtils';
import { TRANSACTION_CONFIG } from '../../../config/constants/transactionConfig';

export interface InternalTransferParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  groupId?: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  transactionType?: TransactionType; // Add transaction type for fee calculation
}

export interface InternalTransferToAddressParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface InternalTransferResult {
  success: boolean;
  signature?: string;
  txId?: string;
  companyFee?: number;
  netAmount?: number;
  blockchainFee?: number;
  error?: string;
}

export interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  currentBalance: number;
  requiredAmount: number;
  shortfall?: number;
}

class InternalTransferService {
  constructor() {
    // Connection management now handled by shared transactionUtils
  }


  /**
   * Send internal P2P transfer
   */
  async sendInternalTransfer(params: InternalTransferParams): Promise<InternalTransferResult> {
    try {
      logger.info('Starting internal transfer', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId
      }, 'InternalTransferService');

      // Validate recipient address
      const recipientValidation = this.validateRecipientAddress(params.to);
      if (!recipientValidation.isValid) {
        return {
          success: false,
          error: recipientValidation.error
        };
      }

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'send';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      // Check balance before proceeding
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency, false, transactionType);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${balanceCheck.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Load wallet using the existing userWalletService
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(params.userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Failed to load user wallet'
        };
      }

      // Load the wallet into solanaWalletService for signing
      const expectedWalletAddress = walletResult.wallet.address;
      logger.info('Loading wallet into solanaWalletService for signing', { 
        userId: params.userId, 
        expectedWalletAddress 
      }, 'InternalTransferService');
      
      // Use the new method that ensures we load the wallet with sufficient balance
      const walletLoaded = await solanaWalletService.loadWalletWithBalance(params.userId, expectedWalletAddress, params.currency);
      if (!walletLoaded) {
        logger.error('Cannot proceed with transaction - no wallet with sufficient balance found', {
          userId: params.userId,
          expectedWalletAddress,
          currency: params.currency,
          issue: 'No wallet with sufficient balance found. Please ensure you have the correct wallet credentials.'
        }, 'InternalTransferService');
        
        // Try comprehensive wallet recovery as a last resort
        logger.info('Attempting comprehensive wallet recovery', { userId: params.userId, expectedWalletAddress }, 'InternalTransferService');
        const recoveryResult = await walletService.recoverWalletForUser(params.userId, expectedWalletAddress);
        
        if (recoveryResult.success && recoveryResult.wallet) {
          logger.info('✅ Wallet recovered successfully, retrying transaction', { 
            userId: params.userId, 
            recoveredAddress: recoveryResult.wallet.address 
          }, 'InternalTransferService');
          
          // Retry loading the wallet after recovery
          const retryWalletLoaded = await solanaWalletService.loadWalletWithBalance(params.userId, expectedWalletAddress, params.currency);
          if (!retryWalletLoaded) {
            return {
              success: false,
              error: 'Wallet recovery succeeded but wallet still cannot be loaded for transaction.'
            };
          }
        } else {
          return {
            success: false,
            error: 'Wallet mismatch: No wallet with sufficient balance found. Please import your existing wallet or ensure you have the correct credentials.'
          };
        }
      }
      logger.info('Wallet loaded successfully for signing', { 
        userId: params.userId, 
        expectedWalletAddress 
      }, 'InternalTransferService');

      // Build and send transaction
      logger.info('Building transaction', {
        currency: params.currency,
        recipientAmount,
        companyFee
      }, 'InternalTransferService');

      let result: InternalTransferResult;
      if (params.currency === 'USDC') {
        logger.info('Sending USDC transfer', { recipientAmount, companyFee }, 'InternalTransferService');
        try {
          result = await this.sendUsdcTransfer(params, recipientAmount, companyFee);
          logger.info('USDC transfer method completed', { 
            success: result.success, 
            signature: result.signature,
            error: result.error 
          }, 'InternalTransferService');
        } catch (error) {
          logger.error('USDC transfer method threw error', error, 'InternalTransferService');
          result = {
            success: false,
            error: error instanceof Error ? error.message : 'USDC transfer method failed'
          };
        }
      } else {
        logger.error('Unsupported currency for internal transfer', { currency: params.currency }, 'InternalTransferService');
        result = {
          success: false,
          error: 'WeSplit only supports USDC transfers. SOL transfers are not supported within the app.'
        };
      }

      logger.info('Transaction result', {
        success: result.success,
        signature: result.signature,
        error: result.error
      }, 'InternalTransferService');

      if (result.success) {
        logger.info('Internal transfer completed successfully', {
          signature: result.signature,
          amount: params.amount,
          netAmount: result.netAmount,
          companyFee: result.companyFee
        }, 'InternalTransferService');

        // Save transaction to Firebase for history
        try {
          await notificationUtils.saveTransactionToFirestore({
            userId: params.userId,
            to: params.to,
            amount: params.amount,
            currency: params.currency,
            signature: result.signature!,
            companyFee: result.companyFee!,
            netAmount: result.netAmount!,
            memo: params.memo,
            groupId: params.groupId
          });

          // Award points for wallet-to-wallet transfer (only for internal transfers)
          // Check if recipient is a registered user to confirm it's an internal transfer
          try {
            const { firebaseDataService } = await import('../../data/firebaseDataService');
            const recipientUser = await firebaseDataService.user.getUserByWalletAddress(params.to);
            
            if (recipientUser) {
              // This is an internal wallet-to-wallet transfer, award points
              const { pointsService } = await import('../../rewards/pointsService');
              const pointsResult = await pointsService.awardTransactionPoints(
                params.userId,
                params.amount,
                result.signature!,
                'send'
              );
              
              if (pointsResult.success) {
                logger.info('✅ Points awarded for internal transfer', {
                  userId: params.userId,
                  pointsAwarded: pointsResult.pointsAwarded,
                  totalPoints: pointsResult.totalPoints,
                  transactionAmount: params.amount
                }, 'InternalTransferService');
              }

              // Check and complete first transaction quest
              const { questService } = await import('../../rewards/questService');
              const isFirstTransaction = await questService.isQuestCompleted(params.userId, 'first_transaction');
              if (!isFirstTransaction) {
                const questResult = await questService.completeQuest(params.userId, 'first_transaction');
                if (questResult.success) {
                  logger.info('✅ First transaction quest completed', {
                    userId: params.userId,
                    pointsAwarded: questResult.pointsAwarded
                  }, 'InternalTransferService');
                }
              }
            }
          } catch (pointsError) {
            logger.error('❌ Error awarding points for internal transfer', pointsError, 'InternalTransferService');
            // Don't fail the transaction if points award fails
          }
        } catch (error) {
          logger.warn('Failed to save transaction to Firebase', { error, signature: result.signature }, 'InternalTransferService');
          // Don't fail the transaction if Firebase save fails
        }
      } else {
        logger.error('Internal transfer failed', {
          error: result.error,
          amount: params.amount,
          currency: params.currency
        }, 'InternalTransferService');
      }

      return result;
    } catch (error) {
      logger.error('Internal transfer failed', error, 'InternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check user balance
   */
  async checkBalance(userId: string, amount: number, currency: 'SOL' | 'USDC', skipCompanyFee: boolean = false, transactionType: TransactionType = 'send'): Promise<BalanceCheckResult> {
    try {
      // Use the existing userWalletService to get balance
      const { walletService } = await import('../wallet');
      const balance = await walletService.getUserWalletBalance(userId);
      
      const currentBalance = balance?.usdcBalance || 0; // WeSplit only supports USDC
      
      // Calculate total required amount (including company fee unless skipped)
      const requiredAmount = skipCompanyFee ? amount : (() => {
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount, transactionType);
        return amount + companyFee;
      })();

      logger.info('Balance check completed', {
        userId,
        currency,
        currentBalance,
        requiredAmount,
        skipCompanyFee,
        transactionType,
        hasSufficientBalance: currentBalance >= requiredAmount
      }, 'InternalTransferService');

      return {
        hasSufficientBalance: currentBalance >= requiredAmount,
        currentBalance,
        requiredAmount,
        shortfall: currentBalance < requiredAmount ? requiredAmount - currentBalance : undefined
      };
    } catch (error) {
      logger.error('Failed to check balance', error, 'InternalTransferService');
      return {
        hasSufficientBalance: false,
        currentBalance: 0,
        requiredAmount: amount
      };
    }
  }

  /**
   * Get real-time balance from on-chain
   */
  async getRealTimeBalance(userId: string): Promise<{ sol: number; usdc: number }> {
    try {
      return await solanaWalletService.getBalance();
    } catch (error) {
      logger.error('Failed to get real-time balance', error, 'InternalTransferService');
      throw error;
    }
  }

  /**
   * SOL transfers are not supported in WeSplit app
   * Only USDC transfers are allowed within the app
   */
  private async sendSolTransfer(
    params: InternalTransferParams, 
    recipientAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    logger.error('SOL transfer attempted - not supported in WeSplit app', { 
      currency: params.currency 
    }, 'InternalTransferService');
    
    return {
      success: false,
      error: 'SOL transfers are not supported within WeSplit app. Only USDC transfers are allowed.'
    };
  }

  /**
   * Send USDC transfer
   */
  private async sendUsdcTransfer(
    params: InternalTransferParams, 
    recipientAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    try {
      logger.info('Starting USDC transfer', {
        to: params.to,
        recipientAmount,
        companyFee,
        originalAmount: params.amount
      }, 'InternalTransferService');

      // Get wallet public key
      logger.info('Getting wallet public key', {}, 'InternalTransferService');
      const publicKey = solanaWalletService.getPublicKey();
      if (!publicKey) {
        logger.error('Wallet not loaded - no public key available', {}, 'InternalTransferService');
        throw new Error('Wallet not loaded - no public key available');
      }
      logger.info('Wallet public key retrieved', { publicKey }, 'InternalTransferService');

      const fromPublicKey = new PublicKey(publicKey);
      const toPublicKey = new PublicKey(params.to);
      const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);

      logger.info('USDC transfer setup', {
        fromPublicKey: fromPublicKey.toBase58(),
        toPublicKey: toPublicKey.toBase58(),
        usdcMint: usdcMint.toBase58()
      }, 'InternalTransferService');

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

      logger.info('Token accounts', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58()
      }, 'InternalTransferService');

      // Check if recipient has USDC token account, create if needed
      let needsTokenAccountCreation = false;
      try {
        await getAccount((await optimizedTransactionUtils.getConnection()), toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.warn('Recipient USDC token account does not exist, will create it', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        needsTokenAccountCreation = true;
      }

      // Get recent blockhash with retry logic
      const connection = await optimizedTransactionUtils.getConnection();
      const blockhash = await TransactionUtils.getLatestBlockhashWithRetry(connection);
      logger.info('Got recent blockhash', { blockhash }, 'InternalTransferService');

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
      
      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // User or company pays fees based on configuration
      });

      logger.info('Transaction created', {
        feePayer: feePayerPublicKey.toBase58(),
        recentBlockhash: blockhash,
        instructionsCount: transaction.instructions.length
      }, 'InternalTransferService');

      // Add priority fee
      const priorityFee = transactionUtils.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
        logger.info('Added priority fee', { priorityFee }, 'InternalTransferService');
      }

      // Add token account creation instruction if needed
      if (needsTokenAccountCreation) {
        logger.info('Adding token account creation instruction', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            feePayerPublicKey, // Fee payer pays ATA creation
            toTokenAccount, // associated token account
            toPublicKey, // owner
            usdcMint // mint
          )
        );
      }

      // Add USDC transfer instruction for recipient (full amount)
      const transferAmount = Math.floor(recipientAmount * Math.pow(10, 6) + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      logger.info('Adding USDC transfer instruction for recipient', { 
        transferAmount, 
        recipientAmount,
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58(),
        authority: fromPublicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58()
      }, 'InternalTransferService');
      
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey, // User is the authority for the token transfer
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Add company fee transfer instruction to admin wallet
      if (companyFee > 0) {
        const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6) + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
        
        // Get company wallet's USDC token account
        const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(COMPANY_WALLET_CONFIG.address));
        
        logger.info('Adding company fee transfer instruction', { 
          companyFeeAmount, 
          companyFee,
          fromTokenAccount: fromTokenAccount.toBase58(),
          companyTokenAccount: companyTokenAccount.toBase58(),
          companyWalletAddress: COMPANY_WALLET_CONFIG.address,
          authority: fromPublicKey.toBase58()
        }, 'InternalTransferService');
        
        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey, // User is the authority for the token transfer
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
            keys: [{ pubkey: feePayerPublicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(params.memo, 'utf8'),
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
          })
        );
        logger.info('Added memo instruction', { 
          memo: params.memo, 
          memoSigner: feePayerPublicKey.toBase58() 
        }, 'InternalTransferService');
      }

      logger.info('All instructions added to transaction', {
        instructionsCount: transaction.instructions.length,
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash
      }, 'InternalTransferService');

      // Get wallet keypair for signing
      const walletInfo = await solanaWalletService.getWalletInfo();
      if (!walletInfo || !walletInfo.secretKey) {
        throw new Error('Wallet keypair not available for signing');
      }

      const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
      const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);

      // Prepare signers array
      const signers: Keypair[] = [];
      
      // Company wallet always pays SOL fees - we need company wallet keypair
      logger.info('Company wallet configuration check', {
        companyWalletRequired: true,
        hasCompanySecretKey: !!COMPANY_WALLET_CONFIG.secretKey,
        companyWalletAddress: COMPANY_WALLET_CONFIG.address,
        feePayerAddress: feePayerPublicKey.toBase58()
      }, 'InternalTransferService');

      if (COMPANY_WALLET_CONFIG.secretKey) {
        try {
          logger.info('Processing company wallet secret key', {
            secretKeyLength: COMPANY_WALLET_CONFIG.secretKey.length,
            secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey.substring(0, 10) + '...',
            secretKeyFormat: 'base64'
          }, 'InternalTransferService');

          // Try different formats for the secret key
          let companySecretKeyBuffer: Buffer;
          
          // Check if it looks like a comma-separated array first
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            try {
              // Remove square brackets if present and split by comma
              const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
              const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
              
              // Validate that all elements are valid numbers
              if (keyArray.some(num => isNaN(num))) {
                throw new Error('Invalid comma-separated array format - contains non-numeric values');
              }
              
              companySecretKeyBuffer = Buffer.from(keyArray);
              logger.info('Successfully decoded secret key as comma-separated array', {
                bufferLength: companySecretKeyBuffer.length,
                arrayLength: keyArray.length
              }, 'InternalTransferService');
            } catch (arrayError) {
              throw new Error(`Failed to parse comma-separated array: ${arrayError instanceof Error ? arrayError.message : String(arrayError)}`);
            }
          } else {
            try {
              // Try base64 first for other formats
              companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
              
              // Check if the length is reasonable for Solana (64 or 65 bytes)
              if (companySecretKeyBuffer.length === 64 || companySecretKeyBuffer.length === 65) {
                logger.info('Successfully decoded secret key as base64', {
                  bufferLength: companySecretKeyBuffer.length
                }, 'InternalTransferService');
              } else {
                throw new Error(`Base64 decoded to unexpected length: ${companySecretKeyBuffer.length}`);
              }
            } catch (base64Error) {
              try {
                // Try hex format
                companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'hex');
                logger.info('Successfully decoded secret key as hex', {
                  bufferLength: companySecretKeyBuffer.length
                }, 'InternalTransferService');
              } catch (hexError) {
                throw new Error('Unable to decode secret key in any supported format');
              }
            }
          }

          // Validate the secret key length (should be 64 or 65 bytes for Solana)
          if (companySecretKeyBuffer.length === 65) {
            // Remove the last byte (public key) to get the 64-byte secret key
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
            logger.info('Trimmed 65-byte keypair to 64-byte secret key', {
              originalLength: 65,
              trimmedLength: companySecretKeyBuffer.length
            }, 'InternalTransferService');
          } else if (companySecretKeyBuffer.length !== 64) {
            throw new Error(`Invalid secret key length: ${companySecretKeyBuffer.length} bytes (expected 64 or 65)`);
          }

          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          
        logger.info('Using company wallet for fees', {
          companyWalletAddress: COMPANY_WALLET_CONFIG.address,
          userWalletAddress: userKeypair.publicKey.toBase58(),
          companyKeypairAddress: companyKeypair.publicKey.toBase58()
        }, 'InternalTransferService');

        // Add both keypairs to signers array
        signers.push(userKeypair, companyKeypair);
        logger.info('Added both keypairs to signers array', {
          signersCount: signers.length,
          signers: signers.map(signer => signer.publicKey.toBase58())
        }, 'InternalTransferService');
        } catch (error) {
          logger.error('Failed to load company wallet keypair', { error }, 'InternalTransferService');
          throw new Error('Company wallet keypair not available for signing');
        }
      } else {
        throw new Error('Company wallet secret key is required for SOL fee coverage');
      }

      // Debug transaction before serialization
      logger.info('Transaction ready for signing', {
        signerPublicKey: userKeypair.publicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58(),
        signersCount: signers.length,
        signers: signers.map(signer => signer.publicKey.toBase58()),
        instructionsCount: transaction.instructions.length
      }, 'InternalTransferService');

      logger.info('Signing and sending transaction', {
        signerPublicKey: userKeypair.publicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58(),
        signersCount: signers.length,
        signers: signers.map(signer => signer.publicKey.toBase58())
      }, 'InternalTransferService');

      // Debug transaction structure
      logger.info('Transaction structure debug', {
        instructionsCount: transaction.instructions.length,
        instructions: transaction.instructions.map((ix, index) => ({
          index,
          programId: ix.programId.toBase58(),
          keys: ix.keys.map(key => ({
            pubkey: key.pubkey.toBase58(),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          }))
        }))
      }, 'InternalTransferService');

      // Sign and send transaction with optimized approach
      let signature: string;
      try {
        logger.info('Attempting to sign and send transaction', {
          connectionEndpoint: (await optimizedTransactionUtils.getConnection()).rpcEndpoint,
          commitment: getConfig().blockchain.commitment,
          priority: params.priority || 'medium'
        }, 'InternalTransferService');
        
        // Use sendTransaction for faster response, then confirm separately
        signature = await optimizedTransactionUtils.sendTransactionWithRetry(transaction, signers, params.priority || 'medium');
        
        logger.info('Transaction signed and sent successfully', { signature }, 'InternalTransferService');
      } catch (signingError) {
        logger.error('Transaction signing failed', { 
          error: signingError,
          errorMessage: signingError instanceof Error ? signingError.message : String(signingError),
          signersCount: signers.length,
          signers: signers.map(signer => signer.publicKey.toBase58())
        }, 'InternalTransferService');
        throw signingError;
      }

      logger.info('Transaction sent successfully', { signature }, 'InternalTransferService');

      // Confirm transaction with optimized timeout handling
      const confirmed = await optimizedTransactionUtils.confirmTransactionWithTimeout(signature);
      
      if (!confirmed) {
        logger.warn('Transaction confirmation timed out, but transaction was sent', { 
          signature,
          note: 'Transaction may still be processing on the blockchain'
        }, 'InternalTransferService');
        
        // Try to check transaction status one more time after a short delay
        try {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          const status = await transactionUtils.getTransactionStatus(signature);
          
          if (status.status === 'confirmed' || status.status === 'finalized') {
            logger.info('Transaction confirmed on retry check', { signature, status }, 'InternalTransferService');
          } else {
            logger.warn('Transaction still not confirmed on retry', { signature, status }, 'InternalTransferService');
          }
        } catch (error) {
          logger.warn('Failed to check transaction status on retry', { signature, error }, 'InternalTransferService');
        }
        
        // Don't fail the transaction - it might still succeed
      } else {
        logger.info('Transaction confirmed successfully', { signature }, 'InternalTransferService');
      }

      // Notifications are now handled by the shared notificationUtils in saveTransactionToFirestore

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount: recipientAmount,
        blockchainFee: this.estimateBlockchainFee(transaction)
      };
    } catch (error) {
      logger.error('USDC transfer failed', error, 'InternalTransferService');
      
      // Failed transfer notifications can be handled by the calling service if needed
      
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
   * Estimate blockchain fee
   */
  private estimateBlockchainFee(transaction: Transaction): number {
    return transactionUtils.estimateBlockchainFee(transaction);
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
      const status = await (await optimizedTransactionUtils.getConnection()).getSignatureStatus(signature, {
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
      logger.warn('Failed to get transaction status, trying next RPC endpoint', { 
        signature,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: (await optimizedTransactionUtils.getConnection()).rpcEndpoint
      }, 'InternalTransferService');
      
      // Switch to next RPC endpoint if available
      if ((await optimizedTransactionUtils.getConnection())) {
        await transactionUtils.switchToNextEndpoint();
        // Retry once with new endpoint
        try {
          const retryStatus = await (await optimizedTransactionUtils.getConnection()).getSignatureStatus(signature, {
            searchTransactionHistory: true
          });
          
          if (retryStatus.value?.err) {
            return { 
              status: 'failed', 
              error: retryStatus.value.err.toString() 
            };
          }
          
          return { status: 'pending' };
        } catch (retryError) {
          return { 
            status: 'pending', 
            error: 'Unable to verify transaction status' 
          };
        }
      }
      
      return { 
        status: 'pending', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send internal transfer to any address (for split wallets, external addresses, etc.)
   * This method doesn't try to find the recipient as a user in the database
   */
  async sendInternalTransferToAddress(params: InternalTransferToAddressParams): Promise<InternalTransferResult> {
    try {
      logger.info('Starting internal transfer to address', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId
      }, 'InternalTransferService');

      // Validate recipient address
      const recipientValidation = this.validateRecipientAddress(params.to);
      if (!recipientValidation.isValid) {
        return {
          success: false,
          error: recipientValidation.error
        };
      }

      // Check if this is a split wallet payment (no company fees)
      const isSplitWalletPayment = Boolean(params.memo && (
        params.memo.includes('Split payment') || 
        params.memo.includes('split wallet') ||
        params.memo.includes('Degen Split')
      ));

      // Check balance before proceeding - skip company fee for split wallet payments
      const transactionType = 'send'; // Default to 'send' for address transfers
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency, isSplitWalletPayment, transactionType);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${balanceCheck.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Calculate company fee - but skip for split wallet payments
      const { fee: companyFee, totalAmount, recipientAmount } = isSplitWalletPayment 
        ? { fee: 0, totalAmount: params.amount, recipientAmount: params.amount }
        : FeeService.calculateCompanyFee(params.amount, transactionType);

      // Load wallet using the existing userWalletService
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(params.userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Failed to load user wallet'
        };
      }

      const userWallet = walletResult.wallet;
      
      // Handle different secret key formats
      let fromKeypair: Keypair;
      if (!userWallet.secretKey) {
        return {
          success: false,
          error: 'User wallet secret key not found'
        };
      }
      
      try {
        // Try base64 format first
        const secretKeyBuffer = Buffer.from(userWallet.secretKey, 'base64');
        fromKeypair = Keypair.fromSecretKey(secretKeyBuffer);
        logger.debug('Successfully created keypair from base64 secret key', null, 'sendInternal');
      } catch (base64Error) {
        try {
          // Try JSON array format (stored in secure storage)
          const secretKeyArray = JSON.parse(userWallet.secretKey);
          fromKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          logger.debug('Successfully created keypair from JSON array secret key', null, 'sendInternal');
        } catch (jsonError) {
          console.error('❌ Failed to create keypair from secret key:', {
            base64Error: (base64Error as Error).message,
            jsonError: (jsonError as Error).message,
            secretKeyLength: userWallet.secretKey?.length,
            secretKeyPreview: userWallet.secretKey?.substring(0, 20) + '...'
          });
          return {
            success: false,
            error: 'Invalid user wallet secret key format'
          };
        }
      }

      // Get recent blockhash with retry logic
      const connection = await optimizedTransactionUtils.getConnection();
      const blockhash = await TransactionUtils.getLatestBlockhashWithRetry(connection);

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromKeypair.publicKey);

      // Create transaction with proper blockhash and fee payer
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // Company or user pays fees based on configuration
      });

      // Add priority fee
      const priorityFee = transactionUtils.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

      if (params.currency === 'USDC') {
        // USDC transfer logic
        const fromTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(getConfig().blockchain.usdcMintAddress),
          fromKeypair.publicKey
        );

        const toTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(getConfig().blockchain.usdcMintAddress),
          new PublicKey(params.to)
        );

        // Check if sender has USDC token account
        try {
          const senderAccount = await getAccount((await optimizedTransactionUtils.getConnection()), fromTokenAccount);
          logger.debug('Sender USDC token account exists', {
            address: fromTokenAccount.toBase58(),
            balance: senderAccount.amount.toString(),
            balanceInUSDC: (Number(senderAccount.amount) / 1000000).toFixed(6),
            isFrozen: senderAccount.isFrozen,
            owner: senderAccount.owner.toBase58()
          });
        } catch (error) {
          console.error('❌ Sender USDC token account does not exist:', {
            address: fromTokenAccount.toBase58(),
            error: (error as Error).message
          });
          return {
            success: false,
            error: 'Your USDC token account does not exist. Please contact support.'
          };
        }

        // Check if recipient has USDC token account, create if not
        try {
          await getAccount((await optimizedTransactionUtils.getConnection()), toTokenAccount);
          logger.debug('Recipient USDC token account exists', null, 'sendInternal');
        } catch (error) {
          logger.debug('Creating USDC token account for recipient', null, 'sendInternal');
          // Token account doesn't exist, create it
          transaction.add(
            createAssociatedTokenAccountInstruction(
              feePayerPublicKey, // fee payer pays for account creation
              toTokenAccount, // associated token account
              new PublicKey(params.to), // owner
              new PublicKey(getConfig().blockchain.usdcMintAddress) // mint
            )
          );
        }

        // Add USDC transfer instruction (full amount to recipient)
        // Use precise conversion to avoid floating point issues
        const transferAmount = Math.floor(recipientAmount * 1000000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
        
        logger.debug('USDC Transfer Amount Conversion', {
          recipientAmount,
          rawCalculation: recipientAmount * 1000000,
          transferAmount,
          expectedRaw: 0.0116 * 1000000,
          difference: Math.abs(transferAmount - (0.0116 * 1000000))
        });
        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromKeypair.publicKey,
            transferAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );

        // Add company fee transfer if applicable
        if (companyFee > 0) {
          const companyTokenAccount = await getAssociatedTokenAddress(
            new PublicKey(getConfig().blockchain.usdcMintAddress),
            new PublicKey(COMPANY_WALLET_CONFIG.address)
          );

          const companyFeeAmount = Math.floor(companyFee * 1000000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
          transaction.add(
            createTransferInstruction(
              fromTokenAccount,
              companyTokenAccount,
              fromKeypair.publicKey,
              companyFeeAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }
      } else {
        // SOL transfer logic
        const lamports = Math.floor(recipientAmount * LAMPORTS_PER_SOL);
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: new PublicKey(params.to),
            lamports
          })
        );

        // Add company fee transfer if applicable
        if (companyFee > 0) {
          const companyFeeLamports = Math.floor(companyFee * LAMPORTS_PER_SOL);
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: fromKeypair.publicKey,
              toPubkey: new PublicKey(COMPANY_WALLET_CONFIG.address),
              lamports: companyFeeLamports
            })
          );
        }
      }

      // Add memo if provided
      if (params.memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: feePayerPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(params.memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Simulate transaction first to catch errors early
      // Skip simulation if we're creating a token account, as simulation often fails for account creation
      const hasTokenAccountCreation = transaction.instructions.some(ix => 
        ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)
      );
      
      if (!hasTokenAccountCreation) {
        try {
          logger.debug('Simulating transaction before sending', null, 'sendInternal');
          const simulationResult = await (await optimizedTransactionUtils.getConnection()).simulateTransaction(transaction);
          
          if (simulationResult.value.err) {
            console.error('❌ Transaction simulation failed:', simulationResult.value.err);
            return {
              success: false,
              error: `Transaction simulation failed: ${JSON.stringify(simulationResult.value.err)}`
            };
          }
          
          logger.debug('Transaction simulation successful', null, 'sendInternal');
        } catch (simulationError) {
          console.error('❌ Transaction simulation error:', simulationError);
          return {
            success: false,
            error: `Transaction simulation error: ${(simulationError as Error).message}`
          };
        }
      } else {
        logger.debug('Skipping simulation due to token account creation - proceeding with transaction', null, 'sendInternal');
      }

      // Prepare signers array
      const signers: Keypair[] = [fromKeypair]; // User always signs for token transfers
      
      // Company wallet always pays SOL fees - we need company wallet keypair
      if (COMPANY_WALLET_CONFIG.secretKey) {
        try {
          // Try different formats for the company secret key
          let companySecretKeyBuffer: Buffer;
          
          // Check if it looks like a comma-separated array first
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            try {
              // Remove square brackets if present and split by comma
              const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
              const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
              
              // Validate that all elements are valid numbers
              if (keyArray.some(num => isNaN(num))) {
                throw new Error('Invalid comma-separated array format - contains non-numeric values');
              }
              
              companySecretKeyBuffer = Buffer.from(keyArray);
            } catch (arrayError) {
              throw new Error(`Failed to parse comma-separated array: ${arrayError instanceof Error ? arrayError.message : String(arrayError)}`);
            }
          } else {
            try {
              // Try base64 first for other formats
              companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
            } catch (base64Error) {
              throw new Error(`Failed to decode base64 secret key: ${base64Error instanceof Error ? base64Error.message : String(base64Error)}`);
            }
          }
          
          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          signers.push(companyKeypair);
          logger.info('Company wallet keypair added to signers', null, 'sendInternal');
        } catch (error) {
          console.error('❌ Failed to create company wallet keypair:', error);
          return {
            success: false,
            error: 'Failed to load company wallet for fee payment'
          };
        }
      }

      // Send transaction with retry logic for blockhash expiration
      logger.info('Sending transaction', null, 'sendInternal');
      let signature: string | undefined;
      let lastError: unknown;
      
      try {
        // Try up to 3 times with fresh blockhashes and exponential backoff
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            logger.info('Transaction attempt', { 
              attempt, 
              maxAttempts: 3, 
              details: {
                instructionCount: transaction.instructions.length,
                feePayer: transaction.feePayer?.toBase58(),
                signerCount: signers.length,
                signers: signers.map(s => s.publicKey.toBase58())
              }
            }, 'sendInternal');
            
            // Get fresh blockhash for each attempt with retry
            const connection = await optimizedTransactionUtils.getConnection();
            const freshBlockhash = await TransactionUtils.getLatestBlockhashWithRetry(connection, 'confirmed');
            
            // Update blockhash and re-sign transaction for each attempt
            transaction.recentBlockhash = freshBlockhash;
            
            // Clear previous signatures and re-sign with fresh blockhash
            transaction.signatures = [];
            transaction.sign(...signers);
            logger.info('Transaction re-signed with fresh blockhash', { freshBlockhash }, 'sendInternal');
            
            logger.info('Attempting sendAndConfirmTransaction with fresh blockhash', { freshBlockhash }, 'sendInternal');
            
            // Use optimized transaction sending approach
            try {
              logger.info('Sending transaction with optimized approach', null, 'sendInternal');
              
              // Transaction is already signed above with fresh blockhash
              
              // Send transaction first (faster response)
              signature = await (await optimizedTransactionUtils.getConnection()).sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 0, // We handle retries ourselves
              });
              
              logger.info('Transaction sent with signature, waiting for confirmation', { signature }, 'sendInternal');
              
              // Confirm transaction with timeout using centralized configuration
              const confirmPromise = (await optimizedTransactionUtils.getConnection()).confirmTransaction(signature, 'confirmed');
              const confirmTimeoutPromise = new Promise<never>((_, reject) => {
                const timeout = TRANSACTION_CONFIG.timeout.confirmation;
                setTimeout(() => reject(new Error(`Transaction confirmation timeout after ${timeout/1000} seconds`)), timeout);
              });
              
              await Promise.race([confirmPromise, confirmTimeoutPromise]);
              logger.info('Transaction confirmed', { signature }, 'sendInternal');
              
            } catch (confirmError) {
              console.warn(`⚠️ Transaction confirmation failed:`, (confirmError as Error).message);
              
              // For split wallet payments, we need strict confirmation
              // Don't accept transactions that haven't been confirmed
              throw new Error(`Transaction confirmation failed: ${(confirmError as Error).message}. Transaction may have failed or is still pending.`);
            }
            
            logger.info('Transaction successful on attempt', { attempt, signature }, 'sendInternal');
            break; // Success, exit retry loop
            
          } catch (error) {
            lastError = error;
            console.warn(`⚠️ Transaction attempt ${attempt} failed:`, (error as Error).message);
            
            // Check if it's a blockhash expiration error
            if ((error as Error).message.includes('block height exceeded') || (error as Error).message.includes('blockhash')) {
              logger.info('Blockhash expired, retrying with fresh blockhash', null, 'sendInternal');
            } else {
              logger.info('Transaction failed for other reason, retrying', null, 'sendInternal');
            }
            
            if (attempt === 3) {
              // Last attempt failed
              console.error('❌ All transaction attempts failed');
              return {
                success: false,
                error: `Transaction failed after 3 attempts: ${(error as Error).message}`
              };
            }
            
            // Wait with exponential backoff before retrying
            const backoffDelay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            logger.info('Waiting before retry', { backoffDelay }, 'sendInternal');
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      } catch (error) {
        console.error('❌ Transaction sending failed:', error);
        return {
          success: false,
          error: `Transaction failed: ${(error as Error).message}`
        };
      }

      // Ensure signature is defined
      if (!signature) {
        return {
          success: false,
          error: 'Transaction failed - no signature received'
        };
      }

      // Save transaction to Firestore (without recipient user lookup)
      await notificationUtils.saveTransactionToFirestore({
        userId: params.userId,
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        signature,
        companyFee,
        netAmount: recipientAmount,
        memo: params.memo
      });

      // Send money sent notification to sender only (no recipient lookup)
      await notificationUtils.sendMoneySentNotification({
        userId: params.userId,
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        signature,
        companyFee,
        netAmount: recipientAmount,
        memo: params.memo
      });

      logger.info('Internal transfer to address completed successfully', {
        signature,
        amount: params.amount,
        currency: params.currency,
        companyFee,
        netAmount: recipientAmount
      }, 'InternalTransferService');

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount: recipientAmount,
        blockchainFee: priorityFee / LAMPORTS_PER_SOL
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500) // Limit stack trace length
      } : { error: String(error) };
      
      logger.error('Failed to send internal transfer to address', {
        error: errorMessage,
        details: errorDetails
      }, 'InternalTransferService');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _internalTransferService: InternalTransferService | null = null;

export const internalTransferService = {
  get instance() {
    if (!_internalTransferService) {
      _internalTransferService = new InternalTransferService();
    }
    return _internalTransferService;
  }
};
