import { Platform } from 'react-native';
import { monitoringService } from '../../services/core';
import { logger } from '../../services/core';
// Centralized API configuration for WeSplit app
// Handles backend URL resolution with multiple fallback options

// Global request throttling
class RequestThrottler {
  private requestQueue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minInterval = 100; // Minimum 100ms between requests

  async throttle<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
      }

      const requestFn = this.requestQueue.shift();
      if (requestFn) {
        this.lastRequestTime = Date.now();
        await requestFn();
      }
    }

    this.isProcessing = false;
  }
}

const requestThrottler = new RequestThrottler();

// Possible backend URLs in order of preference
const POSSIBLE_BACKEND_URLS =
  Platform.OS === 'ios'
    ? [
        'http://localhost:4000',
        'http://127.0.0.1:4000',
        'http://192.0.0.2:4000',
        'http://192.168.1.75:4000',
      ]
    : [
        'http://10.0.2.2:4000',
        'http://localhost:4000',
        'http://127.0.0.1:4000',
        'http://192.0.0.2:4000',
        'http://192.168.1.75:4000',
      ];

let API_BASE_URL = POSSIBLE_BACKEND_URLS[0]; // Start with Android emulator URL

// Create iOS-compatible timeout signal
function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (AbortSignal.timeout) {
    return AbortSignal.timeout(timeoutMs);
  }
  
  // Fallback for iOS devices without AbortSignal.timeout
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

// Helper function to test backend connectivity
async function testBackendConnection(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: createTimeoutSignal(3000),
    });
    return response.ok;
  } catch (error) {
    logger.warn('Backend test failed', { url, error: error instanceof Error ? error.message : 'Unknown error' }, 'api');
    return false;
  }
}

// Initialize and find the best backend URL
export async function initializeBackendURL(): Promise<string> {
  logger.info('Initializing backend URL', null, 'api');
  
  for (const url of POSSIBLE_BACKEND_URLS) {
    logger.debug('Testing backend URL', { url }, 'api');
    const isAvailable = await testBackendConnection(url);
    
    if (isAvailable) {
      API_BASE_URL = url;
      logger.info('Backend found at', { url }, 'api');
      return url;
    }
  }
  
  // If no backend is found, use the first URL as fallback
  console.warn(`⚠️ No backend found, using fallback: ${POSSIBLE_BACKEND_URLS[0]}`);
  API_BASE_URL = POSSIBLE_BACKEND_URLS[0];
  return POSSIBLE_BACKEND_URLS[0];
}

// Get the current backend URL
export function getBackendURL(): string {
  return API_BASE_URL;
}

// Set a specific backend URL (for testing or manual override)
export function setBackendURL(url: string): void {
  API_BASE_URL = url;
  logger.info('Backend URL manually set to', { url }, 'api');
}

// Generic API request handler with automatic retry and error handling
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 3
): Promise<T> {
      return requestThrottler.throttle(async () => {
      const url = `${API_BASE_URL}${endpoint}`;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        const startTime = Date.now();
        
        try {
          logger.debug('API Request attempt', { attempt: attempt + 1, method: options.method || 'GET', endpoint }, 'api');
          
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
            ...options,
            signal: createTimeoutSignal(10000), // 10 second timeout - iOS compatible
          });

        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          
          console.warn(`⚠️ Rate limited (429). Retrying after ${waitTime}ms... (attempt ${attempt + 1}/${retries + 1})`);
          
          // Log 429 error to monitoring
          monitoringService.instance.logRequest(endpoint, 429, Date.now() - startTime, 'Rate limited');
          
          if (attempt === retries) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        logger.info('API Request successful', { endpoint }, 'api');
        
        // Log successful request to monitoring
        monitoringService.instance.logRequest(endpoint, response.status, Date.now() - startTime);
        
        return data;
        
              } catch (error) {
          console.error(`❌ API Request failed (attempt ${attempt + 1}): ${endpoint}`, error);
          
          // Log failed request to monitoring
          monitoringService.instance.logRequest(endpoint, 0, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
          
          if (attempt === retries) {
            // Last attempt failed, throw the error
            throw error;
          }
        
        // If it's a network error and we haven't tried all backend URLs yet, try to find a working one
        if (error instanceof Error && error.message.includes('Network request failed')) {
          logger.warn('Network error detected, trying to find working backend', null, 'api');
          try {
            await initializeBackendURL();
            // Continue to next attempt with new URL
          } catch (initError) {
            console.error('Failed to initialize backend URL:', initError);
          }
        }
        
        // Wait before retrying (exponential backoff with jitter)
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
        const waitTime = baseDelay + jitter;
        
        logger.debug('Waiting before retry', { waitTime }, 'api');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw new Error('All API request attempts failed');
  });
}

// Export the possible URLs for debugging
export { POSSIBLE_BACKEND_URLS }; 