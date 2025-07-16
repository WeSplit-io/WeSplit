import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { firebaseDataService } from './firebaseDataService';

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

export class UserWalletService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
  }

  // Get user's created wallet balance
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // Get user data to find their wallet address
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      if (!user || !user.wallet_address) {
        if (__DEV__) { console.log('No wallet address found for user:', userId); }
        return null;
      }

      const walletAddress = user.wallet_address;
      
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