import { Platform } from 'react-native';
// Centralized API configuration for WeSplit app
// Handles backend URL resolution with multiple fallback options

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

// Helper function to test backend connectivity
async function testBackendConnection(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    });
    return response.ok;
  } catch (error) {
    console.log(`Backend test failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Initialize and find the best backend URL
export async function initializeBackendURL(): Promise<string> {
  console.log('🔍 Initializing backend URL...');
  
  for (const url of POSSIBLE_BACKEND_URLS) {
    console.log(`Testing backend URL: ${url}`);
    const isAvailable = await testBackendConnection(url);
    
    if (isAvailable) {
      API_BASE_URL = url;
      console.log(`✅ Backend found at: ${url}`);
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
  console.log(`🔧 Backend URL manually set to: ${url}`);
}

// Generic API request handler with automatic retry and error handling
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 2
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 API Request (attempt ${attempt + 1}): ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
        signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined, // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Request successful: ${endpoint}`);
      return data;
      
    } catch (error) {
      console.error(`❌ API Request failed (attempt ${attempt + 1}): ${endpoint}`, error);
      
      if (attempt === retries) {
        // Last attempt failed, throw the error
        throw error;
      }
      
      // If it's a network error and we haven't tried all backend URLs yet, try to find a working one
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.log('🔄 Network error detected, trying to find working backend...');
        try {
          await initializeBackendURL();
          // Continue to next attempt with new URL
        } catch (initError) {
          console.error('Failed to initialize backend URL:', initError);
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('All API request attempts failed');
}

// Export the possible URLs for debugging
export { POSSIBLE_BACKEND_URLS }; 