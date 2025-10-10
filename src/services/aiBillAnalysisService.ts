/**
 * AI Bill Analysis Service
 * Wrapper service to integrate with the Python AI agent for real bill analysis
 * Replaces MockBillAnalysisService with actual OCR processing
 */

import { BillAnalysisData, BillAnalysisResult } from '../types/billAnalysis';

export interface AIAnalysisRequest {
  imageUri: string;
  imageData?: string; // Base64 encoded image data
}

export interface AIAnalysisResponse {
  success: boolean;
  data?: {
    is_receipt: boolean;
    category: string;
    merchant: {
      name: string;
      address?: string;
      phone?: string;
    };
    transaction: {
      date: string;
      time: string;
      currency: string;
      country?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    totals: {
      subtotal: number;
      tax: number;
      total: number;
      total_matches: boolean;
    };
  };
  error?: string;
  processing_time?: number;
  confidence?: number;
  usage?: any;
  raw_response?: string;
}

export class AIBillAnalysisService {
  // Configuration - Always use Firebase Functions (both dev and production)
  private static readonly BASE_URL = 'https://us-central1-wesplit-35186.cloudfunctions.net';
  private static readonly API_ENDPOINT = `${this.BASE_URL}/analyzeBill`;
  private static readonly TEST_ENDPOINT = `${this.BASE_URL}/testAI`;
  private static readonly HEALTH_ENDPOINT = `${this.BASE_URL}/aiHealthCheck`;
  
  // Timeout settings - updated for the new model
  private static readonly REQUEST_TIMEOUT = 45000; // 45 seconds for faster model
  private static readonly MAX_RETRIES = 1; // Server has retry logic, minimal client retries
  
  /**
   * Analyze bill image using AI agent
   */
  static async analyzeBillImage(imageUri: string, userId?: string): Promise<BillAnalysisResult> {
    console.log('🤖 AIBillAnalysisService: Starting AI analysis for:', imageUri);
    
    try {
      // Check if AI service is available
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new Error('AI service is not available');
      }
      
      // Convert image to base64 for transmission
      const imageData = await this.convertImageToBase64(imageUri);
      
      // Call AI service with base64 data (with retry logic)
      const aiResponse = await this.callAIServiceWithRetry(imageData, userId);
      
      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI analysis failed');
      }
      
      // Convert AI response to WeSplit format
      const billData = this.convertAIResponseToBillData(aiResponse.data);
      
      console.log('✅ AIBillAnalysisService: Analysis completed successfully');
      
      return {
        success: true,
        data: billData,
        processingTime: aiResponse.processing_time || 0,
        confidence: aiResponse.confidence || 0.95,
        rawText: this.generateRawText(billData)
      };
      
    } catch (error) {
      console.error('❌ AIBillAnalysisService: Analysis failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: 0,
        confidence: 0
      };
    }
  }
  
  /**
   * Test AI service with sample image
   */
  static async testAIService(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🧪 AIBillAnalysisService: Testing AI service...');
      
      const response = await fetch(this.TEST_ENDPOINT, {
        method: 'GET',
        timeout: this.REQUEST_TIMEOUT
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ AIBillAnalysisService: Test successful');
        return { success: true, data: result };
      } else {
        console.error('❌ AIBillAnalysisService: Test failed:', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      console.error('❌ AIBillAnalysisService: Test error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      };
    }
  }
  
  /**
   * Check if AI service is healthy
   */
  private static async checkHealth(): Promise<boolean> {
    try {
      console.log(`🔍 AIBillAnalysisService: Checking health at ${this.HEALTH_ENDPOINT}`);
      
      const response = await fetch(this.HEALTH_ENDPOINT, {
        method: 'GET',
        timeout: 5000 // 5 second timeout for health check
      });
      
      if (!response.ok) {
        console.warn(`⚠️ AIBillAnalysisService: Health check failed with status ${response.status}`);
        return false;
      }
      
      const health = await response.json();
      console.log('✅ AIBillAnalysisService: Health check response:', health);
      return health.status === 'healthy' && health.ai_agent_ready === true;
      
    } catch (error) {
      console.warn('⚠️ AIBillAnalysisService: Health check failed:', error);
      console.warn(`   - Endpoint: ${this.HEALTH_ENDPOINT}`);
      console.warn(`   - Error type: ${error.constructor.name}`);
      console.warn(`   - Error message: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Call AI service with retry logic
   */
  private static async callAIServiceWithRetry(imageData: string, userId?: string): Promise<AIAnalysisResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 AI service attempt ${attempt}/${this.MAX_RETRIES}`);
        const response = await this.callAIService(imageData, userId);
        
        if (response.success) {
          console.log(`✅ AI service succeeded on attempt ${attempt}`);
          return response;
        } else {
          lastError = new Error(response.error || 'AI service returned error');
          console.warn(`⚠️ AI service attempt ${attempt} failed:`, response.error);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ AI service attempt ${attempt} failed:`, lastError.message);
        
        // Wait before retry (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('AI service failed after all retries');
  }

  /**
   * Call AI service with image data
   */
  private static async callAIService(imageData: string, userId?: string): Promise<AIAnalysisResponse> {
    const requestBody = {
      imageData: imageData
    };
    
    // Prepare headers with user ID for rate limiting
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add user ID header if available for rate limiting
    if (userId) {
      headers['x-user-id'] = userId;
    }
    
    console.log('📤 Sending request to AI service:', {
      endpoint: this.API_ENDPOINT,
      dataSize: imageData.length,
      dataType: imageData.startsWith('data:') ? 'base64' : 'unknown',
      hasUserId: !!userId
    });
    
    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      timeout: this.REQUEST_TIMEOUT
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI service error response:', errorText);
      
      // Try to parse the error response
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      // Handle specific error types based on our backend implementation
      if (response.status === 429 || errorData.errorType === 'rate_limit') {
        const retryAfter = errorData.retryAfter || 60;
        throw new Error(`AI service is currently busy. Please try again in ${retryAfter} seconds.`);
      } else if (response.status === 503) {
        throw new Error('AI service temporarily unavailable. Please try again.');
      } else if (response.status === 400) {
        throw new Error('Invalid image format. Please try a different image.');
      } else {
        throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
      }
    }
    
    return await response.json();
  }
  
  /**
   * Convert image URI to base64
   */
  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('🖼️ Converting image to base64:', imageUri);
      
      // For React Native file URIs, convert to base64
      if (imageUri.startsWith('file://')) {
        console.log('📁 Processing React Native file URI...');
        return await this.convertImageFileToBase64(imageUri);
      } else if (imageUri.startsWith('data:')) {
        // Already base64 encoded
        return imageUri;
      } else {
        // Remote URL - fetch and convert
        const response = await fetch(imageUri);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        return `data:image/jpeg;base64,${base64}`;
      }
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  }
  
  /**
   * Convert image file to base64 using React Native compatible method
   */
  private static async convertImageFileToBase64(imageUri: string): Promise<string> {
    try {
      console.log('📁 Converting file to base64:', imageUri);
      
      // Fetch the image as ArrayBuffer (React Native compatible)
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('📊 Image loaded, size:', arrayBuffer.byteLength, 'bytes');
      
      // Optimize image size if too large (>2MB)
      let optimizedBuffer = arrayBuffer;
      if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
        console.log('🔄 Image too large, optimizing...');
        optimizedBuffer = await this.optimizeImageBuffer(arrayBuffer);
        console.log('📊 Optimized image size:', optimizedBuffer.byteLength, 'bytes');
      }
      
      // Convert to base64 using our custom function
      const base64 = this.arrayBufferToBase64(optimizedBuffer);
      const dataUri = `data:image/jpeg;base64,${base64}`;
      
      console.log('✅ Base64 conversion complete, data URI length:', dataUri.length);
      return dataUri;
      
    } catch (error) {
      console.error('❌ Error converting file to base64:', error);
      throw new Error(`Failed to convert image file: ${error.message}`);
    }
  }
  
  /**
   * Optimize image buffer to reduce size (React Native compatible)
   */
  private static async optimizeImageBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      // For React Native, we'll use a simple approach:
      // Take every 2nd byte to reduce size by ~50%
      // This is a basic optimization - in production you'd use a proper image library
      
      const originalBytes = new Uint8Array(buffer);
      const optimizedBytes = new Uint8Array(Math.floor(originalBytes.length / 2));
      
      for (let i = 0; i < optimizedBytes.length; i++) {
        optimizedBytes[i] = originalBytes[i * 2];
      }
      
      console.log('🔄 Image optimized: reduced from', buffer.byteLength, 'to', optimizedBytes.length, 'bytes');
      return optimizedBytes.buffer;
      
    } catch (error) {
      console.warn('⚠️ Image optimization failed, using original:', error);
      return buffer; // Return original if optimization fails
    }
  }
  
  /**
   * Convert ArrayBuffer to base64 (fallback method)
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    // Simple base64 encoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < binary.length) {
      const a = binary.charCodeAt(i++);
      const b = i < binary.length ? binary.charCodeAt(i++) : 0;
      const c = i < binary.length ? binary.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }
  
  /**
   * Convert AI response to WeSplit BillAnalysisData format
   */
  private static convertAIResponseToBillData(aiData: any): BillAnalysisData {
    if (!aiData) {
      throw new Error('No data received from AI service');
    }
    
    console.log('🔄 Converting AI response to WeSplit format:', {
      hasMerchant: !!aiData.merchant,
      hasTransaction: !!aiData.transaction,
      hasItems: !!aiData.items,
      hasTotals: !!aiData.totals,
      itemsCount: aiData.items?.length || 0
    });
    
    // Extract items with proper fallbacks
    const items = (aiData.items || []).map((item: any, index: number) => ({
      name: item.description || `Item ${index + 1}`,
      price: item.total_price || item.unit_price || 0
    }));
    
    // Calculate totals with fallbacks
    const subtotal = aiData.totals?.subtotal || 
                    (items.length > 0 ? items.reduce((sum: number, item: any) => sum + item.price, 0) : 0);
    const tax = aiData.totals?.tax || 0;
    const total = aiData.totals?.total || (subtotal + tax);
    
    const billData: BillAnalysisData = {
      category: aiData.category || 'Food & Drinks',
      country: aiData.transaction?.country || 'USA',
      currency: aiData.transaction?.currency || 'USD',
      store: {
        name: aiData.merchant?.name || 'Unknown Store',
        location: {
          address: aiData.merchant?.address || '',
          city: this.extractCity(aiData.merchant?.address),
          state: this.extractState(aiData.merchant?.address),
          zip_code: this.extractZipCode(aiData.merchant?.address),
          phone: aiData.merchant?.phone || ''
        },
        store_id: aiData.transaction?.receipt_number || ''
      },
      transaction: {
        date: aiData.transaction?.date || new Date().toISOString().split('T')[0],
        time: aiData.transaction?.time || new Date().toLocaleTimeString(),
        order_id: aiData.transaction?.receipt_number || '',
        employee: '',
        items: items,
        sub_total: subtotal,
        sales_tax: tax,
        order_total: total,
        calculated_total: total
      }
    };
    
    console.log('✅ Converted bill data:', {
      store: billData.store.name,
      itemsCount: billData.transaction.items.length,
      total: billData.transaction.order_total
    });
    
    return billData;
  }
  
  /**
   * Generate raw text representation for compatibility
   */
  private static generateRawText(billData: BillAnalysisData): string {
    const lines = [
      billData.store.name,
      billData.store.location.address,
      `${billData.store.location.city}, ${billData.store.location.state} ${billData.store.location.zip_code}`,
      billData.store.location.phone,
      '',
      `Date: ${billData.transaction.date}`,
      `Time: ${billData.transaction.time}`,
      '',
      ...billData.transaction.items.map(item => `${item.name} $${item.price.toFixed(2)}`),
      '',
      `Subtotal: $${billData.transaction.sub_total.toFixed(2)}`,
      `Tax: $${billData.transaction.sales_tax.toFixed(2)}`,
      `Total: $${billData.transaction.order_total.toFixed(2)}`
    ];
    
    return lines.join('\n');
  }
  
  /**
   * Extract city from address string
   */
  private static extractCity(address: string): string {
    if (!address) return '';
    // Simple extraction - could be enhanced
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 2].trim() : '';
  }
  
  /**
   * Extract state from address string
   */
  private static extractState(address: string): string {
    if (!address) return '';
    // Simple extraction - could be enhanced
    const parts = address.split(',');
    if (parts.length > 1) {
      const stateZip = parts[parts.length - 1].trim();
      const stateMatch = stateZip.match(/^([A-Z]{2})/);
      return stateMatch ? stateMatch[1] : '';
    }
    return '';
  }
  
  /**
   * Extract zip code from address string
   */
  private static extractZipCode(address: string): string {
    if (!address) return '';
    // Simple extraction - could be enhanced
    const zipMatch = address.match(/\b\d{5}(-\d{4})?\b/);
    return zipMatch ? zipMatch[0] : '';
  }
  
  /**
   * Get service status
   */
  static async getServiceStatus(): Promise<{
    isAvailable: boolean;
    isHealthy: boolean;
    error?: string;
  }> {
    try {
      const isHealthy = await this.checkHealth();
      return {
        isAvailable: true,
        isHealthy: isHealthy,
        error: isHealthy ? undefined : 'Service is not healthy'
      };
    } catch (error) {
      return {
        isAvailable: false,
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Service unavailable'
      };
    }
  }
}

export default AIBillAnalysisService;
