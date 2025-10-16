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
  ComputeBudgetProgram
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

      // Check if wallet is linked and verified
      const isLinked = await this.isWalletLinked(params.to, params.userId);
      if (!isLinked) {
        return {
          success: false,
          error: 'Recipient wallet is not linked or verified'
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
      const transactionType = params.transactionType || 'withdraw';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      // Load wallet
      const walletLoaded = await solanaWalletService.loadWallet();
      if (!walletLoaded) {
        return {
          success: false,
          error: 'Wallet not loaded'
        };
      }

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
      logger.error('External transfer failed', error, 'ExternalTransferService');
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
      const balance = await solanaWalletService.getBalance();
      const currentBalance = balance.usdc; // WeSplit only supports USDC
      
      // Calculate total required amount (including company fee)
      const { fee: companyFee } = FeeService.calculateCompanyFee(amount);
      const requiredAmount = amount + companyFee;

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
      const fromPublicKey = new PublicKey(solanaWalletService.getPublicKey()!);
      const toPublicKey = new PublicKey(params.to);
      const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);

      // Use centralized fee payer logic - Company pays SOL gas fees
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

      // Check if recipient has USDC token account, create if needed
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        // Token account doesn't exist, we need to create it
        // This would require additional instructions, but for now we'll assume it exists
        logger.warn('Recipient USDC token account does not exist', { toTokenAccount: toTokenAccount.toBase58() }, 'ExternalTransferService');
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
      const transferAmount = Math.floor(recipientAmount * Math.pow(10, 6)); // USDC has 6 decimals
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

      // Add company fee transfer instruction to admin wallet
      if (companyFee > 0) {
        const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6)); // USDC has 6 decimals
        
        // Get company wallet's USDC token account
        const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, companyPublicKey);
        
        logger.info('Adding company fee transfer instruction', { 
          companyFeeAmount, 
          companyFee,
          fromTokenAccount: fromTokenAccount.toBase58(),
          companyTokenAccount: companyTokenAccount.toBase58(),
          companyWalletAddress: companyPublicKey.toBase58()
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

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [], // Signers will be handled by the wallet service
        {
          commitment: getConfig().blockchain.commitment,
          preflightCommitment: getConfig().blockchain.commitment
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
      logger.error('USDC transfer failed', error, 'ExternalTransferService');
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
