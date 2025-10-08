/**
 * Mock Bill Analysis Service
 * This simulates the Python OCR service output and can be easily replaced
 * with actual API calls to your Python service
 * Now processes real AI/OCR data and converts to unified format
 */

import { BillAnalysisData, BillAnalysisResult } from '../types/billAnalysis';
import { MockupDataService } from '../data/mockupData';
import { BillDataProcessor, IncomingBillData } from './billDataProcessor';

export class MockBillAnalysisService {
  /**
   * Simulate bill analysis from image
   * In production, this would call your Python OCR service
   * Now processes real AI/OCR data structure
   */
  static async analyzeBillImage(imageUri: string): Promise<BillAnalysisResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Use unified mockup data for consistency across all bill processing
    const mockupData = MockupDataService.getPrimaryBillData();
    
    // Simulate receiving real AI/OCR data (this would come from your AI service)
    const incomingData: IncomingBillData = {
      category: "Food & Drinks",
      country: "USA",
      currency: "USD",
      store: {
        name: mockupData.merchant,
        location: {
          address: mockupData.location,
          city: "San Francisco",
          state: "CA",
          zip_code: "94102",
          phone: "(415) 555-0123"
        },
        store_id: "SF-001"
      },
      transaction: {
        date: mockupData.date,
        time: mockupData.time,
        order_id: "GSREST001",
        employee: "Server",
        items: mockupData.items.map(item => ({
          name: item.name,
          price: item.price
        })),
        sub_total: mockupData.subtotal,
        sales_tax: mockupData.tax,
        order_total: mockupData.totalAmount,
        calculated_total: mockupData.totalAmount
      }
    };

    // Process the incoming data using our processor
    const processedData = BillDataProcessor.processIncomingBillData(incomingData);
    
    // Convert back to BillAnalysisData format for compatibility
    const mockData: BillAnalysisData = {
      category: incomingData.category,
      country: incomingData.country,
      currency: incomingData.currency,
      store: {
        name: incomingData.store.name,
        location: {
          address: incomingData.store.location.address,
          city: incomingData.store.location.city,
          state: incomingData.store.location.state,
          zip_code: incomingData.store.location.zip_code,
          phone: incomingData.store.location.phone
        },
        store_id: incomingData.store.store_id
      },
      transaction: {
        date: incomingData.transaction.date,
        time: incomingData.transaction.time,
        order_id: incomingData.transaction.order_id,
        employee: incomingData.transaction.employee,
        items: incomingData.transaction.items,
        sub_total: incomingData.transaction.sub_total,
        sales_tax: incomingData.transaction.sales_tax,
        order_total: incomingData.transaction.order_total,
        calculated_total: incomingData.transaction.calculated_total
      }
    };

    return {
      success: true,
      data: mockData,
      processingTime: 2.5,
      confidence: 0.95,
      rawText: `${incomingData.store.name}\n${incomingData.store.location.address}\n${incomingData.store.location.city}, ${incomingData.store.location.state} ${incomingData.store.location.zip_code}\n${incomingData.store.location.phone}\n\nOrder: ${incomingData.transaction.order_id}\nDate: ${incomingData.transaction.date}\nTime: ${incomingData.transaction.time}\nEmployee: ${incomingData.transaction.employee}\n\n${incomingData.transaction.items.map(item => `${item.name} $${item.price.toFixed(2)}`).join('\n')}\n\nSubtotal: $${incomingData.transaction.sub_total.toFixed(2)}\nTax: $${incomingData.transaction.sales_tax.toFixed(2)}\nTotal: $${incomingData.transaction.order_total.toFixed(2)}`,
    };
  }

  /**
   * Simulate different bill types for testing
   * Now uses unified mockup data for consistency
   */
  static async analyzeBillImageWithType(imageUri: string, billType: 'restaurant' | 'coffee' | 'grocery' = 'restaurant'): Promise<BillAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use unified mockup data for consistency across all bill types
    const mockupData = MockupDataService.getPrimaryBillData();
    
    const mockData: BillAnalysisData = {
      category: billType === 'grocery' ? "Groceries" : "Food & Drinks",
      country: "USA",
      currency: "USD",
      store: {
        name: mockupData.merchant,
        location: {
          address: mockupData.location,
          city: "San Francisco",
          state: "CA",
          zip_code: "94102",
          phone: "(415) 555-0123"
        },
        store_id: "SF-001"
      },
      transaction: {
        date: mockupData.date,
        time: mockupData.time,
        order_id: `GS${billType.toUpperCase()}001`,
        employee: "Server",
        items: mockupData.items.map(item => ({
          name: item.name,
          price: item.price
        })),
        sub_total: mockupData.subtotal,
        sales_tax: mockupData.tax,
        order_total: mockupData.totalAmount,
        calculated_total: mockupData.totalAmount
      }
    };

    return {
      success: true,
      data: mockData,
      processingTime: 1.5,
      confidence: 0.92,
      rawText: `Mock raw text for ${billType} bill - ${mockupData.merchant} - Total: $${mockupData.totalAmount.toFixed(2)}`,
    };
  }

  /**
   * Simulate error cases
   */
  static async analyzeBillImageWithError(imageUri: string, errorType: 'low_confidence' | 'no_items' | 'network_error' = 'low_confidence'): Promise<BillAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (errorType) {
      case 'low_confidence':
        return {
          success: false,
          error: 'Low confidence in OCR results. Please retake the photo with better lighting.',
          processingTime: 1.0,
          confidence: 0.3,
        };

      case 'no_items':
        return {
          success: false,
          error: 'No items detected in the bill. Please ensure the entire bill is visible.',
          processingTime: 0.8,
          confidence: 0.0,
        };

      case 'network_error':
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
          processingTime: 0.5,
          confidence: 0.0,
        };

      default:
        return {
          success: false,
          error: 'Unknown error occurred during processing.',
          processingTime: 0.0,
          confidence: 0.0,
        };
    }
  }
}
