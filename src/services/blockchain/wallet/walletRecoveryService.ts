/**
 * Wallet Recovery Service
 * Handles proper wallet recovery by comparing database public keys with local private keys
 */

import * as SecureStore from 'expo-secure-store';
import { Keypair, PublicKey } from '@solana/web3.js';
import { logger } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';

export interface WalletRecoveryResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
    privateKey: string;
  };
  error?: string;
}

export interface StoredWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  userId: string;
  createdAt: string;
}

export class WalletRecoveryService {
  private static readonly WALLET_STORAGE_KEY = 'user_wallets';
  private static readonly USER_WALLET_PREFIX = 'wallet_';
  
  // Cache to prevent repeated wallet recovery calls
  private static walletRecoveryCache = new Map<string, { result: WalletRecoveryResult; timestamp: number }>();
  private static readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Store a wallet securely on the device
   */
  static async storeWallet(userId: string, wallet: {
    address: string;
    publicKey: string;
    privateKey: string;
  }): Promise<boolean> {
    try {
      const walletData: StoredWallet = {
        ...wallet,
        userId,
        createdAt: new Date().toISOString()
      };

      const key = `${this.USER_WALLET_PREFIX}${userId}`;
      await SecureStore.setItemAsync(key, JSON.stringify(walletData));
      
      logger.info('Wallet stored securely', { userId, address: wallet.address }, 'WalletRecoveryService');
      return true;
    } catch (error) {
      logger.error('Failed to store wallet', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Get all stored wallets for a user (including legacy storage formats)
   * SECURITY FIX: Only return wallets that actually belong to the specified user
   */
  static async getStoredWallets(userId: string): Promise<StoredWallet[]> {
    const wallets: StoredWallet[] = [];
    
    try {
      // 1. Check new format: wallet_${userId} - This is safe as it's user-specific
      const newKey = `${this.USER_WALLET_PREFIX}${userId}`;
      const newStoredData = await SecureStore.getItemAsync(newKey);
      if (newStoredData) {
        const walletData: StoredWallet = JSON.parse(newStoredData);
        // Verify the wallet actually belongs to this user
        if (walletData.userId === userId) {
          wallets.push(walletData);
          logger.debug('Found wallet in new format', { userId, address: walletData.address }, 'WalletRecoveryService');
        } else {
          logger.warn('Found wallet with mismatched userId', { 
            expectedUserId: userId, 
            actualUserId: walletData.userId,
            address: walletData.address 
          }, 'WalletRecoveryService');
        }
      }

      // 2. Check legacy format: wallet_private_key - SECURITY FIX: Validate ownership
      const legacyPrivateKey = await SecureStore.getItemAsync('wallet_private_key', {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      
      if (legacyPrivateKey) {
        try {
          // Parse the stored private key (it's stored as JSON array)
          const privateKeyArray = JSON.parse(legacyPrivateKey);
          const privateKeyBuffer = Buffer.from(privateKeyArray);
          const keypair = Keypair.fromSecretKey(privateKeyBuffer);
          
          // SECURITY FIX: Verify this wallet belongs to the current user
          const isValidForUser = await this.verifyWalletOwnership(keypair, userId);
          if (isValidForUser) {
            const legacyWallet: StoredWallet = {
              address: keypair.publicKey.toBase58(),
              publicKey: keypair.publicKey.toBase58(),
              privateKey: Buffer.from(keypair.secretKey).toString('base64'),
              userId,
              createdAt: new Date().toISOString()
            };
            
            wallets.push(legacyWallet);
            logger.debug('Found wallet in legacy format', { userId, address: legacyWallet.address }, 'WalletRecoveryService');
          } else {
            logger.warn('Legacy wallet does not belong to current user', { 
              userId, 
              address: keypair.publicKey.toBase58() 
            }, 'WalletRecoveryService');
          }
        } catch (error) {
          logger.warn('Failed to parse legacy private key', error, 'WalletRecoveryService');
        }
      }

      // 3. Check user-specific legacy format: private_key_${userId}
      const userSpecificKey = `private_key_${userId}`;
      const userSpecificData = await SecureStore.getItemAsync(userSpecificKey);
      
      if (userSpecificData) {
        try {
          // Parse the stored private key (it's stored as JSON array)
          const privateKeyArray = JSON.parse(userSpecificData);
          const privateKeyBuffer = Buffer.from(privateKeyArray);
          const keypair = Keypair.fromSecretKey(privateKeyBuffer);
          
          const userSpecificWallet: StoredWallet = {
            address: keypair.publicKey.toBase58(),
            publicKey: keypair.publicKey.toBase58(),
            privateKey: Buffer.from(keypair.secretKey).toString('base64'),
            userId,
            createdAt: new Date().toISOString()
          };
          
          wallets.push(userSpecificWallet);
          logger.debug('Found wallet in user-specific legacy format', { userId, address: userSpecificWallet.address }, 'WalletRecoveryService');
        } catch (error) {
          logger.warn('Failed to parse user-specific private key', error, 'WalletRecoveryService');
        }
      }

      // 4. Check AsyncStorage for storedWallets (original format) - SECURITY FIX: Validate ownership
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const storedWalletsData = await AsyncStorage.getItem('storedWallets');
        
        if (storedWalletsData) {
          const storedWalletsArray = JSON.parse(storedWalletsData);
          logger.debug('Found AsyncStorage storedWallets', { count: storedWalletsArray.length }, 'WalletRecoveryService');
          
          for (const storedWallet of storedWalletsArray) {
            if (storedWallet.secretKey && storedWallet.address) {
              try {
                // Parse the secret key (it might be a string or array)
                let privateKeyBuffer: Buffer;
                if (typeof storedWallet.secretKey === 'string') {
                  // If it's a string, it might be base64 encoded
                  privateKeyBuffer = Buffer.from(storedWallet.secretKey, 'base64');
                } else if (Array.isArray(storedWallet.secretKey)) {
                  // If it's an array, convert to buffer
                  privateKeyBuffer = Buffer.from(storedWallet.secretKey);
                } else {
                  continue; // Skip if we can't parse it
                }
                
                const keypair = Keypair.fromSecretKey(privateKeyBuffer);
                const derivedAddress = keypair.publicKey.toBase58();
                
                // SECURITY FIX: Verify this wallet belongs to the current user
                const isValidForUser = await this.verifyWalletOwnership(keypair, userId);
                if (isValidForUser) {
                  const asyncStorageWallet: StoredWallet = {
                    address: derivedAddress,
                    publicKey: derivedAddress,
                    privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                    userId,
                    createdAt: new Date().toISOString()
                  };
                  
                  wallets.push(asyncStorageWallet);
                  logger.debug('Found wallet in AsyncStorage format', { userId, address: asyncStorageWallet.address }, 'WalletRecoveryService');
                } else {
                  logger.warn('AsyncStorage wallet does not belong to current user', { 
                    userId, 
                    address: derivedAddress 
                  }, 'WalletRecoveryService');
                }
              } catch (error) {
                logger.warn('Failed to parse AsyncStorage wallet', error, 'WalletRecoveryService');
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to check AsyncStorage for wallets', error, 'WalletRecoveryService');
      }

      // 5. Check for stored mnemonic (wallet_mnemonic) - SECURITY FIX: Validate ownership
      try {
        const storedMnemonic = await SecureStore.getItemAsync('wallet_mnemonic', {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData'
        });
        
        if (storedMnemonic) {
          try {
            // Import bip39 to validate and derive from mnemonic
            const bip39 = await import('bip39');
            if (bip39.validateMnemonic(storedMnemonic)) {
              // Derive keypair from mnemonic
              const seed = await bip39.mnemonicToSeed(storedMnemonic);
              const keypair = Keypair.fromSeed(seed.slice(0, 32));
              
              // SECURITY FIX: Verify this wallet belongs to the current user
              const isValidForUser = await this.verifyWalletOwnership(keypair, userId);
              if (isValidForUser) {
                const mnemonicWallet: StoredWallet = {
                  address: keypair.publicKey.toBase58(),
                  publicKey: keypair.publicKey.toBase58(),
                  privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                  userId,
                  createdAt: new Date().toISOString()
                };
                
                wallets.push(mnemonicWallet);
                logger.debug('Found wallet from stored mnemonic', { userId, address: mnemonicWallet.address }, 'WalletRecoveryService');
              } else {
                logger.warn('Stored mnemonic wallet does not belong to current user', { 
                  userId, 
                  address: keypair.publicKey.toBase58() 
                }, 'WalletRecoveryService');
              }
            }
          } catch (error) {
            logger.warn('Failed to derive wallet from stored mnemonic', error, 'WalletRecoveryService');
          }
        }
      } catch (error) {
        logger.warn('Failed to check for stored mnemonic', error, 'WalletRecoveryService');
      }

      // 6. Check for user-specific mnemonic (mnemonic_${userId}) - This is safe as it's user-specific
      try {
        const userMnemonicKey = `mnemonic_${userId}`;
        const userMnemonicData = await SecureStore.getItemAsync(userMnemonicKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData'
        });
        
        if (userMnemonicData) {
          try {
            // Parse the stored data (it might be JSON)
            let mnemonic: string;
            try {
              const parsed = JSON.parse(userMnemonicData);
              mnemonic = parsed.mnemonic || userMnemonicData;
            } catch {
              mnemonic = userMnemonicData;
            }
            
            // Import bip39 to validate and derive from mnemonic
            const bip39 = await import('bip39');
            if (bip39.validateMnemonic(mnemonic)) {
              // Derive keypair from mnemonic
              const seed = await bip39.mnemonicToSeed(mnemonic);
              const keypair = Keypair.fromSeed(seed.slice(0, 32));
              
              // This is user-specific storage, so it's safe to use
              const userMnemonicWallet: StoredWallet = {
                address: keypair.publicKey.toBase58(),
                publicKey: keypair.publicKey.toBase58(),
                privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                userId,
                createdAt: new Date().toISOString()
              };
              
              wallets.push(userMnemonicWallet);
              logger.debug('Found wallet from user-specific mnemonic', { userId, address: userMnemonicWallet.address }, 'WalletRecoveryService');
            }
          } catch (error) {
            logger.warn('Failed to derive wallet from user-specific mnemonic', error, 'WalletRecoveryService');
          }
        }
      } catch (error) {
        logger.warn('Failed to check for user-specific mnemonic', error, 'WalletRecoveryService');
      }

      // 7. Check for user-specific wallet data (wallet_${userId}) - This is safe as it's user-specific
      try {
        const userWalletKey = `wallet_${userId}`;
        const userWalletData = await SecureStore.getItemAsync(userWalletKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData'
        });
        
        if (userWalletData) {
          try {
            const parsed = JSON.parse(userWalletData);
            if (parsed.secretKey) {
              // Parse the secret key
              let privateKeyBuffer: Buffer;
              if (typeof parsed.secretKey === 'string') {
                privateKeyBuffer = Buffer.from(parsed.secretKey, 'base64');
              } else if (Array.isArray(parsed.secretKey)) {
                privateKeyBuffer = Buffer.from(parsed.secretKey);
              } else {
                throw new Error('Invalid secret key format');
              }
              
              const keypair = Keypair.fromSecretKey(privateKeyBuffer);
              const derivedAddress = keypair.publicKey.toBase58();
              
              // This is user-specific storage, so it's safe to use
              const userWallet: StoredWallet = {
                address: derivedAddress,
                publicKey: derivedAddress,
                privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                userId,
                createdAt: new Date().toISOString()
              };
              
              wallets.push(userWallet);
              logger.debug('Found wallet from user-specific wallet data', { userId, address: userWallet.address }, 'WalletRecoveryService');
            }
          } catch (error) {
            logger.warn('Failed to parse user-specific wallet data', error, 'WalletRecoveryService');
          }
        }
      } catch (error) {
        logger.warn('Failed to check for user-specific wallet data', error, 'WalletRecoveryService');
      }

      logger.info('Found stored wallets', { userId, count: wallets.length }, 'WalletRecoveryService');
      return wallets;
    } catch (error) {
      logger.error('Failed to get stored wallets', error, 'WalletRecoveryService');
      return wallets; // Return whatever we found so far
    }
  }

  /**
   * Recover wallet by comparing database public key with local private keys
   */
  static async recoverWallet(userId: string): Promise<WalletRecoveryResult> {
    try {
      // Check cache first to prevent repeated calls
      const cacheKey = `recovery_${userId}`;
      const cached = this.walletRecoveryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        logger.debug('Using cached wallet recovery result', { userId }, 'WalletRecoveryService');
        return cached.result;
      }
      
      logger.info('Starting wallet recovery', { userId }, 'WalletRecoveryService');

      // 1. Get user's public key from database with error handling
      let userData;
      try {
        userData = await firebaseDataService.user.getCurrentUser(userId);
      } catch (error) {
        logger.warn('Failed to get user data from database, trying local recovery only', { 
          userId, 
          error: error instanceof Error ? error.message : String(error) 
        }, 'WalletRecoveryService');
        
        // Try to recover from local storage only
        const storedWallets = await this.getStoredWallets(userId);
        if (storedWallets.length > 0) {
          const firstWallet = storedWallets[0];
          logger.info('Using first stored wallet for recovery', { 
            userId, 
            address: firstWallet.address 
          }, 'WalletRecoveryService');
          
          return {
            success: true,
            wallet: {
              address: firstWallet.address,
              publicKey: firstWallet.publicKey,
              privateKey: firstWallet.privateKey
            }
          };
        }
        
        return {
          success: false,
          error: 'User not found in database and no local wallets available'
        };
      }
      
      if (!userData?.wallet_address) {
        return {
          success: false,
          error: 'No wallet address found in user data'
        };
      }

      const expectedPublicKey = userData.wallet_address;
      logger.debug('Expected public key from database', { expectedPublicKey }, 'WalletRecoveryService');

      // 2. Get stored wallets from local storage
      const storedWallets = await this.getStoredWallets(userId);
      if (storedWallets.length === 0) {
        return {
          success: false,
          error: 'No wallets found in local storage'
        };
      }

      // 3. Find matching wallet - check all stored wallets
      logger.info('Checking stored wallets for match', { 
        expectedPublicKey, 
        storedWalletsCount: storedWallets.length,
        storedAddresses: storedWallets.map(w => w.address)
      }, 'WalletRecoveryService');

      for (const storedWallet of storedWallets) {
        logger.debug('Checking stored wallet', { 
          address: storedWallet.address,
          publicKey: storedWallet.publicKey,
          expectedPublicKey
        }, 'WalletRecoveryService');

        // Check if this wallet matches the expected address
        const isExactMatch = storedWallet.publicKey === expectedPublicKey || storedWallet.address === expectedPublicKey;
        
        // Also verify the private key can generate the expected public key
        try {
          const keypair = Keypair.fromSecretKey(Buffer.from(storedWallet.privateKey, 'base64'));
          const derivedPublicKey = keypair.publicKey.toBase58();
          
          logger.debug('Derived public key from stored wallet', { 
            storedAddress: storedWallet.address,
            derivedPublicKey,
            expectedPublicKey,
            isExactMatch
          }, 'WalletRecoveryService');
          
          // Check if the derived public key matches the expected one
          const isDerivedMatch = derivedPublicKey === expectedPublicKey;
          
          if (isExactMatch || isDerivedMatch) {
            logger.info('Found matching wallet', { 
              userId, 
              address: storedWallet.address,
              publicKey: storedWallet.publicKey,
              derivedPublicKey,
              expectedPublicKey,
              matchType: isExactMatch ? 'exact' : 'derived'
            }, 'WalletRecoveryService');

            // If this is a legacy wallet, migrate it to the new format
            if (storedWallet.createdAt === new Date().toISOString()) {
              // This is a legacy wallet (created just now in getStoredWallets)
              await this.migrateLegacyWallet(userId, storedWallet);
            }
            
            // Use the derived public key if it matches, otherwise use stored
            const finalPublicKey = isDerivedMatch ? derivedPublicKey : storedWallet.publicKey;
            const finalAddress = isDerivedMatch ? derivedPublicKey : storedWallet.address;
            
            const result = {
              success: true,
              wallet: {
                address: finalAddress,
                publicKey: finalPublicKey,
                privateKey: storedWallet.privateKey
              }
            };
            
            // Cache the successful result
            this.walletRecoveryCache.set(cacheKey, { result, timestamp: Date.now() });
            return result;
          } else {
            logger.debug('Stored wallet does not match expected address', {
              storedAddress: storedWallet.address,
              derivedPublicKey,
              expectedPublicKey
            }, 'WalletRecoveryService');
          }
        } catch (keypairError) {
          logger.error('Failed to create keypair from private key', keypairError, 'WalletRecoveryService');
        }
      }

      const result = {
        success: false,
        error: 'No matching wallet found in local storage'
      };
      
      // Cache the failed result as well to prevent repeated attempts
      this.walletRecoveryCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;

    } catch (error) {
      logger.error('Wallet recovery failed', error, 'WalletRecoveryService');
      const result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during wallet recovery'
      };
      
      // Cache the error result
      const cacheKey = `recovery_${userId}`;
      this.walletRecoveryCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  }

  /**
   * Create a new wallet and store it securely
   */
  static async createAndStoreWallet(userId: string): Promise<WalletRecoveryResult> {
    try {
      // Generate new keypair
      const keypair = Keypair.generate();
      const wallet = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        privateKey: Buffer.from(keypair.secretKey).toString('base64')
      };

      // Store the wallet
      const stored = await this.storeWallet(userId, wallet);
      if (!stored) {
        return {
          success: false,
          error: 'Failed to store new wallet'
        };
      }

      logger.info('New wallet created and stored', { userId, address: wallet.address }, 'WalletRecoveryService');
      
      return {
        success: true,
        wallet
      };
    } catch (error) {
      logger.error('Failed to create and store wallet', error, 'WalletRecoveryService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet'
      };
    }
  }

  /**
   * Migrate legacy wallet to new format
   */
  static async migrateLegacyWallet(userId: string, wallet: StoredWallet): Promise<boolean> {
    try {
      // Store in new format
      const migrated = await this.storeWallet(userId, {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey
      });
      
      if (migrated) {
        // Clear legacy storage
        try {
          await SecureStore.deleteItemAsync('wallet_private_key', {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          await SecureStore.deleteItemAsync(`private_key_${userId}`);
          logger.info('Legacy wallet migrated and cleared', { userId, address: wallet.address }, 'WalletRecoveryService');
        } catch (clearError) {
          logger.warn('Failed to clear legacy storage after migration', clearError, 'WalletRecoveryService');
        }
      }
      
      return migrated;
    } catch (error) {
      logger.error('Failed to migrate legacy wallet', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Clear stored wallet for a user
   */
  static async clearStoredWallet(userId: string): Promise<boolean> {
    try {
      const key = `${this.USER_WALLET_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(key);
      
      // Clear cache for this user
      const cacheKey = `recovery_${userId}`;
      this.walletRecoveryCache.delete(cacheKey);
      
      logger.info('Stored wallet cleared', { userId }, 'WalletRecoveryService');
      return true;
    } catch (error) {
      logger.error('Failed to clear stored wallet', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Clear wallet recovery cache (useful for testing or when user logs out)
   */
  static clearCache(): void {
    this.walletRecoveryCache.clear();
    logger.debug('Wallet recovery cache cleared', null, 'WalletRecoveryService');
  }

  /**
   * Verify that a wallet actually belongs to the specified user
   * SECURITY: This prevents cross-user wallet contamination
   */
  private static async verifyWalletOwnership(keypair: Keypair, userId: string): Promise<boolean> {
    try {
      // Method 1: Check if the wallet address matches the user's wallet in database
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      if (userData?.wallet_address === keypair.publicKey.toBase58()) {
        logger.debug('Wallet ownership verified via database match', { 
          userId, 
          address: keypair.publicKey.toBase58() 
        }, 'WalletRecoveryService');
        return true;
      }

      // Method 2: Check if there's a user-specific storage entry for this wallet
      const userSpecificKey = `private_key_${userId}`;
      const userSpecificData = await SecureStore.getItemAsync(userSpecificKey);
      if (userSpecificData) {
        try {
          const privateKeyArray = JSON.parse(userSpecificData);
          const privateKeyBuffer = Buffer.from(privateKeyArray);
          const userKeypair = Keypair.fromSecretKey(privateKeyBuffer);
          
          if (userKeypair.publicKey.equals(keypair.publicKey)) {
            logger.debug('Wallet ownership verified via user-specific storage', { 
              userId, 
              address: keypair.publicKey.toBase58() 
            }, 'WalletRecoveryService');
            return true;
          }
        } catch (error) {
          logger.warn('Failed to verify wallet ownership via user-specific storage', error, 'WalletRecoveryService');
        }
      }

      // Method 3: Check if there's a mnemonic for this user that derives to this wallet
      const userMnemonicKey = `mnemonic_${userId}`;
      const userMnemonicData = await SecureStore.getItemAsync(userMnemonicKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      
      if (userMnemonicData) {
        try {
          const bip39 = await import('bip39');
          if (bip39.validateMnemonic(userMnemonicData)) {
            const seed = await bip39.mnemonicToSeed(userMnemonicData);
            const derivedKeypair = Keypair.fromSeed(seed.slice(0, 32));
            
            if (derivedKeypair.publicKey.equals(keypair.publicKey)) {
              logger.debug('Wallet ownership verified via user mnemonic', { 
                userId, 
                address: keypair.publicKey.toBase58() 
              }, 'WalletRecoveryService');
              return true;
            }
          }
        } catch (error) {
          logger.warn('Failed to verify wallet ownership via user mnemonic', error, 'WalletRecoveryService');
        }
      }

      logger.warn('Wallet ownership verification failed', { 
        userId, 
        address: keypair.publicKey.toBase58() 
      }, 'WalletRecoveryService');
      return false;
    } catch (error) {
      logger.error('Error verifying wallet ownership', error, 'WalletRecoveryService');
      return false;
    }
  }
}

export const walletRecoveryService = WalletRecoveryService;
