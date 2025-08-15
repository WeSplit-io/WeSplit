import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { firebaseDataService } from './firebaseDataService';
import { solanaAppKitService } from './solanaAppKitService';
import { secureStorageService } from './secureStorageService';
import { logger } from './loggingService';

// Solana RPC endpoints
const SOLANA_RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com'
};

// USDC Token mint addresses
const USDC_MINT_ADDRESSES = {
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
  testnet: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp', // Testnet USDC
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
};

// Current network configuration
const CURRENT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet';
const RPC_ENDPOINT = SOLANA_RPC_ENDPOINTS[CURRENT_NETWORK];
const USDC_MINT_ADDRESS = USDC_MINT_ADDRESSES[CURRENT_NETWORK];

export interface UserWalletBalance {
  solBalance: number;
  usdcBalance: number;
  totalUSD: number;
  address: string;
  isConnected: boolean;
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
    secretKey?: string;
  };
  error?: string;
}

export class UserWalletService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
  }

  // Ensure user has a wallet - create if missing
  async ensureUserWallet(userId: string): Promise<WalletCreationResult> {
    try {
      // Ensuring wallet exists for user

      // Get current user data
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      // Check if user already has a wallet
      if (user && user.wallet_address && user.wallet_address.trim() !== '') {
        // User already has wallet
        return {
          success: true,
          wallet: {
            address: user.wallet_address,
            publicKey: user.wallet_public_key || user.wallet_address
          }
        };
      }

      // User doesn't have a wallet, create one

      const walletResult = await this.createWalletForUser(userId);
      
      // Ensure user has a seed phrase
      await this.ensureUserSeedPhrase(userId);
      
      if (walletResult.success && walletResult.wallet) {
        // Wallet created successfully
        
        // Request airdrop in background for development
        if (process.env.NODE_ENV !== 'production') {
          this.requestAirdrop(walletResult.wallet.address)
            .then(() => {
              logger.info('Background airdrop successful: 1 SOL added to wallet', null, 'UserWalletService');
            })
            .catch((airdropError) => {
              logger.warn('Background airdrop failed (this is normal)', airdropError, 'UserWalletService');
            });
        }
      }

      return walletResult;
    } catch (error) {
      logger.error('Error ensuring user wallet', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure user wallet'
      };
    }
  }

  // Create wallet for a specific user
  async createWalletForUser(userId: string): Promise<WalletCreationResult> {
    try {
      // Create wallet using Solana AppKit
      const result = await solanaAppKitService.createWallet();
      const wallet = result.wallet;

      if (!wallet || !wallet.address) {
        throw new Error('Wallet creation failed - no address generated');
      }

      // Update user document with wallet info
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: wallet.address,
        wallet_public_key: wallet.publicKey || wallet.address
      });

      // Save seed phrase if available
      if (result.mnemonic) {
        const seedPhrase = result.mnemonic;
        await secureStorageService.storeSeedPhrase(userId, seedPhrase);
        
        logger.info('Seed phrase stored securely for user', { userId }, 'UserWalletService');
      }

      // Wallet created and saved for user

      return {
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.address,
          secretKey: wallet.secretKey
        }
      };
    } catch (error) {
      logger.error('Error creating wallet for user', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet'
      };
    }
  }

  // Request airdrop for development
  async requestAirdrop(walletAddress: string, amount: number = 1): Promise<void> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signature = await this.connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
      await this.connection.confirmTransaction(signature);
      
      logger.info('Airdrop successful', { signature }, 'UserWalletService');
    } catch (error) {
      logger.warn('Airdrop failed (this is normal in production)', error, 'UserWalletService');
      throw error;
    }
  }

  // Ensure user has a seed phrase
  async ensureUserSeedPhrase(userId: string): Promise<boolean> {
    try {
      // Check if user already has a seed phrase in secure storage
      const existingSeedPhrase = await secureStorageService.getSeedPhrase(userId);
      if (existingSeedPhrase) {
        // User already has seed phrase
        return true;
      }

      // Generate and save a new seed phrase
      const newSeedPhrase = solanaAppKitService.generateMnemonic();
      await secureStorageService.storeSeedPhrase(userId, newSeedPhrase);
      
      logger.info('Seed phrase generated and saved securely for user', { userId }, 'UserWalletService');
      return true;
    } catch (error) {
      logger.error('Error ensuring user seed phrase', error, 'UserWalletService');
      return false;
    }
  }

  // Get user's created wallet balance
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // First ensure user has a wallet
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        // Failed to ensure wallet for user
        return null;
      }

      const walletAddress = walletResult.wallet.address;
      
      // Fetching balance for user wallet

      // Get SOL balance
      const publicKey = new PublicKey(walletAddress);
      const solBalance = await this.connection.getBalance(publicKey);
      const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
        const accountInfo = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist, balance is 0
      }

      // Calculate total USD value (simplified conversion)
      const solToUSD = 200; // Approximate SOL to USD rate
      const totalUSD = (solBalanceInSol * solToUSD) + usdcBalance;

      // User wallet balance calculated

      return {
        solBalance: solBalanceInSol,
        usdcBalance,
        totalUSD,
        address: walletAddress,
        isConnected: true
      };

    } catch (error) {
      console.error('Error fetching user wallet balance:', error);
      return null;
    }
  }

  // Get balance for a specific wallet address
  async getWalletBalanceByAddress(walletAddress: string): Promise<UserWalletBalance | null> {
    try {
      if (!walletAddress) {
        // No wallet address provided
        return null;
      }

      // Fetching balance for wallet address

      // Get SOL balance
      const publicKey = new PublicKey(walletAddress);
      const solBalance = await this.connection.getBalance(publicKey);
      const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
        const accountInfo = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist, balance is 0
      }

      // Calculate total USD value (simplified conversion)
      const solToUSD = 200; // Approximate SOL to USD rate
      const totalUSD = (solBalanceInSol * solToUSD) + usdcBalance;

      return {
        solBalance: solBalanceInSol,
        usdcBalance,
        totalUSD,
        address: walletAddress,
        isConnected: true
      };

    } catch (error) {
      console.error('Error fetching wallet balance by address:', error);
      return null;
    }
  }
}

// Create singleton instance
export const userWalletService = new UserWalletService(); 