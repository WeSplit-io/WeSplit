/**
 * Secure email authentication service using JWT tokens.
 * Integrates with backend secure authentication endpoints.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Try multiple possible backend URLs (Android emulator first for fastest connection)
const POSSIBLE_BACKEND_URLS = [
  'http://10.0.2.2:4000', // Android emulator - most likely to work
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://192.168.1.133:4000',
];

let API_BASE_URL = POSSIBLE_BACKEND_URLS[0]; // Start with localhost

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    walletAddress: string;
    walletPublicKey: string;
    avatar?: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface VerificationResponse {
  message: string;
  email: string;
  code?: string; // Only in development
  skipVerification: boolean; // Whether verification was skipped
  user?: {
    id: number;
    email: string;
    name: string;
    walletAddress: string;
    walletPublicKey: string;
    avatar?: string;
    createdAt: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

// Helper function to try different backend URLs
async function tryBackendUrls(endpoint: string, options: RequestInit): Promise<Response> {
  if (__DEV__) { console.log('Trying different backend URLs...'); }
  
  for (const baseUrl of POSSIBLE_BACKEND_URLS) {
    try {
      if (__DEV__) { console.log(`Trying: ${baseUrl}${endpoint}`); }
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        // Add shorter timeout to prevent hanging (3 seconds per URL)
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      });
      
      if (__DEV__) { console.log(`${baseUrl} responded with status: ${response.status}`); }
      
      // If successful, update the API_BASE_URL for future requests
      if (response.ok) {
        API_BASE_URL = baseUrl;
        if (__DEV__) { console.log(`Successfully connected to: ${baseUrl}`); }
        return response;
      }
      
      // If server responded but with error, still consider it a working URL
      if (response.status >= 400 && response.status < 500) {
        API_BASE_URL = baseUrl;
        console.log(`Server reachable at: ${baseUrl} (error response but server is up)`);
        return response;
      }
      
    } catch (error) {
      console.log(`Failed to connect to ${baseUrl}:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }
  
  throw new Error(`Cannot connect to backend. Tried all URLs: ${POSSIBLE_BACKEND_URLS.join(', ')}`);
}

export async function sendVerificationCode(email: string): Promise<{ success: boolean }> {
  if (__DEV__) { console.log('=== sendVerificationCode called ==='); }
  if (__DEV__) { console.log('Email:', email); }
  
  try {
    if (__DEV__) { console.log('Making fetch request...'); }
    const response = await tryBackendUrls('/api/auth/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.log('Error data:', errorData);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to send verification code`);
    }

    const data = await response.json();
    if (__DEV__) { console.log('Response data:', data); }
    return data;
  } catch (error) {
    console.error('=== Error in sendVerificationCode ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Full error:', error);
    throw error;
  }
}

export async function verifyCode(email: string, code: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify code');
    }

    const data = await response.json();
    
    // Store tokens securely
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Error verifying code:', error);
    throw error;
  }
}

export async function refreshAccessToken(): Promise<string> {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to refresh token');
    }

    const data = await response.json();
    
    // Store new access token
    await AsyncStorage.setItem('accessToken', data.accessToken);
    
    return data.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (refreshToken) {
      // Call backend logout endpoint
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (error) {
    console.error('Error logging out:', error);
  } finally {
    // Clear stored tokens and user data
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  }
}

export async function getStoredUser(): Promise<any | null> {
  try {
    const userString = await AsyncStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    return !!(accessToken && refreshToken);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// Helper function to make authenticated API calls
export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  let accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();
      
      // Retry the request with new token
      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      // Refresh failed, user needs to login again
      await logout();
      throw new Error('Authentication expired, please login again');
    }
  }

  return response;
} 