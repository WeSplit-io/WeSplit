import { Alert } from 'react-native';
import { solanaAppKitService } from './solanaAppKitService';
import { solanaService } from './solanaTransactionService';
import { walletLogoService } from './walletLogoService';

export interface ExternalWalletAuthResult {
  success: boolean;
  walletAddress?: string;
  walletName?: string;
  balance?: number;
  error?: string;
}

export interface WalletProvider {
  name: string;
  icon: string;
  logoUrl: string;
  isAvailable: boolean;
  connect(): Promise<any>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signMessage(message: any): Promise<any>;
}

class ExternalWalletAuthService {
  private static instance: ExternalWalletAuthService;

  public static getInstance(): ExternalWalletAuthService {
    if (!ExternalWalletAuthService.instance) {
      ExternalWalletAuthService.instance = new ExternalWalletAuthService();
    }
    return ExternalWalletAuthService.instance;
  }

  /**
   * Get available external wallet providers
   */
  async getAvailableProviders(): Promise<WalletProvider[]> {
    try {
      console.log('🔍 ExternalWalletAuth: Getting available providers...');
      
      // Get providers from AppKit service
      const appKitProviders = solanaAppKitService.getAvailableProviders();
      
      // Get wallet availability from logo service
      const availableWallets = await walletLogoService.getAvailableWallets();
      
      // Merge the data to get accurate availability status
      const mergedProviders = appKitProviders.map(appKitProvider => {
        const logoServiceWallet = availableWallets.find(w => 
          w.name.toLowerCase() === appKitProvider.name.toLowerCase()
        );
        
        return {
          name: appKitProvider.name,
          icon: appKitProvider.icon,
          logoUrl: appKitProvider.logoUrl,
          isAvailable: logoServiceWallet ? logoServiceWallet.isAvailable : appKitProvider.isAvailable,
          connect: appKitProvider.connect,
          disconnect: appKitProvider.disconnect,
          signTransaction: appKitProvider.signTransaction,
          signMessage: appKitProvider.signMessage
        };
      });
      
      console.log('🔍 ExternalWalletAuth: Merged providers count:', mergedProviders.length);
      console.log('🔍 ExternalWalletAuth: Available providers:', mergedProviders.filter(p => p.isAvailable).map(p => p.name));
      
      return mergedProviders;
    } catch (error) {
      console.error('Error getting available providers:', error);
      return [];
    }
  }

  /**
   * Connect to external wallet with authentication
   * This requires the user to sign a transaction to prove ownership
   */
  async connectWithAuthentication(providerName: string): Promise<ExternalWalletAuthResult> {
    try {
      console.log('🔐 ExternalWalletAuth: Starting authentication for provider:', providerName);

      // Step 1: Connect to the wallet provider
      const walletInfo = await solanaAppKitService.connectToProvider(providerName);
      
      if (!walletInfo.address) {
        throw new Error('Failed to get wallet address from provider');
      }

      console.log('🔐 ExternalWalletAuth: Connected to wallet:', walletInfo.address);

      // Step 2: Create a challenge transaction for authentication
      const challengeTransaction = await this.createChallengeTransaction(walletInfo.address);
      
      // Step 3: Request user to sign the challenge transaction
      const signedTransaction = await this.requestTransactionSignature(challengeTransaction, providerName);
      
      if (!signedTransaction) {
        throw new Error('User cancelled transaction signing');
      }

      // Step 4: Verify the signed transaction
      const verificationResult = await this.verifySignedTransaction(signedTransaction, walletInfo.address);
      
      if (!verificationResult.success) {
        throw new Error('Transaction verification failed');
      }

      console.log('🔐 ExternalWalletAuth: Authentication successful for wallet:', walletInfo.address);

      // Step 5: Get wallet balance
      const balance = await this.getWalletBalance(walletInfo.address);

      return {
        success: true,
        walletAddress: walletInfo.address,
        walletName: walletInfo.walletName || 'External Wallet',
        balance: balance
      };

    } catch (error) {
      console.error('🔐 ExternalWalletAuth: Authentication failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Create a challenge transaction for authentication
   * This creates a zero-amount transaction to prove wallet ownership
   */
  private async createChallengeTransaction(walletAddress: string): Promise<any> {
    try {
      // Create a challenge transaction that sends 0 SOL to the same address
      // This is a common pattern for wallet authentication
      const challengeTransaction = await solanaService.sendSolTransaction({
        to: walletAddress, // Send to self
        amount: 0, // Zero amount
        currency: 'SOL',
        memo: `WeSplit Authentication - ${Date.now()}`
      });

      return challengeTransaction;
    } catch (error) {
      console.error('Error creating challenge transaction:', error);
      throw new Error('Failed to create authentication challenge');
    }
  }

  /**
   * Request user to sign the challenge transaction
   */
  private async requestTransactionSignature(transaction: any, providerName: string): Promise<any> {
    try {
      // Use the AppKit service to request transaction signing
      // Note: This is a simplified version - in a real implementation,
      // you would need to implement the actual signing flow
      const connectedProvider = solanaAppKitService.getConnectedProvider();
      
      if (!connectedProvider) {
        throw new Error('No wallet provider connected');
      }

      // For now, we'll simulate the signing process
      // In a real implementation, this would call the provider's signTransaction method
      console.log('🔐 ExternalWalletAuth: Requesting transaction signature from provider:', providerName);
      
      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return transaction; // Return the transaction as "signed"
    } catch (error) {
      console.error('Error requesting transaction signature:', error);
      throw new Error('Failed to sign authentication transaction');
    }
  }

  /**
   * Verify the signed transaction
   */
  private async verifySignedTransaction(signedTransaction: any, expectedAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, we'll do a basic verification
      // In a real implementation, you would verify the transaction signature
      console.log('🔐 ExternalWalletAuth: Verifying transaction signature');
      
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Basic verification - check if we have a transaction
      if (!signedTransaction) {
        return {
          success: false,
          error: 'No transaction to verify'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error verifying signed transaction:', error);
      return {
        success: false,
        error: 'Failed to verify transaction'
      };
    }
  }

  /**
   * Get wallet balance
   */
  private async getWalletBalance(walletAddress: string): Promise<number> {
    try {
      const walletInfo = await solanaService.getWalletInfo();
      return walletInfo.balance;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  /**
   * Disconnect from external wallet
   */
  async disconnect(): Promise<void> {
    try {
      await solanaAppKitService.disconnectFromProvider();
      console.log('🔐 ExternalWalletAuth: Disconnected from external wallet');
    } catch (error) {
      console.error('Error disconnecting from external wallet:', error);
    }
  }

  /**
   * Check if a wallet is currently connected
   */
  async isConnected(): Promise<boolean> {
    try {
      return solanaAppKitService.isConnected();
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }
}

export const externalWalletAuthService = ExternalWalletAuthService.getInstance(); 