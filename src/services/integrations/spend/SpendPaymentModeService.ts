/**
 * SPEND Payment Mode Service
 * Determines payment mode and validates payment thresholds for SPEND integration
 */

import { Split } from '../../splits/splitStorageService';
import { SPEND_CONFIG } from './SpendTypes';
import { logger } from '../../analytics/loggingService';

export class SpendPaymentModeService {
  /**
   * Get payment mode for a split
   * @param split - The split to check
   * @returns 'merchant_gateway' if treasury wallet exists, 'personal' otherwise
   */
  static getPaymentMode(split: Split): 'personal' | 'merchant_gateway' {
    if (!split.externalMetadata) {
      return 'personal';
    }

    // Check if treasury wallet is provided
    if (split.externalMetadata.treasuryWallet && split.externalMetadata.treasuryWallet.trim() !== '') {
      return 'merchant_gateway';
    }

    return 'personal';
  }

  /**
   * Check if split requires merchant payment
   * @param split - The split to check
   * @returns true if payment mode is 'merchant_gateway'
   */
  static requiresMerchantPayment(split: Split): boolean {
    return this.getPaymentMode(split) === 'merchant_gateway';
  }

  /**
   * Check if payment threshold is met
   * @param split - The split to check
   * @param totalPaid - Total amount paid by participants
   * @returns true if totalPaid meets or exceeds the required threshold
   */
  static isPaymentThresholdMet(split: Split, totalPaid: number): boolean {
    if (!this.requiresMerchantPayment(split)) {
      // Personal splits don't have thresholds
      return false;
    }

    const threshold = split.externalMetadata?.paymentThreshold ?? SPEND_CONFIG.defaultPaymentThreshold;
    const requiredAmount = split.totalAmount * threshold;

    const isMet = totalPaid >= requiredAmount;

    logger.debug('Payment threshold check', {
      splitId: split.id,
      totalAmount: split.totalAmount,
      totalPaid,
      threshold,
      requiredAmount,
      isMet,
    }, 'SpendPaymentModeService');

    return isMet;
  }

  /**
   * Check if payment has already been processed
   * Prevents duplicate payments
   * @param split - The split to check
   * @returns true if payment status is 'paid' or 'processing'
   */
  static isPaymentAlreadyProcessed(split: Split): boolean {
    if (!split.externalMetadata) {
      return false;
    }

    const status = split.externalMetadata.paymentStatus;
    return status === 'paid' || status === 'processing';
  }

  /**
   * Get payment status from split
   * @param split - The split to check
   * @returns Current payment status or 'pending' if not set
   */
  static getPaymentStatus(split: Split): 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' {
    return split.externalMetadata?.paymentStatus ?? 'pending';
  }

  /**
   * Get order ID from split
   * @param split - The split to check
   * @returns Order ID or undefined
   */
  static getOrderId(split: Split): string | undefined {
    return split.externalMetadata?.orderId;
  }

  /**
   * Get treasury wallet from split
   * @param split - The split to check
   * @returns Treasury wallet address or undefined
   */
  static getTreasuryWallet(split: Split): string | undefined {
    return split.externalMetadata?.treasuryWallet;
  }

  /**
   * Get payment threshold from split
   * @param split - The split to check
   * @returns Payment threshold (default: 1.0 = 100%)
   */
  static getPaymentThreshold(split: Split): number {
    return split.externalMetadata?.paymentThreshold ?? SPEND_CONFIG.defaultPaymentThreshold;
  }
}

