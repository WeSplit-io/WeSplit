/**
 * Price Management Service
 * Handles price calculations and currency conversions
 */

import { logger } from '../analytics/loggingService';

export interface PriceData {
  currency: string;
  amount: number;
  timestamp: string;
}

export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  timestamp: string;
}

export interface BillPriceData {
  billId: string;
  amount: number;
  currency: string;
  timestamp: string;
}

class PriceManagementService {
  private static instance: PriceManagementService;
  private billPrices: Map<string, BillPriceData> = new Map();

  private constructor() {}

  public static getInstance(): PriceManagementService {
    if (!PriceManagementService.instance) {
      PriceManagementService.instance = new PriceManagementService();
    }
    return PriceManagementService.instance;
  }

  public async getCurrentPrice(currency: string): Promise<PriceData | null> {
    try {
      logger.info('Fetching current price', { currency }, 'PriceManagementService');
      
      // Mock implementation
      const priceData: PriceData = {
        currency,
        amount: currency === 'SOL' ? 100 : 1,
        timestamp: new Date().toISOString()
      };

      return priceData;
    } catch (error) {
      logger.error('Failed to fetch price', { currency, error }, 'PriceManagementService');
      return null;
    }
  }

  public async convertCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<ConversionResult | null> {
    try {
      logger.info('Converting currency', { fromCurrency, toCurrency, amount }, 'PriceManagementService');
      
      // Mock implementation
      const rate = fromCurrency === 'SOL' && toCurrency === 'USD' ? 100 : 1;
      const result: ConversionResult = {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: amount * rate,
        rate,
        timestamp: new Date().toISOString()
      };

      return result;
    } catch (error) {
      logger.error('Currency conversion failed', { fromCurrency, toCurrency, amount, error }, 'PriceManagementService');
      return null;
    }
  }

  public validatePriceConsistency(billId: string, totalAmount: number, source: string): { isValid: boolean; message?: string } {
    try {
      const storedPrice = this.billPrices.get(billId);
      if (!storedPrice) {
        // Store the price for future validation
        this.billPrices.set(billId, {
          billId,
          amount: totalAmount,
          currency: 'USDC',
          timestamp: new Date().toISOString()
        });
        return { isValid: true };
      }
      
      // Check if the amount matches (allow small floating point differences)
      const difference = Math.abs(storedPrice.amount - totalAmount);
      if (difference > 0.01) {
        logger.warn('Price inconsistency detected', { billId, storedPrice: storedPrice.amount, currentPrice: totalAmount, source }, 'PriceManagementService');
        return { 
          isValid: false, 
          message: `Price mismatch: stored ${storedPrice.amount} vs current ${totalAmount}` 
        };
      }
      
      return { isValid: true };
    } catch (error) {
      logger.error('Price validation failed', { billId, totalAmount, source, error }, 'PriceManagementService');
      return { isValid: true }; // Fail open
    }
  }

  public getParticipantAmount(totalAmount: number, participantCount: number): number {
    if (participantCount <= 0) {return 0;}
    return totalAmount / participantCount;
  }

  public formatPrice(amount: number, currency: string): string {
    // Handle special cases for non-standard currency codes
    if (currency === 'USDC') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + ' USDC';
    }
    
    if (currency === 'SOL') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }
    
    // For standard currencies, use normal formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Set bill price for a specific bill ID
   */
  public setBillPrice(billId: string, amount: number, currency: string): void {
    try {
      const billPriceData: BillPriceData = {
        billId,
        amount,
        currency,
        timestamp: new Date().toISOString()
      };
      
      this.billPrices.set(billId, billPriceData);
      logger.info('Bill price set', { billId, amount, currency }, 'PriceManagementService');
    } catch (error) {
      logger.error('Failed to set bill price', { billId, amount, currency, error }, 'PriceManagementService');
    }
  }

  /**
   * Get bill price for a specific bill ID
   */
  public getBillPrice(billId: string): BillPriceData | null {
    try {
      const billPrice = this.billPrices.get(billId);
      if (billPrice) {
        logger.debug('Bill price retrieved', { billId, amount: billPrice.amount, currency: billPrice.currency }, 'PriceManagementService');
        return billPrice;
      }
      
      logger.debug('No bill price found', { billId }, 'PriceManagementService');
      return null;
    } catch (error) {
      logger.error('Failed to get bill price', { billId, error }, 'PriceManagementService');
      return null;
    }
  }

  /**
   * Get all cached bill prices
   */
  public getAllPrices(): Map<string, BillPriceData> {
    return new Map(this.billPrices);
  }

  /**
   * Clear all cached bill prices
   */
  public clearAllPrices(): void {
    this.billPrices.clear();
    logger.info('All bill prices cleared', null, 'PriceManagementService');
  }
}

export const priceManagementService = PriceManagementService.getInstance();
export default priceManagementService;