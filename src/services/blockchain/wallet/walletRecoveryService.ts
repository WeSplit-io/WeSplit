/**
 * Wallet Recovery Service
 * Handles proper wallet recovery by comparing database public keys with local private keys
 */

import * as SecureStore from 'expo-secure-store';
import { Keypair, PublicKey } from '@solana/web3.js';
import { logger } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';

export enum WalletRecoveryError {
  NO_LOCAL_WALLETS = 'NO_LOCAL_WALLETS',
  DATABASE_MISMATCH = 'DATABASE_MISMATCH',
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',
  STORAGE_CORRUPTION = 'STORAGE_CORRUPTION',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  NO_WALLET_ADDRESS = 'NO_WALLET_ADDRESS'
}

export interface WalletRecoveryResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
    privateKey: string;
  };
  error?: WalletRecoveryError;
  errorMessage?: string;
  requiresUserAction?: boolean;
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
   */
  static async getStoredWallets(userId: string): Promise<StoredWallet[]> {
    const wallets: StoredWallet[] = [];
    
    try {
      // 1. Check new format: wallet_${userId}
      const newKey = `${this.USER_WALLET_PREFIX}${userId}`;
      const newStoredData = await SecureStore.getItemAsync(newKey);
      if (newStoredData) {
        const walletData: StoredWallet = JSON.parse(newStoredData);
        wallets.push(walletData);
        logger.debug('Found wallet in new format', { userId, address: walletData.address }, 'WalletRecoveryService');
      }

      // 2. Check legacy format: wallet_private_key
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
          
          const legacyWallet: StoredWallet = {
            address: keypair.publicKey.toBase58(),
            publicKey: keypair.publicKey.toBase58(),
            privateKey: Buffer.from(keypair.secretKey).toString('base64'),
            userId,
            createdAt: new Date().toISOString()
          };
          
          wallets.push(legacyWallet);
          logger.debug('Found wallet in legacy format', { userId, address: legacyWallet.address }, 'WalletRecoveryService');
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

      // 4. Check AsyncStorage for storedWallets (original format)
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
                
                const asyncStorageWallet: StoredWallet = {
                  address: derivedAddress,
                  publicKey: derivedAddress,
                  privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                  userId,
                  createdAt: new Date().toISOString()
                };
                
                wallets.push(asyncStorageWallet);
                logger.debug('Found wallet in AsyncStorage format', { userId, address: asyncStorageWallet.address }, 'WalletRecoveryService');
              } catch (error) {
                logger.warn('Failed to parse AsyncStorage wallet', error, 'WalletRecoveryService');
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to check AsyncStorage for wallets', error, 'WalletRecoveryService');
      }

      // 5. Check for stored mnemonic (wallet_mnemonic)
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
              
              const mnemonicWallet: StoredWallet = {
                address: keypair.publicKey.toBase58(),
                publicKey: keypair.publicKey.toBase58(),
                privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                userId,
                createdAt: new Date().toISOString()
              };
              
              wallets.push(mnemonicWallet);
              logger.debug('Found wallet from stored mnemonic', { userId, address: mnemonicWallet.address }, 'WalletRecoveryService');
            }
          } catch (error) {
            logger.warn('Failed to derive wallet from stored mnemonic', error, 'WalletRecoveryService');
          }
        }
      } catch (error) {
        logger.warn('Failed to check for stored mnemonic', error, 'WalletRecoveryService');
      }

      // 6. Check for user-specific mnemonic (mnemonic_${userId})
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

      // 7. Check for user-specific wallet data (wallet_${userId})
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

      // 8. Check additional legacy storage keys that might contain the wallet
      const additionalKeys = [
        'wallet_secret_key',
        `secret_key_${userId}`,
        'app_wallet',
        `app_wallet_${userId}`,
        'main_wallet',
        `main_wallet_${userId}`
      ];
      
      for (const key of additionalKeys) {
        try {
          const additionalData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (additionalData) {
            try {
              // Try to parse as JSON array (private key)
              const privateKeyArray = JSON.parse(additionalData);
              const privateKeyBuffer = Buffer.from(privateKeyArray);
              const keypair = Keypair.fromSecretKey(privateKeyBuffer);
              const derivedAddress = keypair.publicKey.toBase58();
              
              const additionalWallet: StoredWallet = {
                address: derivedAddress,
                publicKey: derivedAddress,
                privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                userId,
                createdAt: new Date().toISOString()
              };
              
              wallets.push(additionalWallet);
              logger.debug('Found wallet from additional storage key', { userId, key, address: additionalWallet.address }, 'WalletRecoveryService');
            } catch (parseError) {
              // Try to parse as wallet object
              try {
                const walletData = JSON.parse(additionalData);
                if (walletData.secretKey || walletData.privateKey) {
                  const secretKey = walletData.secretKey || walletData.privateKey;
                  let privateKeyBuffer: Buffer;
                  
                  if (typeof secretKey === 'string') {
                    privateKeyBuffer = Buffer.from(secretKey, 'base64');
                  } else if (Array.isArray(secretKey)) {
                    privateKeyBuffer = Buffer.from(secretKey);
                  } else {
                    continue;
                  }
                  
                  const keypair = Keypair.fromSecretKey(privateKeyBuffer);
                  const derivedAddress = keypair.publicKey.toBase58();
                  
                  const additionalWallet: StoredWallet = {
                    address: derivedAddress,
                    publicKey: derivedAddress,
                    privateKey: Buffer.from(keypair.secretKey).toString('base64'),
                    userId,
                    createdAt: new Date().toISOString()
                  };
                  
                  wallets.push(additionalWallet);
                  logger.debug('Found wallet from additional storage object', { userId, key, address: additionalWallet.address }, 'WalletRecoveryService');
                }
              } catch (objectParseError) {
                logger.debug('Failed to parse additional storage data', { 
                  userId, 
                  key,
                  error: objectParseError instanceof Error ? objectParseError.message : String(objectParseError)
                }, 'WalletRecoveryService');
              }
            }
          }
        } catch (error) {
          // Continue to next key
        }
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
    const startTime = Date.now();
    
    try {
      logger.info('Starting wallet recovery', { userId }, 'WalletRecoveryService');

      // 1. First check if wallet consistency is valid
      const isConsistent = await this.validateWalletConsistency(userId);
      
      if (isConsistent) {
        // Wallet is consistent, proceed with normal recovery
        return await this.performConsistentWalletRecovery(userId);
      } else {
        // Wallet is inconsistent, resolve the mismatch
        logger.warn('Wallet inconsistency detected, resolving mismatch', { userId }, 'WalletRecoveryService');
        return await this.resolveWalletMismatch(userId);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Wallet recovery failed', { 
        userId, 
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`
      }, 'WalletRecoveryService');
      
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error during wallet recovery'
      };
    }
  }

  /**
   * Perform wallet recovery when consistency is validated
   */
  private static async performConsistentWalletRecovery(userId: string): Promise<WalletRecoveryResult> {
    try {
      // Get user's public key from database
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      
      if (!userData?.wallet_address) {
        return {
          success: false,
          error: WalletRecoveryError.NO_WALLET_ADDRESS,
          errorMessage: 'No wallet address found in user data'
        };
      }

      const expectedPublicKey = userData.wallet_address;
      logger.debug('Expected public key from database', { expectedPublicKey }, 'WalletRecoveryService');

      // Get stored wallets from local storage
      const storedWallets = await this.getStoredWallets(userId);
      if (storedWallets.length === 0) {
        return {
          success: false,
          error: WalletRecoveryError.NO_LOCAL_WALLETS,
          errorMessage: 'No wallets found in local storage'
        };
      }

      // Find matching wallet
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
              await this.migrateLegacyWallet(userId, storedWallet);
            }
            
            // Use the derived public key if it matches, otherwise use stored
            const finalPublicKey = isDerivedMatch ? derivedPublicKey : storedWallet.publicKey;
            const finalAddress = isDerivedMatch ? derivedPublicKey : storedWallet.address;
            
            return {
              success: true,
              wallet: {
                address: finalAddress,
                publicKey: finalPublicKey,
                privateKey: storedWallet.privateKey
              }
            };
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

      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'No matching wallet found in local storage'
      };

    } catch (error) {
      logger.error('Consistent wallet recovery failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
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
          error: WalletRecoveryError.STORAGE_CORRUPTION,
          errorMessage: 'Failed to store new wallet'
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
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Failed to create wallet'
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
   * Validate wallet consistency between database and local storage
   */
  static async validateWalletConsistency(userId: string): Promise<boolean> {
    try {
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      const storedWallets = await this.getStoredWallets(userId);
      
      if (!userData?.wallet_address) {
        logger.debug('No wallet address in database', { userId }, 'WalletRecoveryService');
        return false;
      }
      
      if (storedWallets.length === 0) {
        logger.debug('No local wallets found', { userId }, 'WalletRecoveryService');
        return false;
      }
      
      const hasMatch = storedWallets.some(wallet => 
        wallet.address === userData.wallet_address || 
        wallet.publicKey === userData.wallet_address
      );
      
      logger.debug('Wallet consistency check', { 
        userId, 
        databaseWallet: userData.wallet_address,
        localWalletsCount: storedWallets.length,
        hasMatch 
      }, 'WalletRecoveryService');
      
      return hasMatch;
    } catch (error) {
      logger.error('Failed to validate wallet consistency', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Resolve wallet mismatch by attempting to recover the database wallet
   */
  static async resolveWalletMismatch(userId: string): Promise<WalletRecoveryResult> {
    try {
      logger.info('Resolving wallet mismatch - attempting to recover database wallet', { userId }, 'WalletRecoveryService');
      
      // Get the expected wallet address from database
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      if (!userData?.wallet_address) {
        return { 
          success: false, 
          error: WalletRecoveryError.NO_WALLET_ADDRESS,
          errorMessage: 'No wallet address found in database'
        };
      }
      
      const expectedAddress = userData.wallet_address;
      logger.info('Attempting to recover database wallet', { 
        userId, 
        expectedAddress 
      }, 'WalletRecoveryService');
      
      // Try comprehensive recovery methods to find the database wallet
      const comprehensiveResult = await this.performComprehensiveRecovery(userId, expectedAddress);
      
      if (comprehensiveResult.success) {
        logger.info('Successfully recovered database wallet', { 
          userId, 
          recoveredAddress: comprehensiveResult.wallet!.address,
          expectedAddress
        }, 'WalletRecoveryService');
        return comprehensiveResult;
      }
      
      // If comprehensive recovery failed, try alternative derivation paths
      logger.warn('Comprehensive recovery failed, trying alternative methods', { 
        userId, 
        expectedAddress,
        error: comprehensiveResult.errorMessage
      }, 'WalletRecoveryService');
      
      const alternativeResult = await this.tryAlternativeRecoveryMethods(userId, expectedAddress);
      
      if (alternativeResult.success) {
        logger.info('Successfully recovered database wallet using alternative method', { 
          userId, 
          recoveredAddress: alternativeResult.wallet!.address,
          expectedAddress
        }, 'WalletRecoveryService');
        return alternativeResult;
      }
      
      // If all recovery methods failed, return error
      logger.error('Failed to recover database wallet after all attempts', { 
        userId, 
        expectedAddress,
        comprehensiveError: comprehensiveResult.errorMessage,
        alternativeError: alternativeResult.errorMessage
      }, 'WalletRecoveryService');
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: `Unable to recover database wallet ${expectedAddress}. Please restore from seed phrase or contact support.`,
        requiresUserAction: true
      };
      
    } catch (error) {
      logger.error('Failed to resolve wallet mismatch', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform comprehensive recovery using all available methods
   */
  private static async performComprehensiveRecovery(userId: string, expectedAddress: string): Promise<WalletRecoveryResult> {
    try {
      logger.debug('Starting comprehensive recovery', { userId, expectedAddress }, 'WalletRecoveryService');
      
      // 1. Try to find wallet in all storage formats
      const storedWallets = await this.getStoredWallets(userId);
      
      logger.info('Checking stored wallets for database address match', { 
        userId, 
        expectedAddress,
        storedWalletsCount: storedWallets.length,
        storedAddresses: storedWallets.map(w => w.address)
      }, 'WalletRecoveryService');
      
      for (const wallet of storedWallets) {
        logger.debug('Checking stored wallet', { 
          userId,
          storedAddress: wallet.address,
          expectedAddress
        }, 'WalletRecoveryService');
        
        // Check if this wallet can derive the expected address
        try {
          const keypair = Keypair.fromSecretKey(Buffer.from(wallet.privateKey, 'base64'));
          const derivedAddress = keypair.publicKey.toBase58();
          
          logger.debug('Derived address from stored wallet', { 
            userId,
            storedAddress: wallet.address,
            derivedAddress,
            expectedAddress,
            matches: derivedAddress === expectedAddress
          }, 'WalletRecoveryService');
          
          if (derivedAddress === expectedAddress) {
            logger.info('✅ Found wallet that matches database address!', { 
              userId, 
              storedAddress: wallet.address,
              derivedAddress,
              expectedAddress
            }, 'WalletRecoveryService');
            
            // Store this wallet in the new format for future use
            await this.storeWallet(userId, {
              address: derivedAddress,
              publicKey: derivedAddress,
              privateKey: wallet.privateKey
            });
            
            return {
              success: true,
              wallet: {
                address: derivedAddress,
                publicKey: derivedAddress,
                privateKey: wallet.privateKey
              }
            };
          }
        } catch (error) {
          logger.debug('Failed to derive address from stored wallet', { 
            userId, 
            storedAddress: wallet.address,
            error: error instanceof Error ? error.message : String(error)
          }, 'WalletRecoveryService');
        }
      }
      
      // 2. Try to recover from mnemonic with different derivation paths
      logger.info('No direct match found, trying mnemonic recovery', { userId, expectedAddress }, 'WalletRecoveryService');
      const mnemonicResult = await this.tryMnemonicRecovery(userId, expectedAddress);
      if (mnemonicResult.success) {
        return mnemonicResult;
      }
      
      // 3. Try legacy storage formats that might contain the wallet
      logger.info('Trying legacy storage formats', { userId, expectedAddress }, 'WalletRecoveryService');
      const legacyResult = await this.tryLegacyStorageRecovery(userId, expectedAddress);
      if (legacyResult.success) {
        return legacyResult;
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: `No stored wallet matches the database address ${expectedAddress}`
      };
      
    } catch (error) {
      logger.error('Comprehensive recovery failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Try to recover wallet from legacy storage formats
   */
  private static async tryLegacyStorageRecovery(userId: string, expectedAddress: string): Promise<WalletRecoveryResult> {
    try {
      logger.debug('Trying legacy storage recovery', { userId, expectedAddress }, 'WalletRecoveryService');
      
      // Check various legacy storage keys
      const legacyKeys = [
        'wallet_private_key',
        `private_key_${userId}`,
        `wallet_${userId}`,
        'wallet_secret_key',
        `secret_key_${userId}`
      ];
      
      for (const key of legacyKeys) {
        try {
          const legacyData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (legacyData) {
            logger.debug('Found legacy data', { userId, key }, 'WalletRecoveryService');
            
            // Try to parse as JSON array (private key)
            try {
              const privateKeyArray = JSON.parse(legacyData);
              const privateKeyBuffer = Buffer.from(privateKeyArray);
              const keypair = Keypair.fromSecretKey(privateKeyBuffer);
              const derivedAddress = keypair.publicKey.toBase58();
              
              logger.debug('Derived address from legacy private key', { 
                userId, 
                key,
                derivedAddress,
                expectedAddress,
                matches: derivedAddress === expectedAddress
              }, 'WalletRecoveryService');
              
              if (derivedAddress === expectedAddress) {
                logger.info('✅ Found wallet in legacy storage!', { 
                  userId, 
                  key,
                  derivedAddress,
                  expectedAddress
                }, 'WalletRecoveryService');
                
                // Store in new format
                await this.storeWallet(userId, {
                  address: derivedAddress,
                  publicKey: derivedAddress,
                  privateKey: Buffer.from(keypair.secretKey).toString('base64')
                });
                
                return {
                  success: true,
                  wallet: {
                    address: derivedAddress,
                    publicKey: derivedAddress,
                    privateKey: Buffer.from(keypair.secretKey).toString('base64')
                  }
                };
              }
            } catch (parseError) {
              logger.debug('Failed to parse legacy data as private key', { 
                userId, 
                key,
                error: parseError instanceof Error ? parseError.message : String(parseError)
              }, 'WalletRecoveryService');
            }
            
            // Try to parse as wallet object
            try {
              const walletData = JSON.parse(legacyData);
              if (walletData.secretKey) {
                let privateKeyBuffer: Buffer;
                if (typeof walletData.secretKey === 'string') {
                  privateKeyBuffer = Buffer.from(walletData.secretKey, 'base64');
                } else if (Array.isArray(walletData.secretKey)) {
                  privateKeyBuffer = Buffer.from(walletData.secretKey);
                } else {
                  continue;
                }
                
                const keypair = Keypair.fromSecretKey(privateKeyBuffer);
                const derivedAddress = keypair.publicKey.toBase58();
                
                logger.debug('Derived address from legacy wallet object', { 
                  userId, 
                  key,
                  derivedAddress,
                  expectedAddress,
                  matches: derivedAddress === expectedAddress
                }, 'WalletRecoveryService');
                
                if (derivedAddress === expectedAddress) {
                  logger.info('✅ Found wallet in legacy wallet object!', { 
                    userId, 
                    key,
                    derivedAddress,
                    expectedAddress
                  }, 'WalletRecoveryService');
                  
                  // Store in new format
                  await this.storeWallet(userId, {
                    address: derivedAddress,
                    publicKey: derivedAddress,
                    privateKey: Buffer.from(keypair.secretKey).toString('base64')
                  });
                  
                  return {
                    success: true,
                    wallet: {
                      address: derivedAddress,
                      publicKey: derivedAddress,
                      privateKey: Buffer.from(keypair.secretKey).toString('base64')
                    }
                  };
                }
              }
            } catch (walletParseError) {
              logger.debug('Failed to parse legacy data as wallet object', { 
                userId, 
                key,
                error: walletParseError instanceof Error ? walletParseError.message : String(walletParseError)
              }, 'WalletRecoveryService');
            }
          }
        } catch (error) {
          // Continue to next key
          logger.debug('Error checking legacy key', { 
            userId, 
            key,
            error: error instanceof Error ? error.message : String(error)
          }, 'WalletRecoveryService');
        }
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'No legacy storage contained the expected wallet'
      };
      
    } catch (error) {
      logger.error('Legacy storage recovery failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Try alternative recovery methods
   */
  private static async tryAlternativeRecoveryMethods(userId: string, expectedAddress: string): Promise<WalletRecoveryResult> {
    try {
      logger.debug('Trying alternative recovery methods', { userId, expectedAddress }, 'WalletRecoveryService');
      
      // Try different derivation paths for stored mnemonics
      const keysToCheck = [
        `mnemonic_${userId}`,
        'wallet_mnemonic',
        `seed_phrase_${userId}`,
        'wallet_seed_phrase'
      ];
      
      for (const key of keysToCheck) {
        try {
          const mnemonicData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (mnemonicData) {
            let mnemonic: string;
            try {
              const parsed = JSON.parse(mnemonicData);
              mnemonic = parsed.mnemonic || mnemonicData;
            } catch {
              mnemonic = mnemonicData;
            }
            
            logger.debug('Found mnemonic, trying derivation paths', { userId, key }, 'WalletRecoveryService');
            
            const derivationResult = await this.tryDerivationPaths(mnemonic, expectedAddress);
            if (derivationResult.success) {
              return derivationResult;
            }
          }
        } catch (error) {
          // Continue to next key
        }
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'No alternative recovery methods succeeded'
      };
      
    } catch (error) {
      logger.error('Alternative recovery methods failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Try to recover wallet from mnemonic
   */
  private static async tryMnemonicRecovery(userId: string, expectedAddress: string): Promise<WalletRecoveryResult> {
    try {
      const keysToCheck = [
        `mnemonic_${userId}`,
        'wallet_mnemonic'
      ];
      
      for (const key of keysToCheck) {
        try {
          const mnemonicData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (mnemonicData) {
            let mnemonic: string;
            try {
              const parsed = JSON.parse(mnemonicData);
              mnemonic = parsed.mnemonic || mnemonicData;
            } catch {
              mnemonic = mnemonicData;
            }
            
            const derivationResult = await this.tryDerivationPaths(mnemonic, expectedAddress);
            if (derivationResult.success) {
              return derivationResult;
            }
          }
        } catch (error) {
          // Continue to next key
        }
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'No mnemonic found or derivation failed'
      };
      
    } catch (error) {
      logger.error('Mnemonic recovery failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Try different derivation paths for a mnemonic
   */
  private static async tryDerivationPaths(mnemonic: string, expectedAddress: string): Promise<WalletRecoveryResult> {
    try {
      const bip39 = await import('bip39');
      
      if (!bip39.validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: WalletRecoveryError.INVALID_PRIVATE_KEY,
          errorMessage: 'Invalid mnemonic'
        };
      }
      
      // Try different derivation methods
      const derivationMethods = [
        // Standard derivation
        async () => {
          const seed = await bip39.mnemonicToSeed(mnemonic);
          return Keypair.fromSeed(seed.slice(0, 32));
        },
        // Alternative derivation with different seed length
        async () => {
          const seed = await bip39.mnemonicToSeed(mnemonic);
          return Keypair.fromSeed(seed.slice(0, 64).slice(0, 32));
        }
      ];
      
      for (let i = 0; i < derivationMethods.length; i++) {
        try {
          const keypair = await derivationMethods[i]();
          const derivedAddress = keypair.publicKey.toBase58();
          
          logger.debug('Tried derivation path', { 
            method: i,
            derivedAddress,
            expectedAddress,
            matches: derivedAddress === expectedAddress
          }, 'WalletRecoveryService');
          
          if (derivedAddress === expectedAddress) {
            logger.info('Found matching derivation path', { 
              method: i,
              derivedAddress,
              expectedAddress
            }, 'WalletRecoveryService');
            
            return {
              success: true,
              wallet: {
                address: derivedAddress,
                publicKey: derivedAddress,
                privateKey: Buffer.from(keypair.secretKey).toString('base64')
              }
            };
          }
        } catch (error) {
          logger.debug('Derivation method failed', { 
            method: i,
            error: error instanceof Error ? error.message : String(error)
          }, 'WalletRecoveryService');
        }
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'No derivation path matched the expected address'
      };
      
    } catch (error) {
      logger.error('Derivation paths failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Consolidate multiple wallet storage formats into a single format
   */
  static async consolidateWalletStorage(userId: string): Promise<void> {
    try {
      logger.info('Consolidating wallet storage', { userId }, 'WalletRecoveryService');
      
      const wallets = await this.getStoredWallets(userId);
      
      if (wallets.length <= 1) {
        logger.debug('No consolidation needed', { userId, walletCount: wallets.length }, 'WalletRecoveryService');
        return;
      }
      
      // Keep only the most recent wallet
      const mostRecent = wallets.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      logger.info('Consolidating to single wallet', { 
        userId, 
        keptWallet: mostRecent.address,
        removedCount: wallets.length - 1
      }, 'WalletRecoveryService');
      
      // Clear all storage locations
      await this.clearAllWalletStorage(userId);
      
      // Store only the most recent wallet
      await this.storeWallet(userId, {
        address: mostRecent.address,
        publicKey: mostRecent.publicKey,
        privateKey: mostRecent.privateKey
      });
      
      logger.info('Wallet storage consolidated successfully', { userId }, 'WalletRecoveryService');
    } catch (error) {
      logger.error('Failed to consolidate wallet storage', error, 'WalletRecoveryService');
    }
  }

  /**
   * Clear all wallet storage locations for a user
   */
  static async clearAllWalletStorage(userId: string): Promise<void> {
    try {
      const keysToDelete = [
        `${this.USER_WALLET_PREFIX}${userId}`,
        'wallet_private_key',
        `private_key_${userId}`,
        'wallet_mnemonic',
        `mnemonic_${userId}`,
        `wallet_${userId}`
      ];
      
      for (const key of keysToDelete) {
        try {
          await SecureStore.deleteItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
        } catch (error) {
          // Ignore errors for keys that don't exist
        }
      }
      
      // Clear AsyncStorage
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.removeItem('storedWallets');
      } catch (error) {
        // Ignore AsyncStorage errors
      }
      
      logger.info('All wallet storage cleared', { userId }, 'WalletRecoveryService');
    } catch (error) {
      logger.error('Failed to clear all wallet storage', error, 'WalletRecoveryService');
    }
  }

  /**
   * Clear stored wallet for a user
   */
  static async clearStoredWallet(userId: string): Promise<boolean> {
    try {
      const key = `${this.USER_WALLET_PREFIX}${userId}`;
      await SecureStore.deleteItemAsync(key);
      logger.info('Stored wallet cleared', { userId }, 'WalletRecoveryService');
      return true;
    } catch (error) {
      logger.error('Failed to clear stored wallet', error, 'WalletRecoveryService');
      return false;
    }
  }
}

export const walletRecoveryService = WalletRecoveryService;
