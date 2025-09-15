import { Linking, Platform } from 'react-native';

// Solana configuration
const SOLANA_CONFIG = {
  APP_URL: 'https://wesplit.app',
  REDIRECT_LINK: 'wesplit://wallet/connect',
  APP_NAME: 'WeSplit',
  NETWORK: 'mainnet-beta'
};

// Phantom configuration
const PHANTOM_CONFIG = {
  SCHEMES: [
    'phantom://',
    'app.phantom://',
    'phantom://browse',
    'app.phantom://browse',
    'phantom://connect',
    'phantom://v1/connect',
    'app.phantom://v1/connect'
  ]
};

/**
 * Shared service for Phantom wallet interactions
 * Handles deep link generation and connection requests
 */
class PhantomSharedService {
  /**
   * Check if Phantom wallet is available on the device
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      // Test all Phantom schemes
      for (const scheme of PHANTOM_CONFIG.SCHEMES) {
        try {
          const canOpen = await Linking.canOpenURL(scheme);
          if (canOpen) {
            return true;
          }
        } catch (error) {
          // Continue to next scheme
        }
      }

      // For Android, try package-based detection
      if (Platform.OS === 'android') {
        try {
          const packageCanOpen = await Linking.canOpenURL('app.phantom://');
          if (packageCanOpen) {
            return true;
          }
        } catch (error) {
          // Continue
        }
      }

      // On Android, canOpenURL often returns false even when Phantom is installed
      // So we'll be more permissive and allow connection attempts
      if (Platform.OS === 'android') {
        return true; // Allow connection attempt on Android
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build connection URLs for Phantom using multiple approaches
   */
  static buildConnectionUrls(): string[] {
    const sessionId = `wesplit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build connection request payload
    const connectionRequest = {
      id: sessionId,
      method: 'connect',
      params: {
        app_url: SOLANA_CONFIG.APP_URL,
        redirect_link: SOLANA_CONFIG.REDIRECT_LINK,
        app_name: SOLANA_CONFIG.APP_NAME,
        network: SOLANA_CONFIG.NETWORK
      }
    };
    
    const payload = encodeURIComponent(JSON.stringify(connectionRequest));
    
    const urls = [
      // Simple HTTPS connection (most likely to work)
      `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}&app_name=${encodeURIComponent(SOLANA_CONFIG.APP_NAME)}`,
      
      // Alternative HTTPS format with network
      `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}&app_name=${encodeURIComponent(SOLANA_CONFIG.APP_NAME)}&network=${encodeURIComponent(SOLANA_CONFIG.NETWORK)}`,
      
      // Simple HTTPS with minimal params
      `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}`,
      
      // Direct app scheme with payload
      `phantom://v1/connect?request=${payload}`,
      `app.phantom://v1/connect?request=${payload}`,
      
      // Simple app scheme
      `phantom://connect?app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}`,
      `app.phantom://connect?app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}`,
      
      // Basic fallbacks
      'phantom://',
      'app.phantom://'
    ];
    
    return urls;
  }

  /**
   * Build simple connection URL that should work with most Phantom versions
   */
  static buildSimpleConnectionUrl(): string {
    return `phantom://v1/connect?app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}`;
  }

  /**
   * Build signing URLs for message signing requests
   */
  static buildSigningUrls(message: string): string[] {
    const sessionId = `wesplit_sign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const signingRequest = {
      id: sessionId,
      method: 'signMessage',
      params: {
        message: message,
        app_url: SOLANA_CONFIG.APP_URL,
        redirect_link: SOLANA_CONFIG.REDIRECT_LINK,
        app_name: SOLANA_CONFIG.APP_NAME
      }
    };
    
    const payload = encodeURIComponent(JSON.stringify(signingRequest));
    
    const urls = [
      // HTTPS signing request
      `https://phantom.app/ul/v1/signMessage?message=${encodeURIComponent(message)}&app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}&redirect_link=${encodeURIComponent(SOLANA_CONFIG.REDIRECT_LINK)}`,
      
      // App scheme signing request
      `phantom://v1/signMessage?request=${payload}`,
      `app.phantom://v1/signMessage?request=${payload}`,
      
      // Simple signing request
      `phantom://sign?message=${encodeURIComponent(message)}&app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}`,
      `app.phantom://sign?message=${encodeURIComponent(message)}&app_url=${encodeURIComponent(SOLANA_CONFIG.APP_URL)}`
    ];
    
    return urls;
  }

  /**
   * Open Phantom with connection request using HTTPS deep links
   */
  static async openWithConnectionRequest(): Promise<void> {
    const connectionUrls = this.buildConnectionUrls();
    
    // Try HTTPS deep links first (Phantom's preferred method)
    for (const url of connectionUrls) {
      if (url.startsWith('https://')) {
        try {
          await Linking.openURL(url);
          return;
        } catch (error) {
          // Continue to next URL
        }
      }
    }
    
    // Fallback to app schemes
    for (const url of connectionUrls) {
      if (!url.startsWith('https://')) {
        try {
          await Linking.openURL(url);
          return;
        } catch (error) {
          // Continue to next URL
        }
      }
    }
    
    throw new Error('Failed to open Phantom with any connection method');
  }

  /**
   * Open Phantom with signing request
   */
  static async openWithSigningRequest(message: string): Promise<void> {
    const signingUrls = this.buildSigningUrls(message);
    
    for (const url of signingUrls) {
      try {
        await Linking.openURL(url);
        return;
      } catch (error) {
        // Continue to next URL
      }
    }
    
    throw new Error('Failed to open Phantom with signing request');
  }

  /**
   * Generate a simple connection result for testing
   */
  static generateConnectionResult(): any {
    return {
      success: true,
      walletAddress: 'DemoWalletAddress123456789',
      publicKey: 'DemoPublicKey123456789',
      signature: 'DemoSignature123456789',
      timestamp: Date.now()
    };
  }
}

export default PhantomSharedService;