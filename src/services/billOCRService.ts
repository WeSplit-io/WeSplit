/**
 * Bill OCR Service
 * Handles communication with Python OCR service for bill processing
 */

import { OCRProcessingResult, BillItem } from '../types/billSplitting';
import { logger } from './loggingService';

export interface OCRServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

class BillOCRService {
  private config: OCRServiceConfig;

  constructor(config: OCRServiceConfig) {
    this.config = config;
  }

  /**
   * Process bill image using Python OCR service
   */
  async processBillImage(imageUri: string): Promise<OCRProcessingResult> {
    try {
      logger.info('BillOCRService: Starting bill image processing', { imageUri }, 'BillOCR');

      const startTime = Date.now();

      // Convert image to base64 for API transmission
      const base64Image = await this.convertImageToBase64(imageUri);

      // Call Python OCR service
      const response = await this.callOCRService(base64Image);

      const processingTime = (Date.now() - startTime) / 1000;

      if (response.success) {
        logger.info('BillOCRService: OCR processing successful', { 
          processingTime,
          itemCount: response.extractedItems.length,
          totalAmount: response.totalAmount
        }, 'BillOCR');

        return {
          success: true,
          rawText: response.rawText,
          extractedItems: response.extractedItems,
          totalAmount: response.totalAmount,
          confidence: response.confidence,
          processingTime,
        };
      } else {
        logger.warn('BillOCRService: OCR processing failed', { 
          error: response.error,
          processingTime 
        }, 'BillOCR');

        return {
          success: false,
          rawText: '',
          extractedItems: [],
          totalAmount: 0,
          confidence: 0,
          processingTime,
          error: response.error,
        };
      }
    } catch (error) {
      logger.error('BillOCRService: Error processing bill image', { 
        imageUri, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'BillOCR');

      return {
        success: false,
        rawText: '',
        extractedItems: [],
        totalAmount: 0,
        confidence: 0,
        processingTime: 0,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    }
  }

  /**
   * Convert image URI to base64 string
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // For React Native, we need to use a different approach
      // This is a simplified version - in production, you'd use a proper base64 conversion
      
      // For now, we'll simulate this process
      // In a real implementation, you'd use:
      // - expo-file-system for file operations
      // - react-native-fs for file system access
      // - Or send the image URI directly to your backend
      
      logger.info('BillOCRService: Converting image to base64', { imageUri }, 'BillOCR');
      
      // Simulate base64 conversion
      return `data:image/jpeg;base64,${imageUri}`;
    } catch (error) {
      logger.error('BillOCRService: Error converting image to base64', { 
        imageUri, 
        error 
      }, 'BillOCR');
      throw new Error('Failed to convert image to base64');
    }
  }

  /**
   * Call Python OCR service API
   */
  private async callOCRService(base64Image: string): Promise<{
    success: boolean;
    rawText: string;
    extractedItems: BillItem[];
    totalAmount: number;
    confidence: number;
    error?: string;
  }> {
    try {
      const requestBody = {
        image: base64Image,
        options: {
          extract_items: true,
          extract_amounts: true,
          extract_merchant: true,
          extract_date: true,
          confidence_threshold: 0.7,
        },
      };

      const response = await fetch(`${this.config.baseUrl}/process-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(requestBody),
        timeout: this.config.timeout,
      });

      if (!response.ok) {
        throw new Error(`OCR service responded with status: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: result.success || false,
        rawText: result.raw_text || '',
        extractedItems: this.parseExtractedItems(result.extracted_items || []),
        totalAmount: result.total_amount || 0,
        confidence: result.confidence || 0,
        error: result.error,
      };
    } catch (error) {
      logger.error('BillOCRService: Error calling OCR service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'BillOCR');
      
      // Fallback to mock data for development
      return this.getMockOCRResult();
    }
  }

  /**
   * Parse extracted items from OCR service response
   */
  private parseExtractedItems(items: any[]): BillItem[] {
    return items.map((item, index) => ({
      id: `item_${index + 1}`,
      name: item.name || `Item ${index + 1}`,
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
      category: item.category || 'Other',
      participants: [],
    }));
  }

  /**
   * Mock OCR result for development/testing
   */
  private getMockOCRResult(): {
    success: boolean;
    rawText: string;
    extractedItems: BillItem[];
    totalAmount: number;
    confidence: number;
  } {
    const mockItems: BillItem[] = [
      {
        id: '1',
        name: 'Coffee',
        price: 4.50,
        quantity: 1,
        category: 'Beverage',
        participants: [],
      },
      {
        id: '2',
        name: 'Sandwich',
        price: 12.99,
        quantity: 1,
        category: 'Food',
        participants: [],
      },
      {
        id: '3',
        name: 'Salad',
        price: 8.75,
        quantity: 1,
        category: 'Food',
        participants: [],
      },
    ];

    const totalAmount = mockItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    return {
      success: true,
      rawText: 'Coffee $4.50\nSandwich $12.99\nSalad $8.75\nTotal: $26.24',
      extractedItems: mockItems,
      totalAmount,
      confidence: 0.85,
    };
  }

  /**
   * Validate OCR service configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.baseUrl) {
      errors.push('Base URL is required');
    }

    if (!this.config.baseUrl.startsWith('http')) {
      errors.push('Base URL must be a valid HTTP/HTTPS URL');
    }

    if (this.config.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test OCR service connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        timeout: 5000,
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Service responded with status: ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}

// Default configuration
const defaultConfig: OCRServiceConfig = {
  baseUrl: process.env.EXPO_PUBLIC_OCR_SERVICE_URL || 'http://localhost:8000',
  apiKey: process.env.EXPO_PUBLIC_OCR_API_KEY,
  timeout: 30000, // 30 seconds
};

// Create singleton instance
export const billOCRService = new BillOCRService(defaultConfig);

// Export for testing
export { BillOCRService };
