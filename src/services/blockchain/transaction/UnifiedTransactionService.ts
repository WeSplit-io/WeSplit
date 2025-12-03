/**
 * Unified Transaction Service
 * Routes transactions to appropriate signing method based on wallet type
 * Critical for mixed wallet type support in split operations
 */

import { logger } from '../../analytics/loggingService';
import { consolidatedTransactionService } from './ConsolidatedTransactionService';
import { phantomConnectService } from '../wallet/phantomConnectService';
import { UnifiedWalletService } from '../wallet/UnifiedWalletService';
import {
  TransactionParams,
  TransactionResult,
  UsdcTransactionParams
} from './types';

export interface UnifiedTransactionContext {
  splitType?: 'degen' | 'spend' | 'fair';
  splitId?: string;
  transactionType?: 'payment' | 'withdrawal' | 'transfer';
  walletPreference?: 'embedded' | 'phantom' | 'auto';
}

class UnifiedTransactionService {
  private static instance: UnifiedTransactionService;
  private unifiedWalletService: UnifiedWalletService;

  public static getInstance(): UnifiedTransactionService {
    if (!UnifiedTransactionService.instance) {
      UnifiedTransactionService.instance = new UnifiedTransactionService();
    }
    return UnifiedTransactionService.instance;
  }

  private constructor() {
    this.unifiedWalletService = UnifiedWalletService.getInstance();
  }

  /**
   * Main transaction method - routes to appropriate signer
   */
  async sendTransaction(
    params: TransactionParams & { context?: UnifiedTransactionContext }
  ): Promise<TransactionResult> {
    try {
      const { context = {}, ...transactionParams } = params;

      logger.info('Processing unified transaction', {
        userId: params.userId,
        amount: params.amount,
        context
      }, 'UnifiedTransactionService');

      // Get wallet information for this context
      const walletInfo = await this.unifiedWalletService.getWalletForContext(
        params.userId,
        context
      );

      // Route to appropriate signing method
      switch (walletInfo.type) {
        case 'phantom':
          return await this.sendPhantomTransaction(transactionParams, walletInfo, context);

        case 'embedded':
          return await this.sendEmbeddedTransaction(transactionParams, walletInfo, context);

        case 'none':
        default:
          return {
            success: false,
            error: 'No wallet available for transaction',
            signature: '',
            txId: ''
          };
      }

    } catch (error) {
      logger.error('Unified transaction failed', error, 'UnifiedTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
        signature: '',
        txId: ''
      };
    }
  }

  /**
   * Send transaction using Phantom wallet
   */
  private async sendPhantomTransaction(
    params: TransactionParams,
    walletInfo: any,
    context: UnifiedTransactionContext
  ): Promise<TransactionResult> {
    try {
      logger.info('Sending transaction via Phantom', {
        userId: params.userId,
        amount: params.amount,
        walletAddress: walletInfo.address
      }, 'UnifiedTransactionService');

      // Create USDC transaction parameters
      const usdcParams: UsdcTransactionParams = {
        userId: params.userId,
        amount: params.amount,
        recipientAddress: params.recipientAddress,
        memo: params.memo,
        context: {
          splitType: context.splitType,
          splitId: context.splitId,
          transactionType: context.transactionType
        }
      };

      // Build transaction using existing logic
      const transaction = await this.buildUsdcTransaction(usdcParams);

      // Serialize for Phantom
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      // Sign with Phantom
      const phantomConnect = phantomConnectService.getInstance();
      const signResult = await phantomConnect.signTransaction(serializedTransaction);

      if (!signResult.success) {
        return {
          success: false,
          error: signResult.error || 'Phantom signing failed',
          signature: '',
          txId: ''
        };
      }

      // Submit the signed transaction
      const submitResult = await this.submitSignedTransaction(signResult.signedTransaction);

      logger.info('Phantom transaction completed', {
        userId: params.userId,
        success: submitResult.success,
        signature: submitResult.signature
      }, 'UnifiedTransactionService');

      return submitResult;

    } catch (error) {
      logger.error('Phantom transaction failed', error, 'UnifiedTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Phantom transaction failed',
        signature: '',
        txId: ''
      };
    }
  }

  /**
   * Send transaction using embedded wallet (existing flow)
   */
  private async sendEmbeddedTransaction(
    params: TransactionParams,
    walletInfo: any,
    context: UnifiedTransactionContext
  ): Promise<TransactionResult> {
    try {
      logger.info('Sending transaction via embedded wallet', {
        userId: params.userId,
        amount: params.amount,
        walletAddress: walletInfo.address
      }, 'UnifiedTransactionService');

      // Use existing consolidated transaction service
      return await consolidatedTransactionService.sendUSDCTransaction(params);

    } catch (error) {
      logger.error('Embedded transaction failed', error, 'UnifiedTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Embedded transaction failed',
        signature: '',
        txId: ''
      };
    }
  }

  /**
   * Build USDC transaction (extracted from existing logic)
   */
  private async buildUsdcTransaction(params: UsdcTransactionParams): Promise<any> {
    // This would use the existing transaction building logic
    // Extracted from ConsolidatedTransactionService.sendUSDCTransaction
    const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
    const { getConfig } = await import('../../../config/unified');
    const { PublicKey } = await import('@solana/web3.js');

    // Build transaction using existing logic
    const connection = await optimizedTransactionUtils.getConnection();
    const config = getConfig();

    // Create USDC transfer transaction
    // (Implementation would mirror existing USDC transaction building)

    return transaction; // Placeholder
  }

  /**
   * Submit signed transaction to blockchain
   */
  private async submitSignedTransaction(signedTransaction: Uint8Array): Promise<TransactionResult> {
    try {
      const { optimizedTransactionUtils } = await import('../shared/transactionUtilsOptimized');
      const connection = await optimizedTransactionUtils.getConnection();

      // Deserialize and submit
      const { Transaction } = await import('@solana/web3.js');
      const transaction = Transaction.from(signedTransaction);

      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature);

      return {
        success: true,
        signature,
        txId: signature
      };

    } catch (error) {
      logger.error('Failed to submit signed transaction', error, 'UnifiedTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction submission failed',
        signature: '',
        txId: ''
      };
    }
  }

  /**
   * Check if transaction can be processed with current wallet
   */
  async validateTransactionCapability(
    userId: string,
    context?: UnifiedTransactionContext
  ): Promise<{
    canTransact: boolean;
    walletType: 'embedded' | 'phantom' | 'none';
    error?: string;
  }> {
    try {
      const walletInfo = await this.unifiedWalletService.getWalletForContext(userId, context);

      switch (walletInfo.type) {
        case 'embedded':
          return { canTransact: true, walletType: 'embedded' };

        case 'phantom':
          // Check if Phantom is available and authenticated
          const phantomConnect = phantomConnectService.getInstance();
          // Add availability check logic
          return { canTransact: true, walletType: 'phantom' };

        case 'none':
        default:
          return {
            canTransact: false,
            walletType: 'none',
            error: 'No wallet available'
          };
      }

    } catch (error) {
      return {
        canTransact: false,
        walletType: 'none',
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get transaction fee estimate for wallet type
   */
  async estimateTransactionFee(
    userId: string,
    amount: number,
    context?: UnifiedTransactionContext
  ): Promise<{
    estimatedFee: number;
    walletType: 'embedded' | 'phantom' | 'none';
  }> {
    const walletInfo = await this.unifiedWalletService.getWalletForContext(userId, context);

    // Base fee estimation (would use existing logic)
    const baseFee = await this.getBaseTransactionFee(amount);

    return {
      estimatedFee: baseFee,
      walletType: walletInfo.type
    };
  }

  /**
   * Get base transaction fee (placeholder - would use existing logic)
   */
  private async getBaseTransactionFee(amount: number): Promise<number> {
    // Use existing fee calculation logic
    const { FeeService } = await import('../../../config/constants/feeConfig');
    return FeeService.calculateTransactionFee(amount);
  }
}

export default UnifiedTransactionService;
export { UnifiedTransactionService };
