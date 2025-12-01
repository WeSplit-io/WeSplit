/**
 * Wallet Provider Registry
 * Central registry for all supported Solana wallet providers
 * Includes detection methods, deep link schemes, and metadata
 */

import { Platform } from 'react-native';

export interface WalletProviderInfo {
  name: string;
  displayName: string;
  logoUrl: string;
  fallbackIcon: string;
  isAvailable: boolean;
  detectionMethod: 'mwa' | 'deep-link' | 'package' | 'manual';
  deepLinkScheme?: string;
  packageName?: string;
  appStoreId?: string;
  playStoreId?: string;
  websiteUrl?: string;
  mwaSupported?: boolean;
  priority: number; // Higher number = higher priority in UI
}

export interface WalletProviderRegistry {
  [key: string]: WalletProviderInfo;
}

/**
 * Comprehensive registry of Solana wallet providers
 * Includes detection methods, deep link schemes, and platform-specific information
 */
export const WALLET_PROVIDER_REGISTRY: WalletProviderRegistry = {
  phantom: {
    name: 'phantom',
    displayName: 'Phantom',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphantom-logo.png?alt=media&token=18cd1c78-d879-4b94-abbe-a2011149837a',
    fallbackIcon: '👻',
    isAvailable: false,
    detectionMethod: 'mwa',
    deepLinkScheme: 'phantom://',
    packageName: 'app.phantom',
    appStoreId: '1598432977', // ✅ Verified correct
    playStoreId: 'app.phantom',
    websiteUrl: 'https://phantom.app',
    mwaSupported: true,
    priority: 100
  },
  solflare: {
    name: 'solflare',
    displayName: 'Solflare',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsolflare-logo.png?alt=media&token=8b4331c1-3f9d-4f57-907c-53a2f0d8b137',
    fallbackIcon: '🔥',
    isAvailable: false,
    detectionMethod: 'mwa',
    deepLinkScheme: 'solflare://',
    packageName: 'com.solflare.wallet',
    appStoreId: '1580902717',
    playStoreId: 'com.solflare.wallet',
    websiteUrl: 'https://solflare.com',
    mwaSupported: true,
    priority: 95
  },
  backpack: {
    name: 'backpack',
    displayName: 'Backpack',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbackpack-logo.png?alt=media&token=7c063169-db3e-4396-ad9f-e112b39d688b',
    fallbackIcon: '🎒',
    isAvailable: false,
    detectionMethod: 'mwa',
    deepLinkScheme: 'backpack://',
    packageName: 'com.backpack.app',
    // appStoreId: '1667191423', // No iOS app available
    playStoreId: 'com.backpack.app',
    websiteUrl: 'https://backpack.app',
    mwaSupported: true,
    priority: 90
  },
  slope: {
    name: 'slope',
    displayName: 'Slope',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fslope-logo.png?alt=media&token=62079355-59e2-48da-989b-b795873f8be6',
    fallbackIcon: '📈',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'slope://',
    packageName: 'com.slope.finance',
    // appStoreId: '1610840637', // No iOS app available
    playStoreId: 'com.slope.finance',
    websiteUrl: 'https://slope.finance',
    mwaSupported: false,
    priority: 85
  },
  glow: {
    name: 'glow',
    displayName: 'Glow',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fglow-logo.png?alt=media&token=65abdd59-1fc7-4e8b-ad25-0c29df68f412',
    fallbackIcon: '✨',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'glow://',
    packageName: 'com.glow.app',
    // appStoreId: '1599581225', // No iOS app available
    playStoreId: 'com.glow.app',
    websiteUrl: 'https://glow.app',
    mwaSupported: false,
    priority: 80
  },
  exodus: {
    name: 'exodus',
    displayName: 'Exodus',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fexodus-logo.png?alt=media&token=fbe986bd-e5ef-488e-87c0-7fa860cb9a39',
    fallbackIcon: '🚀',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'exodus://',
    packageName: 'com.exodus.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.exodus.wallet',
    websiteUrl: 'https://exodus.com',
    mwaSupported: false,
    priority: 75
  },
  okx: {
    name: 'okx',
    displayName: 'OKX',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fokx-logo.png?alt=media&token=3880f1e5-d8a0-4494-af9f-997ba91e6ce0',
    fallbackIcon: '🟠',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'okx://',
    packageName: 'com.okx.wallet',
    appStoreId: '1327268470',
    playStoreId: 'com.okx.wallet',
    websiteUrl: 'https://okx.com',
    mwaSupported: false,
    priority: 70
  },
  mathwallet: {
    name: 'mathwallet',
    displayName: 'Math Wallet',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmathwallet-logo.png?alt=media&token=93173eb3-f83f-4b49-abeb-0334621205a3',
    fallbackIcon: '🧮',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'mathwallet://',
    packageName: 'com.mathwallet.app',
    appStoreId: '1384836422',
    playStoreId: 'com.mathwallet.app',
    websiteUrl: 'https://mathwallet.org',
    mwaSupported: false,
    priority: 65
  },
  magiceden: {
    name: 'magiceden',
    displayName: 'Magic Eden',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmagiceden-logo.png?alt=media&token=00c68158-c015-4056-a513-cfb2763017e3',
    fallbackIcon: '🎭',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'magiceden://',
    packageName: 'com.magiceden.wallet',
    appStoreId: '1635329607',
    playStoreId: 'com.magiceden.wallet',
    websiteUrl: 'https://magiceden.io',
    mwaSupported: false,
    priority: 60
  },
  kraken: {
    name: 'kraken',
    displayName: 'Kraken',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkraken-logo.png?alt=media&token=b97dc798-92d6-4d5c-aa26-a2727c025d93',
    fallbackIcon: '🦑',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'kraken://',
    packageName: 'com.kraken.wallet',
    appStoreId: '1483277020',
    playStoreId: 'com.kraken.wallet',
    websiteUrl: 'https://kraken.com',
    mwaSupported: false,
    priority: 55
  },
  imtoken: {
    name: 'imtoken',
    displayName: 'imToken',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fimtoken-logo.png?alt=media&token=878e8b4b-6c6a-4b38-828d-c402d56352b4',
    fallbackIcon: '🔐',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'imtoken://',
    packageName: 'com.imtoken.wallet',
    appStoreId: '1384798940',
    playStoreId: 'com.imtoken.wallet',
    websiteUrl: 'https://token.im',
    mwaSupported: false,
    priority: 50
  },
  huobi: {
    name: 'huobi',
    displayName: 'Huobi',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhuobi-logo.png?alt=media&token=aa0417be-fae6-4e55-a9f3-4e46fd837c6f',
    fallbackIcon: '🟡',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'huobi://',
    packageName: 'com.huobi.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.huobi.wallet',
    websiteUrl: 'https://huobi.com',
    mwaSupported: false,
    priority: 45
  },
  gate: {
    name: 'gate',
    displayName: 'Gate.io',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgate-logo.png?alt=media&token=d551e2d3-e180-4cc0-b9f3-914a174b2d5e',
    fallbackIcon: '🚪',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'gate.io://',
    packageName: 'com.gate.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.gate.wallet',
    websiteUrl: 'https://gate.io',
    mwaSupported: false,
    priority: 40
  },
  coinbase: {
    name: 'coinbase',
    displayName: 'Coinbase',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcoinbase-logo.png?alt=media&token=8b4331c1-3f9d-4f57-907c-53a2f0d8b137',
    fallbackIcon: '🔵',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'coinbase://',
    packageName: 'com.coinbase.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.coinbase.wallet',
    websiteUrl: 'https://coinbase.com',
    mwaSupported: false,
    priority: 35
  },
  coin98: {
    name: 'coin98',
    displayName: 'Coin98',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcoin98-logo.png?alt=media&token=e217c873-7346-47be-bc7b-acee7e9559ee',
    fallbackIcon: '🪙',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'coin98://',
    packageName: 'com.coin98.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.coin98.wallet',
    websiteUrl: 'https://coin98.com',
    mwaSupported: false,
    priority: 30
  },
  clover: {
    name: 'clover',
    displayName: 'Clover',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fclover-logo.png?alt=media&token=10b35b99-3100-4e22-b17c-ca522d3e0cd8',
    fallbackIcon: '🍀',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'clover://',
    packageName: 'com.clover.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.clover.wallet',
    websiteUrl: 'https://clover.finance',
    mwaSupported: false,
    priority: 25
  },
  bybit: {
    name: 'bybit',
    displayName: 'Bybit',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbybit-logo.png?alt=media&token=77756071-5994-4ba8-b173-7ff617e2bb9b',
    fallbackIcon: '🟣',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'bybit://',
    packageName: 'com.bybit.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.bybit.wallet',
    websiteUrl: 'https://bybit.com',
    mwaSupported: false,
    priority: 20
  },
  bravos: {
    name: 'bravos',
    displayName: 'Bravos',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbravos-logo.png?alt=media&token=7c063169-db3e-4396-ad9f-e112b39d688b',
    fallbackIcon: '👏',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'bravos://',
    packageName: 'com.bravos.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.bravos.wallet',
    websiteUrl: 'https://bravos.app',
    mwaSupported: false,
    priority: 15
  },
  brave: {
    name: 'brave',
    displayName: 'Brave',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbrave-logo.png?alt=media&token=62079355-59e2-48da-989b-b795873f8be6',
    fallbackIcon: '🦁',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'brave://',
    packageName: 'com.brave.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.brave.wallet',
    websiteUrl: 'https://brave.com',
    mwaSupported: false,
    priority: 10
  },
  blocto: {
    name: 'blocto',
    displayName: 'Blocto',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fblocto-logo.png?alt=media&token=65abdd59-1fc7-4e8b-ad25-0c29df68f412',
    fallbackIcon: '🧱',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'blocto://',
    packageName: 'com.blocto.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.blocto.wallet',
    websiteUrl: 'https://blocto.io',
    mwaSupported: false,
    priority: 5
  },
  bitget: {
    name: 'bitget',
    displayName: 'Bitget',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbitget-logo.png?alt=media&token=fbe986bd-e5ef-488e-87c0-7fa860cb9a39',
    fallbackIcon: '🟢',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'bitget://',
    packageName: 'com.bitget.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.bitget.wallet',
    websiteUrl: 'https://bitget.com',
    mwaSupported: false,
    priority: 4
  },
  binance: {
    name: 'binance',
    displayName: 'Binance',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbinance-logo.png?alt=media&token=3880f1e5-d8a0-4494-af9f-997ba91e6ce0',
    fallbackIcon: '🟡',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'binance://',
    packageName: 'com.binance.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.binance.wallet',
    websiteUrl: 'https://binance.com',
    mwaSupported: false,
    priority: 3
  },
  argent: {
    name: 'argent',
    displayName: 'Argent',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fargent-logo.png?alt=media&token=f09e5ed1-88b7-4b80-ae06-198c223b965a',
    fallbackIcon: '🛡️',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'argent://',
    packageName: 'com.argent.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.argent.wallet',
    websiteUrl: 'https://argent.xyz',
    mwaSupported: false,
    priority: 2
  },
  ud: {
    name: 'ud',
    displayName: 'Unstoppable Domains',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fud-logo.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448',
    fallbackIcon: '🌐',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'ud://',
    packageName: 'com.ud.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.ud.wallet',
    websiteUrl: 'https://unstoppabledomains.com',
    mwaSupported: false,
    priority: 1
  },
  tokenpocket: {
    name: 'tokenpocket',
    displayName: 'TokenPocket',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftokenpocket-logo.png?alt=media&token=4d31dd0f-1d69-4bd5-a024-52239dedb53d',
    fallbackIcon: '🎒',
    isAvailable: false,
    detectionMethod: 'deep-link',
    deepLinkScheme: 'tokenpocket://',
    packageName: 'com.tokenpocket.wallet',
    appStoreId: '1414384820',
    playStoreId: 'com.tokenpocket.wallet',
    websiteUrl: 'https://tokenpocket.pro',
    mwaSupported: false,
    priority: 0
  }
};

/**
 * Get all wallet providers sorted by priority
 */
export const getAllWalletProviders = (): WalletProviderInfo[] => {
  return Object.values(WALLET_PROVIDER_REGISTRY)
    .sort((a, b) => b.priority - a.priority);
};

/**
 * Get wallet provider by name
 */
export const getWalletProvider = (name: string): WalletProviderInfo | undefined => {
  return WALLET_PROVIDER_REGISTRY[name.toLowerCase()];
};

/**
 * Get MWA-supported wallet providers
 */
export const getMWASupportedProviders = (): WalletProviderInfo[] => {
  return Object.values(WALLET_PROVIDER_REGISTRY)
    .filter(provider => provider.mwaSupported)
    .sort((a, b) => b.priority - a.priority);
};

/**
 * Get deep link schemes for iOS
 */
export const getIOSDeepLinkSchemes = (): string[] => {
  return Object.values(WALLET_PROVIDER_REGISTRY)
    .filter(provider => provider.deepLinkScheme)
    .map(provider => provider.deepLinkScheme!)
    .sort();
};

/**
 * Get package names for Android
 */
export const getAndroidPackageNames = (): string[] => {
  return Object.values(WALLET_PROVIDER_REGISTRY)
    .filter(provider => provider.packageName)
    .map(provider => provider.packageName!)
    .sort();
};

/**
 * Get store URLs for a wallet provider
 */
export const getStoreUrls = (providerName: string): { appStore?: string; playStore?: string } => {
  const provider = getWalletProvider(providerName);
  if (!provider) {
    return {};
  }

  const urls: { appStore?: string; playStore?: string } = {};

  if (provider.appStoreId) {
    urls.appStore = `https://apps.apple.com/app/id${provider.appStoreId}`;
  }

  if (provider.playStoreId) {
    urls.playStore = `https://play.google.com/store/apps/details?id=${provider.playStoreId}`;
  }

  return urls;
};

/**
 * Check if a wallet provider is supported on the current platform
 */
export const isProviderSupportedOnPlatform = (providerName: string): boolean => {
  const provider = getWalletProvider(providerName);
  if (!provider) {
    return false;
  }

  // All providers are supported on both platforms
  // Platform-specific logic can be added here if needed
  return true;
};

/**
 * Get the best detection method for a provider on the current platform
 */
export const getBestDetectionMethod = (providerName: string): 'mwa' | 'deep-link' | 'package' | 'manual' => {
  const provider = getWalletProvider(providerName);
  if (!provider) {
    return 'manual';
  }

  // Prefer MWA if supported
  if (provider.mwaSupported) {
    return 'mwa';
  }

  // Use deep link detection as fallback
  if (provider.deepLinkScheme) {
    return 'deep-link';
  }

  // Use package detection for Android
  if (Platform.OS === 'android' && provider.packageName) {
    return 'package';
  }

  return 'manual';
};
