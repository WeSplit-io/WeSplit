/**
 * Centralized Price Management Service
 * Ensures consistent pricing across the entire application
 * Prepares for future Pyth price feed integration
 */

import { logger } from './loggingService';
import { ErrorHandler } from '../utils/errorHandler';
import { calculateEqualSplit } from '../utils/currencyUtils';

export interface PriceData {
  amount: number;
  currency: string;
  timestamp: string;
  source: 'user_input' | 'bill_analysis' | 'split_calculation' | 'pyth_feed';
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: string;
}

export interface SplitPriceData {
  totalAmount: number;
  currency: string;
  participantCount: number;
  amountPerParticipant: number;
  source: string;
  timestamp: string;
}

class PriceManagementService {
  private static instance: PriceManagementService;
  private priceCache: Map<string, PriceData> = new Map();
  private conversionRates: Map<string, CurrencyConversion> = new Map();

  private constructor() {}

  static getInstance(): PriceManagementService {
    if (!PriceManagementService.instance) {
      PriceManagementService.instance = new PriceManagementService();
    }
    return PriceManagementService.instance;
  }

  /**
   * Set the authoritative price for a bill/split
   * This should be called when the user sets the bill amount
   * Default amount is 75.00 USDC (from unified mockup data)
   */
  setBillPrice(billId: string, amount: number, currency: string = 'USDC'): void {
    // Validate input parameters
    if (!billId || billId.trim() === '') {
      console.error('💰 PriceManagementService: Invalid billId provided', { billId, amount, currency });
      return;
    }
    
    if (amount < 0 || !isFinite(amount)) {
      console.error('💰 PriceManagementService: Invalid amount provided:', amount);
      return;
    }
    
    if (!currency || currency.trim() === '') {
      console.error('💰 PriceManagementService: Invalid currency provided');
      return;
    }

    const priceData: PriceData = {
      amount,
      currency,
      timestamp: new Date().toISOString(),
      source: 'user_input'
    };

    this.priceCache.set(billId, priceData);
    
    // Only log when setting new prices, not when retrieving
    logger.info('Bill price set', {
      billId,
      amount,
      currency,
      source: 'user_input'
    }, 'PriceManagementService');
  }

  /**
   * Get the authoritative price for a bill/split
   * This is the single source of truth for all price calculations
   */
  getBillPrice(billId: string): PriceData | null {
    let priceData = this.priceCache.get(billId);
    
    // If exact match not found, try to find a similar bill ID
    if (!priceData) {
      // Try to find a bill ID that contains parts of the requested ID
      for (const [cachedBillId, cachedPriceData] of this.priceCache.entries()) {
        if (cachedBillId.includes(billId) || billId.includes(cachedBillId)) {
          priceData = cachedPriceData;
          // Migrate the old bill ID to the new format (but don't modify cache during read)
          this.migrateBillId(billId, cachedPriceData);
          break;
        }
      }
      
      // If still not found, try to find by timestamp (for old bill_ format)
      if (!priceData && billId.startsWith('split_')) {
        const timestamp = billId.split('_')[1];
        for (const [cachedBillId, cachedPriceData] of this.priceCache.entries()) {
          if (cachedBillId.includes(timestamp)) {
            priceData = cachedPriceData;
            // Migrate the old bill ID to the new format (but don't modify cache during read)
            this.migrateBillId(billId, cachedPriceData);
            break;
          }
        }
      }
    }

    return priceData || null;
  }

  /**
   * Migrate bill ID to new format (separate method to avoid cache modification during read)
   */
  private migrateBillId(newBillId: string, priceData: PriceData): void {
    // Use setTimeout to defer cache modification to avoid issues during read operations
    setTimeout(() => {
      this.priceCache.set(newBillId, priceData);
      logger.info('Bill ID migrated', {
        newBillId,
        originalAmount: priceData.amount,
        source: priceData.source
      }, 'PriceManagementService');
    }, 0);
  }

  /**
   * Calculate split amounts based on the authoritative price
   */
  calculateSplitAmounts(billId: string, participantCount: number, splitMethod: 'equal' | 'manual' = 'equal'): SplitPriceData | null {
    const priceData = this.getBillPrice(billId);
    
    if (!priceData) {
      console.error('💰 PriceManagementService: Cannot calculate split - no price data for bill:', billId);
      return null;
    }

    const amountPerParticipant = splitMethod === 'equal' 
      ? calculateEqualSplit(priceData.amount, participantCount) // Use consistent rounding
      : priceData.amount; // For manual, each participant sets their own amount

    const splitData: SplitPriceData = {
      totalAmount: priceData.amount,
      currency: priceData.currency,
      participantCount,
      amountPerParticipant,
      source: `split_calculation_${splitMethod}`,
      timestamp: new Date().toISOString()
    };

    return splitData;
  }

  /**
   * Get participant amount for a specific bill and participant
   */
  getParticipantAmount(billId: string, participantId: string, participantCount: number, splitMethod: 'equal' | 'manual' = 'equal'): number {
    const splitData = this.calculateSplitAmounts(billId, participantCount, splitMethod);
    
    if (!splitData) {
      return 0;
    }

    return splitData.amountPerParticipant;
  }

  /**
   * Validate price consistency across different sources
   */
  validatePriceConsistency(billId: string, reportedAmount: number, source: string): {
    isValid: boolean;
    expectedAmount: number;
    difference: number;
    message: string;
  } {
    const priceData = this.getBillPrice(billId);
    
    if (!priceData) {
      return {
        isValid: false,
        expectedAmount: 0,
        difference: 0,
        message: 'No authoritative price found for this bill'
      };
    }

    const difference = Math.abs(priceData.amount - reportedAmount);
    const isValid = difference < 0.01; // Allow for small floating point differences

    const result = {
      isValid,
      expectedAmount: priceData.amount,
      difference,
      message: isValid 
        ? 'Price is consistent' 
        : `Price mismatch: expected ${priceData.amount}, got ${reportedAmount} (difference: ${difference})`
    };

    if (!isValid) {
      logger.warn('Price inconsistency detected', {
        billId,
        expectedAmount: priceData.amount,
        reportedAmount,
        source,
        difference
      }, 'PriceManagementService');
    }

    return result;
  }

  /**
   * Update price from external source (e.g., Pyth feed)
   * This will be used when Pyth integration is added
   */
  updatePriceFromFeed(billId: string, amount: number, currency: string, source: string = 'pyth_feed'): void {
    const priceData: PriceData = {
      amount,
      currency,
      timestamp: new Date().toISOString(),
      source: source as any
    };

    this.priceCache.set(billId, priceData);
    
    logger.info('Price updated from external feed', {
      billId,
      amount,
      currency,
      source
    }, 'PriceManagementService');
  }

  /**
   * Clear price cache (useful for testing or reset)
   */
  clearCache(): void {
    this.priceCache.clear();
    this.conversionRates.clear();
    logger.info('Cache cleared', null, 'priceManagementService');
  }

  /**
   * Force set authoritative price (overrides existing)
   */
  forceSetBillPrice(billId: string, amount: number, currency: string = 'USDC'): void {
    const priceData: PriceData = {
      amount,
      currency,
      timestamp: new Date().toISOString(),
      source: 'user_input'
    };

    this.priceCache.set(billId, priceData);
    
    logger.info('Bill price force set', {
      billId,
      amount,
      currency,
      source: 'force_set'
    }, 'PriceManagementService');
  }

  /**
   * Get all cached prices (for debugging)
   */
  getAllPrices(): Map<string, PriceData> {
    return new Map(this.priceCache);
  }

  /**
   * Convert currency (placeholder for future Pyth integration)
   */
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    // For now, return the same amount
    // This will be replaced with Pyth feed integration
    return amount;
  }
}

// Export singleton instance
export const priceManagementService = PriceManagementService.getInstance();
export default priceManagementService;
