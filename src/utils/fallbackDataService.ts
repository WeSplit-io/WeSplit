/**
 * Fallback Data Service
 * Provides consistent fallback values using unified mockup data
 * Can also process real AI/OCR data when available
 */

import { MockupDataService } from '../data/mockupData';
import { consolidatedBillAnalysisService, IncomingBillData } from '../services/consolidatedBillAnalysisService';
import { logger } from '../services/loggingService';

export class FallbackDataService {
  /**
   * Generate a consistent bill name based on context
   */
  static generateBillName(
    processedBillData?: any,
    billData?: any,
    context?: 'restaurant' | 'grocery' | 'shopping' | 'general'
  ): string {
    // Use actual data if available
    if (processedBillData?.title) return processedBillData.title;
    if (billData?.title) return billData.title;
    if (processedBillData?.store?.name) return processedBillData.store.name;
    if (billData?.store?.name) return billData.store.name;

    // Use consistent mockup data instead of random generation
    return MockupDataService.getBillName();
  }

  /**
   * Generate a consistent bill amount based on context
   */
  static generateBillAmount(
    processedBillData?: any,
    billData?: any,
    context?: 'restaurant' | 'grocery' | 'shopping' | 'general'
  ): number {
    // Use actual data if available
    if (processedBillData?.totalAmount) return processedBillData.totalAmount;
    if (billData?.totalAmount) return billData.totalAmount;
    if (processedBillData?.transaction?.order_total) return processedBillData.transaction.order_total;

    // Use consistent mockup data instead of random generation
    return MockupDataService.getBillAmount();
  }

  /**
   * Generate a consistent date based on context
   */
  static generateBillDate(
    processedBillData?: any,
    billData?: any,
    isRecent: boolean = true
  ): string {
    logger.info('generateBillDate called with', {
      processedBillDataDate: processedBillData?.transaction?.date,
      billDataDate: billData?.date,
      processedBillDataKeys: processedBillData ? Object.keys(processedBillData) : 'null',
      billDataKeys: billData ? Object.keys(billData) : 'null'
    });

    // Always use mockup data for consistency across all screens
    // This ensures all screens show the same date regardless of invalid data
    logger.info('Using mockup data date for consistency', null, 'fallbackDataService');
    return MockupDataService.getBillDate();
  }

  /**
   * Format date to a readable string
   */
  private static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ FallbackDataService: Invalid date provided:', date);
      // Return a fallback date
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    
    return dateObj.toLocaleDateString('en-US', options);
  }

  /**
   * Generate a dynamic time based on context
   */
  static generateBillTime(
    processedBillData?: any,
    billData?: any
  ): string {
    // Use actual data if available
    if (processedBillData?.transaction?.time) return processedBillData.transaction.time;
    if (billData?.time) return billData.time;

    // Generate dynamic time
    const now = new Date();
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const period = hour < 12 ? 'AM' : 'PM';
    
    return `${timeString} ${period}`;
  }

  /**
   * Generate a consistent merchant name
   */
  static generateMerchantName(
    processedBillData?: any,
    billData?: any,
    context?: 'restaurant' | 'grocery' | 'shopping' | 'general'
  ): string {
    // Use actual data if available
    if (processedBillData?.store?.name) return processedBillData.store.name;
    if (billData?.store?.name) return billData.store.name;
    if (processedBillData?.merchant?.name) return processedBillData.merchant.name;
    if (billData?.merchant?.name) return billData.merchant.name;

    // Use consistent mockup data instead of random generation
    return MockupDataService.getMerchantName();
  }

  /**
   * Generate a consistent location
   */
  static generateLocation(
    processedBillData?: any,
    billData?: any
  ): string {
    // Use actual data if available
    if (processedBillData?.store?.location?.city) {
      return `${processedBillData.store.location.city}, ${processedBillData.store.location.state}`;
    }
    if (billData?.location) return billData.location;

    // Use consistent mockup data instead of random generation
    return MockupDataService.getLocation();
  }

  /**
   * Process real AI/OCR data and convert to unified format
   * This method handles the incoming data structure you specified
   */
  static processRealBillData(
    incomingData: IncomingBillData,
    currentUser?: { id: string; name: string; email: string; wallet_address: string }
  ) {
    logger.info('Processing real AI/OCR data', {
      merchant: incomingData.store.name,
      total: incomingData.transaction.order_total,
      itemsCount: incomingData.transaction.items.length
    });

    // Use the BillDataProcessor to handle the conversion
    return consolidatedBillAnalysisService.processIncomingBillData(incomingData, currentUser);
  }

  /**
   * Validate and process incoming AI/OCR data
   */
  static validateAndProcessIncomingData(
    data: any,
    currentUser?: { id: string; name: string; email: string; wallet_address: string }
  ) {
    // Validate the incoming data structure
    const validation = consolidatedBillAnalysisService.validateIncomingData(data);
    
    if (!validation.isValid) {
      console.warn('⚠️ FallbackDataService: Invalid incoming data, using fallback:', validation.errors);
      return this.getFallbackData();
    }

    // Process the valid data
    return this.processRealBillData(data as IncomingBillData, currentUser);
  }

  /**
   * Get fallback data when processing fails
   */
  static getFallbackData() {
    return consolidatedBillAnalysisService.getFallbackData();
  }
}
