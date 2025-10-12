/**
 * Consolidated Bill Analysis Service
 * Combines all bill analysis functionality into a single, comprehensive service
 * Handles AI analysis, OCR processing, and manual bill input
 */

import { 
  BillAnalysisData, 
  BillAnalysisResult,
  ExtendedBillItem, 
  BillParticipant,
  BillSplitSettings 
} from '../types/billAnalysis';
import { OCRProcessingResult, BillItem } from '../types/billSplitting';
import { logger } from './loggingService';
import { calculateEqualSplit } from '../utils/currencyUtils';
import { MockupDataService } from '../data/mockupData';

// Configuration interfaces
export interface OCRServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface AIAnalysisRequest {
  imageUri: string;
  imageData?: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  data?: any;
  error?: string;
  processing_time?: number;
  confidence?: number;
}

export interface ManualBillInput {
  category: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  location?: string;
  description?: string;
}

export interface IncomingBillData {
  category: string;
  country: string;
  currency: string;
  store: {
    name: string;
    location: {
      address: string;
      city: string;
      state: string;
      zip_code: string;
      phone: string;
    };
    store_id: string;
  };
  transaction: {
    date: string;
    time: string;
    order_id: string;
    employee: string;
    items: Array<{ name: string; price: number }>;
    sub_total: number;
    sales_tax: number;
    order_total: number;
    calculated_total: number;
  };
}

export interface ProcessedBillData {
  id: string;
  title: string;
  merchant: string;
  location: string;
  date: string;
  time: string;
  totalAmount: number;
  currency: string;
  items: ExtendedBillItem[];
  participants: BillParticipant[];
  settings: BillSplitSettings;
  rawText?: string;
  confidence?: number;
  processingTime?: number;
}

class ConsolidatedBillAnalysisService {
  private static instance: ConsolidatedBillAnalysisService;
  private ocrConfig: OCRServiceConfig;
  private aiServiceUrl: string;

  private constructor() {
    this.ocrConfig = {
      baseUrl: process.env.EXPO_PUBLIC_OCR_SERVICE_URL || 'http://localhost:8000',
      apiKey: process.env.EXPO_PUBLIC_OCR_API_KEY,
      timeout: 30000
    };
    this.aiServiceUrl = process.env.EXPO_PUBLIC_AI_SERVICE_URL || 'https://us-central1-wesplit-35186.cloudfunctions.net/aiService';
  }

  public static getInstance(): ConsolidatedBillAnalysisService {
    if (!ConsolidatedBillAnalysisService.instance) {
      ConsolidatedBillAnalysisService.instance = new ConsolidatedBillAnalysisService();
    }
    return ConsolidatedBillAnalysisService.instance;
  }

  /**
   * MAIN ENTRY POINT: Analyze bill from image (AI/OCR)
   */
  async analyzeBillFromImage(
    imageUri: string, 
    userId?: string,
    useMockData: boolean = false
  ): Promise<BillAnalysisResult> {
    try {
      logger.info('Starting bill analysis from image', { imageUri, userId, useMockData }, 'BillAnalysis');

      if (useMockData) {
        return await this.analyzeBillWithMockData(imageUri);
      }

      // Try AI service first, fallback to OCR
      try {
        return await this.analyzeBillWithAI(imageUri, userId);
      } catch (aiError) {
        logger.warn('AI analysis failed, falling back to OCR', { error: aiError }, 'BillAnalysis');
        return await this.analyzeBillWithOCR(imageUri);
      }
    } catch (error) {
      logger.error('Bill analysis failed', error, 'BillAnalysis');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bill analysis failed',
        processingTime: 0,
        confidence: 0
      };
    }
  }

  /**
   * Process manual bill input
   */
  async processManualBill(
    manualInput: ManualBillInput,
    currentUser?: { id: string; name: string; wallet_address: string }
  ): Promise<ProcessedBillData> {
    try {
      logger.info('Processing manual bill input', { manualInput }, 'BillAnalysis');

      const billData: BillAnalysisData = {
        category: manualInput.category,
        country: 'USA', // Default country for manual entries
        store: {
          name: manualInput.name,
          location: {
            address: manualInput.location || '',
            city: '',
            state: '',
            zip_code: '',
            phone: ''
          },
          store_id: ''
        },
        transaction: {
          date: manualInput.date.toISOString().split('T')[0],
          time: manualInput.date.toTimeString().split(' ')[0],
          order_id: this.generateBillId(),
          employee: '',
          items: [{ name: manualInput.description || 'Manual Entry', price: manualInput.amount }],
          sub_total: manualInput.amount,
          sales_tax: 0,
          order_total: manualInput.amount,
          calculated_total: manualInput.amount
        },
        currency: manualInput.currency
      };

      return this.processBillData(billData, currentUser);
    } catch (error) {
      logger.error('Manual bill processing failed', error, 'BillAnalysis');
      throw error;
    }
  }

  /**
   * Process incoming AI/OCR data
   */
  async processIncomingBillData(
    incomingData: IncomingBillData,
    currentUser?: { id: string; name: string; wallet_address: string }
  ): Promise<ProcessedBillData> {
    try {
      logger.info('Processing incoming bill data', { incomingData }, 'BillAnalysis');

      const billData: BillAnalysisData = {
        category: incomingData.category,
        country: incomingData.country,
        store: incomingData.store,
        transaction: incomingData.transaction,
        currency: incomingData.currency
      };

      return this.processBillData(billData, currentUser);
    } catch (error) {
      logger.error('Incoming bill data processing failed', error, 'BillAnalysis');
      throw error;
    }
  }

  /**
   * AI-based bill analysis
   */
  private async analyzeBillWithAI(imageUri: string, userId?: string): Promise<BillAnalysisResult> {
    try {
      logger.info('Starting AI bill analysis', { imageUri, userId }, 'BillAnalysis');

      // Check if AI service is available
      const isHealthy = await this.checkAIServiceHealth();
      if (!isHealthy) {
        throw new Error('AI service is not available');
      }

      // Convert image to base64
      const imageData = await this.convertImageToBase64(imageUri);

      // Call AI service with retry logic
      const aiResponse = await this.callAIServiceWithRetry(imageData, userId);

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI analysis failed');
      }

      // Convert AI response to bill data
      const billData = this.convertAIResponseToBillData(aiResponse.data);

      logger.info('AI analysis completed successfully', { 
        processingTime: aiResponse.processing_time,
        confidence: aiResponse.confidence 
      }, 'BillAnalysis');

      return {
        success: true,
        data: billData,
        processingTime: aiResponse.processing_time || 0,
        confidence: aiResponse.confidence || 0.95,
        rawText: this.generateRawText(billData)
      };
    } catch (error) {
      logger.error('AI analysis failed', error, 'BillAnalysis');
      throw error;
    }
  }

  /**
   * OCR-based bill analysis
   */
  private async analyzeBillWithOCR(imageUri: string): Promise<BillAnalysisResult> {
    try {
      logger.info('Starting OCR bill analysis', { imageUri }, 'BillAnalysis');

      const startTime = Date.now();

      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);

      // Call OCR service
      const response = await this.callOCRService(base64Image);

      const processingTime = (Date.now() - startTime) / 1000;

      if (response.success) {
        const billData = this.convertOCRResponseToBillData(response);

        logger.info('OCR analysis completed successfully', { 
          processingTime,
          itemCount: response.extractedItems.length,
          totalAmount: response.totalAmount
        }, 'BillAnalysis');

        return {
          success: true,
          data: billData,
          processingTime,
          confidence: response.confidence,
          rawText: response.rawText
        };
      } else {
        throw new Error(response.error || 'OCR processing failed');
      }
    } catch (error) {
      logger.error('OCR analysis failed', error, 'BillAnalysis');
      throw error;
    }
  }

  /**
   * Mock data analysis (for development/testing)
   */
  private async analyzeBillWithMockData(imageUri: string): Promise<BillAnalysisResult> {
    try {
      logger.info('Using mock data for bill analysis', { imageUri }, 'BillAnalysis');

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Use unified mockup data
      const mockupData = MockupDataService.getPrimaryBillData();

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

      const billData = this.convertIncomingDataToBillData(incomingData);

      return {
        success: true,
        data: billData,
        processingTime: 2.0,
        confidence: 0.95,
        rawText: this.generateRawText(billData)
      };
    } catch (error) {
      logger.error('Mock data analysis failed', error, 'BillAnalysis');
      throw error;
    }
  }

  /**
   * Process bill data into frontend-ready format
   */
  private processBillData(
    analysisData: BillAnalysisData, 
    currentUser?: { id: string; name: string; wallet_address: string }
  ): ProcessedBillData {
    const billId = this.generateBillId();

    // Convert items to extended format
    const extendedItems: ExtendedBillItem[] = analysisData.transaction.items.map((item, index) => ({
      id: `${billId}_item_${index}`,
      name: item.name,
      price: item.price,
      quantity: 1,
      category: this.categorizeItem(item.name),
      participants: [],
      isSelected: true,
    }));

    // Create default participants
    const defaultParticipants: BillParticipant[] = [
      {
        id: currentUser ? currentUser.id : `${billId}_participant_1`,
        name: currentUser ? currentUser.name : 'You',
        walletAddress: currentUser ? currentUser.wallet_address : 'Your wallet address',
        status: 'accepted',
        amountOwed: 0,
        items: [],
      }
    ];

    // Default settings
    const defaultSettings: BillSplitSettings = {
      allowPartialPayments: true,
      requireAllAccept: false,
      autoCalculate: true,
      splitMethod: 'equal',
      taxIncluded: true
    };

    return {
      id: billId,
      title: `${analysisData.store.name} - ${analysisData.transaction.date}`,
      merchant: analysisData.store.name,
      location: analysisData.store.location.address,
      date: analysisData.transaction.date,
      time: analysisData.transaction.time,
      totalAmount: analysisData.transaction.order_total,
      currency: analysisData.currency,
      items: extendedItems,
      participants: defaultParticipants,
      settings: defaultSettings
    };
  }

  /**
   * Convert AI response to bill data format
   */
  private convertAIResponseToBillData(aiData: any): BillAnalysisData {
    // Implementation depends on AI service response format
    // This is a placeholder - adjust based on actual AI response structure
    return {
      category: aiData.category || "Food & Drinks",
      country: aiData.country || "USA",
      store: {
        name: aiData.store?.name || "Unknown Store",
        location: {
          address: aiData.store?.location?.address || "",
          city: aiData.store?.location?.city || "",
          state: aiData.store?.location?.state || "",
          zip_code: aiData.store?.location?.zip_code || "",
          phone: aiData.store?.location?.phone || ""
        },
        store_id: aiData.store?.store_id || ""
      },
      transaction: {
        date: aiData.transaction?.date || new Date().toISOString().split('T')[0],
        time: aiData.transaction?.time || new Date().toTimeString().split(' ')[0],
        order_id: aiData.transaction?.order_id || this.generateBillId(),
        employee: aiData.transaction?.employee || "",
        items: aiData.transaction?.items || [],
        sub_total: aiData.transaction?.sub_total || 0,
        sales_tax: aiData.transaction?.sales_tax || 0,
        order_total: aiData.transaction?.order_total || 0,
        calculated_total: aiData.transaction?.calculated_total || 0
      },
      currency: aiData.currency || "USD"
    };
  }

  /**
   * Convert OCR response to bill data format
   */
  private convertOCRResponseToBillData(ocrResponse: OCRProcessingResult): BillAnalysisData {
    return {
      category: "Food & Drinks", // Default category for OCR
      country: "USA", // Default country for OCR
      store: {
        name: "Extracted Store", // Would need to extract from OCR text
        location: {
          address: "",
          city: "",
          state: "",
          zip_code: "",
          phone: ""
        },
        store_id: ""
      },
      transaction: {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        order_id: this.generateBillId(),
        employee: "",
        items: ocrResponse.extractedItems.map(item => ({
          name: item.name,
          price: item.price
        })),
        sub_total: ocrResponse.totalAmount,
        sales_tax: 0,
        order_total: ocrResponse.totalAmount,
        calculated_total: ocrResponse.totalAmount
      },
      currency: "USD"
    };
  }

  /**
   * Convert incoming data to bill data format
   */
  private convertIncomingDataToBillData(incomingData: IncomingBillData): BillAnalysisData {
    return {
      category: incomingData.category,
      country: incomingData.country,
      store: incomingData.store,
      transaction: incomingData.transaction,
      currency: incomingData.currency
    };
  }

  /**
   * Generate raw text from bill data
   */
  private generateRawText(billData: BillAnalysisData): string {
    const items = billData.transaction.items.map(item => `${item.name}: $${item.price}`).join('\n');
    return `${billData.store.name}\n${billData.transaction.date} ${billData.transaction.time}\n\n${items}\n\nTotal: $${billData.transaction.order_total}`;
  }

  /**
   * Categorize item based on name
   */
  private categorizeItem(itemName: string, fallbackCategory?: string): string {
    const name = itemName.toLowerCase();
    
    if (name.includes('drink') || name.includes('beverage') || name.includes('coffee') || name.includes('tea')) {
      return 'Beverages';
    } else if (name.includes('appetizer') || name.includes('starter')) {
      return 'Appetizers';
    } else if (name.includes('dessert') || name.includes('sweet')) {
      return 'Desserts';
    } else if (name.includes('main') || name.includes('entree')) {
      return 'Main Course';
    } else if (name.includes('salad')) {
      return 'Salads';
    } else if (name.includes('soup')) {
      return 'Soups';
    }
    
    return fallbackCategory || 'Food';
  }

  /**
   * Generate unique bill ID
   */
  private generateBillId(): string {
    return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert image to base64
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // Implementation depends on your image handling library
      // This is a placeholder - implement based on your needs
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      logger.error('Failed to convert image to base64', error, 'BillAnalysis');
      throw new Error('Failed to convert image to base64');
    }
  }

  /**
   * Check AI service health
   */
  private async checkAIServiceHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      logger.warn('AI service health check failed', error, 'BillAnalysis');
      return false;
    }
  }

  /**
   * Call AI service with retry logic
   */
  private async callAIServiceWithRetry(imageData: string, userId?: string, maxRetries: number = 3): Promise<AIAnalysisResponse> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.ocrConfig.timeout);
        
        const response = await fetch(`${this.aiServiceUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_data: imageData,
            user_id: userId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`AI service responded with status: ${response.status}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        logger.warn(`AI service call attempt ${attempt} failed`, { error, attempt }, 'BillAnalysis');
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('AI service call failed after all retries');
  }

  /**
   * Call OCR service
   */
  private async callOCRService(base64Image: string): Promise<OCRProcessingResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.ocrConfig.timeout);
      
      const response = await fetch(`${this.ocrConfig.baseUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.ocrConfig.apiKey && { 'Authorization': `Bearer ${this.ocrConfig.apiKey}` })
        },
        body: JSON.stringify({
          image: base64Image
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OCR service responded with status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('OCR service call failed', error, 'BillAnalysis');
      throw error;
    }
  }

  /**
   * Validate incoming bill data
   */
  validateIncomingData(data: IncomingBillData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.store?.name) {
      errors.push('Store name is required');
    }

    if (!data.transaction?.items || data.transaction.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (!data.transaction?.order_total || data.transaction.order_total <= 0) {
      errors.push('Valid order total is required');
    }

    if (!data.currency) {
      errors.push('Currency is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert processed bill data to split data format
   */
  convertToSplitData(
    processedData: ProcessedBillData,
    splitType: 'fair' | 'degen',
    userId: string
  ): any {
    return {
      billId: processedData.id,
      title: processedData.title,
      merchant: processedData.merchant,
      location: processedData.location,
      date: processedData.date,
      time: processedData.time,
      totalAmount: processedData.totalAmount,
      currency: processedData.currency,
      items: processedData.items,
      participants: processedData.participants,
      settings: processedData.settings,
      splitType,
      creatorId: userId,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Add participant to processed bill data
   */
  addParticipant(processedData: ProcessedBillData, participant: { name: string; walletAddress: string; status: string }): ProcessedBillData {
    const newParticipant: BillParticipant = {
      id: `${processedData.id}_participant_${processedData.participants.length + 1}`,
      name: participant.name,
      walletAddress: participant.walletAddress,
      status: participant.status as any,
      amountOwed: 0,
      items: []
    };

    return {
      ...processedData,
      participants: [...processedData.participants, newParticipant]
    };
  }

  /**
   * Get fallback data for testing
   */
  getFallbackData(): ProcessedBillData {
    const mockupData = MockupDataService.getPrimaryBillData();
    
    return {
      id: this.generateBillId(),
      title: `${mockupData.merchant} - ${mockupData.date}`,
      merchant: mockupData.merchant,
      location: mockupData.location,
      date: mockupData.date,
      time: mockupData.time,
      totalAmount: mockupData.totalAmount,
      currency: 'USD',
      items: mockupData.items.map((item, index) => ({
        id: `item_${index}`,
        name: item.name,
        price: item.price,
        quantity: 1,
        category: this.categorizeItem(item.name),
        participants: [],
        isSelected: true
      })),
      participants: [{
        id: 'participant_1',
        name: 'You',
        walletAddress: 'Your wallet address',
        status: 'accepted',
        amountOwed: 0,
        items: []
      }],
      settings: {
        allowPartialPayments: true,
        requireAllAccept: false,
        autoCalculate: true,
        splitMethod: 'equal',
        taxIncluded: true
      }
    };
  }
}

// Export singleton instance
export const consolidatedBillAnalysisService = ConsolidatedBillAnalysisService.getInstance();
export default consolidatedBillAnalysisService;
