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
import type { LinkedWallet } from '../wallet/LinkedWalletService';
import { signTransaction as signTransactionWithCompanyWallet, submitTransaction as submitTransactionToBlockchain } from './transactionSigningService';

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
  private connection: Connection;

  constructor() {
    this.connection = new Connection(getConfig().blockchain.rpcUrl, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: getConfig().blockchain.timeout,
    });
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

      // Build and send transaction - WeSplit only supports USDC transfers
      let result: ExternalTransferResult;
      if (params.currency === 'USDC') {
        result = await this.sendUsdcTransfer(params, recipientAmount, companyFee, expectedWalletAddress, walletResult.wallet.secretKey);
      } else {
        result = {
          success: false,
          error: 'WeSplit only supports USDC transfers. SOL transfers are not supported within the app.'
        };
      }

      if (result.success) {
        // Update last used timestamp for linked wallet
        await this.updateLinkedWalletLastUsed(params.to, params.userId);
        
        // Save transaction to database for history
        try {
          const { firebaseDataService } = await import('../../data');
          
          const transactionData = {
            type: 'withdraw' as const,
            amount: params.amount,
            currency: params.currency,
            from_user: params.userId,
            to_user: params.to, // External wallet address
            from_wallet: expectedWalletAddress, // User's wallet address
            to_wallet: params.to,
            tx_hash: result.signature!,
            note: params.memo || 'External wallet transfer',
            status: 'completed' as const,
            company_fee: result.companyFee || 0,
            net_amount: result.netAmount || params.amount,
            gas_fee: result.blockchainFee || 0, // Blockchain fee (SOL)
            blockchain_network: 'solana',
            confirmation_count: 0, // Will be updated if needed
            block_height: 0 // Will be updated if needed
          };
          
          await firebaseDataService.transaction.createTransaction(transactionData);
          logger.info('✅ External transfer saved to database', {
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
      const { fee: companyFee } = FeeService.calculateCompanyFee(amount);
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
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
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
      try {
        await getAccount(this.connection, toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'ExternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.warn('Recipient USDC token account does not exist, will create it', { 
          toTokenAccount: toTokenAccount.toBase58(),
          error: error instanceof Error ? error.message : String(error)
        }, 'ExternalTransferService');
        needsTokenAccountCreation = true;
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction with proper fee payer
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
        
        // Use the already imported COMPANY_WALLET_CONFIG
        const localCompanyConfig = COMPANY_WALLET_CONFIG;
        
        // Debug company wallet config
        logger.info('Company wallet config debug', {
          hasCompanyWalletConfig: !!localCompanyConfig,
          companyWalletAddress: localCompanyConfig?.address,
          companyWalletConfigKeys: localCompanyConfig ? Object.keys(localCompanyConfig) : 'undefined'
        }, 'ExternalTransferService');
        
        if (!localCompanyConfig || !localCompanyConfig.address) {
          logger.error('Company wallet config is undefined or missing address', {
            hasConfig: !!localCompanyConfig,
            hasAddress: !!localCompanyConfig?.address
          }, 'ExternalTransferService');
          return {
            success: false,
            error: 'Company wallet configuration is not properly loaded'
          };
        }
        
        // Get company wallet's USDC token account - following internal transfer pattern
        const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(localCompanyConfig.address));
        
        logger.info('Adding company fee transfer instruction', { 
          companyFeeAmount, 
          companyFee,
          fromTokenAccount: fromTokenAccount.toBase58(),
          companyTokenAccount: companyTokenAccount.toBase58(),
          companyWalletAddress: localCompanyConfig.address
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
      logger.info('Company wallet configuration check', {
        companyWalletRequired: true,
        companyWalletAddress: COMPANY_WALLET_CONFIG.address,
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
            
      logger.info('Transaction serialized, requesting company wallet signature', {
        transactionSize: txArray.length,
        transactionType: typeof serializedTransaction,
        isUint8Array: txArray instanceof Uint8Array,
        from: fromPublicKey.toBase58(),
        to: toPublicKey.toBase58(),
        amount: recipientAmount,
        companyFee,
        totalAmount: params.amount
            }, 'ExternalTransferService');
            
      // Use Firebase Function to add company wallet signature
      let fullySignedTransaction: Uint8Array;
      try {
        fullySignedTransaction = await signTransactionWithCompanyWallet(txArray);
        logger.info('Company wallet signature added successfully', {
          transactionSize: fullySignedTransaction.length
          }, 'ExternalTransferService');
      } catch (signingError) {
        logger.error('Failed to add company wallet signature', { 
          error: signingError,
          errorMessage: signingError instanceof Error ? signingError.message : String(signingError)
            }, 'ExternalTransferService');
        return {
          success: false,
          error: `Failed to sign transaction with company wallet: ${signingError instanceof Error ? signingError.message : String(signingError)}`
        };
          }
          
      // Submit the fully signed transaction
      let signature: string;
      try {
        logger.info('Submitting fully signed transaction', {
          connectionEndpoint: this.connection.rpcEndpoint,
          commitment: getConfig().blockchain.commitment
          }, 'ExternalTransferService');
          
        const result = await submitTransactionToBlockchain(fullySignedTransaction);
        signature = result.signature;
        
        logger.info('Transaction submitted successfully', { signature }, 'ExternalTransferService');
      } catch (submissionError) {
        logger.error('Transaction submission failed', { 
          error: submissionError,
          errorMessage: submissionError instanceof Error ? submissionError.message : String(submissionError)
          }, 'ExternalTransferService');
          return {
            success: false,
          error: `Failed to submit transaction: ${submissionError instanceof Error ? submissionError.message : String(submissionError)}`
        };
      }

      // Enhanced verification (matching split logic)
      const verificationResult = await this.verifyTransactionOnBlockchain(signature);
      if (!verificationResult.success) {
        logger.error('External transfer verification failed', {
          signature,
          error: verificationResult.error
        }, 'ExternalTransferService');
        return {
          success: false,
          error: verificationResult.error || 'Transaction verification failed'
        };
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
   * Enhanced transaction verification (matching split logic)
   */
  private async verifyTransactionOnBlockchain(signature: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Verifying external transfer transaction on blockchain', {
        signature
      }, 'ExternalTransferService');

      // Enhanced verification with multiple attempts (matching split logic)
      const maxAttempts = 10;
      const delayMs = 1000; // 1 second delay between attempts

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const status = await this.connection.getSignatureStatus(signature, {
            searchTransactionHistory: true
          });

          if (status.value) {
            if (status.value.err) {
              logger.error('External transfer failed on blockchain', {
                signature,
                error: status.value.err,
                attempt
              }, 'ExternalTransferService');
              return {
                success: false,
                error: `Transaction failed: ${status.value.err.toString()}`
              };
            }

            const confirmations = status.value.confirmations || 0;
            if (confirmations > 0) {
              logger.info('External transfer confirmed on blockchain', {
                signature,
                confirmations,
                attempt
              }, 'ExternalTransferService');
              return { success: true };
            }
          }

          if (attempt < maxAttempts) {
            logger.info('External transfer not yet confirmed, retrying', {
              signature,
              attempt,
              maxAttempts
            }, 'ExternalTransferService');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          logger.warn('External transfer verification attempt failed', {
            signature,
            attempt,
            error: error instanceof Error ? error.message : String(error)
          }, 'ExternalTransferService');
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // If we reach here, all verification attempts failed
      logger.warn('External transfer verification timeout', {
        signature,
        maxAttempts
      }, 'ExternalTransferService');

      // For external transfers, be strict about verification
      return {
        success: false,
        error: 'Transaction verification timeout - transaction may have failed'
      };
    } catch (error) {
      logger.error('External transfer verification failed', {
        signature,
        error: error instanceof Error ? error.message : String(error)
      }, 'ExternalTransferService');
      return {
        success: false,
        error: 'Transaction verification failed'
      };
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
