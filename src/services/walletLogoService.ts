import { Platform } from 'react-native';

export interface WalletLogo {
  name: string;
  logoUrl: string;
  fallbackIcon: string;
  isAvailable: boolean;
  detectionMethod: 'deep-link' | 'browser-extension' | 'app-installation' | 'manual';
}

export interface WalletProviderInfo {
  name: string;
  logoUrl: string;
  fallbackIcon: string;
  isAvailable: boolean;
  detectionMethod: 'deep-link' | 'browser-extension' | 'app-installation' | 'manual';
  deepLinkScheme?: string;
  appStoreId?: string;
  playStoreId?: string;
  websiteUrl?: string;
}

class WalletLogoService {
  private static instance: WalletLogoService;
  private walletProviders: Map<string, WalletProviderInfo> = new Map();

  public static getInstance(): WalletLogoService {
    if (!WalletLogoService.instance) {
      WalletLogoService.instance = new WalletLogoService();
    }
    return WalletLogoService.instance;
  }

  constructor() {
    this.initializeWalletProviders();
  }

  private initializeWalletProviders() {
    const providers: WalletProviderInfo[] = [
      {
        name: 'Phantom',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.png',
        fallbackIcon: '👻',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'phantom://',
        appStoreId: '1598432977',
        playStoreId: 'com.phantom.app',
        websiteUrl: 'https://phantom.app'
      },
      {
        name: 'Solflare',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.png',
        fallbackIcon: '🔥',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'solflare://',
        appStoreId: '1580902717',
        playStoreId: 'com.solflare.mobile',
        websiteUrl: 'https://solflare.com'
      },
      {
        name: 'Backpack',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/backpack.png',
        fallbackIcon: '🎒',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'backpack://',
        appStoreId: '1667191423',
        playStoreId: 'com.backpack.app',
        websiteUrl: 'https://backpack.app'
      },
      {
        name: 'Slope',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/slope.png',
        fallbackIcon: '📈',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'slope://',
        appStoreId: '1591082281',
        playStoreId: 'com.slope.finance',
        websiteUrl: 'https://slope.finance'
      },
      {
        name: 'Glow',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/glow.png',
        fallbackIcon: '✨',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'glow://',
        appStoreId: '1591082281',
        playStoreId: 'com.glow.app',
        websiteUrl: 'https://glow.app'
      },
      {
        name: 'Exodus',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/exodus.png',
        fallbackIcon: '🚀',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'exodus://',
        appStoreId: '1414384820',
        playStoreId: 'exodusmovement.exodus',
        websiteUrl: 'https://exodus.com'
      },
      {
        name: 'Coinbase',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/coinbase.png',
        fallbackIcon: '🪙',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'coinbase://',
        appStoreId: 'com.coinbase.Coinbase',
        playStoreId: 'com.coinbase.android',
        websiteUrl: 'https://coinbase.com'
      },
      {
        name: 'OKX',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/okx.png',
        fallbackIcon: '⚡',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'okx://',
        appStoreId: 'okx',
        playStoreId: 'com.okinc.okex.gp',
        websiteUrl: 'https://okx.com'
      },
      {
        name: 'Brave',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/brave.png',
        fallbackIcon: '🦁',
        isAvailable: false,
        detectionMethod: 'browser-extension',
        websiteUrl: 'https://brave.com'
      },
      {
        name: 'Magic Eden',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/magic-eden.png',
        fallbackIcon: '🎭',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'magiceden://',
        appStoreId: 'magic-eden',
        playStoreId: 'com.magiceden.app',
        websiteUrl: 'https://magiceden.io'
      },
      {
        name: 'Talisman',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/talisman.png',
        fallbackIcon: '🔮',
        isAvailable: false,
        detectionMethod: 'browser-extension',
        websiteUrl: 'https://talisman.xyz'
      },
      {
        name: 'XDeFi',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/xdefi.png',
        fallbackIcon: '🦊',
        isAvailable: false,
        detectionMethod: 'browser-extension',
        websiteUrl: 'https://xdefi.com'
      },
      {
        name: 'Zerion',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/zerion.png',
        fallbackIcon: '🔗',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'zerion://',
        appStoreId: 'zerion',
        playStoreId: 'io.zerion.android',
        websiteUrl: 'https://zerion.io'
      },
      {
        name: 'Trust Wallet',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/trust.png',
        fallbackIcon: '🛡️',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'trust://',
        appStoreId: 'trust-wallet',
        playStoreId: 'com.wallet.crypto.trustapp',
        websiteUrl: 'https://trustwallet.com'
      },
      {
        name: 'SafePal',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/safepal.png',
        fallbackIcon: '🦅',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'safepal://',
        appStoreId: 'safepal',
        playStoreId: 'com.safepal.wallet',
        websiteUrl: 'https://safepal.io'
      },
      {
        name: 'Bitget',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/bitget.png',
        fallbackIcon: '🪙',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'bitget://',
        appStoreId: 'bitget',
        playStoreId: 'com.bitget.wallet',
        websiteUrl: 'https://bitget.com'
      },
      {
        name: 'Bybit',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/bybit.png',
        fallbackIcon: '📊',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'bybit://',
        appStoreId: 'bybit',
        playStoreId: 'com.bybit.app',
        websiteUrl: 'https://bybit.com'
      },
      {
        name: 'Gate.io',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/gate.png',
        fallbackIcon: '🚪',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'gate://',
        appStoreId: 'gate',
        playStoreId: 'com.gateio.gateio',
        websiteUrl: 'https://gate.io'
      },
      {
        name: 'Huobi',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/huobi.png',
        fallbackIcon: '🔥',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'huobi://',
        appStoreId: 'huobi',
        playStoreId: 'com.huobi.pro',
        websiteUrl: 'https://huobi.com'
      },
      {
        name: 'Kraken',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/kraken.png',
        fallbackIcon: '🐙',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'kraken://',
        appStoreId: 'kraken',
        playStoreId: 'com.kraken.trade',
        websiteUrl: 'https://kraken.com'
      },
      {
        name: 'Binance',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/binance.png',
        fallbackIcon: '🟡',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'binance://',
        appStoreId: 'binance',
        playStoreId: 'com.binance.dev',
        websiteUrl: 'https://binance.com'
      },
      {
        name: 'Math Wallet',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/math.png',
        fallbackIcon: '🧮',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'math://',
        appStoreId: 'math-wallet',
        playStoreId: 'com.mathwallet.android',
        websiteUrl: 'https://mathwallet.org'
      },
      {
        name: 'TokenPocket',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/tokenpocket.png',
        fallbackIcon: '💼',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'tpt://',
        appStoreId: 'tokenpocket',
        playStoreId: 'vip.mytokenpocket',
        websiteUrl: 'https://tokenpocket.pro'
      },
      {
        name: 'ONTO',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/onto.png',
        fallbackIcon: '🔐',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'onto://',
        appStoreId: 'onto',
        playStoreId: 'com.github.ontio.onto',
        websiteUrl: 'https://onto.app'
      },
      {
        name: 'imToken',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/imtoken.png',
        fallbackIcon: '🔑',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'imtokenv2://',
        appStoreId: 'imtoken',
        playStoreId: 'im.token.app',
        websiteUrl: 'https://imtoken.com'
      },
      {
        name: 'Coin98',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/coin98.png',
        fallbackIcon: '98',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'coin98://',
        appStoreId: 'coin98',
        playStoreId: 'coin98.crypto.finance.media',
        websiteUrl: 'https://coin98.com'
      },
      {
        name: 'Blocto',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/blocto.png',
        fallbackIcon: '🎯',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'blocto://',
        appStoreId: 'blocto',
        playStoreId: 'com.blocto.app',
        websiteUrl: 'https://blocto.io'
      },

      {
        name: 'Nightly',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/nightly.png',
        fallbackIcon: '🌙',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'nightly://',
        appStoreId: 'nightly',
        playStoreId: 'com.nightlylabs.wallet',
        websiteUrl: 'https://nightly.app'
      },
      {
        name: 'Clover',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/clover.png',
        fallbackIcon: '🍀',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'clover://',
        appStoreId: 'clover',
        playStoreId: 'com.clover.wallet',
        websiteUrl: 'https://clover.finance'
      },
      {
        name: 'WalletConnect',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/walletconnect.png',
        fallbackIcon: '🔗',
        isAvailable: false,
        detectionMethod: 'manual',
        websiteUrl: 'https://walletconnect.com'
      },
      {
        name: 'MetaMask',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/metamask.png',
        fallbackIcon: '🦊',
        isAvailable: false,
        detectionMethod: 'browser-extension',
        websiteUrl: 'https://metamask.io'
      },
      {
        name: 'Rainbow',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/rainbow.png',
        fallbackIcon: '🌈',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'rainbow://',
        appStoreId: 'rainbow',
        playStoreId: 'me.rainbow',
        websiteUrl: 'https://rainbow.me'
      },
      {
        name: 'Argent',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/argent.png',
        fallbackIcon: '🛡️',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'argent://',
        appStoreId: 'argent',
        playStoreId: 'im.argent.contractwalletclient',
        websiteUrl: 'https://argent.xyz'
      },
      {
        name: 'Bravos',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/bravos.png',
        fallbackIcon: '⚔️',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'bravos://',
        appStoreId: 'bravos',
        playStoreId: 'com.bravos.wallet',
        websiteUrl: 'https://bravos.app'
      },
      {
        name: 'Myria',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/myria.png',
        fallbackIcon: '🎮',
        isAvailable: false,
        detectionMethod: 'deep-link',
        deepLinkScheme: 'myria://',
        appStoreId: 'myria',
        playStoreId: 'com.myria.wallet',
        websiteUrl: 'https://myria.com'
      }
    ];

    // Add all providers to the map
    providers.forEach(provider => {
      this.walletProviders.set(provider.name.toLowerCase(), provider);
    });
  }

  /**
   * Check if a wallet is available on the device
   */
  async checkWalletAvailability(walletName: string): Promise<boolean> {
    try {
      const provider = this.walletProviders.get(walletName.toLowerCase());
      if (!provider) {
        return false;
      }

      switch (provider.detectionMethod) {
        case 'deep-link':
          return await this.checkDeepLinkAvailability(provider);
        case 'browser-extension':
          return await this.checkBrowserExtensionAvailability(provider);
        case 'app-installation':
          return await this.checkAppInstallationAvailability(provider);
        case 'manual':
          return true; // Always available for manual wallets
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking availability for ${walletName}:`, error);
      return false;
    }
  }

  /**
   * Check if a wallet is available via deep link
   */
  private async checkDeepLinkAvailability(provider: WalletProviderInfo): Promise<boolean> {
    if (!provider.deepLinkScheme) {
      return false;
    }

    try {
      // For React Native, we can check if the app can handle the deep link
      const { Linking, Platform } = require('react-native');
      
      // Try to check if the deep link can be opened
      const canOpen = await Linking.canOpenURL(provider.deepLinkScheme);
      
      console.log(`🔍 WalletLogoService: Checking ${provider.name} availability:`, {
        scheme: provider.deepLinkScheme,
        canOpen: canOpen,
        platform: Platform.OS
      });
      
      // If the deep link check fails, try alternative detection methods
      if (!canOpen && Platform.OS === 'android') {
        // For Android, try checking if the app is installed using package name
        const packageName = this.getPackageNameForWallet(provider.name);
        if (packageName) {
          try {
            const packageCanOpen = await Linking.canOpenURL(`${packageName}://`);
            console.log(`🔍 WalletLogoService: ${provider.name} package check:`, {
              package: packageName,
              canOpen: packageCanOpen
            });
            if (packageCanOpen) {
              return true;
            }
          } catch (packageError) {
            console.log(`🔍 WalletLogoService: Package check failed for ${provider.name}:`, packageError);
          }
        }
        
        // For Phantom specifically, try multiple detection methods
        if (provider.name.toLowerCase() === 'phantom') {
          const phantomDetectionResult = await this.detectPhantomWallet();
          if (phantomDetectionResult) {
            console.log(`🔍 WalletLogoService: Phantom detected via alternative method`);
            return true;
          }
        }
      }
      
      return canOpen;
    } catch (error) {
      console.error(`Error checking deep link for ${provider.name}:`, error);
      
      // For Phantom specifically, try alternative detection even if deep link check fails
      if (provider.name.toLowerCase() === 'phantom') {
        const phantomDetectionResult = await this.detectPhantomWallet();
        if (phantomDetectionResult) {
          console.log(`🔍 WalletLogoService: Phantom detected via fallback method`);
          return true;
        }
      }
      
      // Don't assume availability on error - this can lead to false positives
      console.log(`🔍 WalletLogoService: ${provider.name} availability check failed, marking as unavailable`);
      return false;
    }
  }

  /**
   * Special detection method for Phantom wallet
   */
  private async detectPhantomWallet(): Promise<boolean> {
    try {
      const { Linking, Platform } = require('react-native');
      
      // Try multiple Phantom deep link schemes
      const phantomSchemes = [
        'phantom://',
        'app.phantom://',
        'phantom://browse',
        'app.phantom://browse'
      ];
      
      for (const scheme of phantomSchemes) {
        try {
          const canOpen = await Linking.canOpenURL(scheme);
          console.log(`🔍 WalletLogoService: Phantom scheme test ${scheme}:`, canOpen);
          if (canOpen) {
            return true;
          }
        } catch (error) {
          console.log(`🔍 WalletLogoService: Phantom scheme test failed for ${scheme}:`, error);
        }
      }
      
      // For Android, try to check if the Phantom app is installed
      if (Platform.OS === 'android') {
        try {
          // Try to open Phantom with a specific action
          const canOpen = await Linking.canOpenURL('phantom://browse');
          console.log(`🔍 WalletLogoService: Phantom browse test:`, canOpen);
          if (canOpen) {
            return true;
          }
        } catch (error) {
          console.log(`🔍 WalletLogoService: Phantom browse test failed:`, error);
        }
      }
      
      return false;
    } catch (error) {
      console.error('🔍 WalletLogoService: Error in Phantom detection:', error);
      return false;
    }
  }

  /**
   * Check if a browser extension is available
   */
  private async checkBrowserExtensionAvailability(provider: WalletProviderInfo): Promise<boolean> {
    // Browser extensions are typically not available in React Native
    // This would be more relevant for web applications
    return false;
  }

  /**
   * Check if an app is installed
   */
  private async checkAppInstallationAvailability(provider: WalletProviderInfo): Promise<boolean> {
    try {
      const { Linking } = require('react-native');
      
      // Check if the app can be opened via its scheme
      if (provider.deepLinkScheme) {
        return await Linking.canOpenURL(provider.deepLinkScheme);
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking app installation for ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Test if a wallet can actually be connected to
   */
  async testWalletConnection(walletName: string): Promise<boolean> {
    try {
      console.log(`🔍 WalletLogoService: Testing connection to ${walletName}...`);
      
      // Try to open the wallet's deep link to see if it responds
      const provider = this.walletProviders.get(walletName.toLowerCase());
      if (!provider || !provider.deepLinkScheme) {
        return false;
      }

      const { Linking } = require('react-native');
      
      // Try to open the wallet's deep link
      const canOpen = await Linking.canOpenURL(provider.deepLinkScheme);
      
      if (canOpen) {
        console.log(`🔍 WalletLogoService: ${walletName} deep link test successful`);
        return true;
      }

      // For Android, try package-based detection
      const { Platform } = require('react-native');
      if (Platform.OS === 'android') {
        const packageName = this.getPackageNameForWallet(walletName);
        if (packageName) {
          try {
            const packageCanOpen = await Linking.canOpenURL(`${packageName}://`);
            if (packageCanOpen) {
              console.log(`🔍 WalletLogoService: ${walletName} package test successful`);
              return true;
            }
          } catch (error) {
            console.log(`🔍 WalletLogoService: ${walletName} package test failed:`, error);
          }
        }
      }

      // For Phantom specifically, use passive detection instead of opening the app
      if (walletName.toLowerCase() === 'phantom') {
        const phantomInstalled = await this.passivePhantomDetection();
        if (phantomInstalled) {
          console.log(`🔍 WalletLogoService: ${walletName} passive detection successful`);
          return true;
        }
      }

      console.log(`🔍 WalletLogoService: ${walletName} connection test failed`);
      return false;
      
    } catch (error) {
      console.error(`🔍 WalletLogoService: Error testing ${walletName} connection:`, error);
      return false;
    }
  }

  /**
   * Passive Phantom detection without opening the app
   */
  private async passivePhantomDetection(): Promise<boolean> {
    try {
      const { Linking, Platform } = require('react-native');
      
      // Test multiple Phantom deep link schemes without opening the app
      const phantomSchemes = [
        'phantom://',
        'app.phantom://',
        'phantom://browse',
        'app.phantom://browse'
      ];
      
      for (const scheme of phantomSchemes) {
        try {
          const canOpen = await Linking.canOpenURL(scheme);
          if (canOpen) {
            console.log(`🔍 WalletLogoService: Phantom scheme ${scheme} available`);
            return true;
          }
        } catch (error) {
          console.log(`🔍 WalletLogoService: Phantom scheme ${scheme} test failed:`, error);
        }
      }
      
      // For Android, try package-based detection
      if (Platform.OS === 'android') {
        try {
          const packageCanOpen = await Linking.canOpenURL('app.phantom://');
          if (packageCanOpen) {
            console.log('🔍 WalletLogoService: Phantom package detection successful');
            return true;
          }
        } catch (error) {
          console.log('🔍 WalletLogoService: Phantom package detection failed:', error);
        }
      }
      
      return false;
    } catch (error) {
      console.error('🔍 WalletLogoService: Error in passive Phantom detection:', error);
      return false;
    }
  }

  /**
   * Test if Phantom is actually installed by trying to open it
   * DEPRECATED: This method opens the wallet app, which is not desired behavior
   * Use passivePhantomDetection() instead
   */
  private async testPhantomInstallation(): Promise<boolean> {
    console.warn('🔍 WalletLogoService: testPhantomInstallation is deprecated - use passive detection instead');
    return this.passivePhantomDetection();
  }

  /**
   * Get package name for wallet on Android
   */
  private getPackageNameForWallet(walletName: string): string | null {
    const packageMap: { [key: string]: string } = {
      'phantom': 'app.phantom',
      'solflare': 'com.solflare.wallet',
      'backpack': 'com.backpack.app',
      'slope': 'com.slope.finance',
      'exodus': 'exodusmovement.exodus',
      'coinbase': 'com.coinbase.android',
      'okx': 'com.okinc.okex.gp',
      'brave': 'com.brave.browser',
      'magic eden': 'com.magiceden.app',
      'talisman': 'com.talisman.wallet',
      'xdefi': 'io.xdefi.wallet',
      'zerion': 'io.zerion.app',
      'trust wallet': 'com.wallet.crypto.trustapp',
      'safepal': 'com.safepal.wallet',
      'bitget': 'com.bitget.wallet',
      'bybit': 'com.bybit.app',
      'gate.io': 'io.gate.wallet',
      'huobi': 'com.huobi.wallet',
      'kraken': 'com.kraken.trade',
      'binance': 'com.binance.dev',
      'math wallet': 'com.mathwallet.android',
      'tokenpocket': 'vip.mytokenpocket',
      'onto': 'com.onchain.onto',
      'imtoken': 'im.token.app',
      'coin98': 'coin98.crypto.finance.media',
      'blocto': 'com.blocto.app',
      'nightly': 'com.nightly.app',
      'clover': 'com.clover.finance',
      'metamask': 'io.metamask',
      'rainbow': 'me.rainbow',
      'argent': 'im.argent.contractwalletclient',
      'bravos': 'com.bravos.wallet',
      'myria': 'com.myria.wallet'
    };
    
    return packageMap[walletName.toLowerCase()] || null;
  }

  /**
   * Get all available wallet providers with their availability status
   */
  async getAvailableWallets(): Promise<WalletProviderInfo[]> {
    const wallets: WalletProviderInfo[] = [];
    
    console.log('🔍 WalletLogoService: Starting wallet availability check...');
    
    for (const [name, provider] of this.walletProviders) {
      const isAvailable = await this.checkWalletAvailability(provider.name);
      const updatedProvider = { ...provider, isAvailable };
      wallets.push(updatedProvider);
      
      console.log(`🔍 WalletLogoService: ${provider.name} - Available: ${isAvailable}`);
    }
    
    // Only add fallback providers if they're not already in the list
    // and only for wallets that we can actually test
    const popularWallets = ['Phantom', 'Solflare', 'Backpack'];
    for (const walletName of popularWallets) {
      const existingWallet = wallets.find(w => w.name === walletName);
      if (!existingWallet) {
        console.log(`🔍 WalletLogoService: Adding fallback ${walletName} wallet`);
        const fallbackProvider: WalletProviderInfo = {
          name: walletName,
          logoUrl: `https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/${walletName.toLowerCase()}.png`,
          fallbackIcon: walletName === 'Phantom' ? '👻' : walletName === 'Solflare' ? '🔥' : '🎒',
          isAvailable: false, // Start as false, will be tested
          detectionMethod: 'manual'
        };
        wallets.push(fallbackProvider);
      }
    }
    
    // Test connections for popular wallets that were marked as unavailable
    for (const wallet of wallets) {
      if (popularWallets.includes(wallet.name) && !wallet.isAvailable) {
        console.log(`🔍 WalletLogoService: Testing connection for ${wallet.name}...`);
        const canConnect = await this.testWalletConnection(wallet.name);
        wallet.isAvailable = canConnect;
        console.log(`🔍 WalletLogoService: ${wallet.name} connection test result: ${canConnect}`);
      }
    }
    
    console.log('🔍 WalletLogoService: Final wallet list:', wallets.map(w => `${w.name} (${w.isAvailable ? 'Available' : 'Not Available'})`));
    
    return wallets;
  }

  /**
   * Get wallet logo URL
   */
  getWalletLogoUrl(walletName: string): string {
    const provider = this.walletProviders.get(walletName.toLowerCase());
    return provider?.logoUrl || '';
  }

  /**
   * Get wallet fallback icon
   */
  getWalletFallbackIcon(walletName: string): string {
    const provider = this.walletProviders.get(walletName.toLowerCase());
    return provider?.fallbackIcon || '💳';
  }

  /**
   * Get wallet provider info
   */
  getWalletProviderInfo(walletName: string): WalletProviderInfo | null {
    return this.walletProviders.get(walletName.toLowerCase()) || null;
  }

  /**
   * Get all wallet providers (without availability check)
   */
  getAllWalletProviders(): WalletProviderInfo[] {
    return Array.from(this.walletProviders.values());
  }
}

export const walletLogoService = WalletLogoService.getInstance(); 