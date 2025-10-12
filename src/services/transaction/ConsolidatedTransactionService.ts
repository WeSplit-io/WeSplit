/**
 * Consolidated Transaction Service
 * Main service that orchestrates all transaction-related functionality
 * Uses modular components for better maintainability
 */

import { TransactionWalletManager } from './TransactionWalletManager';
import { TransactionProcessor } from './TransactionProcessor';
import { PaymentRequestManager } from './PaymentRequestManager';
import { BalanceManager } from './BalanceManager';
import { logger } from '../loggingService';
import { 
  TransactionParams, 
  TransactionResult, 
  PaymentRequest, 
  PaymentRequestResult,
  WalletInfo,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';

class ConsolidatedTransactionService {
  private static instance: ConsolidatedTransactionService;
  private walletManager: TransactionWalletManager;
  private transactionProcessor: TransactionProcessor;
  private paymentRequestManager: PaymentRequestManager;
  private balanceManager: BalanceManager;

  private constructor() {
    this.walletManager = new TransactionWalletManager();
    this.transactionProcessor = new TransactionProcessor();
    this.paymentRequestManager = new PaymentRequestManager();
    this.balanceManager = new BalanceManager();
  }

  public static getInstance(): ConsolidatedTransactionService {
    if (!ConsolidatedTransactionService.instance) {
      ConsolidatedTransactionService.instance = new ConsolidatedTransactionService();
    }
    return ConsolidatedTransactionService.instance;
  }

  // ===== WALLET MANAGEMENT METHODS =====

  /**
   * Load wallet from secure storage
   */
  async loadWallet(): Promise<boolean> {
    return this.walletManager.loadWallet();
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    return this.walletManager.getWalletInfo();
  }

  // ===== TRANSACTION METHODS =====

  /**
   * Send SOL transaction (not supported)
   */
  async sendSolTransaction(params: TransactionParams): Promise<TransactionResult> {
    return this.transactionProcessor.sendSolTransaction(params);
  }

  /**
   * Send USDC transaction
   */
  async sendUSDCTransaction(params: TransactionParams): Promise<TransactionResult> {
    const keypair = this.walletManager.getKeypair();
    if (!keypair) {
      return {
        signature: '',
        txId: '',
        success: false,
        error: 'No wallet connected'
      };
    }

    return this.transactionProcessor.sendUSDCTransaction(params, keypair);
  }

  /**
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    return this.transactionProcessor.getTransactionFeeEstimate(amount, currency, priority);
  }

  // ===== PAYMENT REQUEST METHODS =====

  /**
   * Create a new payment request
   */
  async createPaymentRequest(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: string,
    description?: string,
    groupId?: string
  ): Promise<PaymentRequestResult> {
    return this.paymentRequestManager.createPaymentRequest(
      senderId,
      recipientId,
      amount,
      currency,
      description,
      groupId
    );
  }

  /**
   * Process a payment request
   */
  async processPaymentRequest(
    requestId: string,
    transactionId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed'
  ): Promise<PaymentRequestResult> {
    return this.paymentRequestManager.processPaymentRequest(requestId, transactionId, status);
  }

  /**
   * Get payment requests for a user
   */
  async getPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    return this.paymentRequestManager.getPaymentRequests(userId);
  }

  // ===== BALANCE METHODS =====

  /**
   * Get user wallet balance
   */
  async getUserWalletBalance(userId: string): Promise<WalletBalance> {
    return this.balanceManager.getUserWalletBalance(userId);
  }

  /**
   * Get USDC balance for a wallet address
   */
  async getUsdcBalance(walletAddress: string): Promise<UsdcBalanceResult> {
    return this.balanceManager.getUsdcBalance(walletAddress);
  }

  /**
   * Check if user has sufficient SOL for gas fees
   */
  async hasSufficientSolForGas(userId: string): Promise<GasCheckResult> {
    return this.balanceManager.hasSufficientSolForGas(userId);
  }

  // ===== LEGACY COMPATIBILITY METHODS =====

  /**
   * Legacy method for sending USDC transactions
   * @deprecated Use sendUSDCTransaction instead
   */
  async sendUsdcTransaction(
    to: string,
    amount: number,
    userId: string,
    memo?: string
  ): Promise<TransactionResult> {
    logger.warn('Using deprecated sendUsdcTransaction method', null, 'ConsolidatedTransactionService');
    
    return this.sendUSDCTransaction({
      to,
      amount,
      currency: 'USDC',
      userId,
      memo
    });
  }

  /**
   * Legacy method for sending USDC to address
   * @deprecated Use sendUSDCTransaction instead
   */
  async sendUsdcToAddress(
    to: string,
    amount: number,
    userId: string,
    memo?: string
  ): Promise<TransactionResult> {
    logger.warn('Using deprecated sendUsdcToAddress method', null, 'ConsolidatedTransactionService');
    
    return this.sendUSDCTransaction({
      to,
      amount,
      currency: 'USDC',
      userId,
      memo
    });
  }

  /**
   * Legacy method for getting user wallet address
   * @deprecated Use getWalletInfo instead
   */
  async getUserWalletAddress(userId: string): Promise<string | null> {
    logger.warn('Using deprecated getUserWalletAddress method', null, 'ConsolidatedTransactionService');
    
    const walletInfo = await this.getWalletInfo();
    return walletInfo?.address || null;
  }

  /**
   * Legacy method for sending USDC from specific wallet
   * @deprecated Use sendUSDCTransaction instead
   */
  async sendUsdcFromSpecificWallet(
    fromWalletAddress: string,
    to: string,
    amount: number,
    userId: string,
    memo?: string
  ): Promise<TransactionResult> {
    logger.warn('Using deprecated sendUsdcFromSpecificWallet method', null, 'ConsolidatedTransactionService');
    
    // This method would need to be implemented if specific wallet functionality is required
    return {
      signature: '',
      txId: '',
      success: false,
      error: 'sendUsdcFromSpecificWallet is deprecated and not implemented in the new architecture'
    };
  }
}

// Export singleton instance
export const consolidatedTransactionService = ConsolidatedTransactionService.getInstance();

// Export types for backward compatibility
export type {
  TransactionParams,
  TransactionResult,
  PaymentRequest,
  PaymentRequestResult,
  WalletInfo,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';
