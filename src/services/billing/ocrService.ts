/**
 * OCR Service
 * 
 * Clean implementation for receipt scanning and analysis.
 * Extracts data matching the ProcessedBillData structure required for split creation.
 * 
 * @example
 * ```typescript
 * import { ocrService } from '@/services/billing';
 * 
 * const result = await ocrService.analyzeReceipt(imageUri, currentUser);
 * if (result.success && result.data) {
 *   // Use result.data (ProcessedBillData) for split creation
 * }
 * ```
 * 
 * @see ProcessedBillData - Output structure matches manual split creation
 * @see consolidatedBillAnalysisService - Uses this service internally
 */

import { logger } from '../core';
import { 
  BillAnalysisResult, 
  ProcessedBillData, 
  BillItem, 
  BillParticipant, 
  BillSettings 
} from '../../types/billAnalysis';
import { roundUsdcAmount } from '../../utils/ui/format/formatUtils';
import { convertFiatToUSDC } from '../core';

/**
 * Configuration for OCR service
 */
interface OCRServiceConfig {
  readonly aiServiceUrl: string;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly timeout: number;
}

/**
 * Response structure from AI service
 */
interface AIResponse {
  success: boolean;
  data?: AIReceiptData;
  error?: string;
  processing_time?: number;
  confidence?: number;
}

/**
 * Receipt data structure from AI service
 */
interface AIReceiptData {
  is_receipt: boolean;
  category?: string;
  merchant?: {
    name?: string;
    address?: string;
    phone?: string;
    vat_number?: string;
  };
  transaction?: {
    date?: string;
    time?: string;
    receipt_number?: string;
    country?: string;
    currency?: string;
  };
  items?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
    tax_rate?: number;
  }>;
  totals?: {
    subtotal?: number;
    tax?: number;
    total?: number;
    total_calculated?: number;
    total_matches?: boolean;
  };
  notes?: string;
}

/**
 * Constants for OCR service
 */
const OCR_CONSTANTS = {
  DEFAULT_MERCHANT_NAME: 'Unknown Merchant',
  DEFAULT_CATEGORY: 'Other',
  DEFAULT_CURRENCY: 'USD',
  MIN_TOTAL_AMOUNT: 0.01,
  DEFAULT_CONFIDENCE: 0.85,
  IMAGE_URI_PREVIEW_LENGTH: 50,
} as const;

/**
 * Item category keywords for automatic categorization
 */
const ITEM_CATEGORIES = {
  FOOD: ['food', 'meal', 'burger', 'pizza', 'restaurant'],
  BEVERAGES: ['drink', 'coffee', 'tea', 'soda', 'beverage'],
  FEES: ['tax', 'tip', 'service'],
  TRANSPORT: ['travel', 'transport', 'uber', 'taxi'],
  ACCOMMODATION: ['hotel', 'accommodation', 'lodging'],
} as const;

/**
 * OCR Service Class
 * 
 * Singleton service for analyzing receipt images and extracting structured data.
 * Follows the same data structure as manual split creation for consistency.
 */
class OCRService {
  private static instance: OCRService | null = null;
  private readonly config: OCRServiceConfig;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.config = {
      aiServiceUrl: 'https://us-central1-wesplit-35186.cloudfunctions.net/analyzeBill',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    };
  }

  /**
   * Get singleton instance of OCRService
   * 
   * @returns {OCRService} The singleton instance
   */
  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Main entry point: Analyze receipt image and extract structured data
   * 
   * @param {string} imageUri - URI of the receipt image to analyze
   * @param {Object} currentUser - Current user information (optional)
   * @param {string} currentUser.id - User ID
   * @param {string} currentUser.name - User name
   * @param {string} currentUser.wallet_address - User wallet address
   * 
   * @returns {Promise<BillAnalysisResult>} Analysis result with ProcessedBillData or error
   * 
   * @throws {Error} If image URI is invalid or empty
   * 
   * @example
   * ```typescript
   * const result = await ocrService.analyzeReceipt(imageUri, {
   *   id: 'user123',
   *   name: 'John Doe',
   *   wallet_address: '...'
   * });
   * 
   * if (result.success && result.data) {
   *   console.log('Extracted total:', result.data.totalAmount);
   *   console.log('Items:', result.data.items.length);
   * }
   * ```
   */
  async analyzeReceipt(
    imageUri: string,
    currentUser?: { id: string; name: string; wallet_address: string }
  ): Promise<BillAnalysisResult> {
    const startTime = Date.now();

    // Validate input
    if (!imageUri || typeof imageUri !== 'string' || imageUri.trim().length === 0) {
      const error = 'Invalid image URI: must be a non-empty string';
      logger.error('OCR analysis failed: invalid input', { imageUri }, 'OCRService');
      return {
        success: false,
        error,
        processingTime: Date.now() - startTime,
        confidence: 0,
      };
    }

    try {
      logger.info('Starting OCR receipt analysis', {
        imageUri: imageUri.substring(0, OCR_CONSTANTS.IMAGE_URI_PREVIEW_LENGTH) + '...',
        userId: currentUser?.id,
      }, 'OCRService');

      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);

      // Call AI service with retry logic
      const aiResponse = await this.callAIServiceWithRetry(base64Image, currentUser?.id);

      if (!aiResponse.success || !aiResponse.data) {
        const errorMessage = aiResponse.error || 'OCR analysis failed';
        logger.error('AI service returned error', { error: errorMessage }, 'OCRService');
        throw new Error(errorMessage);
      }

      // Validate that it's a receipt
      if (!aiResponse.data.is_receipt) {
        const errorMessage = aiResponse.data.notes || 'Image does not contain a valid receipt';
        logger.warn('Image is not a receipt', { notes: aiResponse.data.notes }, 'OCRService');
        return {
          success: false,
          error: errorMessage,
          processingTime: Date.now() - startTime,
          confidence: 0,
        };
      }

      // Transform AI response to ProcessedBillData structure
      const processedData = await this.transformToProcessedBillData(
        aiResponse.data,
        currentUser
      );

      const processingTime = Date.now() - startTime;

      logger.info('OCR analysis completed successfully', {
        processingTime,
        confidence: aiResponse.confidence || OCR_CONSTANTS.DEFAULT_CONFIDENCE,
        itemCount: processedData.items.length,
        totalAmount: processedData.totalAmount,
        currency: processedData.currency,
      }, 'OCRService');

      return {
        success: true,
        data: processedData,
        processingTime: aiResponse.processing_time || processingTime,
        confidence: aiResponse.confidence || OCR_CONSTANTS.DEFAULT_CONFIDENCE,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('OCR analysis failed', {
        error: errorMessage,
        processingTime: Date.now() - startTime,
        userId: currentUser?.id,
      }, 'OCRService');

      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime,
        confidence: 0,
      };
    }
  }

  /**
   * Transform AI response to ProcessedBillData structure
   * Matches the structure used in manual split creation
   */
  private async transformToProcessedBillData(
    aiData: NonNullable<AIResponse['data']>,
    currentUser?: { id: string; name: string; wallet_address: string }
  ): Promise<ProcessedBillData> {
    const billId = this.generateBillId();
    const now = new Date();

    // Extract merchant information
    const merchantName = aiData.merchant?.name || OCR_CONSTANTS.DEFAULT_MERCHANT_NAME;
    const merchantAddress = aiData.merchant?.address || '';
    const merchantPhone = aiData.merchant?.phone || '';

    // Extract transaction information
    const transactionDate = aiData.transaction?.date || now.toISOString().split('T')[0];
    const transactionTime = aiData.transaction?.time || now.toTimeString().split(' ')[0];
    const receiptNumber = aiData.transaction?.receipt_number || '';
    const originalCurrency = aiData.transaction?.currency || OCR_CONSTANTS.DEFAULT_CURRENCY;

    // Extract totals
    let originalSubtotal = aiData.totals?.subtotal || 0;
    let originalTax = aiData.totals?.tax || 0;
    const originalTotal = aiData.totals?.total || aiData.totals?.total_calculated || 0;

    // Validate total
    if (originalTotal <= 0 || originalTotal < OCR_CONSTANTS.MIN_TOTAL_AMOUNT) {
      throw new Error(
        `Invalid receipt total: total amount must be at least ${OCR_CONSTANTS.MIN_TOTAL_AMOUNT}`
      );
    }

    // Convert currency to USDC if needed
    let totalAmount = originalTotal;
    let convertedSubtotal = originalSubtotal;
    let convertedTax = originalTax;
    
    if (originalCurrency !== 'USDC' && originalCurrency !== 'USD') {
      try {
        // Convert total amount
        totalAmount = await convertFiatToUSDC(originalTotal, originalCurrency);
        
        // Convert subtotal and tax if they exist
        if (originalSubtotal > 0) {
          convertedSubtotal = await convertFiatToUSDC(originalSubtotal, originalCurrency);
        }
        if (originalTax > 0) {
          convertedTax = await convertFiatToUSDC(originalTax, originalCurrency);
        }
        
        logger.info('Converted receipt amounts to USDC', {
          originalTotal,
          originalSubtotal,
          originalTax,
          originalCurrency,
          convertedTotal: totalAmount,
          convertedSubtotal,
          convertedTax,
        }, 'OCRService');
      } catch (conversionError) {
        logger.error('Currency conversion failed', {
          error: conversionError,
          originalAmount: originalTotal,
          originalCurrency,
        }, 'OCRService');
        throw new Error(`Failed to convert ${originalCurrency} to USDC: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
      }
    } else if (originalCurrency === 'USD') {
      // USD to USDC is 1:1 for now
      totalAmount = originalTotal;
      convertedSubtotal = originalSubtotal;
      convertedTax = originalTax;
    }

    // Process items
    const items: BillItem[] = (aiData.items || []).map((item, index) => {
      const itemQuantity = item.quantity || 1;
      let itemPrice = item.total_price || item.unit_price || 0;

      // Convert item price if needed
      if (originalCurrency !== 'USDC' && originalCurrency !== 'USD' && itemPrice > 0) {
        // Calculate conversion rate from total
        const conversionRate = totalAmount / originalTotal;
        itemPrice = itemPrice * conversionRate;
      }

      return {
        id: `${billId}_item_${index}`,
        name: item.description || `Item ${index + 1}`,
        price: roundUsdcAmount(itemPrice),
        quantity: itemQuantity,
        category: this.categorizeItem(item.description || ''),
        total: roundUsdcAmount(itemPrice * itemQuantity),
        participants: [],
      };
    });

    // If no items extracted, create a single item with the total
    if (items.length === 0) {
      items.push({
        id: `${billId}_item_0`,
        name: 'Total Amount',
        price: roundUsdcAmount(totalAmount),
        quantity: 1,
        category: 'Other',
        total: roundUsdcAmount(totalAmount),
        participants: [],
      });
    }

    // Data validation: Check items sum vs total
    const itemsSum = items.reduce((sum, item) => sum + item.total, 0);
    const itemsSumMismatch = Math.abs(itemsSum - totalAmount) > 0.01; // Allow 0.01 USDC tolerance

    // Data validation: Check subtotal + tax vs total
    const subtotalTaxSum = (convertedSubtotal || 0) + (convertedTax || 0);
    const subtotalTaxMismatch = subtotalTaxSum > 0 && Math.abs(subtotalTaxSum - totalAmount) > 0.01;

    // Log validation warnings
    if (itemsSumMismatch) {
      logger.warn('Items sum mismatch detected', {
        itemsSum: roundUsdcAmount(itemsSum),
        totalAmount: roundUsdcAmount(totalAmount),
        difference: roundUsdcAmount(Math.abs(itemsSum - totalAmount)),
      }, 'OCRService');
    }

    if (subtotalTaxMismatch) {
      logger.warn('Subtotal + tax mismatch detected', {
        subtotal: roundUsdcAmount(convertedSubtotal),
        tax: roundUsdcAmount(convertedTax),
        sum: roundUsdcAmount(subtotalTaxSum),
        totalAmount: roundUsdcAmount(totalAmount),
        difference: roundUsdcAmount(Math.abs(subtotalTaxSum - totalAmount)),
      }, 'OCRService');
    }

    // Map OCR category to app category
    const mapOCRCategoryToAppCategory = (ocrCategory?: string): string => {
      if (!ocrCategory) return 'trip'; // Default
      
      const categoryLower = ocrCategory.toLowerCase();
      
      // Map OCR categories to app categories
      if (categoryLower.includes('food') || categoryLower.includes('drink') || categoryLower.includes('restaurant')) {
        return 'food';
      }
      if (categoryLower.includes('travel') || categoryLower.includes('transport')) {
        return 'trip';
      }
      if (categoryLower.includes('event') || categoryLower.includes('entertainment')) {
        return 'event';
      }
      if (categoryLower.includes('housing') || categoryLower.includes('home') || categoryLower.includes('hotel')) {
        return 'home';
      }
      if (categoryLower.includes('on-chain') || categoryLower.includes('crypto') || categoryLower.includes('nft')) {
        return 'rocket';
      }
      
      return 'trip'; // Default fallback
    };

    const appCategory = mapOCRCategoryToAppCategory(aiData.category);

    // Create default participant (creator)
    const participants: BillParticipant[] = [
      {
        id: currentUser?.id || `${billId}_participant_1`,
        name: currentUser?.name || 'You',
        wallet_address: '',
        walletAddress: '',
        status: 'accepted',
        amountOwed: 0, // Will be calculated when split is created
        items: [],
      },
    ];

    // Create default settings (matching manual creation)
    const settings: BillSettings = {
      allowPartialPayments: true,
      requireAllAccept: false,
      autoCalculate: true,
      splitMethod: 'equal',
      currency: 'USDC',
      taxIncluded: true,
    };

    // Build ProcessedBillData (matching manual creation structure)
    const processedData: ProcessedBillData = {
      id: billId,
      title: merchantName,
      merchant: merchantName,
      location: merchantAddress,
      date: transactionDate,
      time: transactionTime,
      totalAmount: roundUsdcAmount(totalAmount),
      subtotal: convertedSubtotal > 0 ? roundUsdcAmount(convertedSubtotal) : undefined,
      tax: convertedTax > 0 ? roundUsdcAmount(convertedTax) : undefined,
      currency: 'USDC', // Always USDC after conversion
      items,
      participants,
      settings,
      // OCR-extracted additional data
      merchantPhone: merchantPhone || undefined,
      receiptNumber: receiptNumber || undefined,
      // Validation warnings
      validationWarnings: (itemsSumMismatch || subtotalTaxMismatch) ? {
        itemsSumMismatch: itemsSumMismatch || undefined,
        subtotalTaxMismatch: subtotalTaxMismatch || undefined,
      } : undefined,
      // OCR metadata
      ocrCategory: appCategory,
    };

    return processedData;
  }

  /**
   * Convert image URI to base64 string
   * 
   * @param {string} imageUri - URI of the image to convert
   * @returns {Promise<string>} Base64 encoded image data (without data URI prefix)
   * 
   * @throws {Error} If image fetch or conversion fails
   * 
   * @private
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      logger.debug('Converting image to base64', { imageUri: imageUri.substring(0, 50) + '...' }, 'OCRService');

      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: HTTP ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onloadend = () => {
          try {
            const base64 = reader.result as string;
            if (!base64) {
              reject(new Error('FileReader returned empty result'));
              return;
            }

            // Extract base64 data (remove data URI prefix if present)
            const base64Data = base64.includes(',') 
              ? base64.split(',')[1] 
              : base64;

            if (!base64Data || base64Data.trim().length === 0) {
              reject(new Error('Failed to extract base64 data from image'));
              return;
            }

            logger.debug('Image converted to base64 successfully', {
              dataLength: base64Data.length
            }, 'OCRService');

            resolve(base64Data);
          } catch (error) {
            reject(error instanceof Error ? error : new Error('Failed to process base64 data'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('FileReader error while converting image'));
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to convert image to base64', { 
        error: errorMessage,
        imageUri: imageUri.substring(0, 50) + '...'
      }, 'OCRService');
      throw new Error(`Image conversion failed: ${errorMessage}`);
    }
  }

  /**
   * Call AI service with retry logic and exponential backoff
   * 
   * @param {string} imageData - Base64 encoded image data
   * @param {string} userId - Optional user ID for rate limiting
   * @returns {Promise<AIResponse>} AI service response
   * 
   * @throws {Error} If all retry attempts fail
   * 
   * @private
   */
  private async callAIServiceWithRetry(
    imageData: string,
    userId?: string
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug('Calling AI service', {
          attempt,
          maxRetries: this.config.maxRetries,
          userId: userId || 'anonymous',
        }, 'OCRService');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          logger.warn('AI service request timeout', { attempt, timeout: this.config.timeout }, 'OCRService');
        }, this.config.timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (userId) {
          headers['x-user-id'] = userId;
        }

        const response = await fetch(this.config.aiServiceUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageData,
            userId: userId || 'anonymous',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If not JSON, use the text as error message
            errorMessage = errorText || errorMessage;
          }

          // Don't retry on client errors (4xx) - these are permanent failures
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Client error: ${errorMessage}`);
          }

          // Retry on server errors (5xx) and other errors
          throw new Error(`Server error: ${errorMessage}`);
        }

        const result = await response.json();

        // Validate response structure
        if (typeof result !== 'object' || result === null) {
          throw new Error('Invalid response format from AI service');
        }

        logger.info('AI service call successful', {
          attempt,
          processingTime: result.processing_time,
          confidence: result.confidence,
          success: result.success,
        }, 'OCRService');

        return {
          success: result.success || false,
          data: result.data,
          error: result.error,
          processing_time: result.processing_time,
          confidence: result.confidence,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        logger.warn('AI service call failed', {
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
          willRetry: attempt < this.config.maxRetries,
        }, 'OCRService');

        // If this was the last attempt, throw the error
        if (attempt === this.config.maxRetries) {
          throw lastError;
        }

        // Exponential backoff: wait longer with each retry
        const backoffDelay = this.config.retryDelay * attempt;
        logger.debug('Waiting before retry', { backoffDelay, nextAttempt: attempt + 1 }, 'OCRService');
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('AI service call failed after all retries');
  }

  /**
   * Generate unique bill ID
   * 
   * Format: bill_{timestamp}_{randomString}
   * 
   * @returns {string} Unique bill identifier
   * 
   * @private
   */
  private generateBillId(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 11); // 9 characters
    return `bill_${timestamp}_${randomString}`;
  }

  /**
   * Categorize item based on description
   * Uses keyword matching as fallback when OCR category is not available
   * 
   * @param {string} itemName - Item description/name
   * @returns {string} Category name
   * 
   * @private
   */
  private categorizeItem(itemName: string): string {
    if (!itemName || typeof itemName !== 'string') {
      return OCR_CONSTANTS.DEFAULT_CATEGORY;
    }

    const name = itemName.toLowerCase().trim();

    // Check each category
    if (ITEM_CATEGORIES.FOOD.some(keyword => name.includes(keyword))) {
      return 'Food';
    }
    if (ITEM_CATEGORIES.BEVERAGES.some(keyword => name.includes(keyword))) {
      return 'Beverages';
    }
    if (ITEM_CATEGORIES.FEES.some(keyword => name.includes(keyword))) {
      return 'Fees';
    }
    if (ITEM_CATEGORIES.TRANSPORT.some(keyword => name.includes(keyword))) {
      return 'Transport';
    }
    if (ITEM_CATEGORIES.ACCOMMODATION.some(keyword => name.includes(keyword))) {
      return 'Accommodation';
    }

    return OCR_CONSTANTS.DEFAULT_CATEGORY;
  }
}

/**
 * Export singleton instance
 * 
 * Use this instance throughout the application for OCR operations.
 * 
 * @example
 * ```typescript
 * import { ocrService } from '@/services/billing';
 * 
 * const result = await ocrService.analyzeReceipt(imageUri, currentUser);
 * ```
 */
export const ocrService = OCRService.getInstance();

/**
 * Export the class for testing or advanced usage
 */
export { OCRService };

