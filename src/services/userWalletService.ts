import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { firebaseDataService } from './firebaseDataService';
import { solanaAppKitService } from './solanaAppKitService';

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
      if (__DEV__) {
        console.log('🔧 Ensuring wallet exists for user:', userId);
      }

      // Get current user data
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      // Check if user already has a wallet
      if (user && user.wallet_address && user.wallet_address.trim() !== '') {
        if (__DEV__) {
          console.log('✅ User already has wallet:', user.wallet_address);
        }
        return {
          success: true,
          wallet: {
            address: user.wallet_address,
            publicKey: user.wallet_public_key || user.wallet_address
          }
        };
      }

      // User doesn't have a wallet, create one
      if (__DEV__) {
        console.log('🔄 Creating new wallet for user:', userId);
      }

      const walletResult = await this.createWalletForUser(userId);
      
      // Ensure user has a seed phrase
      await this.ensureUserSeedPhrase(userId);
      
      if (walletResult.success && walletResult.wallet) {
        if (__DEV__) {
          console.log('✅ Wallet created successfully:', walletResult.wallet.address);
        }
        
        // Request airdrop in background for development
        if (process.env.NODE_ENV !== 'production') {
          this.requestAirdrop(walletResult.wallet.address)
            .then(() => {
              if (__DEV__) {
                console.log('✅ Background airdrop successful: 1 SOL added to wallet');
              }
            })
            .catch((airdropError) => {
              if (__DEV__) {
                console.log('⚠️ Background airdrop failed (this is normal):', airdropError.message);
              }
            });
        }
      }

      return walletResult;
    } catch (error) {
      console.error('Error ensuring user wallet:', error);
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
        const seedPhrase = result.mnemonic.split(' ');
        await firebaseDataService.user.saveUserSeedPhrase(userId, seedPhrase);
        
        if (__DEV__) {
          console.log('✅ Seed phrase saved for user:', userId);
        }
      }

      if (__DEV__) {
        console.log('✅ Wallet created and saved for user:', {
          userId,
          address: wallet.address,
          publicKey: wallet.publicKey,
          hasSeedPhrase: !!result.mnemonic
        });
      }

      return {
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.address,
          secretKey: wallet.secretKey
        }
      };
    } catch (error) {
      console.error('Error creating wallet for user:', error);
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
      
      if (__DEV__) {
        console.log('✅ Airdrop successful:', signature);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('⚠️ Airdrop failed (this is normal in production):', error);
      }
      throw error;
    }
  }

  // Ensure user has a seed phrase
  async ensureUserSeedPhrase(userId: string): Promise<boolean> {
    try {
      // Check if user already has a seed phrase
      const existingSeedPhrase = await firebaseDataService.user.getUserSeedPhrase(userId);
      if (existingSeedPhrase && existingSeedPhrase.length > 0) {
        if (__DEV__) { console.log('✅ User already has seed phrase'); }
        return true;
      }

      // Generate and save a new seed phrase
      const newSeedPhrase = solanaAppKitService.generateMnemonic().split(' ');
      await firebaseDataService.user.saveUserSeedPhrase(userId, newSeedPhrase);
      
      if (__DEV__) { console.log('✅ Seed phrase generated and saved for user:', userId); }
      return true;
    } catch (error) {
      console.error('Error ensuring user seed phrase:', error);
      return false;
    }
  }

  // Get user's created wallet balance
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // First ensure user has a wallet
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        if (__DEV__) {
          console.log('❌ Failed to ensure wallet for user:', userId);
        }
        return null;
      }

      const walletAddress = walletResult.wallet.address;
      
      if (__DEV__) { console.log('Fetching balance for user wallet:', walletAddress); }

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
        if (__DEV__) { console.log('USDC token account does not exist for wallet:', walletAddress); }
      }

      // Calculate total USD value (simplified conversion)
      const solToUSD = 200; // Approximate SOL to USD rate
      const totalUSD = (solBalanceInSol * solToUSD) + usdcBalance;

      if (__DEV__) { 
        console.log('User wallet balance:', {
          address: walletAddress,
          solBalance: solBalanceInSol,
          usdcBalance,
          totalUSD
        });
      }

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
        if (__DEV__) { console.log('No wallet address provided'); }
        return null;
      }

      if (__DEV__) { console.log('Fetching balance for wallet address:', walletAddress); }

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
        if (__DEV__) { console.log('USDC token account does not exist for wallet:', walletAddress); }
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