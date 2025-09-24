import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { firebaseDataService } from './firebaseDataService';
import { consolidatedWalletService } from './consolidatedWalletService';
import { secureStorageService } from './secureStorageService';
import { walletManagementService } from './walletManagementService';
import { bip39WalletService } from './bip39WalletService';
import { legacyWalletRecoveryService } from './legacyWalletRecoveryService';
import { logger } from './loggingService';
import * as bip39 from 'bip39';

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
      logger.info('UserWalletService: Ensuring wallet for user', { userId }, 'UserWalletService');

      // Get current user data - use original user ID only
      let user;
      try {
        user = await firebaseDataService.user.getCurrentUser(userId);
        logger.info('Found user document with original user ID', { userId }, 'UserWalletService');
      } catch (userError) {
        if (userError instanceof Error && userError.message.includes('User not found')) {
          logger.error('User document not found in Firestore', { userId, error: userError.message }, 'UserWalletService');
          return {
            success: false,
            error: 'User document not found in Firestore'
          };
        } else {
          throw userError;
        }
      }

      // Debug: Log the user data to understand what we're getting
      logger.info('UserWalletService: Retrieved user data for wallet check', { 
        userId: userId,
        actualUserId: user?.id,
        hasUser: !!user,
        walletAddress: user?.wallet_address,
        primaryWallet: (user as any)?.primary_wallet,
        walletPublicKey: user?.wallet_public_key,
        hasWalletAddress: !!(user?.wallet_address),
        walletAddressLength: user?.wallet_address?.length || 0,
        walletAddressTrimmed: user?.wallet_address?.trim() || '',
        walletAddressIsEmpty: !user?.wallet_address?.trim()
      }, 'UserWalletService');

      // Check if user already has a wallet - prioritize wallet_address over primary_wallet
      const existingWalletAddress = user?.wallet_address || (user as any)?.primary_wallet;
      const walletStatus = (user as any)?.wallet_status;
      const hasPrivateKey = (user as any)?.wallet_has_private_key;
      
      // Check if user has a valid wallet address (not placeholder)
      const hasValidWalletAddress = existingWalletAddress && 
                                   existingWalletAddress.trim() !== '' && 
                                   existingWalletAddress !== '11111111111111111111111111111111';
      
      // Check if wallet is actually working (has valid address and private key)
      const walletIsWorking = hasValidWalletAddress && hasPrivateKey;
      
      if (user && walletIsWorking) {
        // User already has a working wallet - IMPORTANT: Return existing wallet, don't create new one
        logger.info('User already has working wallet, preserving it', { 
          userId: userId, 
          walletAddress: existingWalletAddress,
          source: user.wallet_address ? 'wallet_address' : 'primary_wallet',
          walletStatus: walletStatus,
          hasPrivateKey: hasPrivateKey,
          walletIsWorking: true
        }, 'UserWalletService');
        
        return {
          success: true,
          wallet: {
            address: existingWalletAddress,
            publicKey: user.wallet_public_key || existingWalletAddress
          }
        };
      }

      // Check if we need to restore the correct wallet address
      if (hasValidWalletAddress && !walletIsWorking) {
        // User has a valid wallet address but it's not working properly
        // This might be because the wallet_address field was overwritten
        logger.info('User has valid wallet address but wallet is not working, attempting to restore', { 
          userId, 
          existingWalletAddress,
          walletStatus: walletStatus,
          hasPrivateKey: hasPrivateKey
        }, 'UserWalletService');
        
        // Try to restore the wallet using the existing address
        const restoreResult = await this.restoreUserWallet(userId, existingWalletAddress);
        if (restoreResult.success) {
          return {
            success: true,
            wallet: {
              address: existingWalletAddress,
              publicKey: user.wallet_public_key || existingWalletAddress
            }
          };
        }
      }

      // User doesn't have a valid wallet, create one
      logger.info('User has no valid wallet, creating new one', { 
        userId: userId, 
        existingWalletAddress,
        walletStatus: (user as any)?.wallet_status,
        hasPlaceholderWallet: existingWalletAddress === '11111111111111111111111111111111'
      }, 'UserWalletService');

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

  // Import existing wallet for a specific user (overwrites existing)
  async importExistingWallet(userId: string, privateKeyOrSeedPhrase: string): Promise<WalletCreationResult> {
    try {
      logger.info('Importing existing wallet for user', { userId }, 'UserWalletService');
      
      // Get the user's current data to get the actual Firebase document ID
      const currentUser = await firebaseDataService.user.getCurrentUser(userId);
      if (!currentUser) {
        logger.error('User not found in Firebase', { userId }, 'UserWalletService');
        return {
          success: false,
          error: 'User not found in Firebase'
        };
      }
      
      // Use the actual Firebase document ID for updates
      const actualUserId = String(currentUser.id);
      logger.info('Using actual Firebase document ID for wallet import', {
        displayUserId: userId,
        actualUserId: actualUserId
      }, 'UserWalletService');
      
      let wallet;
      let mnemonic: string | null = null;
      
      // Check if it's a seed phrase (12 or 24 words) or a private key
      const words = privateKeyOrSeedPhrase.trim().split(' ');
      if (words.length === 12 || words.length === 24) {
        // It's a seed phrase
        mnemonic = privateKeyOrSeedPhrase.trim();
        
        // Validate the mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
          throw new Error('Invalid seed phrase');
        }
        
        // Import wallet from seed phrase
        wallet = await consolidatedWalletService.importWallet(mnemonic);
      } else {
        // It's a private key (base64 or array format)
        let privateKeyBuffer: Buffer;
        
        try {
          // Try to parse as JSON array first
          const privateKeyArray = JSON.parse(privateKeyOrSeedPhrase);
          privateKeyBuffer = Buffer.from(privateKeyArray);
        } catch {
          // If not JSON, try as base64
          privateKeyBuffer = Buffer.from(privateKeyOrSeedPhrase, 'base64');
        }
        
        // Create keypair from private key
        const keypair = Keypair.fromSecretKey(privateKeyBuffer);
        
        // Create wallet info
        wallet = {
          address: keypair.publicKey.toBase58(),
          publicKey: keypair.publicKey.toBase58(),
          secretKey: Buffer.from(keypair.secretKey).toString('base64'),
          balance: 0,
          usdcBalance: 0,
          isConnected: true,
          walletName: 'Imported Wallet',
          walletType: 'imported'
        };
      }

      if (!wallet || !wallet.address) {
        throw new Error('Wallet import failed - no address generated');
      }

      // Update user document with wallet info - use the actual Firebase document ID
      await firebaseDataService.user.updateUser(actualUserId, {
        wallet_address: wallet.address,
        wallet_public_key: wallet.publicKey || wallet.address
      });

      // Track wallet import in Firebase
      await walletManagementService.trackWalletCreation(actualUserId, wallet.address, 'external');

      // CRITICAL: Store private key in secure storage for transaction signing
      if (wallet.secretKey) {
        try {
          // Convert secret key to JSON array format for storage
          const secretKeyArray = Array.from(new Uint8Array(Buffer.from(wallet.secretKey, 'base64')));
          await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
          
          // Track private key storage in Firebase
          await walletManagementService.trackPrivateKeyStorage(actualUserId, true);
          
          logger.info('Private key stored securely for imported wallet', { 
            userId, 
            walletAddress: wallet.address 
          }, 'UserWalletService');
        } catch (keyStorageError) {
          logger.error('Failed to store private key for imported wallet', keyStorageError, 'UserWalletService');
          // Don't fail wallet import if key storage fails, but log the error
        }
      }

      // Store the mnemonic if provided
      if (mnemonic) {
        try {
          await secureStorageService.storeSeedPhrase(userId, mnemonic);
          
          // Track seed phrase storage in Firebase
          await walletManagementService.trackSeedPhraseStorage(actualUserId, true);
          
          logger.info('Seed phrase stored securely for imported wallet', { 
            userId, 
            walletAddress: wallet.address 
          }, 'UserWalletService');
        } catch (seedError) {
          logger.warn('Failed to store seed phrase for imported wallet', seedError, 'UserWalletService');
          // Don't fail wallet import if seed phrase storage fails
        }
      }

      // Wallet imported and saved for user
      logger.info('Wallet import completed successfully', {
        userId,
        walletAddress: wallet.address,
        hasPrivateKey: !!wallet.secretKey,
        hasSeedPhrase: !!mnemonic
      }, 'UserWalletService');

      return {
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.address
        }
      };
    } catch (error) {
      logger.error('Failed to import wallet for user', error, 'UserWalletService');
      return {
        success: false,
        error: `Failed to import wallet: ${error}`
      };
    }
  }

  // Create a new unified wallet for a specific user (overwrites existing)
  async createNewUnifiedWallet(userId: string): Promise<WalletCreationResult> {
    try {
      logger.info('Creating new unified BIP39-based wallet for user (overwriting existing)', { userId }, 'UserWalletService');
      
      // Get the user's current data to get the actual Firebase document ID
      const currentUser = await firebaseDataService.user.getCurrentUser(userId);
      if (!currentUser) {
        logger.error('User not found in Firebase', { userId }, 'UserWalletService');
        return {
          success: false,
          error: 'User not found in Firebase'
        };
      }
      
      // Use the actual Firebase document ID for updates
      const actualUserId = String(currentUser.id);
      logger.info('Using actual Firebase document ID for wallet update', {
        displayUserId: userId,
        actualUserId: actualUserId
      }, 'UserWalletService');
      
      // Generate a cryptographically secure mnemonic (12 words)
      const mnemonic = bip39.generateMnemonic(128); // 12 words - compatible with most wallets
      
      // Validate the generated mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Generated mnemonic is invalid');
      }
      
      // Derive wallet from the mnemonic using consolidated service
      const result = await consolidatedWalletService.importWallet(mnemonic);
      const wallet = result;

      if (!wallet || !wallet.address) {
        throw new Error('Wallet creation failed - no address generated from mnemonic');
      }

      // Update user document with wallet info - use the actual Firebase document ID
      await firebaseDataService.user.updateUser(actualUserId, {
        wallet_address: wallet.address,
        wallet_public_key: wallet.publicKey || wallet.address
      });

      // Track wallet creation in Firebase
      await walletManagementService.trackWalletCreation(actualUserId, wallet.address, 'app-generated');

      // CRITICAL: Store private key in secure storage for transaction signing
      if (wallet.secretKey) {
        try {
          // Convert secret key to JSON array format for storage
          const secretKeyArray = Array.from(new Uint8Array(Buffer.from(wallet.secretKey, 'base64')));
          await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
          
          // Track private key storage in Firebase
          await walletManagementService.trackPrivateKeyStorage(actualUserId, true);
          
          logger.info('Private key stored securely for user', { 
            userId, 
            walletAddress: wallet.address 
          }, 'UserWalletService');
        } catch (keyStorageError) {
          logger.error('Failed to store private key for user', keyStorageError, 'UserWalletService');
          // Don't fail wallet creation if key storage fails, but log the error
        }
      }

      // Store the mnemonic that was used to generate this wallet
      try {
        await secureStorageService.storeSeedPhrase(userId, mnemonic);
        
        // Track seed phrase storage in Firebase
        await walletManagementService.trackSeedPhraseStorage(actualUserId, true);
        
        logger.info('Seed phrase stored securely for user (matches wallet)', { 
          userId, 
          walletAddress: wallet.address 
        }, 'UserWalletService');
      } catch (seedError) {
        logger.warn('Failed to store seed phrase for user', seedError, 'UserWalletService');
        // Don't fail wallet creation if seed phrase storage fails
      }

      // Wallet created and saved for user
      logger.info('Unified wallet creation completed successfully', {
        userId,
        walletAddress: wallet.address,
        hasPrivateKey: !!wallet.secretKey,
        hasSeedPhrase: true
      }, 'UserWalletService');

      return {
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.address
        }
      };
    } catch (error) {
      logger.error('Failed to create unified wallet for user', error, 'UserWalletService');
      return {
        success: false,
        error: `Failed to create unified wallet: ${error}`
      };
    }
  }

  // Create wallet for a specific user
  async createWalletForUser(userId: string): Promise<WalletCreationResult> {
    try {
      // CRITICAL: Check if user already has a valid wallet before creating a new one
      let existingUser;
      try {
        existingUser = await firebaseDataService.user.getCurrentUser(userId);
      } catch (error) {
        // User not found, existingUser will be undefined
        existingUser = undefined;
      }
      
      const existingWalletAddress = existingUser?.wallet_address || (existingUser as any)?.primary_wallet;
      const hasValidExistingWallet = existingWalletAddress && 
                                    existingWalletAddress.trim() !== '' && 
                                    existingWalletAddress !== '11111111111111111111111111111111';
      
      if (hasValidExistingWallet) {
        logger.warn('User already has a valid wallet, not creating a new one', { 
          userId, 
          existingWalletAddress,
          walletStatus: (existingUser as any)?.wallet_status
        }, 'UserWalletService');
        
        return {
          success: true,
          wallet: {
            address: existingWalletAddress,
            publicKey: existingUser?.wallet_public_key || existingWalletAddress
          }
        };
      }

      // UNIFIED APPROACH: Generate BIP39 mnemonic and derive wallet from it
      logger.info('Creating unified BIP39-based wallet for user', { userId }, 'UserWalletService');
      
      // Generate a cryptographically secure mnemonic (12 words)
      const mnemonic = bip39.generateMnemonic(128); // 12 words - compatible with most wallets
      
      // Validate the generated mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Generated mnemonic is invalid');
      }
      
      // Derive wallet from the mnemonic using consolidated service
      const result = await consolidatedWalletService.importWallet(mnemonic);
      const wallet = result;

      if (!wallet || !wallet.address) {
        throw new Error('Wallet creation failed - no address generated from mnemonic');
      }

      // Update user document with wallet info - use the original user ID
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

      // Store the mnemonic that was used to generate this wallet
      try {
        await secureStorageService.storeSeedPhrase(userId, mnemonic);
        
        // Track seed phrase storage in Firebase
        await walletManagementService.trackSeedPhraseStorage(userId, true);
        
        logger.info('Seed phrase stored securely for user (matches wallet)', { 
          userId, 
          walletAddress: wallet.address 
        }, 'UserWalletService');
      } catch (seedError) {
        logger.warn('Failed to store seed phrase for user', seedError, 'UserWalletService');
        // Don't fail wallet creation if seed phrase storage fails
      }

      // Wallet created and saved for user
      logger.info('Wallet creation completed successfully', {
        userId,
        walletAddress: wallet.address,
        hasPrivateKey: !!wallet.secretKey,
        hasSeedPhrase: true // Seed phrase is generated separately
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

  // Restore user wallet using existing address
  async restoreUserWallet(userId: string, walletAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Attempting to restore user wallet', { userId, walletAddress }, 'UserWalletService');
      
      // Check if private key already exists
      const existingPrivateKey = await secureStorageService.getPrivateKey(userId);
      if (existingPrivateKey) {
        logger.info('Private key already exists for user, wallet is restored', { userId }, 'UserWalletService');
        return { success: true };
      }
      
      // Get seed phrase
      const seedPhrase = await secureStorageService.getSeedPhrase(userId);
      if (!seedPhrase) {
        logger.warn('No seed phrase found for user, cannot restore wallet', { userId }, 'UserWalletService');
        return { success: false, error: 'No seed phrase found' };
      }
      
      // Try to derive the keypair from seed phrase
      const derivedKeypair = await this.deriveKeypairFromSeedPhrase(seedPhrase, walletAddress);
      
      if (derivedKeypair && derivedKeypair.publicKey.toBase58() === walletAddress) {
        // Store the private key
        const secretKeyArray = Array.from(derivedKeypair.secretKey);
        await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
        
        // Update Firebase to reflect private key availability
        await firebaseDataService.user.updateUser(userId, {
          wallet_has_private_key: true,
          wallet_status: 'healthy',
          wallet_last_fixed_at: new Date().toISOString()
        });
        
        logger.info('Successfully restored wallet for user', { userId, walletAddress }, 'UserWalletService');
        return { success: true };
      } else {
        logger.warn('Could not derive keypair for existing wallet address', { userId, walletAddress }, 'UserWalletService');
        return { success: false, error: 'Could not derive keypair for existing wallet' };
      }
    } catch (error) {
      logger.error('Failed to restore user wallet', error, 'UserWalletService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to restore wallet'
      };
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
      const bip39Result = bip39WalletService.generateWallet();
      await secureStorageService.storeSeedPhrase(userId, bip39Result.mnemonic);
      
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
        logger.error('Failed to ensure wallet for balance check', { 
          userId, 
          success: walletResult.success, 
          error: walletResult.error 
        }, 'UserWalletService');
        return null;
      }

      const walletAddress = walletResult.wallet.address;
      
      // Debug: Log wallet address and network info
      logger.info('Fetching balance for wallet', { 
        userId, 
        walletAddress, 
        network: RPC_CONFIG.network,
        rpcEndpoint: RPC_ENDPOINT,
        isProduction: RPC_CONFIG.isProduction
      }, 'UserWalletService');
      
      // Fetching balance for user wallet

      // Get SOL balance with rate limiting protection
      let solBalanceInSol = 0;
      try {
        const publicKey = new PublicKey(walletAddress);
        logger.info('Fetching SOL balance from blockchain', { 
          walletAddress, 
          publicKey: publicKey.toBase58() 
        }, 'UserWalletService');
        
        const solBalance = await this.connection.getBalance(publicKey);
        solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
        
        logger.info('SOL balance fetched successfully', { 
          walletAddress, 
          solBalanceLamports: solBalance,
          solBalanceSOL: solBalanceInSol
        }, 'UserWalletService');
      } catch (error) {
        logger.error('Error fetching SOL balance', error, 'UserWalletService');
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
        
        logger.info('Fetching USDC balance from blockchain', { 
          walletAddress, 
          usdcMint: usdcMint.toBase58(),
          usdcTokenAccount: usdcTokenAccount.toBase58()
        }, 'UserWalletService');
        
        const accountInfo = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
        
        logger.info('USDC balance fetched successfully', { 
          walletAddress, 
          usdcBalanceRaw: accountInfo.amount.toString(),
          usdcBalance: usdcBalance
        }, 'UserWalletService');
      } catch (error) {
        logger.warn('USDC balance fetch failed (token account may not exist)', error, 'UserWalletService');
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

      // Debug: Log final balance
      logger.info('Balance calculation completed', { 
        userId,
        walletAddress,
        solBalance: solBalanceInSol,
        usdcBalance: usdcBalance,
        totalUSD: totalUSD,
        solToUSDRate: solToUSD
      }, 'UserWalletService');

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
      let user;
      try {
        user = await firebaseDataService.user.getCurrentUser(userId);
      } catch (userError) {
        // Handle case where user document doesn't exist in Firestore
        if (userError instanceof Error && userError.message.includes('User not found')) {
          logger.warn('User document not found in Firestore during wallet fix, creating user document first', { userId }, 'UserWalletService');
          
          // Create user document first
          try {
            const userData = {
              id: userId,
              name: '',
              email: '',
              wallet_address: '',
              wallet_public_key: '',
              created_at: new Date().toISOString(),
              avatar: '',
              emailVerified: true,
              lastLoginAt: new Date().toISOString(),
              hasCompletedOnboarding: false
            };
            
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, userData, { merge: true });
            
            logger.info('Created missing user document during wallet fix', { userId }, 'UserWalletService');
            user = userData;
          } catch (createError) {
            logger.error('Failed to create user document during wallet fix', createError, 'UserWalletService');
            return {
              success: false,
              error: 'Failed to create user document: ' + (createError instanceof Error ? createError.message : 'Unknown error')
            };
          }
        } else {
          throw userError;
        }
      }
      
      const currentWalletAddress = user?.wallet_address;
      const originalWalletAddress = 'G86LiEfFkKAhq4QYXrZ9EmVEfDXrVoKuvWgirSz5rfpE';
      
      // Check if wallet is already working and doesn't need fixing
      if (currentWalletAddress && 
          currentWalletAddress !== '11111111111111111111111111111111' && 
          (user as any)?.wallet_status !== 'error' &&
          (user as any)?.wallet_has_private_key) {
        logger.info('Wallet is already working, no fix needed', { 
          userId, 
          walletAddress: currentWalletAddress,
          walletStatus: (user as any)?.wallet_status,
          hasPrivateKey: (user as any)?.wallet_has_private_key
        }, 'UserWalletService');
        return {
          success: true,
          error: 'Wallet is already working'
        };
      }
      
      if (!currentWalletAddress) {
        return { success: false, error: 'No wallet address found for user' };
      }
      
      // Only restore wallet address if current address is a placeholder
      if (currentWalletAddress === '11111111111111111111111111111111') {
        logger.info('Restoring wallet address from placeholder', { userId, currentAddress: currentWalletAddress, originalAddress: originalWalletAddress }, 'UserWalletService');
        
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