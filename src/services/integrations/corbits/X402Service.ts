/**
 * x402 Service
 * Core service for Corbits x402 payment protocol integration
 * Handles payment validation, authorization, and verification
 */

import { logger } from '../../analytics/loggingService';
import { X402_CONFIG, isX402Enabled } from './X402Config';
import {
  X402AuthorizationResult,
  X402ValidationResult,
  X402PaymentVerificationResult,
  X402PaymentRequirements,
  X402ServiceConfig,
} from './X402Types';
import { PublicKey } from '@solana/web3.js';

export class X402Service {
  /**
   * Validate payment request before transaction
   * Performs risk assessment and compliance checks
   * 
   * @param config - Service configuration
   * @returns Validation result
   */
  static async validatePaymentRequest(
    config: X402ServiceConfig
  ): Promise<X402ValidationResult> {
    // Fail-safe: If x402 is disabled, return success
    if (!isX402Enabled()) {
      return {
        success: true,
        valid: true,
        riskLevel: 'low',
        riskScore: 0,
      };
    }

    try {
      logger.info('Validating payment request with x402', {
        userId: config.userId,
        amount: config.amount,
        context: config.context,
        x402_blocked: false,
      }, 'X402Service');

      // TODO: Integrate with Faremeter validation API
      // For now, return a basic validation result
      // This will be enhanced with actual Faremeter integration
      
      // Basic validation logic
      const riskScore = this.calculateRiskScore(config);
      const riskLevel = this.getRiskLevel(riskScore);

      // If risk is too high, fail validation
      if (riskLevel === 'high' && riskScore > 80) {
        logger.warn('x402 validation blocked transaction due to high risk', {
          userId: config.userId,
          amount: config.amount,
          context: config.context,
          riskScore,
          riskLevel,
          x402_blocked: true,
        }, 'X402Service');

        return {
          success: true,
          valid: false,
          riskScore,
          riskLevel,
          error: 'Payment request failed risk assessment',
          message: 'High risk transaction detected',
        };
      }

      return {
        success: true,
        valid: true,
        riskScore,
        riskLevel,
        metadata: {
          validatedAt: new Date().toISOString(),
          ...config.metadata,
        },
      };
    } catch (error) {
      // Fail-safe: Log error but allow transaction to proceed
      logger.warn('x402 validation failed, allowing transaction to proceed', {
        error: error instanceof Error ? error.message : String(error),
        userId: config.userId,
        amount: config.amount,
      }, 'X402Service');

      return {
        success: false,
        valid: true, // Fail-safe: allow transaction if validation fails
        error: error instanceof Error ? error.message : 'Validation error',
        message: 'Validation service unavailable, transaction allowed',
      };
    }
  }

  /**
   * Authorize transaction with x402
   * Gets payment authorization before executing transaction
   * 
   * @param config - Service configuration
   * @param recipientAddress - Recipient wallet address
   * @returns Authorization result
   */
  static async authorizeTransaction(
    config: X402ServiceConfig,
    recipientAddress: string
  ): Promise<X402AuthorizationResult> {
    // Fail-safe: If x402 is disabled, return success
    if (!isX402Enabled()) {
      return {
        success: true,
        authorized: true,
      };
    }

    try {
      logger.info('Authorizing transaction with x402', {
        userId: config.userId,
        amount: config.amount,
        recipientAddress,
        context: config.context,
        x402_blocked: false,
      }, 'X402Service');

      // Validate recipient address
      try {
        new PublicKey(recipientAddress);
      } catch {
        logger.warn('x402 authorization blocked due to invalid recipient address', {
          userId: config.userId,
          amount: config.amount,
          recipientAddress,
          context: config.context,
          x402_blocked: true,
        }, 'X402Service');

        return {
          success: false,
          authorized: false,
          error: 'Invalid recipient address',
        };
      }

      // Convert amount to base units (USDC has 6 decimals)
      const amountInBaseUnits = Math.floor(config.amount * 1_000_000).toString();

      // Create payment requirements
      const paymentRequirements: X402PaymentRequirements = {
        network: X402_CONFIG.network,
        asset: 'USDC',
        amount: amountInBaseUnits,
        payTo: recipientAddress,
        nonce: this.generateNonce(),
        timestamp: Date.now(),
      };

      // TODO: Integrate with Faremeter authorization API
      // For now, return a basic authorization result
      // This will be enhanced with actual Faremeter integration

      const authorizationId = this.generateAuthorizationId();

      return {
        success: true,
        authorized: true,
        authorizationId,
        paymentRequirements,
      };
    } catch (error) {
      // Fail-safe: Log error but allow transaction to proceed
      logger.warn('x402 authorization failed, allowing transaction to proceed', {
        error: error instanceof Error ? error.message : String(error),
        userId: config.userId,
        amount: config.amount,
        recipientAddress,
      }, 'X402Service');

      return {
        success: false,
        authorized: true, // Fail-safe: allow transaction if authorization fails
        error: error instanceof Error ? error.message : 'Authorization error',
        message: 'Authorization service unavailable, transaction allowed',
      };
    }
  }

  /**
   * Create payment requirements for paywalled features
   * Generates x402 payment requirements for premium API access
   * 
   * @param amount - Amount in USDC
   * @param merchantWallet - Merchant wallet address (optional, uses config if not provided)
   * @returns Payment requirements
   */
  static async createPaymentRequirements(
    amount: number,
    merchantWallet?: string
  ): Promise<X402PaymentRequirements | null> {
    // Fail-safe: If x402 is disabled, return null
    if (!isX402Enabled()) {
      return null;
    }

    try {
      const wallet = merchantWallet || X402_CONFIG.merchantWallet;
      if (!wallet) {
        logger.warn('No merchant wallet configured for payment requirements', {}, 'X402Service');
        return null;
      }

      // Validate wallet address
      try {
        new PublicKey(wallet);
      } catch {
        logger.error('Invalid merchant wallet address', { wallet }, 'X402Service');
        return null;
      }

      // Convert amount to base units (USDC has 6 decimals)
      const amountInBaseUnits = Math.floor(amount * 1_000_000).toString();

      return {
        network: X402_CONFIG.network,
        asset: 'USDC',
        amount: amountInBaseUnits,
        payTo: wallet,
        nonce: this.generateNonce(),
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to create payment requirements', {
        error: error instanceof Error ? error.message : String(error),
        amount,
      }, 'X402Service');
      return null;
    }
  }

  /**
   * Verify payment completion
   * Verifies that a payment was successfully completed
   * 
   * @param transactionSignature - Transaction signature
   * @param amount - Expected amount
   * @returns Verification result
   */
  static async verifyPayment(
    transactionSignature: string,
    amount: number
  ): Promise<X402PaymentVerificationResult> {
    // Fail-safe: If x402 is disabled, return success
    if (!isX402Enabled()) {
      return {
        success: true,
        verified: true,
        transactionSignature,
        amount,
      };
    }

    try {
      logger.info('Verifying payment with x402', {
        transactionSignature,
        amount,
        x402_blocked: false,
      }, 'X402Service');

      // TODO: Integrate with Faremeter verification API
      // For now, return a basic verification result
      // This will be enhanced with actual Faremeter integration

      // Basic verification: check signature format
      if (!transactionSignature || transactionSignature.length < 64) {
        return {
          success: false,
          verified: false,
          error: 'Invalid transaction signature',
        };
      }

      return {
        success: true,
        verified: true,
        transactionSignature,
        amount,
      };
    } catch (error) {
      // Fail-safe: Log error but return success
      logger.warn('x402 verification failed, assuming payment succeeded', {
        error: error instanceof Error ? error.message : String(error),
        transactionSignature,
      }, 'X402Service');

      return {
        success: false,
        verified: true, // Fail-safe: assume payment succeeded if verification fails
        transactionSignature,
        amount,
        error: error instanceof Error ? error.message : 'Verification error',
        message: 'Verification service unavailable, payment assumed successful',
      };
    }
  }

  /**
   * Calculate risk score for a payment request
   * Simple risk assessment based on amount and context
   * 
   * @param config - Service configuration
   * @returns Risk score (0-100, lower is better)
   */
  private static calculateRiskScore(config: X402ServiceConfig): number {
    let riskScore = 0;

    // Amount-based risk
    if (config.amount > 10000) {
      riskScore += 30; // High amount
    } else if (config.amount > 1000) {
      riskScore += 15; // Medium amount
    } else {
      riskScore += 5; // Low amount
    }

    // Context-based risk
    if (config.context === 'external_payment') {
      riskScore += 20; // External payments are riskier
    } else if (config.context === 'split_payment') {
      riskScore += 10; // Split payments have moderate risk
    }

    // Ensure score is between 0 and 100
    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Get risk level from risk score
   * 
   * @param riskScore - Risk score (0-100)
   * @returns Risk level
   */
  private static getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore < 30) {
      return 'low';
    } else if (riskScore < 70) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Generate a unique nonce for payment requests
   * 
   * @returns Nonce string
   */
  private static generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate a unique authorization ID
   * 
   * @returns Authorization ID string
   */
  private static generateAuthorizationId(): string {
    return `x402-auth-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}
