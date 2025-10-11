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
import { CURRENT_NETWORK, TRANSACTION_CONFIG } from '../config/chain';
import { FeeService, COMPANY_FEE_CONFIG, COMPANY_WALLET_CONFIG, TransactionType } from '../config/feeConfig';
import { solanaWalletService } from '../wallet/solanaWallet';
import { logger } from '../services/loggingService';
import { moneyTransferNotificationService } from '../services/moneyTransferNotificationService';

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
  private connection: Connection;
  private rpcEndpoints: string[];
  private currentEndpointIndex: number = 0;

  constructor() {
    this.rpcEndpoints = CURRENT_NETWORK.rpcEndpoints || [CURRENT_NETWORK.rpcUrl];
    this.connection = this.createOptimizedConnection();
  }

  private createOptimizedConnection(): Connection {
    const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
    
    return new Connection(currentEndpoint, {
      commitment: CURRENT_NETWORK.commitment,
      confirmTransactionInitialTimeout: TRANSACTION_CONFIG.timeout.transaction,
      wsEndpoint: CURRENT_NETWORK.wsUrl,
      disableRetryOnRateLimit: false,
      // Performance optimizations
      httpHeaders: {
        'User-Agent': 'WeSplit/1.0',
        'Connection': 'keep-alive',
      },
      // Connection pooling with React Native compatible timeout
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TRANSACTION_CONFIG.timeout.connection);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    });
  }

  private async switchToNextEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    this.connection = this.createOptimizedConnection();
    console.log(`🔄 Switched to RPC endpoint: ${this.rpcEndpoints[this.currentEndpointIndex]}`);
  }

  /**
   * Get latest blockhash with retry logic and RPC failover
   */
  private async getLatestBlockhashWithRetry(commitment: 'confirmed' | 'finalized' = 'confirmed'): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { blockhash } = await this.connection.getLatestBlockhash(commitment);
        return blockhash;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Failed to get blockhash on attempt ${attempt + 1}/${maxRetries}:`, error);
        
        // Check if it's a network error that might benefit from RPC failover
        if (error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('AbortSignal') ||
          error.message.includes('aborted')
        )) {
          console.log(`🔄 Switching RPC endpoint due to network error...`);
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to get blockhash after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Send transaction with retry logic and RPC failover
   */
  private async sendTransactionWithRetry(
    transaction: Transaction, 
    signers: Keypair[], 
    priority: 'low' | 'medium' | 'high'
  ): Promise<string> {
    const maxRetries = TRANSACTION_CONFIG.retry.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get fresh blockhash for each attempt with retry logic
        const blockhash = await this.getLatestBlockhashWithRetry('confirmed');
        transaction.recentBlockhash = blockhash;

        // Sign the transaction
        transaction.sign(...signers);

        // Send transaction (faster than sendAndConfirmTransaction)
        const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 0, // We handle retries ourselves
        });

        logger.info('Transaction sent successfully', { 
          signature, 
          attempt: attempt + 1,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        }, 'InternalTransferService');

        return signature;

      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transaction send attempt ${attempt + 1} failed`, { 
          error: lastError.message,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        }, 'InternalTransferService');

        // Switch to next RPC endpoint if available
        if (this.rpcEndpoints.length > 1) {
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = TRANSACTION_CONFIG.retry.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Confirm transaction with timeout and retry logic
   */
  private async confirmTransactionWithTimeout(signature: string): Promise<boolean> {
    const timeout = TRANSACTION_CONFIG.timeout.confirmation;
    
    try {
      const confirmationPromise = this.connection.confirmTransaction(signature, 'confirmed');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeout);
      });

      const result = await Promise.race([confirmationPromise, timeoutPromise]);
      
      if (result.value?.err) {
        throw new Error(`Transaction failed: ${result.value.err.toString()}`);
      }

      return true;
    } catch (error) {
      logger.warn('Transaction confirmation failed or timed out', { 
        signature, 
        error: error instanceof Error ? error.message : String(error)
      }, 'InternalTransferService');
      return false;
    }
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

      // Check balance before proceeding
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${balanceCheck.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'send';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      // Load wallet using the existing userWalletService
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(params.userId);
      
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
        
        return {
          success: false,
          error: 'Wallet mismatch: No wallet with sufficient balance found. Please import your existing wallet or ensure you have the correct credentials.'
        };
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
      if (params.currency === 'SOL') {
        logger.info('Sending SOL transfer', { recipientAmount, companyFee }, 'InternalTransferService');
        result = await this.sendSolTransfer(params, recipientAmount, companyFee);
      } else {
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
          await this.saveTransactionToFirebase({
            userId: params.userId,
            toAddress: params.to,
            amount: params.amount,
            currency: params.currency,
            signature: result.signature!,
            companyFee: result.companyFee!,
            netAmount: result.netAmount!,
            memo: params.memo,
            groupId: params.groupId
          });
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
  async checkBalance(userId: string, amount: number, currency: 'SOL' | 'USDC', skipCompanyFee: boolean = false): Promise<BalanceCheckResult> {
    try {
      // Use the existing userWalletService to get balance
      const { userWalletService } = await import('../services/userWalletService');
      const balance = await userWalletService.getUserWalletBalance(userId);
      
      const currentBalance = currency === 'SOL' ? (balance?.solBalance || 0) : (balance?.usdcBalance || 0);
      
      // Calculate total required amount (including company fee unless skipped)
      const requiredAmount = skipCompanyFee ? amount : (() => {
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount);
        return amount + companyFee;
      })();

      logger.info('Balance check completed', {
        userId,
        currency,
        currentBalance,
        requiredAmount,
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
   * Send SOL transfer
   */
  private async sendSolTransfer(
    params: InternalTransferParams, 
    recipientAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    try {
      const fromPublicKey = new PublicKey(solanaWalletService.getPublicKey()!);
      const toPublicKey = new PublicKey(params.to);
      const lamports = recipientAmount * LAMPORTS_PER_SOL;

      // Get recent blockhash with retry logic
      const blockhash = await this.getLatestBlockhashWithRetry();

      // Use centralized fee payer logic - Company pays SOL gas fees
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
      
      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey
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

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

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

      // Get wallet keypair for signing
      const walletInfo = await solanaWalletService.getWalletInfo();
      if (!walletInfo || !walletInfo.secretKey) {
        throw new Error('Wallet keypair not available for signing');
      }

      const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
      const keypair = Keypair.fromSecretKey(secretKeyBuffer);

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair], // Use the actual keypair for signing
        {
          commitment: CURRENT_NETWORK.commitment,
          preflightCommitment: CURRENT_NETWORK.commitment
        }
      );

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount: recipientAmount,
        blockchainFee: this.estimateBlockchainFee(transaction)
      };
    } catch (error) {
      logger.error('SOL transfer failed', error, 'InternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SOL transfer failed'
      };
    }
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
      const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);

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
        await getAccount(this.connection, toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.warn('Recipient USDC token account does not exist, will create it', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        needsTokenAccountCreation = true;
      }

      // Get recent blockhash with retry logic
      const blockhash = await this.getLatestBlockhashWithRetry();
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
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
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
          connectionEndpoint: this.connection.rpcEndpoint,
          commitment: CURRENT_NETWORK.commitment,
          priority: params.priority || 'medium'
        }, 'InternalTransferService');
        
        // Use sendTransaction for faster response, then confirm separately
        signature = await this.sendTransactionWithRetry(transaction, signers, params.priority || 'medium');
        
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
      const confirmed = await this.confirmTransactionWithTimeout(signature);
      
      if (!confirmed) {
        logger.warn('Transaction confirmation timed out, but transaction was sent', { 
          signature,
          note: 'Transaction may still be processing on the blockchain'
        }, 'InternalTransferService');
        // Don't fail the transaction - it might still succeed
      } else {
        logger.info('Transaction confirmed successfully', { signature }, 'InternalTransferService');
      }

      // Create notifications for successful money transfer
      try {
        if (params.groupId) {
          // Group payment notifications
          await moneyTransferNotificationService.createGroupPaymentSentNotification(
            params.userId,
            params.groupId,
            params.amount,
            params.currency,
            signature,
            params.memo
          );
          
          await moneyTransferNotificationService.createGroupPaymentReceivedNotification(
            params.groupId,
            params.amount,
            params.currency,
            signature,
            params.userId,
            params.memo
          );
        } else {
          // Direct P2P payment notifications
          await moneyTransferNotificationService.createMoneySentNotification(
            params.userId,
            params.to,
            params.amount,
            params.currency,
            signature,
            params.memo
          );
          
          await moneyTransferNotificationService.createMoneyReceivedNotification(
            params.userId,
            params.to,
            params.amount,
            params.currency,
            signature,
            params.memo
          );
        }
        logger.info('Money transfer notifications created successfully', { signature }, 'InternalTransferService');
      } catch (notificationError) {
        logger.warn('Failed to create money transfer notifications', { 
          signature, 
          error: notificationError 
        }, 'InternalTransferService');
        // Don't fail the transaction if notifications fail
      }

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
      
      // Create notification for failed transfer
      try {
        await moneyTransferNotificationService.createMoneyTransferFailedNotification(
          params.userId,
          params.amount,
          params.currency,
          error instanceof Error ? error.message : 'Transfer failed',
          !!params.groupId,
          params.groupId
        );
      } catch (notificationError) {
        logger.warn('Failed to create money transfer failed notification', { 
          error: notificationError 
        }, 'InternalTransferService');
      }
      
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
   * Save transaction to Firebase for history and send notification to recipient
   */
  private async saveTransactionToFirebase(transactionData: {
    userId: string;
    toAddress: string;
    amount: number;
    currency: string;
    signature: string;
    companyFee: number;
    netAmount: number;
    memo?: string;
    groupId?: string;
  }): Promise<void> {
    try {
      const { firebaseTransactionService, firebaseDataService } = await import('../services/firebaseDataService');
      
      // Find recipient user by wallet address to get their user ID
      const recipientUser = await firebaseDataService.user.getUserByWalletAddress(transactionData.toAddress);
      const recipientUserId = recipientUser ? recipientUser.id.toString() : transactionData.toAddress; // Fallback to address if no user found
      
      const transaction = {
        id: transactionData.signature,
        type: 'send' as const,
        amount: transactionData.amount,
        currency: transactionData.currency,
        from_user: transactionData.userId,
        to_user: recipientUserId, // Use user ID instead of wallet address
        from_wallet: '', // Will be filled by the service
        to_wallet: transactionData.toAddress,
        tx_hash: transactionData.signature,
        note: transactionData.memo || `Payment to ${transactionData.toAddress}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'completed' as const,
        group_id: transactionData.groupId || null,
        company_fee: transactionData.companyFee,
        net_amount: transactionData.netAmount
      };

      await firebaseTransactionService.createTransaction(transaction);
      logger.info('Transaction saved to Firebase', { 
        signature: transactionData.signature,
        from_user: transactionData.userId,
        to_user: recipientUserId,
        to_wallet: transactionData.toAddress
      }, 'InternalTransferService');

      // Send notification to recipient
      await this.sendReceivedFundsNotification(transactionData);
    } catch (error) {
      logger.error('Failed to save transaction to Firebase', error, 'InternalTransferService');
      throw error;
    }
  }

  /**
   * Send notification to recipient when they receive funds
   */
  private async sendReceivedFundsNotification(transactionData: {
    userId: string;
    toAddress: string;
    amount: number;
    currency: string;
    signature: string;
    companyFee: number;
    netAmount: number;
    memo?: string;
    groupId?: string;
  }): Promise<void> {
    try {
      logger.info('🔔 Sending received funds notification', {
        to: transactionData.toAddress,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'InternalTransferService');

      // Find recipient user by wallet address
      const { firebaseDataService } = await import('../services/firebaseDataService');
      const recipientUser = await firebaseDataService.user.getUserByWalletAddress(transactionData.toAddress);

      if (!recipientUser) {
        logger.info('🔔 No user found with wallet address (external wallet):', transactionData.toAddress, 'InternalTransferService');
        return; // External wallet, no notification needed
      }

      // Get sender user info
      const senderUser = await firebaseDataService.user.getCurrentUser(transactionData.userId);

      // Create notification data
      const notificationData = {
        userId: recipientUser.id.toString(),
        title: '💰 Funds Received',
        message: `You received ${transactionData.netAmount} ${transactionData.currency} from ${senderUser.name}`,
        type: 'money_received' as const,
        data: {
          transactionId: transactionData.signature,
          amount: transactionData.netAmount,
          currency: transactionData.currency,
          senderId: transactionData.userId,
          senderName: senderUser.name,
          memo: transactionData.memo || '',
          timestamp: new Date().toISOString()
        },
        is_read: false
      };

      // Send notification
      const { sendNotification } = await import('../services/firebaseNotificationService');
      await sendNotification(
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.data
      );

      logger.info('✅ Received funds notification sent successfully', {
        recipientId: recipientUser.id,
        recipientName: recipientUser.name,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'InternalTransferService');

    } catch (error) {
      logger.error('❌ Error sending received funds notification', error, 'InternalTransferService');
      // Don't throw error - notification failure shouldn't break the transaction
    }
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
      const status = await this.connection.getSignatureStatus(signature, {
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
        endpoint: this.rpcEndpoints[this.currentEndpointIndex]
      }, 'InternalTransferService');
      
      // Switch to next RPC endpoint if available
      if (this.rpcEndpoints.length > 1) {
        await this.switchToNextEndpoint();
        // Retry once with new endpoint
        try {
          const retryStatus = await this.connection.getSignatureStatus(signature, {
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
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency, isSplitWalletPayment);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${balanceCheck.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Calculate company fee - but skip for split wallet payments
      const { fee: companyFee, totalAmount, recipientAmount } = isSplitWalletPayment 
        ? { fee: 0, totalAmount: params.amount, recipientAmount: params.amount }
        : FeeService.calculateCompanyFee(params.amount);

      // Load wallet using the existing userWalletService
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(params.userId);
      
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
        console.log('✅ Successfully created keypair from base64 secret key');
      } catch (base64Error) {
        try {
          // Try JSON array format (stored in secure storage)
          const secretKeyArray = JSON.parse(userWallet.secretKey);
          fromKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          console.log('✅ Successfully created keypair from JSON array secret key');
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
      const blockhash = await this.getLatestBlockhashWithRetry();

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromKeypair.publicKey);

      // Create transaction with proper blockhash and fee payer
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // Company or user pays fees based on configuration
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

      if (params.currency === 'USDC') {
        // USDC transfer logic
        const fromTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(CURRENT_NETWORK.usdcMintAddress),
          fromKeypair.publicKey
        );

        const toTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(CURRENT_NETWORK.usdcMintAddress),
          new PublicKey(params.to)
        );

        // Check if sender has USDC token account
        try {
          const senderAccount = await getAccount(this.connection, fromTokenAccount);
          console.log('✅ Sender USDC token account exists:', {
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
          await getAccount(this.connection, toTokenAccount);
          console.log('✅ Recipient USDC token account exists');
        } catch (error) {
          console.log('🔧 Creating USDC token account for recipient...');
          // Token account doesn't exist, create it
          transaction.add(
            createAssociatedTokenAccountInstruction(
              feePayerPublicKey, // fee payer pays for account creation
              toTokenAccount, // associated token account
              new PublicKey(params.to), // owner
              new PublicKey(CURRENT_NETWORK.usdcMintAddress) // mint
            )
          );
        }

        // Add USDC transfer instruction (full amount to recipient)
        // Use precise conversion to avoid floating point issues
        const transferAmount = Math.floor(recipientAmount * 1000000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
        
        console.log('🔍 USDC Transfer Amount Conversion:', {
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
            new PublicKey(CURRENT_NETWORK.usdcMintAddress),
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
          console.log('🔍 Simulating transaction before sending...');
          const simulationResult = await this.connection.simulateTransaction(transaction);
          
          if (simulationResult.value.err) {
            console.error('❌ Transaction simulation failed:', simulationResult.value.err);
            return {
              success: false,
              error: `Transaction simulation failed: ${JSON.stringify(simulationResult.value.err)}`
            };
          }
          
          console.log('✅ Transaction simulation successful');
        } catch (simulationError) {
          console.error('❌ Transaction simulation error:', simulationError);
          return {
            success: false,
            error: `Transaction simulation error: ${(simulationError as Error).message}`
          };
        }
      } else {
        console.log('🔧 Skipping simulation due to token account creation - proceeding with transaction');
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
          console.log('✅ Company wallet keypair added to signers');
        } catch (error) {
          console.error('❌ Failed to create company wallet keypair:', error);
          return {
            success: false,
            error: 'Failed to load company wallet for fee payment'
          };
        }
      }

      // Send transaction with retry logic for blockhash expiration
      console.log('🚀 Sending transaction...');
      let signature: string | undefined;
      let lastError: any;
      
      try {
        // Try up to 3 times with fresh blockhashes and exponential backoff
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`🔄 Transaction attempt ${attempt}/3`);
            console.log(`🔍 Transaction details:`, {
              instructionCount: transaction.instructions.length,
              feePayer: transaction.feePayer?.toBase58(),
              signerCount: signers.length,
              signers: signers.map(s => s.publicKey.toBase58())
            });
            
            // Get fresh blockhash for each attempt with retry
            const freshBlockhash = await this.getLatestBlockhashWithRetry('confirmed');
            
            // Update blockhash and re-sign transaction for each attempt
            transaction.recentBlockhash = freshBlockhash;
            
            // Clear previous signatures and re-sign with fresh blockhash
            transaction.signatures = [];
            transaction.sign(...signers);
            console.log(`✅ Transaction re-signed with fresh blockhash: ${freshBlockhash}`);
            
            console.log(`🔍 Attempting sendAndConfirmTransaction with fresh blockhash: ${freshBlockhash}`);
            
            // Use optimized transaction sending approach
            try {
              console.log(`⏳ Sending transaction with optimized approach...`);
              
              // Transaction is already signed above with fresh blockhash
              
              // Send transaction first (faster response)
              signature = await this.connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 0, // We handle retries ourselves
              });
              
              console.log(`📤 Transaction sent with signature: ${signature}, waiting for confirmation...`);
              
              // Confirm transaction with timeout
              const confirmPromise = this.connection.confirmTransaction(signature, 'confirmed');
              const confirmTimeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Transaction confirmation timeout after 15 seconds')), 15000);
              });
              
              await Promise.race([confirmPromise, confirmTimeoutPromise]);
              console.log(`✅ Transaction confirmed: ${signature}`);
              
            } catch (confirmError) {
              console.warn(`⚠️ Transaction confirmation failed:`, (confirmError as Error).message);
              
              // For split wallet payments, we need strict confirmation
              // Don't accept transactions that haven't been confirmed
              throw new Error(`Transaction confirmation failed: ${(confirmError as Error).message}. Transaction may have failed or is still pending.`);
            }
            
            console.log(`✅ Transaction successful on attempt ${attempt} with signature: ${signature}`);
            break; // Success, exit retry loop
            
          } catch (error) {
            lastError = error;
            console.warn(`⚠️ Transaction attempt ${attempt} failed:`, (error as Error).message);
            
            // Check if it's a blockhash expiration error
            if ((error as Error).message.includes('block height exceeded') || (error as Error).message.includes('blockhash')) {
              console.log(`🔄 Blockhash expired, retrying with fresh blockhash...`);
            } else {
              console.log(`🔄 Transaction failed for other reason, retrying...`);
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
            console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
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
      await this.saveTransactionToFirestore({
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
      await this.sendMoneySentNotification({
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

  /**
   * Save transaction to Firestore (without recipient user lookup)
   */
  private async saveTransactionToFirestore(transactionData: {
    userId: string;
    to: string;
    amount: number;
    currency: string;
    signature: string;
    companyFee: number;
    netAmount: number;
    memo?: string;
  }): Promise<void> {
    try {
      const { firebaseTransactionService } = await import('../services/firebaseDataService');
      
      const transaction = {
        id: transactionData.signature,
        type: 'send' as const,
        amount: transactionData.amount,
        currency: transactionData.currency,
        from_user: transactionData.userId,
        to_user: transactionData.to, // Use address directly since no user lookup
        from_wallet: '', // Will be filled by the service
        to_wallet: transactionData.to,
        tx_hash: transactionData.signature,
        note: transactionData.memo || `Payment to ${transactionData.to}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'completed' as const,
        group_id: null,
        company_fee: transactionData.companyFee,
        net_amount: transactionData.netAmount
      };

      await firebaseTransactionService.createTransaction(transaction);
      logger.info('Transaction saved to Firebase', { 
        signature: transactionData.signature,
        from_user: transactionData.userId,
        to_wallet: transactionData.to
      }, 'InternalTransferService');
    } catch (error) {
      logger.error('Failed to save transaction to Firebase', error, 'InternalTransferService');
      // Don't throw error - Firebase save failure shouldn't break the transaction
    }
  }

  /**
   * Send money sent notification to sender only
   */
  private async sendMoneySentNotification(transactionData: {
    userId: string;
    to: string;
    amount: number;
    currency: string;
    signature: string;
    companyFee: number;
    netAmount: number;
    memo?: string;
  }): Promise<void> {
    try {
      logger.info('🔔 Sending money sent notification', {
        from: transactionData.userId,
        to: transactionData.to,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'InternalTransferService');

      // Get sender user info
      const { firebaseDataService } = await import('../services/firebaseDataService');
      const senderUser = await firebaseDataService.user.getCurrentUser(transactionData.userId);

      // Create notification data
      const notificationData = {
        userId: transactionData.userId,
        title: '💰 Money Sent Successfully',
        message: `You sent ${transactionData.netAmount} ${transactionData.currency} to ${transactionData.to}`,
        type: 'money_sent' as const,
        data: {
          transactionId: transactionData.signature,
          amount: transactionData.netAmount,
          currency: transactionData.currency,
          recipientId: transactionData.to,
          recipientName: 'Unknown User', // No user lookup for external addresses
          memo: transactionData.memo || '',
          timestamp: new Date().toISOString()
        },
        is_read: false
      };

      // Send notification
      const { sendNotification } = await import('../services/firebaseNotificationService');
      await sendNotification(
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.data
      );

      logger.info('✅ Money sent notification sent successfully', {
        senderId: transactionData.userId,
        senderName: senderUser.name,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'InternalTransferService');

    } catch (error) {
      logger.error('❌ Error sending money sent notification', error, 'InternalTransferService');
      // Don't throw error - notification failure shouldn't break the transaction
    }
  }
}

// Export singleton instance
export const internalTransferService = new InternalTransferService();
