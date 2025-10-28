/**
 * Solana Mobile Wallet Adapter (MWA) Discovery Service
 * Handles discovery of MWA-compatible wallet providers
 */

import { Platform, Linking } from 'react-native';
import { WALLET_PROVIDER_REGISTRY, WalletProviderInfo, getMWASupportedProviders } from '../providers/registry';
import { startRemoteScenario, transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { SolanaMobileWalletAdapterError, SolanaMobileWalletAdapterErrorCode } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { logger } from '../../../analytics/loggingService';
import { getPlatformInfo, isMWAAvailable } from '../../../../utils/core/platformDetection';

export interface MWADiscoveryResult {
  provider: WalletProviderInfo;
  isAvailable: boolean;
  detectionMethod: 'mwa' | 'deep-link' | 'package' | 'manual';
  error?: string;
  timestamp: number;
}

export interface MWADiscoveryOptions {
  timeout?: number;
  useCache?: boolean;
  includeUnsupported?: boolean;
}

class MWADiscoveryService {
  private static instance: MWADiscoveryService;
  private discoveryCache: Map<string, MWADiscoveryResult> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  public static getInstance(): MWADiscoveryService {
    if (!MWADiscoveryService.instance) {
      MWADiscoveryService.instance = new MWADiscoveryService();
    }
    return MWADiscoveryService.instance;
  }

  /**
   * Discover all available wallet providers
   */
  async discoverProviders(options: MWADiscoveryOptions = {}): Promise<MWADiscoveryResult[]> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      useCache = true,
      includeUnsupported = false
    } = options;

    logger.info('Starting provider discovery', {
      timeout,
      useCache,
      includeUnsupported,
      platform: Platform.OS
    });

    const providers = includeUnsupported 
      ? Object.values(WALLET_PROVIDER_REGISTRY)
      : Object.values(WALLET_PROVIDER_REGISTRY); // Show all providers, not just MWA supported ones

    const discoveryPromises = providers.map(provider => 
      this.discoverProvider(provider, { timeout, useCache })
    );

    try {
      const results = await Promise.allSettled(discoveryPromises);
      
      const discoveryResults: MWADiscoveryResult[] = results
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            const provider = providers[index];
            return {
              provider,
              isAvailable: false,
              detectionMethod: 'manual' as const,
              error: result.reason?.message || 'Discovery failed',
              timestamp: Date.now()
            };
          }
        })
        .filter(result => result !== null) as MWADiscoveryResult[];

      logger.info('Discovery completed', {
        totalProviders: providers.length,
        availableProviders: discoveryResults.filter(r => r.isAvailable).length,
        results: discoveryResults.map(r => ({
          name: r.provider.name,
          available: r.isAvailable,
          method: r.detectionMethod
        }))
      });

      return discoveryResults;
    } catch (error) {
      console.error('🔍 MWA Discovery: Discovery failed:', error);
      throw new Error(`Provider discovery failed: ${error}`);
    }
  }

  /**
   * Discover a specific wallet provider
   */
  async discoverProvider(
    provider: WalletProviderInfo, 
    options: MWADiscoveryOptions = {}
  ): Promise<MWADiscoveryResult> {
    const { timeout = this.DEFAULT_TIMEOUT, useCache = true } = options;
    const cacheKey = `${provider.name}_${Platform.OS}`;

    // Check cache first
    if (useCache) {
      const cached = this.discoveryCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        logger.debug('Using cached result for', { providerName: provider.name }, 'mwaDiscoveryService');
        return cached;
      }
    }

    logger.info('Discovering provider', { providerName: provider.name }, 'mwaDiscoveryService');

    try {
      const result = await this.performDiscovery(provider, timeout);
      
      // Cache the result
      if (useCache) {
        this.discoveryCache.set(cacheKey, result);
      }

      logger.info('Provider discovery completed', {
        available: result.isAvailable,
        method: result.detectionMethod,
        error: result.error
      });

      return result;
    } catch (error) {
      const result: MWADiscoveryResult = {
        provider,
        isAvailable: false,
        detectionMethod: 'manual',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      // Cache the error result
      if (useCache) {
        this.discoveryCache.set(cacheKey, result);
      }

      console.error(`🔍 MWA Discovery: ${provider.name} discovery failed:`, error);
      return result;
    }
  }

  /**
   * Perform the actual discovery for a provider
   */
  private async performDiscovery(
    provider: WalletProviderInfo, 
    timeout: number
  ): Promise<MWADiscoveryResult> {
    const startTime = Date.now();

    try {
      // Try MWA discovery first if supported
      if (provider.mwaSupported) {
        const mwaResult = await this.tryMWADiscovery(provider, timeout);
        if (mwaResult.isAvailable) {
          return {
            ...mwaResult,
            timestamp: Date.now()
          };
        }
      }

      // Fallback to deep link detection
      if (provider.deepLinkScheme) {
        const deepLinkResult = await this.tryDeepLinkDiscovery(provider, timeout);
        if (deepLinkResult.isAvailable) {
          return {
            ...deepLinkResult,
            timestamp: Date.now()
          };
        }
      }

      // Fallback to package detection (Android only)
      if (Platform.OS === 'android' && provider.packageName) {
        const packageResult = await this.tryPackageDiscovery(provider, timeout);
        if (packageResult.isAvailable) {
          return {
            ...packageResult,
            timestamp: Date.now()
          };
        }
      }

      // No detection method succeeded
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'manual',
        error: 'No detection method succeeded',
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'manual',
        error: error instanceof Error ? error.message : 'Discovery failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Try MWA discovery using the real MWA protocol
   */
  private async tryMWADiscovery(
    provider: WalletProviderInfo, 
    timeout: number
  ): Promise<MWADiscoveryResult> {
    logger.info('Trying MWA discovery for', { providerName: provider.name }, 'mwaDiscoveryService');
    
    try {
      // Check if MWA is available on this platform
      if (!isMWAAvailable()) {
        logger.debug('MWA not available on this platform', { providerName: provider.name }, 'mwaDiscoveryService');
        return {
          provider,
          isAvailable: false,
          detectionMethod: 'mwa',
          error: 'MWA not available on this platform',
          timestamp: Date.now()
        };
      }

      // Check if provider supports MWA
      if (!provider.mwaSupported) {
        logger.debug('Provider does not support MWA', { providerName: provider.name }, 'mwaDiscoveryService');
        return {
          provider,
          isAvailable: false,
          detectionMethod: 'mwa',
          error: 'Provider does not support MWA',
          timestamp: Date.now()
        };
      }

      logger.debug('Testing MWA availability for', { providerName: provider.name }, 'mwaDiscoveryService');
      
      // Try to import MWA module to test availability
      try {
        const mwaModule = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
        if (!mwaModule.startRemoteScenario) {
          throw new Error('MWA startRemoteScenario not available');
        }
        
        // MWA module is available, but we can't actually test wallet availability
        // without user interaction, so we'll return false for now
        // In a real implementation, this would use the actual MWA protocol
        logger.debug('MWA module available but wallet detection requires user interaction', { providerName: provider.name }, 'mwaDiscoveryService');
        
        return {
          provider,
          isAvailable: false, // Set to false since we can't detect without user interaction
          detectionMethod: 'mwa',
          error: 'Wallet detection requires user interaction',
          timestamp: Date.now()
        };
        
      } catch (importError) {
        // Handle TurboModuleRegistry errors specifically
        if (importError instanceof Error && (
          importError.message.includes('TurboModuleRegistry') ||
          importError.message.includes('SolanaMobileWalletAdapter')
        )) {
          logger.debug('MWA native module not available', { providerName: provider.name, error: importError.message }, 'mwaDiscoveryService');
          return {
            provider,
            isAvailable: false,
            detectionMethod: 'mwa',
            error: 'MWA native module not available',
            timestamp: Date.now()
          };
        }
        
        throw importError;
      }
      
    } catch (mwaError) {
      const errorMessage = mwaError instanceof Error ? mwaError.message : 'Unknown MWA error';
      logger.warn('Provider not available via MWA', { providerName: provider.name, error: errorMessage }, 'mwaDiscoveryService');
      
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'mwa',
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Try deep link discovery
   */
  private async tryDeepLinkDiscovery(
    provider: WalletProviderInfo, 
    timeout: number
  ): Promise<MWADiscoveryResult> {
    logger.info('Trying deep link discovery for', { providerName: provider.name }, 'mwaDiscoveryService');
    
    if (!provider.deepLinkScheme) {
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'deep-link',
        error: 'No deep link scheme available',
        timestamp: Date.now()
      };
    }

    try {
      const canOpen = await Promise.race([
        Linking.canOpenURL(provider.deepLinkScheme),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      return {
        provider,
        isAvailable: canOpen,
        detectionMethod: 'deep-link',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'deep-link',
        error: error instanceof Error ? error.message : 'Deep link check failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Try package discovery (Android only)
   */
  private async tryPackageDiscovery(
    provider: WalletProviderInfo, 
    timeout: number
  ): Promise<MWADiscoveryResult> {
    logger.info('Trying package discovery for', { providerName: provider.name }, 'mwaDiscoveryService');
    
    if (Platform.OS !== 'android' || !provider.packageName) {
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'package',
        error: 'Package discovery not available on this platform',
        timestamp: Date.now()
      };
    }

    try {
      const packageScheme = `${provider.packageName}://`;
      const canOpen = await Promise.race([
        Linking.canOpenURL(packageScheme),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      return {
        provider,
        isAvailable: canOpen,
        detectionMethod: 'package',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'package',
        error: error instanceof Error ? error.message : 'Package check failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    logger.info('Clearing discovery cache', null, 'mwaDiscoveryService');
    this.discoveryCache.clear();
  }

  /**
   * Get cached discovery results
   */
  getCachedResults(): MWADiscoveryResult[] {
    return Array.from(this.discoveryCache.values());
  }

  /**
   * Test discovery for a specific provider (for debugging)
   */
  async testDiscovery(providerName: string): Promise<MWADiscoveryResult> {
    const provider = WALLET_PROVIDER_REGISTRY[providerName.toLowerCase()];
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    logger.info('Testing discovery for', { providerName }, 'mwaDiscoveryService');
    return this.discoverProvider(provider, { useCache: false });
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): {
    totalProviders: number;
    availableProviders: number;
    mwaSupported: number;
    cacheSize: number;
    platform: string;
  } {
    const allProviders = Object.values(WALLET_PROVIDER_REGISTRY);
    const cachedResults = this.getCachedResults();
    const availableResults = cachedResults.filter(r => r.isAvailable);

    return {
      totalProviders: allProviders.length,
      availableProviders: availableResults.length,
      mwaSupported: allProviders.filter(p => p.mwaSupported).length,
      cacheSize: this.discoveryCache.size,
      platform: Platform.OS
    };
  }

  /**
   * Get available wallets for UI display
   * Returns only wallets that are actually available on the device
   */
  async getAvailableWallets(): Promise<{
    mwaWallets: MWADiscoveryResult[];
    deepLinkWallets: MWADiscoveryResult[];
    allAvailable: MWADiscoveryResult[];
  }> {
    const platformInfo = getPlatformInfo();
    
    // If running in Expo Go, return mock data
    if (platformInfo.isExpoGo) {
      return this.getMockAvailableWallets();
    }

    // Perform discovery for all providers
    const results = await this.discoverProviders({
      timeout: 5000, // Shorter timeout for UI
      useCache: true,
      includeUnsupported: false
    });

    const availableResults = results.filter(r => r.isAvailable);
    const mwaWallets = availableResults.filter(r => r.detectionMethod === 'mwa');
    const deepLinkWallets = availableResults.filter(r => r.detectionMethod === 'deep-link');

    return {
      mwaWallets,
      deepLinkWallets,
      allAvailable: availableResults
    };
  }

  /**
   * Get mock available wallets for Expo Go
   */
  private getMockAvailableWallets(): {
    mwaWallets: MWADiscoveryResult[];
    deepLinkWallets: MWADiscoveryResult[];
    allAvailable: MWADiscoveryResult[];
  } {
    const mockProviders = [
      {
        name: 'Phantom',
        displayName: 'Phantom',
        mwaSupported: true,
        deepLinkScheme: 'phantom://',
        packageName: 'app.phantom',
        icon: 'https://phantom.app/img/phantom-logo.png'
      },
      {
        name: 'Solflare',
        displayName: 'Solflare',
        mwaSupported: true,
        deepLinkScheme: 'solflare://',
        packageName: 'com.solflare.mobile',
        icon: 'https://solflare.com/favicon.ico'
      },
      {
        name: 'Backpack',
        displayName: 'Backpack',
        mwaSupported: true,
        deepLinkScheme: 'backpack://',
        packageName: 'com.backpack.app',
        icon: 'https://backpack.app/favicon.ico'
      }
    ];

    const mockResults: MWADiscoveryResult[] = mockProviders.map(provider => ({
      provider: {
        ...provider,
        logoUrl: provider.icon,
        fallbackIcon: provider.icon,
        isAvailable: true,
        detectionMethod: 'mwa' as const,
        priority: 1
      } as WalletProviderInfo,
      isAvailable: true,
      detectionMethod: 'mwa' as const,
      timestamp: Date.now()
    }));

    return {
      mwaWallets: mockResults,
      deepLinkWallets: [],
      allAvailable: mockResults
    };
  }
}

export const mwaDiscoveryService = MWADiscoveryService.getInstance();
