/**
 * Phantom Connect Service
 *
 * Wraps the Phantom SDK connection logic and provides a clean interface
 * for connecting via social login (Google/Apple) and managing wallet connections.
 *
 * This service is designed to be used with the official @phantom/react-native-sdk
 * and provides configuration for spending limits and embedded wallets.
 */

import { logger } from '../../analytics/loggingService';

export interface PhantomConnectConfig {
  enableSocialLogin: boolean;
  enableEmbeddedWallets: boolean;
  spendingLimits?: {
    maxAmount?: number;    // Max per transaction
    maxDaily?: number;     // Max per day
    allowedTokens?: string[]; // Token mint addresses to allow
  };
}

export interface PhantomConnectOptions {
  preferredMethod?: 'social' | 'wallet';
  socialProvider?: 'google' | 'apple';
  authCode?: string; // For callback handling
}

export interface PhantomConnectResult {
  success: boolean;
  address?: string;
  publicKey?: string;
  error?: string;
  userInfo?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  walletId?: string;
  authUserId?: string;
}

/**
 * Default configuration for Phantom Connect
 */
const DEFAULT_CONFIG: PhantomConnectConfig = {
  enableSocialLogin: true,
  enableEmbeddedWallets: true,
  spendingLimits: {
    maxAmount: 100,
    maxDaily: 500,
    allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] // USDC by default
  }
};

class PhantomConnectService {
  private static instance: PhantomConnectService;
  private config: PhantomConnectConfig = { ...DEFAULT_CONFIG };
  private isConnected: boolean = false;
  private currentAddress: string | null = null;
  private currentPublicKey: string | null = null;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    logger.debug('PhantomConnectService instantiated', null, 'PhantomConnectService');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PhantomConnectService {
    if (!PhantomConnectService.instance) {
      PhantomConnectService.instance = new PhantomConnectService();
    }
    return PhantomConnectService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    PhantomConnectService.instance = undefined as any;
  }

  /**
   * Configure the Phantom Connect service
   */
  public configure(config: Partial<PhantomConnectConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      spendingLimits: {
        ...this.config.spendingLimits,
        ...config.spendingLimits
      }
    };

    logger.info('PhantomConnectService configured', {
      enableSocialLogin: this.config.enableSocialLogin,
      enableEmbeddedWallets: this.config.enableEmbeddedWallets,
      hasSpendingLimits: !!this.config.spendingLimits
    }, 'PhantomConnectService');
  }

  /**
   * Get current configuration
   */
  public getConfig(): PhantomConnectConfig {
    return { ...this.config };
  }

  /**
   * Connect to Phantom wallet via social login or direct connection
   *
   * NOTE: This method is designed to work with the Phantom SDK hooks.
   * In production, the actual connection is handled by the SDK's useConnect hook.
   * This service provides the configuration and callback handling.
   */
  public async connect(options: PhantomConnectOptions = {}): Promise<PhantomConnectResult> {
    try {
      logger.info('Initiating Phantom connection', {
        preferredMethod: options.preferredMethod || 'social',
        socialProvider: options.socialProvider,
        hasAuthCode: !!options.authCode
      }, 'PhantomConnectService');

      // If we have an auth code, this is a callback from social auth
      if (options.authCode) {
        return await this.handleAuthCallback(options.authCode, options.socialProvider);
      }

      // For social login, we need to trigger the SDK's modal
      // The actual connection happens through the useConnect hook in React components
      if (options.preferredMethod === 'social' && this.config.enableSocialLogin) {
        logger.info('Preparing social login connection', {
          provider: options.socialProvider
        }, 'PhantomConnectService');

        // Return a result indicating social auth is required
        // The component should then open the Phantom SDK modal
        return {
          success: false,
          error: 'social_auth_required'
        };
      }

      // For direct wallet connection (non-social)
      // This would be handled by the SDK's connect method
      return {
        success: false,
        error: 'Direct wallet connection requires SDK modal. Use social login or open Phantom SDK modal.'
      };

    } catch (error) {
      logger.error('Phantom connection failed', error, 'PhantomConnectService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Handle the callback from social authentication
   */
  private async handleAuthCallback(
    authCode: string,
    socialProvider?: 'google' | 'apple'
  ): Promise<PhantomConnectResult> {
    try {
      logger.info('Handling social auth callback', {
        hasAuthCode: !!authCode,
        provider: socialProvider
      }, 'PhantomConnectService');

      // In a real implementation, this would exchange the auth code
      // with Phantom's backend to get wallet credentials
      // For now, the SDK handles this automatically through the usePhantom hook

      // This is a placeholder for when manual callback handling is needed
      // (e.g., for deep link callbacks that the SDK doesn't auto-handle)

      return {
        success: false,
        error: 'Auth callback handling is managed by Phantom SDK. Use usePhantom hook results.'
      };

    } catch (error) {
      logger.error('Auth callback handling failed', error, 'PhantomConnectService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auth callback failed'
      };
    }
  }

  /**
   * Process a successful connection result from the Phantom SDK
   * Call this from React components after usePhantom hook indicates connection
   */
  public processConnectionResult(sdkResult: {
    walletId?: string;
    authUserId?: string;
    addresses?: Array<{ address: string; type: string }>;
    userInfo?: { name?: string; email?: string; avatar?: string };
  }): PhantomConnectResult {
    try {
      if (!sdkResult.walletId && !sdkResult.addresses?.length) {
        return {
          success: false,
          error: 'No wallet data in SDK result'
        };
      }

      // Extract Solana address from addresses array
      const solanaAddress = sdkResult.addresses?.find(
        addr => addr.type === 'solana'
      )?.address || sdkResult.addresses?.[0]?.address;

      if (!solanaAddress) {
        return {
          success: false,
          error: 'No Solana address found in connection result'
        };
      }

      // Update internal state
      this.isConnected = true;
      this.currentAddress = solanaAddress;
      this.currentPublicKey = solanaAddress; // For Solana, address is the public key

      logger.info('Phantom connection processed successfully', {
        walletId: sdkResult.walletId,
        address: solanaAddress.slice(0, 8) + '...'
      }, 'PhantomConnectService');

      return {
        success: true,
        address: solanaAddress,
        publicKey: solanaAddress,
        walletId: sdkResult.walletId,
        authUserId: sdkResult.authUserId,
        userInfo: sdkResult.userInfo
      };

    } catch (error) {
      logger.error('Failed to process connection result', error, 'PhantomConnectService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process connection'
      };
    }
  }

  /**
   * Disconnect from Phantom wallet
   */
  public async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from Phantom', null, 'PhantomConnectService');

      // Clear internal state
      this.isConnected = false;
      this.currentAddress = null;
      this.currentPublicKey = null;

      // Note: The actual SDK disconnect should be called from the React component
      // using the useConnect hook's disconnect method

      logger.info('Phantom disconnected successfully', null, 'PhantomConnectService');

    } catch (error) {
      logger.error('Phantom disconnect failed', error, 'PhantomConnectService');
      throw error;
    }
  }

  /**
   * Check if currently connected
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current wallet address
   */
  public getCurrentAddress(): string | null {
    return this.currentAddress;
  }

  /**
   * Get current public key
   */
  public getCurrentPublicKey(): string | null {
    return this.currentPublicKey;
  }

  /**
   * Validate spending against configured limits
   */
  public validateSpending(amount: number, tokenMint?: string): { valid: boolean; reason?: string } {
    const limits = this.config.spendingLimits;

    if (!limits) {
      return { valid: true };
    }

    // Check max amount per transaction
    if (limits.maxAmount && amount > limits.maxAmount) {
      return {
        valid: false,
        reason: `Amount ${amount} exceeds maximum transaction limit of ${limits.maxAmount}`
      };
    }

    // Check allowed tokens
    if (tokenMint && limits.allowedTokens && !limits.allowedTokens.includes(tokenMint)) {
      return {
        valid: false,
        reason: `Token ${tokenMint} is not in the allowed tokens list`
      };
    }

    return { valid: true };
  }
}

export default PhantomConnectService;
export { PhantomConnectService };
