/**
 * Price Manager Debugger
 * Utility to debug and test price management issues
 * Consolidates price debugging functionality
 */

import { priceManagementService } from '../services/priceManagementService';
import { MockupDataService } from '../data/mockupData';
import { logger } from '../services/core';

export class PriceManagerDebugger {
  /**
   * Debug the current state of price management
   */
  static debugPriceManagement(billId: string): void {
    
    // Get all cached prices
    const allPrices = priceManagementService.getAllPrices();
    logger.info('All cached prices', { prices: Array.from(allPrices.entries()) }, 'priceManagerDebugger');
    
    // Get specific bill price
    const billPrice = priceManagementService.getBillPrice(billId);
    
    // Get unified mockup amount
    const unifiedAmount = MockupDataService.getBillAmount();
    
    // Check if price is consistent
    if (billPrice) {
      const isConsistent = Math.abs(billPrice.amount - unifiedAmount) < 0.01;
      if (!isConsistent) {
        logger.warn('Price inconsistency detected', {
          billPrice: billPrice.amount,
          unifiedAmount,
          difference: Math.abs(billPrice.amount - unifiedAmount)
        }, 'PriceManagerDebugger');
      }
    } else {
      logger.error('No price found for bill', { billId }, 'PriceManagerDebugger');
    }
  }

  /**
   * Force fix price management for a bill
   */
  static forceFixPriceManagement(billId: string): void {
    
    const unifiedAmount = MockupDataService.getBillAmount();
    
    // Clear any existing price
    priceManagementService.clearCache();
    
    // Set the correct price
    priceManagementService.forceSetBillPrice(billId, unifiedAmount, 'USDC');
    
  }

  /**
   * Test split calculation
   */
  static testSplitCalculation(billId: string, participantCount: number): void {
    
    const splitData = priceManagementService.calculateSplitAmounts(billId, participantCount, 'equal');
    
    if (splitData) {
    } else {
    }
  }

  /**
   * Debug split wallet data
   */
  static debugSplitWalletData(splitWallet: any): void {
    
    if (!splitWallet) {
      return;
    }
    
    
    // Calculate totals
    const totalOwed = splitWallet.participants?.reduce((sum: number, p: any) => sum + (p.amountOwed || 0), 0) || 0;
    const totalPaid = splitWallet.participants?.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0) || 0;
    const completionPercentage = splitWallet.totalAmount > 0 ? Math.round((totalPaid / splitWallet.totalAmount) * 100) : 0;
    
    
    // Check for inconsistencies
    const inconsistencies = [];
    if (Math.abs(totalOwed - splitWallet.totalAmount) > 0.01) {
      inconsistencies.push(`Total owed (${totalOwed}) doesn't match wallet total (${splitWallet.totalAmount})`);
    }
    if (totalPaid > splitWallet.totalAmount) {
      inconsistencies.push(`Total paid (${totalPaid}) exceeds wallet total (${splitWallet.totalAmount})`);
    }
    if (splitWallet.totalAmount !== MockupDataService.getBillAmount()) {
      inconsistencies.push(`Wallet amount (${splitWallet.totalAmount}) doesn't match unified amount (${MockupDataService.getBillAmount()})`);
    }
    
    if (inconsistencies.length > 0) {
      console.warn('⚠️ Split Wallet Inconsistencies:', inconsistencies);
    } else {
    }
  }

  /**
   * Debug bill amount consistency across different sources
   */
  static debugBillAmounts(billId: string, sources: {
    processedBillData?: any;
    billData?: any;
    routeParams?: any;
    splitWallet?: any;
  }) {
    
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
    
    logger.info('PriceManagerDebugger Results', { results }, 'priceManagerDebugger');
    
    if (results.inconsistencies.length > 0) {
      console.warn('⚠️ PriceManagerDebugger: Inconsistencies found:', results.inconsistencies);
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
      logger.info('Set authoritative price', { billId, amount, currency }, 'priceManagerDebugger');
      return true;
    } else if (existingPrice.amount !== amount) {
      console.warn('⚠️ PriceManagerDebugger: Authoritative price mismatch:', {
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
    logger.info('All cached prices', { prices: Array.from(allPrices.entries()) }, 'priceManagerDebugger');
    return allPrices;
  }

  /**
   * Run comprehensive debug
   */
  static runComprehensiveDebug(billId: string, participantCount: number = 2): void {
    logger.info('Running comprehensive debug', null, 'priceManagerDebugger');
    
    // Debug current state
    this.debugPriceManagement(billId);
    
    logger.info('Testing Split Calculation', null, 'priceManagerDebugger');
    this.testSplitCalculation(billId, participantCount);
    
    logger.info('Force Fixing Price Management', null, 'priceManagerDebugger');
    this.forceFixPriceManagement(billId);
    
    logger.info('Testing After Fix', null, 'priceManagerDebugger');
    this.debugPriceManagement(billId);
    this.testSplitCalculation(billId, participantCount);
    
    logger.info('Comprehensive debug completed', null, 'priceManagerDebugger');
  }
}

export default PriceManagerDebugger;
