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
      // This is a simplified check - in production you might want to use Linking.canOpenURL
      const { Linking } = require('react-native');
      return await Linking.canOpenURL(provider.deepLinkScheme);
    } catch (error) {
      console.error(`Error checking deep link for ${provider.name}:`, error);
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
   * Get all available wallet providers with their availability status
   */
  async getAvailableWallets(): Promise<WalletProviderInfo[]> {
    const wallets: WalletProviderInfo[] = [];
    
    for (const [name, provider] of this.walletProviders) {
      const isAvailable = await this.checkWalletAvailability(provider.name);
      const updatedProvider = { ...provider, isAvailable };
      wallets.push(updatedProvider);
    }
    
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