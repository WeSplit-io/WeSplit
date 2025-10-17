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
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Keypair
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConfig } from '../config/unified';
import { TRANSACTION_CONFIG } from '../config/transactionConfig';
import { FeeService, COMPANY_FEE_CONFIG, COMPANY_WALLET_CONFIG, TransactionType } from '../config/feeConfig';
import { solanaWalletService } from '../wallet/solanaWallet';
import { logger } from '../services/loggingService';

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

export interface LinkedWallet {
  id: string;
  address: string;
  walletType: 'phantom' | 'solflare' | 'backpack' | 'other';
  verifiedAt: string;
  lastUsed?: string;
  isActive: boolean;
}

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
      const transactionType = params.transactionType || 'withdraw';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      // Ensure user's wallet is loaded
      const { walletService } = await import('../services/WalletService');
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

      // Load the wallet for transaction signing
      logger.info('Loading wallet for transaction signing', { userId: params.userId }, 'ExternalTransferService');
      const expectedWalletAddress = walletResult.wallet?.address;
      if (!expectedWalletAddress) {
        logger.error('No wallet address available for loading', { userId: params.userId }, 'ExternalTransferService');
        return {
          success: false,
          error: 'No wallet address available for transaction signing'
        };
      }
      
      const solanaWalletLoaded = await solanaWalletService.loadWallet(params.userId, expectedWalletAddress);
      if (!solanaWalletLoaded) {
        logger.error('Failed to load wallet for transaction signing', { 
          userId: params.userId, 
          expectedAddress: expectedWalletAddress 
        }, 'ExternalTransferService');
        return {
          success: false,
          error: 'Failed to load wallet for transaction signing'
        };
      }
      logger.info('Wallet loaded successfully for transaction signing', { 
        userId: params.userId, 
        walletAddress: expectedWalletAddress 
      }, 'ExternalTransferService');

      // Build and send transaction - WeSplit only supports USDC transfers
      let result: ExternalTransferResult;
      if (params.currency === 'USDC') {
        result = await this.sendUsdcTransfer(params, recipientAmount, companyFee);
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
          const { firebaseTransactionService } = await import('../services/firebaseDataService');
          
          const transactionData = {
            type: 'withdraw' as const,
            amount: params.amount,
            currency: params.currency,
            from_user: params.userId,
            to_user: params.to, // External wallet address
            from_wallet: '', // Will be filled by the service
            to_wallet: params.to,
            tx_hash: result.signature!,
            note: params.memo || 'External wallet transfer',
            status: 'completed' as const,
            group_id: null,
            company_fee: result.companyFee || 0,
            net_amount: result.netAmount || params.amount
          };
          
          await firebaseTransactionService.createTransaction(transactionData);
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
        (wallet.isActive !== false) && 
        (wallet.status === 'active' || !wallet.status)
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
      const { LinkedWalletService } = await import('../services/LinkedWalletService');
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
      const { walletService } = await import('../services/WalletService');
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
    companyFee: number
  ): Promise<ExternalTransferResult> {
    try {
      logger.info('Starting USDC transfer', {
        recipientAmount,
        companyFee,
        to: params.to
      }, 'ExternalTransferService');

      const fromPublicKey = new PublicKey(solanaWalletService.getPublicKey()!);
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
      try {
        await getAccount(this.connection, toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'ExternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        // This would require additional instructions, but for now we'll assume it exists
        logger.warn('Recipient USDC token account does not exist', { 
          toTokenAccount: toTokenAccount.toBase58(),
          error: error instanceof Error ? error.message : String(error)
        }, 'ExternalTransferService');
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
        
        // Import company wallet config locally to ensure it's loaded
        const { COMPANY_WALLET_CONFIG: localCompanyConfig } = await import('../config/feeConfig');
        
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
      const walletInfo = await solanaWalletService.getWalletInfo();
      if (!walletInfo || !walletInfo.secretKey) {
        logger.error('Wallet keypair not available for signing', {}, 'ExternalTransferService');
        return {
          success: false,
          error: 'User wallet keypair not available for transaction signing'
        };
      }

      const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
      const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);
      
      signers.push(userKeypair);
      logger.info('User keypair added to signers', { 
        userAddress: userKeypair.publicKey.toBase58() 
      }, 'ExternalTransferService');

      // Add company wallet keypair for fee payment (required - same as internal transfers)
      const { COMPANY_WALLET_CONFIG } = await import('../config/feeConfig');
      logger.info('Company wallet configuration check', {
        companyWalletRequired: true,
        hasCompanySecretKey: !!COMPANY_WALLET_CONFIG.secretKey,
        companyWalletAddress: COMPANY_WALLET_CONFIG.address,
        feePayerAddress: feePayerPublicKey.toBase58()
      }, 'ExternalTransferService');

      if (COMPANY_WALLET_CONFIG.secretKey) {
        try {
          logger.info('Processing company wallet secret key', {
            secretKeyLength: COMPANY_WALLET_CONFIG.secretKey.length,
            secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey.substring(0, 20) + '...',
            hasCommas: COMPANY_WALLET_CONFIG.secretKey.includes(','),
            hasBrackets: COMPANY_WALLET_CONFIG.secretKey.includes('[') || COMPANY_WALLET_CONFIG.secretKey.includes(']'),
            secretKeyFormat: COMPANY_WALLET_CONFIG.secretKey.includes(',') ? 'comma-separated' : 'base64'
          }, 'ExternalTransferService');

          let companySecretKeyBuffer: Buffer;
          
          // Handle different secret key formats
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            logger.info('Processing comma-separated secret key format', {}, 'ExternalTransferService');
            const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
            const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
            
            logger.info('Secret key array processing', {
              cleanKeyLength: cleanKey.length,
              keyArrayLength: keyArray.length,
              firstFewNumbers: keyArray.slice(0, 5),
              lastFewNumbers: keyArray.slice(-5)
            }, 'ExternalTransferService');
            
            companySecretKeyBuffer = Buffer.from(keyArray);
          } else {
            logger.info('Processing base64 secret key format', {}, 'ExternalTransferService');
            companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
          }
          
          // Validate and trim if needed
          logger.info('Secret key buffer validation', {
            bufferLength: companySecretKeyBuffer.length,
            expectedLength: 64,
            isValidLength: companySecretKeyBuffer.length === 64 || companySecretKeyBuffer.length === 65
          }, 'ExternalTransferService');
          
          if (companySecretKeyBuffer.length === 65) {
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
            logger.info('Trimmed 65-byte keypair to 64-byte secret key', {
              originalLength: 65,
              trimmedLength: companySecretKeyBuffer.length
            }, 'ExternalTransferService');
          } else if (companySecretKeyBuffer.length !== 64) {
            throw new Error(`Invalid secret key length: ${companySecretKeyBuffer.length} bytes (expected 64 or 65)`);
          }
          
          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          
          logger.info('Company keypair created successfully', {
            companyWalletAddress: COMPANY_WALLET_CONFIG.address,
            companyKeypairAddress: companyKeypair.publicKey.toBase58(),
            addressesMatch: companyKeypair.publicKey.toBase58() === COMPANY_WALLET_CONFIG.address
          }, 'ExternalTransferService');
          
          signers.push(companyKeypair);
          logger.info('Company keypair added to signers', { 
            companyAddress: companyKeypair.publicKey.toBase58(),
            totalSigners: signers.length
          }, 'ExternalTransferService');
        } catch (error) {
          logger.error('Failed to load company wallet keypair', { error }, 'ExternalTransferService');
          return {
            success: false,
            error: 'Company wallet keypair not available for signing'
          };
        }
      } else {
        logger.error('Company wallet secret key is required for SOL fee coverage', {}, 'ExternalTransferService');
        return {
          success: false,
          error: 'Company wallet secret key is required for SOL fee coverage. Please contact support.'
        };
      }

      // Sign and send transaction
      logger.info('Sending USDC transfer transaction', {
        from: fromPublicKey.toBase58(),
        to: toPublicKey.toBase58(),
        amount: recipientAmount,
        companyFee,
        totalAmount: params.amount,
        signersCount: signers.length
      }, 'ExternalTransferService');

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        signers, // Use proper signers array
        {
          commitment: getConfig().blockchain.commitment,
          preflightCommitment: getConfig().blockchain.commitment
        }
      );

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
export const externalTransferService = new ExternalTransferService();
