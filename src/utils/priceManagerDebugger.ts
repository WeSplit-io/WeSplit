/**
 * Price Manager Debugger
 * Utility to debug and test price management issues
 * Consolidates price debugging functionality
 */

import { priceManagementService } from '../services/priceManagementService';
import { MockupDataService } from '../data/mockupData';

export class PriceManagerDebugger {
  /**
   * Debug the current state of price management
   */
  static debugPriceManagement(billId: string): void {
    console.log('🔍 PriceManagerDebugger: Debugging price management for bill:', billId);
    
    // Get all cached prices
    const allPrices = priceManagementService.getAllPrices();
    console.log('📊 All cached prices:', Array.from(allPrices.entries()));
    
    // Get specific bill price
    const billPrice = priceManagementService.getBillPrice(billId);
    console.log('💰 Bill price for', billId, ':', billPrice);
    
    // Get unified mockup amount
    const unifiedAmount = MockupDataService.getBillAmount();
    console.log('🎯 Unified mockup amount:', unifiedAmount);
    
    // Check if price is consistent
    if (billPrice) {
      const isConsistent = Math.abs(billPrice.amount - unifiedAmount) < 0.01;
      console.log('✅ Price consistency check:', {
        billPrice: billPrice.amount,
        unifiedAmount,
        isConsistent,
        difference: Math.abs(billPrice.amount - unifiedAmount)
      });
    } else {
      console.log('❌ No price found for bill:', billId);
    }
  }

  /**
   * Force fix price management for a bill
   */
  static forceFixPriceManagement(billId: string): void {
    console.log('🔧 PriceManagerDebugger: Force fixing price management for bill:', billId);
    
    const unifiedAmount = MockupDataService.getBillAmount();
    
    // Clear any existing price
    priceManagementService.clearCache();
    
    // Set the correct price
    priceManagementService.forceSetBillPrice(billId, unifiedAmount, 'USDC');
    
    console.log('✅ PriceManagerDebugger: Price management fixed:', {
      billId,
      amount: unifiedAmount,
      currency: 'USDC'
    });
  }

  /**
   * Test split calculation
   */
  static testSplitCalculation(billId: string, participantCount: number): void {
    console.log('🧪 PriceManagerDebugger: Testing split calculation:', {
      billId,
      participantCount
    });
    
    const splitData = priceManagementService.calculateSplitAmounts(billId, participantCount, 'equal');
    
    if (splitData) {
      console.log('✅ Split calculation successful:', {
        totalAmount: splitData.totalAmount,
        amountPerParticipant: splitData.amountPerParticipant,
        participantCount: splitData.participantCount,
        currency: splitData.currency
      });
    } else {
      console.log('❌ Split calculation failed - no price data available');
    }
  }

  /**
   * Debug split wallet data
   */
  static debugSplitWalletData(splitWallet: any): void {
    console.log('🔍 PriceManagerDebugger: Debugging split wallet data...');
    
    if (!splitWallet) {
      console.log('❌ No split wallet provided');
      return;
    }
    
    console.log('📊 Split Wallet Data:', {
      id: splitWallet.id,
      totalAmount: splitWallet.totalAmount,
      currency: splitWallet.currency,
      participantsCount: splitWallet.participants?.length || 0,
      participants: splitWallet.participants?.map((p: any) => ({
        userId: p.userId,
        amountOwed: p.amountOwed,
        amountPaid: p.amountPaid,
        status: p.status
      })) || []
    });
    
    // Calculate totals
    const totalOwed = splitWallet.participants?.reduce((sum: number, p: any) => sum + (p.amountOwed || 0), 0) || 0;
    const totalPaid = splitWallet.participants?.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0) || 0;
    const completionPercentage = splitWallet.totalAmount > 0 ? Math.round((totalPaid / splitWallet.totalAmount) * 100) : 0;
    
    console.log('💰 Split Wallet Totals:', {
      totalAmount: splitWallet.totalAmount,
      totalOwed,
      totalPaid,
      completionPercentage: `${completionPercentage}%`,
      remainingAmount: splitWallet.totalAmount - totalPaid
    });
    
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
      console.log('✅ Split wallet data is consistent');
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
    console.log('🔍 PriceManagerDebugger: Debugging bill amounts for:', billId);
    
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
    
    console.log('🔍 PriceManagerDebugger: Results:', results);
    
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
      console.log('💰 PriceManagerDebugger: Set authoritative price:', { billId, amount, currency });
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
    console.log('📊 All cached prices:', Array.from(allPrices.entries()));
    return allPrices;
  }

  /**
   * Run comprehensive debug
   */
  static runComprehensiveDebug(billId: string, participantCount: number = 2): void {
    console.log('🔍 PriceManagerDebugger: Running comprehensive debug...');
    console.log('================================================');
    
    // Debug current state
    this.debugPriceManagement(billId);
    
    console.log('\n--- Testing Split Calculation ---');
    this.testSplitCalculation(billId, participantCount);
    
    console.log('\n--- Force Fixing Price Management ---');
    this.forceFixPriceManagement(billId);
    
    console.log('\n--- Testing After Fix ---');
    this.debugPriceManagement(billId);
    this.testSplitCalculation(billId, participantCount);
    
    console.log('================================================');
    console.log('✅ Comprehensive debug completed');
  }
}

export default PriceManagerDebugger;
