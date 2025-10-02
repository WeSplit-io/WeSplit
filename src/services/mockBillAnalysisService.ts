/**
 * Mock Bill Analysis Service
 * This simulates the Python OCR service output and can be easily replaced
 * with actual API calls to your Python service
 */

import { BillAnalysisData, BillAnalysisResult } from '../types/billAnalysis';

export class MockBillAnalysisService {
  /**
   * Simulate bill analysis from image
   * In production, this would call your Python OCR service
   */
  static async analyzeBillImage(imageUri: string): Promise<BillAnalysisResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock data based on your example
    const mockData: BillAnalysisData = {
      category: "Food & Drinks",
      country: "USA",
      currency: "USD",
      store: {
        name: "FIVE GUYS",
        location: {
          address: "36 West 48th St",
          city: "New York",
          state: "NY",
          zip_code: "10022",
          phone: "(212) 997-1270"
        },
        store_id: "NY-1111"
      },
      transaction: {
        date: "2/11/2017",
        time: "2:50:56 PM",
        order_id: "AAANCF3G4CCJ",
        employee: "Tiffany m",
        items: [
          { name: "Cheeseburger", price: 8.19 },
          { name: "Mayo", price: 0.00 },
          { name: "Bacon Cheeseburger", price: 9.19 },
          { name: "Bacon", price: 0.00 },
          { name: "Jalapeno Peppers", price: 0.00 },
          { name: "Little Cajun Fry", price: 2.99 },
          { name: "Regular Soda", price: 2.99 }
        ],
        sub_total: 26.35,
        sales_tax: 2.34,
        order_total: 28.69,
        calculated_total: 28.69
      }
    };

    return {
      success: true,
      data: mockData,
      processingTime: 2.5,
      confidence: 0.95,
      rawText: "FIVE GUYS\n36 West 48th St\nNew York, NY 10022\n(212) 997-1270\n\nOrder: AAANCF3G4CCJ\nDate: 2/11/2017\nTime: 2:50:56 PM\nEmployee: Tiffany m\n\nCheeseburger $8.19\nMayo $0.00\nBacon Cheeseburger $9.19\nBacon $0.00\nJalapeno Peppers $0.00\nLittle Cajun Fry $2.99\nRegular Soda $2.99\n\nSubtotal: $26.35\nTax: $2.34\nTotal: $28.69",
    };
  }

  /**
   * Simulate different bill types for testing
   */
  static async analyzeBillImageWithType(imageUri: string, billType: 'restaurant' | 'coffee' | 'grocery' = 'restaurant'): Promise<BillAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    let mockData: BillAnalysisData;

    switch (billType) {
      case 'coffee':
        mockData = {
          category: "Food & Drinks",
          country: "USA",
          currency: "USD",
          store: {
            name: "STARBUCKS",
            location: {
              address: "123 Main St",
              city: "San Francisco",
              state: "CA",
              zip_code: "94102",
              phone: "(415) 555-0123"
            },
            store_id: "SF-2222"
          },
          transaction: {
            date: "3/15/2024",
            time: "9:30:15 AM",
            order_id: "SB123456",
            employee: "Alex",
            items: [
              { name: "Grande Latte", price: 4.95 },
              { name: "Blueberry Muffin", price: 2.95 },
              { name: "Bottle Water", price: 1.50 }
            ],
            sub_total: 9.40,
            sales_tax: 0.75,
            order_total: 10.15,
            calculated_total: 10.15
          }
        };
        break;

      case 'grocery':
        mockData = {
          category: "Groceries",
          country: "USA",
          currency: "USD",
          store: {
            name: "WHOLE FOODS",
            location: {
              address: "456 Market St",
              city: "San Francisco",
              state: "CA",
              zip_code: "94105",
              phone: "(415) 555-0456"
            },
            store_id: "SF-3333"
          },
          transaction: {
            date: "3/20/2024",
            time: "6:45:30 PM",
            order_id: "WF789012",
            employee: "Maria",
            items: [
              { name: "Organic Bananas", price: 3.99 },
              { name: "Almond Milk", price: 4.49 },
              { name: "Whole Grain Bread", price: 2.99 },
              { name: "Greek Yogurt", price: 5.99 },
              { name: "Spinach", price: 2.49 }
            ],
            sub_total: 19.95,
            sales_tax: 1.60,
            order_total: 21.55,
            calculated_total: 21.55
          }
        };
        break;

      default: // restaurant
        mockData = {
          category: "Food & Drinks",
          country: "USA",
          currency: "USD",
          store: {
            name: "FIVE GUYS",
            location: {
              address: "36 West 48th St",
              city: "New York",
              state: "NY",
              zip_code: "10022",
              phone: "(212) 997-1270"
            },
            store_id: "NY-1111"
          },
          transaction: {
            date: "2/11/2017",
            time: "2:50:56 PM",
            order_id: "AAANCF3G4CCJ",
            employee: "Tiffany m",
            items: [
              { name: "Cheeseburger", price: 8.19 },
              { name: "Mayo", price: 0.00 },
              { name: "Bacon Cheeseburger", price: 9.19 },
              { name: "Bacon", price: 0.00 },
              { name: "Jalapeno Peppers", price: 0.00 },
              { name: "Little Cajun Fry", price: 2.99 },
              { name: "Regular Soda", price: 2.99 }
            ],
            sub_total: 26.35,
            sales_tax: 2.34,
            order_total: 28.69,
            calculated_total: 28.69
          }
        };
    }

    return {
      success: true,
      data: mockData,
      processingTime: 1.5,
      confidence: 0.92,
      rawText: `Mock raw text for ${billType} bill`,
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
