/**
 * Consolidated Wallet Service for WeSplit
 * Combines all wallet connection, transaction, and management functionality
 * Replaces: walletConnectionService, unifiedWalletService, realWalletAdapterService, 
 * mobileWalletAdapterService, externalWalletAuthService, and parts of solanaAppKitService
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import { Alert, Linking, Platform } from 'react-native';
import { walletLogoService } from './walletLogoService';
import { RPC_CONFIG, USDC_CONFIG } from './shared/walletConstants';
import { COMPANY_WALLET_CONFIG } from '../config/chain';

// Types
export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance: number;
  usdcBalance: number;
  isConnected: boolean;
  walletName?: string;
  walletType?: 'app-generated' | 'external';
}

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

export interface WalletProvider {
  name: string;
  icon: string;
  logoUrl: string;
  isAvailable: boolean;
  deepLinkScheme?: string;
  detectionMethod?: 'deep-link' | 'package' | 'browser-extension' | 'manual';
}

export interface TransactionParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TransactionResult {
  signature: string;
  txId: string;
  success: boolean;
  error?: string;
}

// Company fee structure
const COMPANY_FEE_STRUCTURE = {
  percentage: 0.025, // 2.5%
  minimum: 0.001, // 0.001 SOL minimum
  maximum: 0.1 // 0.1 SOL maximum
};

// Transaction configuration
const TRANSACTION_CONFIG = {
  retry: {
    maxRetries: 3,
    retryDelay: 1000
  },
  priorityFees: {
    low: 1000,
    medium: 5000,
    high: 10000
  }
};

class ConsolidatedWalletService {
  private static instance: ConsolidatedWalletService;
  private connection: Connection;
  private keypair: Keypair | null = null;
  private connectedProvider: WalletProvider | null = null;
  private connectionState: {
    publicKey: PublicKey | null;
    connecting: boolean;
    connected: boolean;
    disconnecting: boolean;
  };

  private constructor() {
    this.connection = new Connection(RPC_CONFIG.endpoint, 'confirmed');
    this.connectionState = {
      publicKey: null,
      connecting: false,
      connected: false,
      disconnecting: false
    };
  }

  public static getInstance(): ConsolidatedWalletService {
    if (!ConsolidatedWalletService.instance) {
      ConsolidatedWalletService.instance = new ConsolidatedWalletService();
    }
    return ConsolidatedWalletService.instance;
  }

  // ===== WALLET CREATION AND IMPORT METHODS =====

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<{ wallet: WalletInfo }> {
    try {
      // CRITICAL FIX: Use BIP39 mnemonic-based generation instead of random keypair
      const { generateWalletFromMnemonic } = await import('../wallet/derive');
      const walletResult = generateWalletFromMnemonic();
      const keypair = walletResult.keypair;
      const address = keypair.publicKey.toBase58();
      
      // Get balance
      const balance = await this.connection.getBalance(keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(USDC_CONFIG.mintAddress),
          keypair.publicKey
        );
        const tokenAccount = await getAccount(this.connection, usdcTokenAddress);
        usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist yet, balance is 0
      }
      
      const wallet: WalletInfo = {
        address,
        publicKey: address,
        secretKey: Buffer.from(keypair.secretKey).toString('base64'),
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'App Wallet',
        walletType: 'app-generated'
      };
      
      this.keypair = keypair;
      this.connectionState.publicKey = keypair.publicKey;
      this.connectionState.connected = true;
      
      return { wallet };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error}`);
    }
  }

  /**
   * Import wallet from seed phrase
   */
  async importWallet(seedPhrase: string): Promise<WalletInfo> {
    try {
      // Use bip39WalletService for proper BIP39 handling
      const { bip39WalletService } = await import('./bip39WalletService');
      const result = bip39WalletService.deriveKeypairFromMnemonic(seedPhrase);
      
      const address = result.publicKey.toBase58();
      
      // Get balance
      const balance = await this.connection.getBalance(result.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(USDC_CONFIG.mintAddress),
          result.publicKey
        );
        const tokenAccount = await getAccount(this.connection, usdcTokenAddress);
        usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6);
      } catch (error) {
        // Token account doesn't exist yet, balance is 0
      }
      
      const wallet: WalletInfo = {
        address,
        publicKey: address,
        secretKey: Buffer.from(result.secretKey).toString('base64'),
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'Imported Wallet',
        walletType: 'app-generated'
      };
      
      this.keypair = result;
      this.connectionState.publicKey = result.publicKey;
      this.connectionState.connected = true;
      
      return wallet;
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error}`);
    }
  }

  /**
   * Generate a mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      const { bip39WalletService } = require('./bip39WalletService');
      return bip39WalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error}`);
    }
  }

  // ===== WALLET CONNECTION METHODS =====

  /**
   * Get all available wallet providers
   */
  async getAvailableProviders(): Promise<WalletProvider[]> {
    try {
      const allWallets = walletLogoService.getAllWalletProviders();
      const availableProviders: WalletProvider[] = [];

      for (const wallet of allWallets) {
        const isAvailable = await this.checkWalletAvailability(wallet.name);
        availableProviders.push({
          name: wallet.name,
          icon: wallet.fallbackIcon,
          logoUrl: wallet.logoUrl,
          isAvailable,
          deepLinkScheme: wallet.deepLinkScheme,
          detectionMethod: wallet.detectionMethod as any
        });
      }

      // Always ensure Phantom is available
      const hasPhantom = availableProviders.some(p => p.name.toLowerCase() === 'phantom');
      if (!hasPhantom) {
        availableProviders.unshift({
          name: 'Phantom',
          icon: '👻',
          logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.png',
          isAvailable: true,
          deepLinkScheme: 'phantom://',
          detectionMethod: 'deep-link'
        });
      }

      return availableProviders;
    } catch (error) {
      console.error('Error getting available providers:', error);
      return [{
        name: 'Phantom',
        icon: '👻',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.png',
        isAvailable: true,
        deepLinkScheme: 'phantom://',
        detectionMethod: 'deep-link'
      }];
    }
  }

  /**
   * Connect to a specific wallet provider
   */
  async connectToProvider(providerName: string): Promise<WalletConnectionResult> {
    try {
      if (this.connectionState.connecting) {
        throw new Error('Connection already in progress');
      }

      this.connectionState.connecting = true;
      console.log('🔗 Connecting to wallet provider:', providerName);

      // Check if provider is available
      const isAvailable = await this.checkWalletAvailability(providerName);
      if (!isAvailable) {
        if (await this.promptWalletInstallation(providerName)) {
          await this.installWallet(providerName);
          return this.connectToProvider(providerName);
        }
        throw new Error(`${providerName} is not available on this device`);
      }

      // Handle different providers
      let walletInfo: WalletInfo;
      
      if (providerName.toLowerCase() === 'phantom') {
        walletInfo = await this.connectToPhantom();
      } else {
        // For other providers, use similar logic
        walletInfo = await this.connectToExternalWallet(providerName);
      }

      this.connectionState.connected = true;
      this.connectionState.publicKey = new PublicKey(walletInfo.address);
      this.connectionState.connecting = false;

      return {
        success: true,
        walletAddress: walletInfo.address,
        walletName: walletInfo.walletName,
        balance: walletInfo.balance,
        provider: providerName
      };

    } catch (error) {
      this.connectionState.connecting = false;
      console.error('Connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Connect to Phantom wallet
   */
  private async connectToPhantom(): Promise<WalletInfo> {
    try {
      // Open Phantom with connection request
      const phantomUrl = 'phantom://v1/connect?app_url=https://wesplit.app&redirect_link=https://wesplit.app/wallet/connected';
      await Linking.openURL(phantomUrl);

      // For demo purposes, return a mock connection
      // In production, you would listen for the redirect and parse the response
      const mockPublicKey = new PublicKey('11111111111111111111111111111112');
      
      return {
        address: mockPublicKey.toBase58(),
        publicKey: mockPublicKey.toBase58(),
        balance: 0,
        usdcBalance: 0,
        isConnected: true,
        walletName: 'Phantom',
        walletType: 'external'
      };
    } catch (error) {
      throw new Error(`Failed to connect to Phantom: ${error}`);
    }
  }

  /**
   * Connect to external wallet
   */
  private async connectToExternalWallet(providerName: string): Promise<WalletInfo> {
    try {
      const providerInfo = walletLogoService.getWalletProviderInfo(providerName);
      if (!providerInfo) {
        throw new Error(`Provider ${providerName} not found`);
      }

      // Open wallet with connection request
      if (providerInfo.deepLinkScheme) {
        const connectUrl = `${providerInfo.deepLinkScheme}connect?app_url=https://wesplit.app`;
        await Linking.openURL(connectUrl);
      }

      // For demo purposes, return a mock connection
      const mockPublicKey = new PublicKey('11111111111111111111111111111112');
      
      return {
        address: mockPublicKey.toBase58(),
        publicKey: mockPublicKey.toBase58(),
        balance: 0,
        usdcBalance: 0,
        isConnected: true,
        walletName: providerName,
        walletType: 'external'
      };
    } catch (error) {
      throw new Error(`Failed to connect to ${providerName}: ${error}`);
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
          return false; // Not available in React Native
        case 'app-installation':
          return await this.checkAppInstallationAvailability(providerInfo);
        case 'manual':
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking wallet availability:', error);
      return false;
    }
  }

  private async checkDeepLinkAvailability(providerInfo: any): Promise<boolean> {
    if (!providerInfo.deepLinkScheme) {
      return false;
    }

    try {
      return await Linking.canOpenURL(providerInfo.deepLinkScheme);
    } catch (error) {
      return false;
    }
  }

  private async checkAppInstallationAvailability(providerInfo: any): Promise<boolean> {
    try {
      if (providerInfo.deepLinkScheme) {
        return await Linking.canOpenURL(providerInfo.deepLinkScheme);
      }
      return false;
    } catch (error) {
      return false;
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

  // ===== TRANSACTION METHODS =====

  /**
   * Send SOL transaction
   */
  async sendSolTransaction(params: TransactionParams): Promise<TransactionResult> {
    try {
      if (!this.connectionState.connected) {
        throw new Error('No wallet connected');
      }

      const fromPublicKey = this.connectionState.publicKey!;
      const toPublicKey = new PublicKey(params.to);
      const lamports = params.amount * LAMPORTS_PER_SOL;

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

      // Add memo if provided
      if (params.memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(params.memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Sign and send transaction
      const signature = await this.sendTransactionWithRetry(transaction, params.priority);

      return {
        signature,
        txId: signature,
        success: true
      };

    } catch (error) {
      console.error('Error sending SOL transaction:', error);
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Send USDC transaction
   */
  async sendUSDCTransaction(params: TransactionParams): Promise<TransactionResult> {
    try {
      if (!this.connectionState.connected) {
        throw new Error('No wallet connected');
      }

      const fromPublicKey = this.connectionState.publicKey!;
      const toPublicKey = new PublicKey(params.to);
      const amount = Math.floor(params.amount * 1_000_000); // USDC has 6 decimals

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = COMPANY_WALLET_CONFIG.useUserWalletForFees 
        ? fromPublicKey 
        : new PublicKey(COMPANY_WALLET_CONFIG.address);

      // Get associated token addresses
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_CONFIG.mintAddress),
        fromPublicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_CONFIG.mintAddress),
        toPublicKey
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // User or company pays fees based on configuration
      });

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

      // Check if recipient has USDC token account, create if not
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        // Token account doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            feePayerPublicKey, // Fee payer pays ATA creation
            toTokenAccount, // ata
            toPublicKey, // owner
            new PublicKey(USDC_CONFIG.mintAddress) // mint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          amount
        )
      );

      // Add memo if provided
      if (params.memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(params.memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Sign and send transaction
      const signature = await this.sendTransactionWithRetry(transaction, params.priority);

      return {
        signature,
        txId: signature,
        success: true
      };

    } catch (error) {
      console.error('Error sending USDC transaction:', error);
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Send transaction with retry logic
   */
  private async sendTransactionWithRetry(transaction: Transaction, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= TRANSACTION_CONFIG.retry.maxRetries; attempt++) {
      try {
        console.log(`🔄 Transaction attempt ${attempt}/${TRANSACTION_CONFIG.retry.maxRetries} (${priority} priority)`);
        
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          this.keypair ? [this.keypair] : [],
          {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            maxRetries: 0,
            skipPreflight: false,
          }
        );
        
        console.log(`✅ Transaction successful on attempt ${attempt}:`, signature);
        return signature;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Transaction attempt ${attempt} failed:`, error);
        
        if (attempt < TRANSACTION_CONFIG.retry.maxRetries) {
          const delay = TRANSACTION_CONFIG.retry.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Transaction failed after ${TRANSACTION_CONFIG.retry.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Get priority fee based on priority level
   */
  private getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Calculate company fee
   */
  calculateCompanyFee(amount: number): { fee: number; netAmount: number } {
    const fee = Math.max(
      COMPANY_FEE_STRUCTURE.minimum,
      Math.min(amount * COMPANY_FEE_STRUCTURE.percentage, COMPANY_FEE_STRUCTURE.maximum)
    );
    const netAmount = amount - fee;
    return { fee, netAmount };
  }

  // ===== WALLET MANAGEMENT METHODS =====

  /**
   * Disconnect from current wallet
   */
  async disconnect(): Promise<void> {
    try {
      this.connectionState = {
        publicKey: null,
        connecting: false,
        connected: false,
        disconnecting: false
      };
      this.connectedProvider = null;
      console.log('🔗 Disconnected from wallet');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connectionState.connected;
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return { ...this.connectionState };
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        return null;
      }

      const publicKey = this.connectionState.publicKey;
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(USDC_CONFIG.mintAddress),
          publicKey
        );
        const account = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(account.amount) / 1_000_000; // USDC has 6 decimals
      } catch (error) {
        // USDC token account doesn't exist
        usdcBalance = 0;
      }

      return {
        address: publicKey.toBase58(),
        publicKey: publicKey.toBase58(),
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: this.connectedProvider?.name || 'External Wallet',
        walletType: 'external'
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return null;
    }
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string): Promise<string> {
    try {
      if (!this.connectionState.connected) {
        throw new Error('No wallet connected');
      }

      // For external wallets, this would open the wallet app for signing
      // For now, return a mock signature
      return 'MockSignature123456789';
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const consolidatedWalletService = ConsolidatedWalletService.getInstance();
