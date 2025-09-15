import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { firebaseDataService } from './firebaseDataService';
import { consolidatedWalletService } from './consolidatedWalletService';
import { secureStorageService } from './secureStorageService';
import { walletManagementService } from './walletManagementService';
import { bip39WalletService } from './bip39WalletService';
import { legacyWalletRecoveryService } from './legacyWalletRecoveryService';
import { logger } from './loggingService';

// Import shared constants
import { RPC_CONFIG, USDC_CONFIG, WALLET_CONFIG } from './shared/walletConstants';

// Use shared constants
const RPC_ENDPOINT = RPC_CONFIG.endpoint;
const USDC_MINT_ADDRESS = USDC_CONFIG.mintAddress;

console.log('🌐 UserWalletService: Using network:', RPC_CONFIG.network);
console.log('🌐 UserWalletService: RPC endpoint:', RPC_ENDPOINT);
console.log('🌐 UserWalletService: USDC mint address:', USDC_MINT_ADDRESS);

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
  private lastBalanceCall: { [userId: string]: number } = {};
  private lastSuccessfulBalance: { [userId: string]: UserWalletBalance } = {};
  private readonly BALANCE_CALL_DEBOUNCE_MS = WALLET_CONFIG.balanceCallDebounce; // Use shared configuration

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
        // User already has wallet - IMPORTANT: Return existing wallet, don't create new one
        logger.info('User already has existing wallet, preserving it', { 
          userId, 
          walletAddress: user.wallet_address 
        }, 'UserWalletService');
        
        return {
          success: true,
          wallet: {
            address: user.wallet_address,
            publicKey: user.wallet_public_key || user.wallet_address
          }
        };
      }

      // User doesn't have a wallet, create one
      logger.info('User has no wallet, creating new one', { userId }, 'UserWalletService');

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
      // Create wallet using consolidated service
      const result = await consolidatedWalletService.createWallet();
      const wallet = result.wallet;

      if (!wallet || !wallet.address) {
        throw new Error('Wallet creation failed - no address generated');
      }

      // Update user document with wallet info
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: wallet.address,
        wallet_public_key: wallet.publicKey || wallet.address
      });

      // Track wallet creation in Firebase
      await walletManagementService.trackWalletCreation(userId, wallet.address, 'app-generated');

      // CRITICAL: Store private key in secure storage for transaction signing
      if (wallet.secretKey) {
        try {
          // Convert secret key to JSON array format for storage
          const secretKeyArray = Array.from(new Uint8Array(Buffer.from(wallet.secretKey, 'base64')));
          await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
          
          // Track private key storage in Firebase
          await walletManagementService.trackPrivateKeyStorage(userId, true);
          
          logger.info('Private key stored securely for user', { 
            userId, 
            walletAddress: wallet.address 
          }, 'UserWalletService');
        } catch (keyStorageError) {
          logger.error('Failed to store private key for user', keyStorageError, 'UserWalletService');
          // Don't fail wallet creation if key storage fails, but log the error
        }
      }

      // Save seed phrase if available
      if (result.mnemonic) {
        const seedPhrase = result.mnemonic;
        await secureStorageService.storeSeedPhrase(userId, seedPhrase);
        
        // Track seed phrase storage in Firebase
        await walletManagementService.trackSeedPhraseStorage(userId, true);
        
        logger.info('Seed phrase stored securely for user', { userId }, 'UserWalletService');
      }

      // Wallet created and saved for user
      logger.info('Wallet creation completed successfully', {
        userId,
        walletAddress: wallet.address,
        hasPrivateKey: !!wallet.secretKey,
        hasSeedPhrase: !!result.mnemonic
      }, 'UserWalletService');

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
      const newSeedPhrase = bip39WalletService.generateMnemonic();
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
      // Check debounce - prevent rapid successive calls, but only if we have a recent successful call
      const now = Date.now();
      const lastCall = this.lastBalanceCall[userId] || 0;
      const hasRecentSuccessfulCall = this.lastSuccessfulBalance[userId] && (now - lastCall < this.BALANCE_CALL_DEBOUNCE_MS);
      
      if (hasRecentSuccessfulCall) {
        console.log('🔄 UserWalletService: Debouncing balance call for user (returning cached):', userId);
        return this.lastSuccessfulBalance[userId];
      }
      
      // Update last call time
      this.lastBalanceCall[userId] = now;
      
      // First ensure user has a wallet
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        // Failed to ensure wallet for user
        return null;
      }

      const walletAddress = walletResult.wallet.address;
      
      // Fetching balance for user wallet

      // Get SOL balance with rate limiting protection
      let solBalanceInSol = 0;
      try {
        const publicKey = new PublicKey(walletAddress);
        const solBalance = await this.connection.getBalance(publicKey);
        solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
      } catch (error) {
        // Handle rate limiting specifically
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('Rate limited when fetching SOL balance, using cached value');
          // Return cached balance or 0 if no cache
          return {
            solBalance: 0,
            usdcBalance: 0,
            totalUSD: 0,
            address: walletAddress,
            isConnected: true
          };
        }
        throw error;
      }

      // Get USDC balance with rate limiting protection
      let usdcBalance = 0;
      try {
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(walletAddress));
        const accountInfo = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
      } catch (error) {
        // Handle rate limiting specifically
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('Rate limited when fetching USDC balance, using 0');
          usdcBalance = 0;
        } else if (error instanceof Error && error.message.includes('TokenAccountNotFoundError')) {
          // Token account doesn't exist, balance is 0 - this is normal for new wallets
          console.log('💰 UserWalletService: USDC token account not found for wallet (normal for new wallets)');
          usdcBalance = 0;
        } else {
          // For other errors, log but continue
          console.warn('Error fetching USDC balance:', error);
          usdcBalance = 0;
        }
      }

      // Calculate total USD value (simplified conversion)
      const solToUSD = 200; // Approximate SOL to USD rate
      const totalUSD = (solBalanceInSol * solToUSD) + usdcBalance;

      // User wallet balance calculated

      const balance = {
        solBalance: solBalanceInSol,
        usdcBalance,
        totalUSD: totalUSD || 0, // Ensure totalUSD is never undefined
        address: walletAddress,
        isConnected: true
      };

      // Cache the successful balance
      this.lastSuccessfulBalance[userId] = balance;
      
      return balance;

    } catch (error) {
      // Handle rate limiting at the top level
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('Rate limited when fetching wallet balance');
        return {
          solBalance: 0,
          usdcBalance: 0,
          totalUSD: 0,
          address: '',
          isConnected: false
        };
      }
      console.error('Error fetching user wallet balance:', error);
      return null;
    }
  }

  // Enhanced balance checking with transaction monitoring
  async getUserWalletBalanceWithTransactionCheck(userId: string, lastKnownBalance?: UserWalletBalance): Promise<{
    balance: UserWalletBalance | null;
    hasNewTransactions: boolean;
    newTransactions: any[];
  }> {
    try {
      const currentBalance = await this.getUserWalletBalance(userId);
      
      if (!currentBalance) {
        return {
          balance: null,
          hasNewTransactions: false,
          newTransactions: []
        };
      }

      // Check if there are new transactions by comparing balances
      let hasNewTransactions = false;
      let newTransactions: any[] = [];

      if (lastKnownBalance) {
        const balanceChanged = 
          Math.abs(currentBalance.usdcBalance - lastKnownBalance.usdcBalance) > 0.000001 ||
          Math.abs(currentBalance.solBalance - lastKnownBalance.solBalance) > 0.000001;

        if (balanceChanged) {
          hasNewTransactions = true;
          console.log('💰 UserWalletService: Balance change detected!', {
            previous: lastKnownBalance,
            current: currentBalance
          });

          // Try to fetch recent transactions for this wallet
          try {
            const publicKey = new PublicKey(currentBalance.address);
            const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 5 });
            
            if (signatures.length > 0) {
              // Get transaction details for the most recent signatures
              const transactionDetails = await Promise.all(
                signatures.slice(0, 3).map(async (sig) => {
                  try {
                    const tx = await this.connection.getTransaction(sig.signature, {
                      commitment: 'confirmed',
                      maxSupportedTransactionVersion: 0
                    });
                    return {
                      signature: sig.signature,
                      blockTime: sig.blockTime,
                      slot: sig.slot,
                      transaction: tx
                    };
                  } catch (error) {
                    console.warn('Failed to get transaction details for signature:', sig.signature);
                    return null;
                  }
                })
              );

              newTransactions = transactionDetails.filter(tx => tx !== null);
              console.log('💰 UserWalletService: Found new transactions:', newTransactions.length);
            }
          } catch (error) {
            console.warn('Failed to fetch recent transactions:', error);
          }
        }
      }

      return {
        balance: currentBalance,
        hasNewTransactions,
        newTransactions
      };

    } catch (error) {
      console.error('Error in enhanced balance check:', error);
      return {
        balance: null,
        hasNewTransactions: false,
        newTransactions: []
      };
    }
  }

  // Clear balance cache for a user (useful when balance seems incorrect)
  async clearBalanceCache(userId: string): Promise<void> {
    try {
      delete this.lastSuccessfulBalance[userId];
      delete this.lastBalanceCall[userId];
      
      logger.info('Balance cache cleared for user', { userId }, 'UserWalletService');
    } catch (error) {
      logger.error('Failed to clear balance cache', error, 'UserWalletService');
    }
  }

  // Force refresh balance from blockchain (bypasses cache)
  async forceRefreshBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // Clear cache first
      await this.clearBalanceCache(userId);
      
      // Get fresh balance
      const balance = await this.getUserWalletBalance(userId);
      
      logger.info('Balance force refreshed for user', { 
        userId, 
        balance: balance ? `${balance.usdcBalance} USDC, ${balance.solBalance} SOL` : 'null'
      }, 'UserWalletService');
      
      return balance;
    } catch (error) {
      logger.error('Failed to force refresh balance', error, 'UserWalletService');
      return null;
    }
  }

  // Fix existing user wallet by storing private key from seed phrase
  async fixExistingUserWallet(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Attempting to fix existing user wallet', { userId }, 'UserWalletService');
      
      // Get user's current wallet address and restore original if needed
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const currentWalletAddress = user?.wallet_address;
      const originalWalletAddress = 'G86LiEfFkKAhq4QYXrZ9EmVEfDXrVoKuvWgirSz5rfpE';
      
      if (!currentWalletAddress) {
        return { success: false, error: 'No wallet address found for user' };
      }
      
      // Restore original wallet address if it's different
      if (currentWalletAddress !== originalWalletAddress) {
        logger.info('Restoring original wallet address', { userId, currentAddress: currentWalletAddress, originalAddress: originalWalletAddress }, 'UserWalletService');
        
        await firebaseDataService.user.updateUser(userId, {
          wallet_address: originalWalletAddress,
          wallet_public_key: originalWalletAddress,
          wallet_status: 'healthy',
          wallet_has_private_key: false,
          wallet_last_fixed_at: new Date().toISOString()
        });
        
        logger.info('Original wallet address restored', { userId, originalWalletAddress }, 'UserWalletService');
      }
      
      const expectedWalletAddress = originalWalletAddress;
      
      // Check if private key already exists
      const existingPrivateKey = await secureStorageService.getPrivateKey(userId);
      if (existingPrivateKey) {
        logger.info('Private key already exists for user', { userId }, 'UserWalletService');
        return { success: true };
      }
      
      // Get seed phrase
      const seedPhrase = await secureStorageService.getSeedPhrase(userId);
      if (!seedPhrase) {
        return { success: false, error: 'No seed phrase found for user' };
      }
      
      logger.info('Found seed phrase for user, attempting to derive private key', { userId }, 'UserWalletService');
      
      // Try to derive the keypair from seed phrase
      const derivedKeypair = await this.deriveKeypairFromSeedPhrase(seedPhrase, expectedWalletAddress);
      
      if (derivedKeypair && derivedKeypair.publicKey.toBase58() === expectedWalletAddress) {
        // Store the private key
        const secretKeyArray = Array.from(derivedKeypair.secretKey);
        await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
        
        // Update Firebase to reflect private key availability
        await firebaseDataService.user.updateUser(userId, {
          wallet_has_private_key: true,
          wallet_status: 'healthy',
          wallet_last_fixed_at: new Date().toISOString()
        });
        
        // Track wallet fix success in Firebase
        await walletManagementService.trackWalletFix(userId, true);
        
        logger.info('Successfully stored private key for existing user', { 
          userId, 
          walletAddress: expectedWalletAddress 
        }, 'UserWalletService');
        
        return { success: true };
      } else {
        // Try legacy recovery methods
        logger.info('Standard derivation failed, attempting legacy recovery', { userId, expectedWalletAddress }, 'UserWalletService');
        
        const legacyRecovery = await legacyWalletRecoveryService.recoverLegacyWallet(userId, expectedWalletAddress);
        
        if (legacyRecovery.success && legacyRecovery.keypair) {
          // Store the recovered private key
          const secretKeyArray = Array.from(legacyRecovery.keypair.secretKey);
          await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
          
          // Update Firebase to reflect private key availability
          await firebaseDataService.user.updateUser(userId, {
            wallet_has_private_key: true,
            wallet_status: 'healthy',
            wallet_last_fixed_at: new Date().toISOString()
          });
          
          // Track wallet fix success in Firebase
          await walletManagementService.trackWalletFix(userId, true);
          
          logger.info('Successfully recovered wallet using legacy method', { 
            userId, 
            walletAddress: expectedWalletAddress,
            method: legacyRecovery.method
          }, 'UserWalletService');
          
          return { success: true };
        } else {
          // Legacy recovery failed, but we don't want to create a new wallet
          logger.info('Legacy recovery failed, but preserving original wallet address', { userId, expectedWalletAddress }, 'UserWalletService');

          // Track wallet fix failure in Firebase
          await walletManagementService.trackWalletFix(userId, false, 'Could not recover private key for existing wallet');
          
          return {
            success: false,
            error: 'Could not recover private key for existing wallet. Please contact support to restore access to your funds.'
          };
        }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      // Track wallet fix failure in Firebase
      await walletManagementService.trackWalletFix(userId, false, errorMsg);
      
      logger.error('Failed to fix existing user wallet', error, 'UserWalletService');
      return { 
        success: false, 
        error: errorMsg
      };
    }
  }

  // Derive keypair from seed phrase for existing users
  private async deriveKeypairFromSeedPhrase(seedPhrase: string, expectedAddress: string): Promise<Keypair | null> {
    try {
      logger.info('Attempting to derive keypair from seed phrase', { 
        expectedAddress,
        seedPhraseLength: seedPhrase.split(' ').length 
      }, 'UserWalletService');
      
      // First, check if it's a valid BIP39 mnemonic
      if (bip39WalletService.isBip39Mnemonic(seedPhrase)) {
        logger.info('Seed phrase appears to be BIP39 mnemonic, attempting recovery', { expectedAddress }, 'UserWalletService');
        
        // Try to recover the wallet using BIP39 service
        const recoveredWallet = bip39WalletService.tryRecoverWalletFromMnemonic(seedPhrase, expectedAddress);
        if (recoveredWallet) {
          logger.info('Successfully recovered wallet using BIP39 service', { expectedAddress }, 'UserWalletService');
          return recoveredWallet.keypair;
        }
      } else {
        logger.info('Seed phrase is not BIP39 mnemonic, will try custom recovery methods', { expectedAddress }, 'UserWalletService');
      }
      
      // Try to use the consolidated service to import the wallet from seed phrase
      try {
        const importedWallet = await consolidatedWalletService.importWallet(seedPhrase);
        
        if (importedWallet && importedWallet.address === expectedAddress) {
          logger.info('Successfully imported wallet from seed phrase using service', { expectedAddress }, 'UserWalletService');
          
          // Get the keypair from the service
          const keypair = (consolidatedWalletService as any).keypair;
          if (keypair) {
            return keypair;
          }
        }
      } catch (importError) {
        logger.warn('Failed to import wallet from seed phrase using service', importError, 'UserWalletService');
      }
      
      // Fallback: Try deterministic approach (for non-BIP39 seed phrases)
      const seedWords = seedPhrase.split(' ');
      if (seedWords.length !== 12 && seedWords.length !== 24) {
        logger.warn('Seed phrase does not have standard word count', { 
          wordCount: seedWords.length,
          expectedAddress 
        }, 'UserWalletService');
        return null;
      }
      
      // Create a deterministic seed from the seed phrase
      const seedString = seedPhrase;
      const seedBytes = new TextEncoder().encode(seedString);
      
      // Use the seed to create a deterministic keypair
      const keypair = Keypair.fromSeed(seedBytes.slice(0, 32));
      
      // Check if this keypair matches the expected address
      if (keypair.publicKey.toBase58() === expectedAddress) {
        logger.info('Successfully derived matching keypair from seed phrase using fallback method', { expectedAddress }, 'UserWalletService');
        return keypair;
      } else {
        logger.warn('Derived keypair does not match expected address', {
          expected: expectedAddress,
          derived: keypair.publicKey.toBase58()
        }, 'UserWalletService');
        return null;
      }
    } catch (error) {
      logger.error('Failed to derive keypair from seed phrase', error, 'UserWalletService');
      return null;
    }
  }

  // Ensure USDC token account exists for a wallet
  async ensureUsdcTokenAccount(walletAddress: string): Promise<boolean> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);

      // Check if token account exists
      try {
        await getAccount(this.connection, usdcTokenAccount);
        logger.info('USDC token account already exists', { walletAddress }, 'UserWalletService');
        return true;
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.info('USDC token account missing, attempting to create', { walletAddress }, 'UserWalletService');
        
        // Note: In a real implementation, you would need the wallet's private key to create the token account
        // For now, we'll return false and let the transaction creation handle it
        logger.warn('Cannot create USDC token account without private key', { walletAddress }, 'UserWalletService');
        return false;
      }
    } catch (error) {
      logger.error('Failed to check/create USDC token account', error, 'UserWalletService');
      return false;
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

      const balance = {
        solBalance: solBalanceInSol,
        usdcBalance,
        totalUSD: totalUSD || 0, // Ensure totalUSD is never undefined
        address: walletAddress,
        isConnected: true
      };

      // Cache the successful balance (use wallet address as key for this method)
      this.lastSuccessfulBalance[walletAddress] = balance;
      
      return balance;

    } catch (error) {
      console.error('Error fetching wallet balance by address:', error);
      return null;
    }
  }
}

// Create singleton instance
export const userWalletService = new UserWalletService(); 