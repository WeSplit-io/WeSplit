import { Linking, Platform, Alert } from 'react-native';
import { walletLogoService } from './walletLogoService';

export interface WalletProvider {
  name: string;
  displayName: string;
  isInstalled: boolean;
  isAvailable: boolean;
  deepLinkScheme?: string;
  packageName?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  logoUrl?: string;
  detectionMethod: 'deep-link' | 'package' | 'browser-extension' | 'manual';
  priority: number; // Higher number = higher priority in UI
}

export interface PhoneAnalysisResult {
  detectedWallets: WalletProvider[];
  totalDetected: number;
  recommendedWallets: WalletProvider[];
  analysisTimestamp: Date;
  platform: 'ios' | 'android' | 'web';
}

class PhoneWalletAnalysisService {
  private static instance: PhoneWalletAnalysisService;
  private analysisCache: Map<string, PhoneAnalysisResult> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Known wallet providers with their detection methods
  private readonly WALLET_PROVIDERS: WalletProvider[] = [
    {
      name: 'phantom',
      displayName: 'Phantom',
      isInstalled: false,
      isAvailable: false,
      deepLinkScheme: 'phantom://',
      packageName: 'app.phantom',
      appStoreUrl: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
      logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fphantom-logo.png?alt=media',
      detectionMethod: 'deep-link',
      priority: 10
    },
    {
      name: 'solflare',
      displayName: 'Solflare',
      isInstalled: false,
      isAvailable: false,
      deepLinkScheme: 'solflare://',
      packageName: 'com.solflare.mobile',
      appStoreUrl: 'https://apps.apple.com/app/solflare/id1580902717',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
      logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fsolflare-logo.png?alt=media',
      detectionMethod: 'deep-link',
      priority: 9
    },
    {
      name: 'backpack',
      displayName: 'Backpack',
      isInstalled: false,
      isAvailable: false,
      deepLinkScheme: 'backpack://',
      packageName: 'app.backpack.mobile',
      appStoreUrl: 'https://apps.apple.com/app/backpack-wallet/id6443944476',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=app.backpack.mobile',
      logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fbackpack-logo.png?alt=media',
      detectionMethod: 'deep-link',
      priority: 8
    },
    {
      name: 'exodus',
      displayName: 'Exodus',
      isInstalled: false,
      isAvailable: false,
      deepLinkScheme: 'exodus://',
      packageName: 'exodusmovement.exodus',
      appStoreUrl: 'https://apps.apple.com/app/exodus-crypto-bitcoin-wallet/id1414384820',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=exodusmovement.exodus',
      logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fexodus-logo.png?alt=media',
      detectionMethod: 'deep-link',
      priority: 7
    },
    {
      name: 'trust',
      displayName: 'Trust Wallet',
      isInstalled: false,
      isAvailable: false,
      deepLinkScheme: 'trust://',
      packageName: 'com.wallet.crypto.trustapp',
      appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
      logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Ftrust-logo.png?alt=media',
      detectionMethod: 'deep-link',
      priority: 6
    },
    {
      name: 'coinbase',
      displayName: 'Coinbase Wallet',
      isInstalled: false,
      isAvailable: false,
      deepLinkScheme: 'cbwallet://',
      packageName: 'org.toshi',
      appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
      logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fcoinbase-logo.png?alt=media',
      detectionMethod: 'deep-link',
      priority: 5
    }
  ];

  private constructor() {
    console.log('📱 PhoneWalletAnalysisService: Initialized for wallet detection');
  }

  public static getInstance(): PhoneWalletAnalysisService {
    if (!PhoneWalletAnalysisService.instance) {
      PhoneWalletAnalysisService.instance = new PhoneWalletAnalysisService();
    }
    return PhoneWalletAnalysisService.instance;
  }

  /**
   * Analyze the phone to detect installed wallet providers
   */
  async analyzePhoneForWallets(): Promise<PhoneAnalysisResult> {
    try {
      console.log('📱 PhoneWalletAnalysisService: Starting phone analysis for wallet detection...');

      // Check cache first
      const cacheKey = 'phone_analysis';
      const cached = this.analysisCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.analysisTimestamp)) {
        console.log('📱 PhoneWalletAnalysisService: Using cached analysis result');
        return cached;
      }

      const detectedWallets: WalletProvider[] = [];
      const platform = Platform.OS as 'ios' | 'android' | 'web';

      // Analyze each wallet provider
      let detectionSuccessCount = 0;
      for (const provider of this.WALLET_PROVIDERS) {
        try {
          const isInstalled = await this.detectWalletInstallation(provider);
          const isAvailable = await this.checkWalletAvailability(provider);

          const detectedProvider: WalletProvider = {
            ...provider,
            isInstalled,
            isAvailable
          };

          detectedWallets.push(detectedProvider);

          if (isInstalled || isAvailable) {
            detectionSuccessCount++;
          }

          console.log(`📱 PhoneWalletAnalysisService: ${provider.displayName} - Installed: ${isInstalled}, Available: ${isAvailable}`);
        } catch (error) {
          console.error(`📱 PhoneWalletAnalysisService: Error detecting ${provider.name}:`, error);
          // Add provider as not detected
          detectedWallets.push({
            ...provider,
            isInstalled: false,
            isAvailable: false
          });
        }
      }

      // If no wallets were detected, show all as potentially available
      // This allows users to try connecting even if detection failed
      if (detectionSuccessCount === 0) {
        console.log('📱 PhoneWalletAnalysisService: No wallets detected, showing all as potentially available');
        detectedWallets.forEach(wallet => {
          wallet.isAvailable = true; // Allow users to try connecting
          console.log(`📱 PhoneWalletAnalysisService: Making ${wallet.displayName} available for connection`);
        });
      }

      console.log('📱 PhoneWalletAnalysisService: Final wallet list:', detectedWallets.map(w => ({
        name: w.displayName,
        installed: w.isInstalled,
        available: w.isAvailable
      })));

      // Sort by priority and availability
      const sortedWallets = detectedWallets.sort((a, b) => {
        // First sort by availability (available first)
        if (a.isAvailable !== b.isAvailable) {
          return b.isAvailable ? 1 : -1;
        }
        // Then by priority
        return b.priority - a.priority;
      });

      // Get recommended wallets (top 3 available or installed)
      const recommendedWallets = sortedWallets
        .filter(wallet => wallet.isAvailable || wallet.isInstalled)
        .slice(0, 3);

      const result: PhoneAnalysisResult = {
        detectedWallets: sortedWallets,
        totalDetected: detectedWallets.filter(w => w.isInstalled || w.isAvailable).length,
        recommendedWallets,
        analysisTimestamp: new Date(),
        platform
      };

      // Cache the result
      this.analysisCache.set(cacheKey, result);

      console.log(`📱 PhoneWalletAnalysisService: Analysis complete - ${result.totalDetected} wallets detected`);
      return result;

    } catch (error) {
      console.error('📱 PhoneWalletAnalysisService: Error during phone analysis:', error);
      throw error;
    }
  }

  /**
   * Detect if a specific wallet is installed
   */
  private async detectWalletInstallation(provider: WalletProvider): Promise<boolean> {
    try {
      switch (provider.detectionMethod) {
        case 'deep-link':
          return await this.checkDeepLinkAvailability(provider);
        case 'package':
          return await this.checkPackageAvailability(provider);
        case 'browser-extension':
          return await this.checkBrowserExtensionAvailability(provider);
        case 'manual':
          return true; // Always available for manual wallets
        default:
          return false;
      }
    } catch (error) {
      console.error(`📱 PhoneWalletAnalysisService: Error detecting ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Check if wallet is available via deep link
   */
  private async checkDeepLinkAvailability(provider: WalletProvider): Promise<boolean> {
    if (!provider.deepLinkScheme) {
      return false;
    }

    try {
      console.log(`📱 PhoneWalletAnalysisService: Checking ${provider.name} with scheme: ${provider.deepLinkScheme}`);
      
      // Try multiple detection methods
      const methods = [
        // Method 1: Direct deep link check
        async () => {
          const canOpen = await Linking.canOpenURL(provider.deepLinkScheme!);
          console.log(`📱 ${provider.name} - Direct deep link: ${canOpen}`);
          return canOpen;
        },
        
        // Method 2: Try with different URL formats
        async () => {
          if (Platform.OS === 'android' && provider.packageName) {
            const packageUrl = `${provider.packageName}://`;
            const canOpen = await Linking.canOpenURL(packageUrl);
            console.log(`📱 ${provider.name} - Package URL: ${canOpen}`);
            return canOpen;
          }
          return false;
        },
        
        // Method 3: Try with app-specific URLs
        async () => {
          const appUrl = `${provider.deepLinkScheme}app`;
          const canOpen = await Linking.canOpenURL(appUrl);
          console.log(`📱 ${provider.name} - App URL: ${canOpen}`);
          return canOpen;
        }
      ];

      // Try all methods
      for (const method of methods) {
        try {
          const result = await method();
          if (result) {
            console.log(`📱 PhoneWalletAnalysisService: ${provider.name} detected via method`);
            return true;
          }
        } catch (error) {
          console.log(`📱 ${provider.name} - Method failed:`, error);
        }
      }

      // Special handling for Phantom
      if (provider.name.toLowerCase() === 'phantom') {
        return await this.detectPhantomWallet();
      }

      console.log(`📱 PhoneWalletAnalysisService: ${provider.name} not detected via any method`);
      return false;
    } catch (error) {
      console.error(`📱 PhoneWalletAnalysisService: Deep link check failed for ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Check if wallet is available via package name (Android)
   */
  private async checkPackageAvailability(provider: WalletProvider): Promise<boolean> {
    if (Platform.OS !== 'android' || !provider.packageName) {
      return false;
    }

    try {
      const packageUrl = `${provider.packageName}://`;
      const canOpen = await Linking.canOpenURL(packageUrl);
      console.log(`📱 PhoneWalletAnalysisService: ${provider.name} package check:`, {
        package: provider.packageName,
        canOpen
      });
      return canOpen;
    } catch (error) {
      console.error(`📱 PhoneWalletAnalysisService: Package check failed for ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Check if wallet is available via browser extension (Web)
   */
  private async checkBrowserExtensionAvailability(provider: WalletProvider): Promise<boolean> {
    if (Platform.OS !== 'web') {
      return false;
    }

    try {
      // For web, we can check if the extension is available
      // This would typically involve checking window object for extension APIs
      return false; // Placeholder for web extension detection
    } catch (error) {
      console.error(`📱 PhoneWalletAnalysisService: Browser extension check failed for ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Special detection method for Phantom wallet
   */
  private async detectPhantomWallet(): Promise<boolean> {
    try {
      console.log('📱 PhoneWalletAnalysisService: Running special Phantom detection...');
      
      // Try multiple Phantom-specific detection methods
      const phantomMethods = [
        // Method 1: Standard Phantom deep link
        async () => {
          const canOpen = await Linking.canOpenURL('phantom://');
          console.log('📱 Phantom - Standard deep link:', canOpen);
          return canOpen;
        },
        
        // Method 2: Phantom with specific path
        async () => {
          const canOpen = await Linking.canOpenURL('phantom://app');
          console.log('📱 Phantom - App path:', canOpen);
          return canOpen;
        },
        
        // Method 3: Phantom package name (Android)
        async () => {
          if (Platform.OS === 'android') {
            const canOpen = await Linking.canOpenURL('app.phantom://');
            console.log('📱 Phantom - Package name:', canOpen);
            return canOpen;
          }
          return false;
        },
        
        // Method 4: Try opening Phantom directly
        async () => {
          try {
            // This is a more aggressive check - actually try to open the app
            const canOpen = await Linking.canOpenURL('phantom://open');
            console.log('📱 Phantom - Direct open:', canOpen);
            return canOpen;
          } catch (error) {
            console.log('📱 Phantom - Direct open failed:', error);
            return false;
          }
        }
      ];

      // Try all Phantom detection methods
      for (const method of phantomMethods) {
        try {
          const result = await method();
          if (result) {
            console.log('📱 PhoneWalletAnalysisService: Phantom detected via special method');
            return true;
          }
        } catch (error) {
          console.log('📱 Phantom detection method failed:', error);
        }
      }

      console.log('📱 PhoneWalletAnalysisService: Phantom not detected via special methods');
      return false;
    } catch (error) {
      console.error('📱 PhoneWalletAnalysisService: Phantom detection failed:', error);
      return false;
    }
  }

  /**
   * Check if wallet is available for connection (using existing service)
   */
  private async checkWalletAvailability(provider: WalletProvider): Promise<boolean> {
    try {
      return await walletLogoService.checkWalletAvailability(provider.name);
    } catch (error) {
      console.error(`📱 PhoneWalletAnalysisService: Availability check failed for ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Get installation instructions for a wallet
   */
  getInstallationInstructions(provider: WalletProvider): { title: string; message: string; url?: string } {
    const platform = Platform.OS;
    
    if (platform === 'ios') {
      return {
        title: `Install ${provider.displayName}`,
        message: `To use ${provider.displayName}, please install it from the App Store.`,
        url: provider.appStoreUrl
      };
    } else if (platform === 'android') {
      return {
        title: `Install ${provider.displayName}`,
        message: `To use ${provider.displayName}, please install it from the Google Play Store.`,
        url: provider.playStoreUrl
      };
    } else {
      return {
        title: `Install ${provider.displayName}`,
        message: `To use ${provider.displayName}, please install it from the official website.`
      };
    }
  }

  /**
   * Open wallet installation page
   */
  async openWalletInstallation(provider: WalletProvider): Promise<void> {
    try {
      const platform = Platform.OS;
      let url: string | undefined;

      if (platform === 'ios' && provider.appStoreUrl) {
        url = provider.appStoreUrl;
      } else if (platform === 'android' && provider.playStoreUrl) {
        url = provider.playStoreUrl;
      }

      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open installation page');
        }
      } else {
        Alert.alert('Error', 'Installation URL not available for this platform');
      }
    } catch (error) {
      console.error('📱 PhoneWalletAnalysisService: Error opening installation page:', error);
      Alert.alert('Error', 'Failed to open installation page');
    }
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    console.log('📱 PhoneWalletAnalysisService: Cache cleared');
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    return diff < this.CACHE_DURATION;
  }

  /**
   * Get wallet provider by name
   */
  getWalletProvider(name: string): WalletProvider | undefined {
    return this.WALLET_PROVIDERS.find(provider => 
      provider.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get all available wallet providers
   */
  getAllWalletProviders(): WalletProvider[] {
    return [...this.WALLET_PROVIDERS];
  }
}

// Export singleton instance
export const phoneWalletAnalysisService = PhoneWalletAnalysisService.getInstance();
