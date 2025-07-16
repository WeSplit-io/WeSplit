/**
 * @deprecated This file is deprecated and should no longer be used.
 * 
 * The wallet functionality has been migrated to use the Solana AppKit implementation
 * in `src/services/solanaAppKitService.ts` and `src/context/WalletContext.tsx`.
 * 
 * Please use the new WalletContext methods instead:
 * - useWallet() hook for accessing wallet state and methods
 * - solanaAppKitService for direct wallet operations
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

// Simplified Solana Wallet Service for React Native
// This provides basic wallet functionality without web-specific adapters

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  clusterApiUrl, 
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { solanaService } from '../src/services/solanaTransactionService';

// Your Solana network configuration
const SOLANA_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet';
const SOLANA_RPC_URL = clusterApiUrl(SOLANA_NETWORK);

// Create connection to Solana network
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Wallet interface
export interface WalletInfo {
  publicKey: PublicKey;
  address: string;
  isConnected: boolean;
  balance?: number;
  walletName?: string;
  secretKey?: string; // hex string
}

// Simple wallet manager for React Native
class SolanaWalletManager {
  private keypair: Keypair | null = null;
  private isConnected = false;
  private publicKey: PublicKey | null = null;

  // Generate a new wallet
  async generateWallet(): Promise<WalletInfo> {
    try {
      if (__DEV__) { console.log('Generating new Solana wallet...'); }
      
      this.keypair = Keypair.generate();
      this.publicKey = this.keypair.publicKey;
      this.isConnected = true;
      
      if (__DEV__) { console.log('Wallet generated successfully'); }
      
      return {
        publicKey: this.publicKey,
        address: this.publicKey.toString(),
        isConnected: true,
        balance: 0,
        walletName: 'Generated Wallet',
        secretKey: Buffer.from(this.keypair.secretKey).toString('hex'),
      };
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  // Import wallet from secret key
  async importWallet(secretKey: string): Promise<WalletInfo> {
    try {
      if (__DEV__) { console.log('Importing wallet from secret key...'); }
      
      const secretKeyBytes = new Uint8Array(Buffer.from(secretKey, 'hex'));
      this.keypair = Keypair.fromSecretKey(secretKeyBytes);
      this.publicKey = this.keypair.publicKey;
      this.isConnected = true;
      
      if (__DEV__) { console.log('Wallet imported successfully'); }
      
      return {
        publicKey: this.publicKey,
        address: this.publicKey.toString(),
        isConnected: true,
        balance: 0,
        walletName: 'Imported Wallet',
        secretKey: Buffer.from(this.keypair.secretKey).toString('hex'),
      };
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw new Error('Failed to import wallet');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (__DEV__) { console.log('Disconnecting Solana wallet...'); }
      
      this.keypair = null;
      this.publicKey = null;
      this.isConnected = false;
      
      if (__DEV__) { console.log('Solana wallet disconnected successfully'); }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    if (!this.publicKey || !this.isConnected || !this.keypair) {
      return null;
    }

    try {
      let balance = 0;
      try {
        if (__DEV__) { console.log('Fetching balance for address:', this.publicKey.toString()); }
        balance = await connection.getBalance(this.publicKey);
        if (__DEV__) { console.log('Raw balance from network:', balance, 'lamports'); }
      } catch (balanceError) {
        if (__DEV__) { 
          console.log('Could not retrieve balance from network:', balanceError);
          console.log('Using fallback balance of 0');
        }
        balance = 0;
      }
      
      const solBalance = balance / LAMPORTS_PER_SOL;
      if (__DEV__) { console.log('Converted balance:', solBalance, 'SOL'); }
      
      return {
        publicKey: this.publicKey,
        address: this.publicKey.toString(),
        isConnected: true,
        balance: solBalance,
        walletName: 'Generated Wallet'
      };
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      return null;
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.publicKey || !this.isConnected || !this.keypair) {
      throw new Error('Wallet not connected');
    }

    try {
      if (__DEV__) { console.log('Signing transaction...'); }
      transaction.sign(this.keypair);
      if (__DEV__) { console.log('Transaction signed successfully'); }
      return transaction;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw new Error('Failed to sign transaction');
    }
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    if (!this.publicKey || !this.isConnected || !this.keypair) {
      throw new Error('Wallet not connected');
    }

    try {
      if (__DEV__) { console.log('Sending transaction...'); }
      
      // Sign the transaction
      const signedTransaction = await this.signTransaction(transaction);
      
      // Send the transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      if (__DEV__) { console.log('Transaction sent successfully:', signature); }
      return signature;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error('Failed to send transaction');
    }
  }

  // Get current wallet name
  getCurrentWalletName(): string {
    return this.isConnected ? 'Generated Wallet' : '';
  }
}

// Create wallet manager instance
const walletManager = new SolanaWalletManager();

// Export wallet functions
export const generateWallet = async (): Promise<WalletInfo> => {
  try {
    // Try to use the new Solana service first
    const walletData = await solanaService.generateWallet();
    
    // Also generate with the old service for compatibility
    const oldWalletInfo = await walletManager.generateWallet();
    
    return {
      publicKey: oldWalletInfo.publicKey,
      address: walletData.address,
      isConnected: true,
      balance: 0,
      walletName: 'Generated Wallet',
      secretKey: walletData.secretKey
    };
  } catch (error) {
    console.warn('Failed to generate wallet with new service, falling back to old service:', error);
    return await walletManager.generateWallet();
  }
};

export const importWallet = async (secretKey: string): Promise<WalletInfo> => {
  return await walletManager.importWallet(secretKey);
};

export const disconnectWallet = async (): Promise<void> => {
  return await walletManager.disconnect();
};

export const getWalletInfo = async (): Promise<WalletInfo | null> => {
  return await walletManager.getWalletInfo();
};

export const signTransaction = async (transaction: Transaction): Promise<Transaction> => {
  return await walletManager.signTransaction(transaction);
};

export const sendTransaction = async (transaction: Transaction): Promise<string> => {
  return await walletManager.sendTransaction(transaction);
};

export const getCurrentWalletName = (): string => {
  return walletManager.getCurrentWalletName();
};

// Export connection for other modules
export { connection };

// Export configuration
export const WALLET_CONFIG = {
  network: SOLANA_NETWORK,
  rpcUrl: SOLANA_RPC_URL,
};

// Legacy function for backward compatibility
export const connectWallet = async (): Promise<WalletInfo> => {
  return await generateWallet();
};

export const connectToSpecificWallet = async (walletName: string): Promise<WalletInfo> => {
  console.warn('connectToSpecificWallet is deprecated, using generateWallet instead');
  return await generateWallet();
};

export const getAvailableWallets = () => {
  return [{ name: 'Generated Wallet', url: '', icon: '', readyState: 'Installed' }];
};

export const isWalletAvailable = (walletName: string): boolean => {
  return walletName.toLowerCase() === 'generated wallet';
}; 