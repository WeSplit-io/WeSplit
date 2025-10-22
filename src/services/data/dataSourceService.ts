/**
 * Data Source Service
 * Centralized service for managing data source hierarchy and fallbacks
 * Replaces scattered MockupDataService fallbacks with consistent data access
 */

import { MockupDataService } from '../data/mockupData';
import { logger } from '../core/loggingService';
import { ErrorHandler } from '../../utils/core/errorHandler';

export interface BillData {
  id?: string;
  title?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  merchant?: {
    name?: string;
    address?: string;
  };
  participants?: any[];
}

export interface SplitData {
  id?: string;
  title?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  merchant?: {
    name?: string;
    address?: string;
  };
  participants?: any[];
  status?: string;
  splitType?: string;
}

export interface DataSourceResult<T> {
  data: T;
  source: 'splitData' | 'billData' | 'processedBillData' | 'fallback';
  isFallback: boolean;
}

export class DataSourceService {
  /**
   * Get bill amount with proper fallback hierarchy
   * Priority: splitData > processedBillData > billData > fallback
   */
  static getBillAmount(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): DataSourceResult<number> {
    // Priority 1: Split data (most authoritative)
    if (splitData?.totalAmount !== undefined && splitData.totalAmount > 0) {
      return {
        data: splitData.totalAmount,
        source: 'splitData',
        isFallback: false
      };
    }

    // Priority 2: Processed bill data
    if (processedBillData?.totalAmount !== undefined && processedBillData.totalAmount > 0) {
      return {
        data: processedBillData.totalAmount,
        source: 'processedBillData',
        isFallback: false
      };
    }

    // Priority 3: Raw bill data
    if (billData?.totalAmount !== undefined && billData.totalAmount > 0) {
      return {
        data: billData.totalAmount,
        source: 'billData',
        isFallback: false
      };
    }

    // Fallback: Mockup data (only for development/testing)
    const fallbackAmount = MockupDataService.getBillAmount();
    logger.warn('Using fallback amount from MockupDataService', { 
      fallbackAmount,
      splitData: splitData?.totalAmount,
      processedBillData: processedBillData?.totalAmount,
      billData: billData?.totalAmount
    }, 'DataSourceService');
    
    return {
      data: fallbackAmount,
      source: 'fallback',
      isFallback: true
    };
  }

  /**
   * Get bill name with proper fallback hierarchy
   * Priority: splitData > processedBillData > billData > fallback
   */
  static getBillName(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): DataSourceResult<string> {
    // Priority 1: Split data (most authoritative)
    if (splitData?.title) {
      return {
        data: splitData.title,
        source: 'splitData',
        isFallback: false
      };
    }

    // Priority 2: Processed bill data
    if (processedBillData?.title) {
      return {
        data: processedBillData.title,
        source: 'processedBillData',
        isFallback: false
      };
    }

    // Priority 3: Raw bill data
    if (billData?.title) {
      return {
        data: billData.title,
        source: 'billData',
        isFallback: false
      };
    }

    // Fallback: Mockup data (only for development/testing)
    const fallbackName = MockupDataService.getBillName();
    console.warn('DataSourceService: Using fallback name from MockupDataService:', fallbackName);
    
    return {
      data: fallbackName,
      source: 'fallback',
      isFallback: true
    };
  }

  /**
   * Get bill currency with proper fallback hierarchy
   */
  static getBillCurrency(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): DataSourceResult<string> {
    // Priority 1: Split data
    if (splitData?.currency) {
      return {
        data: splitData.currency,
        source: 'splitData',
        isFallback: false
      };
    }

    // Priority 2: Processed bill data
    if (processedBillData?.currency) {
      return {
        data: processedBillData.currency,
        source: 'processedBillData',
        isFallback: false
      };
    }

    // Priority 3: Raw bill data
    if (billData?.currency) {
      return {
        data: billData.currency,
        source: 'billData',
        isFallback: false
      };
    }

    // Fallback: Default currency
    return {
      data: 'USDC',
      source: 'fallback',
      isFallback: true
    };
  }

  /**
   * Get bill date with proper fallback hierarchy
   */
  static getBillDate(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): DataSourceResult<string> {
    // Priority 1: Split data
    if (splitData?.date) {
      return {
        data: splitData.date,
        source: 'splitData',
        isFallback: false
      };
    }

    // Priority 2: Processed bill data
    if (processedBillData?.date) {
      return {
        data: processedBillData.date,
        source: 'processedBillData',
        isFallback: false
      };
    }

    // Priority 3: Raw bill data
    if (billData?.date) {
      return {
        data: billData.date,
        source: 'billData',
        isFallback: false
      };
    }

    // Fallback: Current date
    return {
      data: new Date().toISOString(),
      source: 'fallback',
      isFallback: true
    };
  }

  /**
   * Get merchant information with proper fallback hierarchy
   */
  static getMerchantInfo(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): DataSourceResult<{ name: string; address?: string }> {
    // Priority 1: Split data
    if (splitData?.merchant?.name) {
      return {
        data: {
          name: splitData.merchant.name,
          address: splitData.merchant.address
        },
        source: 'splitData',
        isFallback: false
      };
    }

    // Priority 2: Processed bill data
    if (processedBillData?.merchant?.name) {
      return {
        data: {
          name: processedBillData.merchant.name,
          address: processedBillData.merchant.address
        },
        source: 'processedBillData',
        isFallback: false
      };
    }

    // Priority 3: Raw bill data
    if (billData?.merchant?.name) {
      return {
        data: {
          name: billData.merchant.name,
          address: billData.merchant.address
        },
        source: 'billData',
        isFallback: false
      };
    }

    // Fallback: Default merchant
    return {
      data: {
        name: 'Unknown Merchant',
        address: undefined
      },
      source: 'fallback',
      isFallback: true
    };
  }

  /**
   * Get participants with proper fallback hierarchy
   */
  static getParticipants(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): DataSourceResult<any[]> {
    // Priority 1: Split data
    if (splitData?.participants && splitData.participants.length > 0) {
      return {
        data: splitData.participants,
        source: 'splitData',
        isFallback: false
      };
    }

    // Priority 2: Processed bill data
    if (processedBillData?.participants && processedBillData.participants.length > 0) {
      return {
        data: processedBillData.participants,
        source: 'processedBillData',
        isFallback: false
      };
    }

    // Priority 3: Raw bill data
    if (billData?.participants && billData.participants.length > 0) {
      return {
        data: billData.participants,
        source: 'billData',
        isFallback: false
      };
    }

    // Fallback: Empty array
    return {
      data: [],
      source: 'fallback',
      isFallback: true
    };
  }

  /**
   * Get comprehensive bill information with all data sources
   */
  static getBillInfo(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ) {
    return {
      amount: this.getBillAmount(splitData, processedBillData, billData),
      name: this.getBillName(splitData, processedBillData, billData),
      currency: this.getBillCurrency(splitData, processedBillData, billData),
      date: this.getBillDate(splitData, processedBillData, billData),
      merchant: this.getMerchantInfo(splitData, processedBillData, billData),
      participants: this.getParticipants(splitData, processedBillData, billData)
    };
  }

  /**
   * Check if any fallback data is being used
   */
  static isUsingFallbackData(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData
  ): boolean {
    const billInfo = this.getBillInfo(splitData, processedBillData, billData);
    return Object.values(billInfo).some(result => result.isFallback);
  }

  /**
   * Log data source usage for debugging
   */
  static logDataSourceUsage(
    splitData?: SplitData,
    processedBillData?: BillData,
    billData?: BillData,
    context?: string
  ): void {
    const billInfo = this.getBillInfo(splitData, processedBillData, billData);
    const contextStr = context ? `[${context}] ` : '';
    
    logger.info('Data source usage', {
      amount: { value: billInfo.amount.data, source: billInfo.amount.source, isFallback: billInfo.amount.isFallback },
      name: { value: billInfo.name.data, source: billInfo.name.source, isFallback: billInfo.name.isFallback },
      currency: { value: billInfo.currency.data, source: billInfo.currency.source, isFallback: billInfo.currency.isFallback },
      date: { value: billInfo.date.data, source: billInfo.date.source, isFallback: billInfo.date.isFallback },
      merchant: { value: billInfo.merchant.data, source: billInfo.merchant.source, isFallback: billInfo.merchant.isFallback },
      participants: { count: billInfo.participants.data.length, source: billInfo.participants.source, isFallback: billInfo.participants.isFallback }
    });

    if (this.isUsingFallbackData(splitData, processedBillData, billData)) {
      console.warn(`${contextStr}DataSourceService: WARNING - Using fallback data. This may indicate missing or invalid data.`);
    }
  }
}

export default DataSourceService;
