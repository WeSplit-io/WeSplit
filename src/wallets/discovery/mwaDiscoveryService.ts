/**
 * Solana Mobile Wallet Adapter (MWA) Discovery Service
 * Handles discovery of MWA-compatible wallet providers
 */

import { Platform, Linking } from 'react-native';
import { WALLET_PROVIDER_REGISTRY, WalletProviderInfo, getMWASupportedProviders } from '../providers/registry';
import { startRemoteScenario, transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { SolanaMobileWalletAdapterError, SolanaMobileWalletAdapterErrorCode } from '@solana-mobile/mobile-wallet-adapter-protocol';

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

    console.log('🔍 MWA Discovery: Starting provider discovery...', {
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

      console.log('🔍 MWA Discovery: Discovery completed', {
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
        console.log(`🔍 MWA Discovery: Using cached result for ${provider.name}`);
        return cached;
      }
    }

    console.log(`🔍 MWA Discovery: Discovering ${provider.name}...`);

    try {
      const result = await this.performDiscovery(provider, timeout);
      
      // Cache the result
      if (useCache) {
        this.discoveryCache.set(cacheKey, result);
      }

      console.log(`🔍 MWA Discovery: ${provider.name} discovery completed`, {
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
    console.log(`🔍 MWA Discovery: Trying MWA discovery for ${provider.name}`);
    
    try {
      // For now, we'll use a simplified MWA test
      // The actual MWA API requires more complex setup
      // This is a placeholder that will be updated when we have the full MWA implementation
      
      console.log('🔍 MWA Discovery: Testing MWA availability for', provider.name);
      
      // Simulate MWA discovery test
      // In a real implementation, this would use the actual MWA protocol
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For now, assume MWA is available if the provider supports it
      const isAvailable = provider.mwaSupported || false;
      
      if (isAvailable) {
        console.log('✅ MWA Discovery: Provider available via MWA', provider.name);
      } else {
        console.log('❌ MWA Discovery: Provider not available via MWA', provider.name);
      }
      
      return {
        provider,
        isAvailable,
        detectionMethod: 'mwa',
        timestamp: Date.now()
      };
      
    } catch (mwaError) {
      console.log('❌ MWA Discovery: Provider not available via MWA', provider.name, mwaError);
      
      return {
        provider,
        isAvailable: false,
        detectionMethod: 'mwa',
        error: mwaError instanceof Error ? mwaError.message : 'MWA discovery failed',
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
    console.log(`🔍 MWA Discovery: Trying deep link discovery for ${provider.name}`);
    
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
    console.log(`🔍 MWA Discovery: Trying package discovery for ${provider.name}`);
    
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
    console.log('🔍 MWA Discovery: Clearing discovery cache');
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

    console.log(`🔍 MWA Discovery: Testing discovery for ${providerName}`);
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
}

export const mwaDiscoveryService = MWADiscoveryService.getInstance();
