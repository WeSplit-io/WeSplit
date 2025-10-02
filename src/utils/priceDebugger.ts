/**
 * Price Debugging Utility
 * Helps track down bill amount inconsistencies across the app
 */

import { priceManagementService } from '../services/priceManagementService';

export class PriceDebugger {
  /**
   * Debug bill amount consistency across different sources
   */
  static debugBillAmounts(billId: string, sources: {
    processedBillData?: any;
    billData?: any;
    routeParams?: any;
    splitWallet?: any;
  }) {
    console.log('🔍 PriceDebugger: Debugging bill amounts for:', billId);
    
    const results = {
      billId,
      authoritativePrice: priceManagementService.getBillPrice(billId),
      sources: {
        processedBillData: sources.processedBillData?.totalAmount,
        billData: sources.billData?.totalAmount,
        routeParams: sources.routeParams?.totalAmount,
        splitWallet: sources.splitWallet?.totalAmount,
      },
      inconsistencies: [] as string[]
    };
    
    // Check for inconsistencies
    const amounts = Object.values(results.sources).filter(amount => amount !== undefined);
    const uniqueAmounts = [...new Set(amounts)];
    
    if (uniqueAmounts.length > 1) {
      results.inconsistencies.push(`Multiple different amounts found: ${uniqueAmounts.join(', ')}`);
    }
    
    if (results.authoritativePrice && !amounts.includes(results.authoritativePrice.amount)) {
      results.inconsistencies.push(`Authoritative price (${results.authoritativePrice.amount}) doesn't match any source amounts`);
    }
    
    if (!results.authoritativePrice && amounts.length > 0) {
      results.inconsistencies.push(`No authoritative price set, but sources have amounts: ${amounts.join(', ')}`);
    }
    
    console.log('🔍 PriceDebugger: Results:', results);
    
    if (results.inconsistencies.length > 0) {
      console.warn('⚠️ PriceDebugger: Inconsistencies found:', results.inconsistencies);
    }
    
    return results;
  }
  
  /**
   * Set authoritative price if not already set
   */
  static ensureAuthoritativePrice(billId: string, amount: number, currency: string = 'USDC') {
    const existingPrice = priceManagementService.getBillPrice(billId);
    
    if (!existingPrice) {
      priceManagementService.setBillPrice(billId, amount, currency);
      console.log('💰 PriceDebugger: Set authoritative price:', { billId, amount, currency });
      return true;
    } else if (existingPrice.amount !== amount) {
      console.warn('⚠️ PriceDebugger: Authoritative price mismatch:', {
        billId,
        existingAmount: existingPrice.amount,
        newAmount: amount
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all cached prices for debugging
   */
  static getAllCachedPrices() {
    const allPrices = priceManagementService.getAllPrices();
    console.log('💰 PriceDebugger: All cached prices:', Array.from(allPrices.entries()));
    return allPrices;
  }
  
  /**
   * Clear all cached prices (for testing)
   */
  static clearAllPrices() {
    priceManagementService.clearCache();
    console.log('🧹 PriceDebugger: Cleared all cached prices');
  }
}
