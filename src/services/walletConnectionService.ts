import { Alert, Linking, Platform } from 'react-native';
import { walletLogoService } from './walletLogoService';
import { solanaAppKitService } from './solanaAppKitService';
import { solanaService } from './solanaTransactionService';

export interface WalletConnectionResult {
  success: boolean;
  walletAddress?: string;
  walletName?: string;
  balance?: number;
  error?: string;
  provider?: string;
}

export interface WalletConnectionOptions {
  provider: string;
  redirectToApp?: boolean;
  showInstallPrompt?: boolean;
}

class WalletConnectionService {
  private static instance: WalletConnectionService;

  public static getInstance(): WalletConnectionService {
    if (!WalletConnectionService.instance) {
      WalletConnectionService.instance = new WalletConnectionService();
    }
    return WalletConnectionService.instance;
  }

  /**
   * Connect to any available wallet provider
   */
  async connectWallet(options: WalletConnectionOptions): Promise<WalletConnectionResult> {
    try {
      console.log('🔗 WalletConnection: Attempting to connect to', options.provider);

      // Step 1: Check if the wallet is available
      const isAvailable = await this.checkWalletAvailability(options.provider);
      
      if (!isAvailable) {
        // Try to install the wallet if not available
        if (options.showInstallPrompt !== false) {
          const shouldInstall = await this.promptWalletInstallation(options.provider);
          if (shouldInstall) {
            await this.installWallet(options.provider);
            // After installation, try connecting again
            return this.connectWallet({ ...options, showInstallPrompt: false });
          }
        }
        
        return {
          success: false,
          error: `${options.provider} is not available on this device`
        };
      }

      // Step 2: Attempt to connect using the appropriate method
      const connectionResult = await this.attemptConnection(options);
      
      if (!connectionResult.success) {
        return connectionResult;
      }

      // Step 3: Verify the connection and get wallet info
      const walletInfo = await this.verifyConnection(connectionResult.walletAddress!);
      
      return {
        success: true,
        walletAddress: walletInfo.address,
        walletName: walletInfo.walletName,
        balance: walletInfo.balance,
        provider: options.provider
      };

    } catch (error) {
      console.error('🔗 WalletConnection: Connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Check if a wallet is available on the device
   */
  private async checkWalletAvailability(providerName: string): Promise<boolean> {
    try {
      const providerInfo = walletLogoService.getWalletProviderInfo(providerName);
      if (!providerInfo) {
        return false;
      }

      switch (providerInfo.detectionMethod) {
        case 'deep-link':
          return await this.checkDeepLinkAvailability(providerInfo);
        case 'browser-extension':
          return await this.checkBrowserExtensionAvailability(providerInfo);
        case 'app-installation':
          return await this.checkAppInstallationAvailability(providerInfo);
        case 'manual':
          return true; // Manual wallets are always available
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking wallet availability:', error);
      return false;
    }
  }

  /**
   * Check deep link availability
   */
  private async checkDeepLinkAvailability(providerInfo: any): Promise<boolean> {
    if (!providerInfo.deepLinkScheme) {
      return false;
    }

    try {
      return await Linking.canOpenURL(providerInfo.deepLinkScheme);
    } catch (error) {
      console.error('Error checking deep link:', error);
      return false;
    }
  }

  /**
   * Check browser extension availability
   */
  private async checkBrowserExtensionAvailability(providerInfo: any): Promise<boolean> {
    // Browser extensions are not available in React Native
    return false;
  }

  /**
   * Check app installation availability
   */
  private async checkAppInstallationAvailability(providerInfo: any): Promise<boolean> {
    try {
      if (providerInfo.deepLinkScheme) {
        return await Linking.canOpenURL(providerInfo.deepLinkScheme);
      }
      return false;
    } catch (error) {
      console.error('Error checking app installation:', error);
      return false;
    }
  }

  /**
   * Attempt to connect to the wallet using the appropriate method
   */
  private async attemptConnection(options: WalletConnectionOptions): Promise<WalletConnectionResult> {
    try {
      const providerInfo = walletLogoService.getWalletProviderInfo(options.provider);
      if (!providerInfo) {
        return {
          success: false,
          error: `Provider ${options.provider} not found`
        };
      }

      // Use the AppKit service for the actual connection
      const walletInfo = await solanaAppKitService.connectToProvider(options.provider);
      
      if (!walletInfo.address) {
        return {
          success: false,
          error: 'Failed to get wallet address'
        };
      }

      return {
        success: true,
        walletAddress: walletInfo.address,
        walletName: walletInfo.walletName,
        balance: walletInfo.balance
      };

    } catch (error) {
      console.error('Error attempting connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Verify the connection and get additional wallet info
   */
  private async verifyConnection(walletAddress: string): Promise<any> {
    try {
      // Get wallet balance and other info
      const walletInfo = await solanaService.getWalletInfo();
      
      return {
        address: walletAddress,
        walletName: 'External Wallet', // Default name since SolanaWalletInfo doesn't have walletName
        balance: walletInfo.balance || 0
      };
    } catch (error) {
      console.error('Error verifying connection:', error);
      return {
        address: walletAddress,
        walletName: 'External Wallet',
        balance: 0
      };
    }
  }

  /**
   * Prompt user to install a wallet
   */
  private async promptWalletInstallation(providerName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const providerInfo = walletLogoService.getWalletProviderInfo(providerName);
      const storeUrl = Platform.OS === 'ios' ? providerInfo?.appStoreId : providerInfo?.playStoreId;
      
      Alert.alert(
        `${providerName} Not Found`,
        `${providerName} is not installed on your device. Would you like to install it?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Install',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Install wallet by opening app store
   */
  private async installWallet(providerName: string): Promise<void> {
    try {
      const providerInfo = walletLogoService.getWalletProviderInfo(providerName);
      if (!providerInfo) {
        throw new Error('Provider not found');
      }

      let storeUrl = '';
      if (Platform.OS === 'ios') {
        storeUrl = `https://apps.apple.com/app/id${providerInfo.appStoreId}`;
      } else {
        storeUrl = `https://play.google.com/store/apps/details?id=${providerInfo.playStoreId}`;
      }

      if (storeUrl) {
        await Linking.openURL(storeUrl);
      }
    } catch (error) {
      console.error('Error installing wallet:', error);
      throw error;
    }
  }

  /**
   * Get all available wallets on the device
   */
  async getAvailableWallets(): Promise<any[]> {
    try {
      const allWallets = walletLogoService.getAllWalletProviders();
      const availableWallets = [];

      for (const wallet of allWallets) {
        const isAvailable = await this.checkWalletAvailability(wallet.name);
        if (isAvailable) {
          availableWallets.push({
            ...wallet,
            isAvailable: true
          });
        }
      }

      return availableWallets;
    } catch (error) {
      console.error('Error getting available wallets:', error);
      return [];
    }
  }

  /**
   * Disconnect from current wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      await solanaAppKitService.disconnectFromProvider();
      console.log('🔗 WalletConnection: Disconnected from wallet');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  /**
   * Check if a wallet is currently connected
   */
  async isWalletConnected(): Promise<boolean> {
    try {
      return solanaAppKitService.isConnected();
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      return false;
    }
  }

  /**
   * Get connected wallet info
   */
  async getConnectedWalletInfo(): Promise<any> {
    try {
      if (!await this.isWalletConnected()) {
        return null;
      }

      return await solanaAppKitService.getWalletInfo();
    } catch (error) {
      console.error('Error getting connected wallet info:', error);
      return null;
    }
  }

  /**
   * Sign a transaction with the connected wallet
   */
  async signTransaction(transaction: any): Promise<any> {
    try {
      if (!await this.isWalletConnected()) {
        throw new Error('No wallet connected');
      }

      const connectedProvider = solanaAppKitService.getConnectedProvider();
      if (!connectedProvider) {
        throw new Error('No wallet provider connected');
      }

      return await connectedProvider.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: any): Promise<any> {
    try {
      if (!await this.isWalletConnected()) {
        throw new Error('No wallet connected');
      }

      const connectedProvider = solanaAppKitService.getConnectedProvider();
      if (!connectedProvider) {
        throw new Error('No wallet provider connected');
      }

      return await connectedProvider.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }
}

export const walletConnectionService = WalletConnectionService.getInstance(); 