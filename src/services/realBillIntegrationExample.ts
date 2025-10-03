/**
 * Real Bill Integration Example
 * Shows how to integrate real AI/OCR data into your split screens
 */

import { FallbackDataService } from '../utils/fallbackDataService';
import { BillDataProcessor, IncomingBillData } from './billDataProcessor';

export class RealBillIntegrationExample {
  /**
   * Example: How to handle real AI/OCR data in your split screens
   * This shows the complete flow from receiving data to creating a split
   */
  static async handleRealBillData(
    incomingData: IncomingBillData,
    currentUser: { id: string; name: string; email: string; wallet_address: string }
  ) {
    console.log('🔄 RealBillIntegrationExample: Processing real bill data...');

    try {
      // Step 1: Validate the incoming data
      const validation = BillDataProcessor.validateIncomingData(incomingData);
      
      if (!validation.isValid) {
        console.error('❌ Invalid bill data:', validation.errors);
        throw new Error(`Invalid bill data: ${validation.errors.join(', ')}`);
      }

      // Step 2: Process the data into unified format
      const processedData = FallbackDataService.processRealBillData(incomingData, currentUser);
      
      console.log('✅ Processed bill data:', {
        id: processedData.id,
        title: processedData.title,
        totalAmount: processedData.totalAmount,
        merchant: processedData.merchant,
        itemsCount: processedData.items.length,
        participantsCount: processedData.participants.length
      });

      // Step 3: Convert to split data format
      const splitData = BillDataProcessor.convertToSplitData(
        processedData,
        'fair', // or 'degen'
        currentUser.id
      );

      console.log('✅ Split data ready:', {
        billId: splitData.billId,
        title: splitData.title,
        totalAmount: splitData.totalAmount,
        participants: splitData.participants.length
      });

      return {
        success: true,
        processedData,
        splitData,
        originalData: incomingData
      };

    } catch (error) {
      console.error('❌ Error processing real bill data:', error);
      
      // Fallback to mockup data
      const fallbackData = FallbackDataService.getFallbackData();
      const fallbackSplitData = BillDataProcessor.convertToSplitData(
        fallbackData,
        'fair',
        currentUser.id
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedData: fallbackData,
        splitData: fallbackSplitData,
        originalData: incomingData
      };
    }
  }

  /**
   * Example: How to use this in your split screens
   * Replace your current bill processing logic with this
   */
  static async processBillForSplit(
    billData: any, // This could be from your AI/OCR service
    currentUser: { id: string; name: string; email: string; wallet_address: string }
  ) {
    // Check if it's real AI/OCR data or fallback data
    if (this.isRealBillData(billData)) {
      console.log('🔄 Processing real AI/OCR bill data...');
      return await this.handleRealBillData(billData, currentUser);
    } else {
      console.log('🔄 Processing fallback/mockup data...');
      const fallbackData = FallbackDataService.getFallbackData();
      const splitData = BillDataProcessor.convertToSplitData(
        fallbackData,
        'fair',
        currentUser.id
      );
      
      return {
        success: true,
        processedData: fallbackData,
        splitData,
        originalData: billData
      };
    }
  }

  /**
   * Check if the data is real AI/OCR data
   */
  private static isRealBillData(data: any): boolean {
    return (
      data &&
      data.store &&
      data.store.name &&
      data.transaction &&
      data.transaction.order_total &&
      data.transaction.items &&
      Array.isArray(data.transaction.items)
    );
  }

  /**
   * Example: How to integrate this into your existing split screens
   * 
   * In your SplitDetailsScreen, FairSplitScreen, or DegenLockScreen:
   * 
   * ```typescript
   * // Replace your current bill processing logic with:
   * const result = await RealBillIntegrationExample.processBillForSplit(
   *   processedBillData, // Your current bill data
   *   currentUser
   * );
   * 
   * if (result.success) {
   *   // Use result.processedData for display
   *   // Use result.splitData for creating splits
   *   setTotalAmount(result.processedData.totalAmount.toString());
   *   setBillTitle(result.processedData.title);
   *   // ... etc
   * } else {
   *   // Handle error or use fallback data
   *   console.error('Failed to process bill data:', result.error);
   * }
   * ```
   */
}

export default RealBillIntegrationExample;
