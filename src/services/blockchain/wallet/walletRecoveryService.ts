/**
 * Wallet Recovery Service
 * Handles proper wallet recovery by comparing database public keys with local private keys
 */

import * as SecureStore from 'expo-secure-store';
import { Keypair, PublicKey } from '@solana/web3.js';
import { logger } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';
import { secureVault } from '../../security/secureVault';
import * as Crypto from 'expo-crypto';

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
   * Hash email for use as storage identifier (fallback when userId changes)
   * Uses SHA-256 to create consistent identifier from email
   */
  private static async hashEmail(email: string): Promise<string> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        normalizedEmail
      );
      return hash.substring(0, 16); // Use first 16 chars as identifier
    } catch (error) {
      logger.error('Failed to hash email', error, 'WalletRecoveryService');
      // Fallback: use base64 encoded email (less secure but works)
      return Buffer.from(email.toLowerCase().trim()).toString('base64').substring(0, 16);
    }
  }

  /**
   * Store a wallet securely on the device
   * Also stores by email hash as backup identifier (for recovery when userId changes)
   */
  static async storeWallet(userId: string, wallet: {
    address: string;
    publicKey: string;
    privateKey: string;
  }, userEmail?: string): Promise<boolean> {
    try {
      // Primary: store private key via secure vault (Keychain+MMKV) using userId
      const pkStored = await secureVault.store(userId, 'privateKey', wallet.privateKey);
      if (!pkStored) {
        // Fallback: previous behavior in SecureStore (LAST RESORT - has issues in production)
        try {
        const walletData: StoredWallet = {
          ...wallet,
          userId,
          createdAt: new Date().toISOString()
        };
        const key = `${this.USER_WALLET_PREFIX}${userId}`;
        await SecureStore.setItemAsync(key, JSON.stringify(walletData));
          logger.warn('Wallet stored in SecureStore fallback (Keychain+MMKV failed)', { userId, address: wallet.address }, 'WalletRecoveryService');
        } catch (secureStoreError) {
          logger.error('SecureStore fallback also failed', secureStoreError, 'WalletRecoveryService');
          return false;
        }
      }
      
      // ✅ CRITICAL: Also store by email hash as backup identifier
      // This allows recovery even if userId changes after app update
      if (userEmail) {
        try {
          const emailHash = await this.hashEmail(userEmail);
          const emailStored = await secureVault.store(emailHash, 'privateKey', wallet.privateKey);
          if (emailStored) {
            logger.info('Wallet also stored by email hash (backup identifier)', { 
              emailHash: emailHash.substring(0, 8) + '...',
              address: wallet.address 
            }, 'WalletRecoveryService');
          } else {
            logger.warn('Failed to store wallet by email hash (non-critical)', { 
              emailHash: emailHash.substring(0, 8) + '...' 
            }, 'WalletRecoveryService');
          }
        } catch (emailError) {
          // Non-critical - email-based storage is backup only
          logger.warn('Email-based wallet storage failed (non-critical)', emailError, 'WalletRecoveryService');
        }
      }
      
      logger.info('Wallet stored securely', { userId, address: wallet.address }, 'WalletRecoveryService');
      
      // Automatically create cloud backup if user has set backup password
      // This is done asynchronously to not block wallet storage
      WalletRecoveryService.createCloudBackupIfEnabled(userId).catch(error => {
        logger.warn('Failed to create automatic cloud backup', error, 'WalletRecoveryService');
      });
      
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
      // 0. Check secure vault (primary)
      try {
        const privateKey = await secureVault.get(userId, 'privateKey');
        if (privateKey) {
          try {
            const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'base64'));
            const address = keypair.publicKey.toBase58();
            wallets.push({
              address,
              publicKey: address,
              privateKey,
              userId,
              createdAt: new Date().toISOString()
            });
            logger.debug('Found wallet in secure vault', { userId, address }, 'WalletRecoveryService');
          } catch (e) {
            logger.warn('Failed to parse privateKey from secure vault', e, 'WalletRecoveryService');
          }
        }
      } catch (e) {
        logger.warn('Secure vault read failed', e, 'WalletRecoveryService');
      }

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
            logger.debug('Processing AsyncStorage wallet', { 
              userId, 
              hasSecretKey: !!storedWallet.secretKey,
              hasAddress: !!storedWallet.address,
              hasPrivateKey: !!storedWallet.privateKey,
              walletKeys: Object.keys(storedWallet)
            }, 'WalletRecoveryService');
            
            // Check for different possible key names
            const secretKey = storedWallet.secretKey || storedWallet.privateKey || storedWallet.secret;
            const address = storedWallet.address || storedWallet.publicKey;
            
            // Skip wallets with empty secretKey (test/external wallets)
            if (!secretKey || secretKey === '' || secretKey.length === 0) {
              logger.debug('Skipping wallet with empty secretKey (likely test/external wallet)', { 
                userId,
                address,
                walletName: storedWallet.name || 'Unknown',
                isAppGenerated: storedWallet.isAppGenerated
              }, 'WalletRecoveryService');
              continue;
            }
            
            if (secretKey && address) {
              try {
                // Parse the secret key (it might be a string or array)
                let privateKeyBuffer: Buffer;
                if (typeof secretKey === 'string') {
                  // If it's a string, it might be base64 encoded
                  try {
                    privateKeyBuffer = Buffer.from(secretKey, 'base64');
                    // Verify it's a valid 64-byte key
                    if (privateKeyBuffer.length !== 64) {
                      throw new Error('Invalid key length');
                    }
                  } catch (base64Error) {
                    // If base64 fails, try as raw string
                    privateKeyBuffer = Buffer.from(secretKey);
                  }
                } else if (Array.isArray(secretKey)) {
                  // If it's an array, convert to buffer
                  privateKeyBuffer = Buffer.from(secretKey);
                } else {
                  logger.warn('Invalid secret key format', { 
                    userId
                    // SECURITY: Do not log secret key metadata (type, length, etc.)
                  }, 'WalletRecoveryService');
                  continue;
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
                logger.info('✅ Successfully parsed AsyncStorage wallet', { 
                  userId, 
                  address: asyncStorageWallet.address,
                  originalAddress: address,
                  matches: derivedAddress === address
                }, 'WalletRecoveryService');
              } catch (error) {
                logger.warn('Failed to parse AsyncStorage wallet', { 
                  error: error instanceof Error ? error.message : String(error),
                  userId,
                  address
                  // SECURITY: Do not log secret key metadata (type, length, etc.)
                }, 'WalletRecoveryService');
              }
            } else {
              logger.debug('Skipping AsyncStorage wallet - missing required fields', { 
                userId,
                hasSecretKey: !!secretKey,
                hasAddress: !!address,
                walletData: storedWallet
              }, 'WalletRecoveryService');
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
   * Also attempts email-based recovery as fallback when userId-based recovery fails
   */
  static async recoverWallet(userId: string, userEmail?: string): Promise<WalletRecoveryResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting comprehensive wallet recovery', { userId, hasEmail: !!userEmail }, 'WalletRecoveryService');

      // Try to migrate old production wallets first
      const migrationResult = await this.migrateOldProductionWallets(userId);
      if (migrationResult) {
        logger.info('Old wallet migrated, attempting recovery', { userId }, 'WalletRecoveryService');
      }

      // Check if wallet consistency is valid
      const isConsistent = await this.validateWalletConsistency(userId);
      
      let recoveryResult: WalletRecoveryResult;
      if (isConsistent) {
        // Wallet is consistent, proceed with normal recovery
        recoveryResult = await this.performConsistentWalletRecovery(userId);
      } else {
        // Wallet is inconsistent, resolve the mismatch
        logger.warn('Wallet inconsistency detected, resolving mismatch', { userId }, 'WalletRecoveryService');
        recoveryResult = await this.resolveWalletMismatch(userId);
      }

      // ✅ CRITICAL: If userId-based recovery failed, try email-based recovery
      // This handles cases where userId changed after app update but email is the same
      if (!recoveryResult.success && userEmail) {
        logger.info('UserId-based recovery failed, attempting email-based recovery', { 
          userId,
          emailHash: (await this.hashEmail(userEmail)).substring(0, 8) + '...'
        }, 'WalletRecoveryService');
        
        try {
          const emailHash = await this.hashEmail(userEmail);
          const emailPrivateKey = await secureVault.get(emailHash, 'privateKey');
          
          if (emailPrivateKey) {
            logger.info('Found wallet by email hash, attempting recovery', { 
              emailHash: emailHash.substring(0, 8) + '...'
            }, 'WalletRecoveryService');
            
            try {
              const keypair = Keypair.fromSecretKey(Buffer.from(emailPrivateKey, 'base64'));
              const recoveredAddress = keypair.publicKey.toBase58();
              
              // Get user data to verify address matches
              const userData = await firebaseDataService.user.getCurrentUser(userId);
              const expectedAddress = userData?.wallet_address;
              
              if (expectedAddress && recoveredAddress === expectedAddress) {
                logger.info('✅ Email-based wallet recovery successful', { 
                  userId,
                  address: recoveredAddress
                }, 'WalletRecoveryService');
                
                // Re-store wallet using current userId for future recovery
                await secureVault.store(userId, 'privateKey', emailPrivateKey);
                
                return {
                  success: true,
                  wallet: {
                    address: recoveredAddress,
                    publicKey: recoveredAddress,
                    privateKey: emailPrivateKey
                  }
                };
              } else if (!expectedAddress) {
                // No expected address in database, but we found wallet by email
                logger.info('Email-based wallet found but no database address to verify', { 
                  userId,
                  address: recoveredAddress
                }, 'WalletRecoveryService');
                
                // Re-store wallet using current userId
                await secureVault.store(userId, 'privateKey', emailPrivateKey);
                
                return {
                  success: true,
                  wallet: {
                    address: recoveredAddress,
                    publicKey: recoveredAddress,
                    privateKey: emailPrivateKey
                  }
                };
              } else {
                logger.warn('Email-based wallet address mismatch', { 
                  expectedAddress,
                  recoveredAddress
                }, 'WalletRecoveryService');
              }
            } catch (parseError) {
              logger.error('Failed to parse email-based wallet private key', parseError, 'WalletRecoveryService');
            }
          } else {
            logger.debug('No wallet found by email hash', { 
              emailHash: emailHash.substring(0, 8) + '...'
            }, 'WalletRecoveryService');
          }
        } catch (emailRecoveryError) {
          logger.warn('Email-based recovery attempt failed', emailRecoveryError, 'WalletRecoveryService');
        }
      }

      return recoveryResult;

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
          
          // Additional validation: check if addresses are valid Solana addresses
          const isValidSolanaAddress = (addr: string) => {
            try {
              new PublicKey(addr);
              return true;
            } catch {
              return false;
            }
          };
          
          // Enhanced matching logic for better compatibility
          const isAddressMatch = isValidSolanaAddress(expectedPublicKey) && 
            (derivedPublicKey === expectedPublicKey || 
             storedWallet.address === expectedPublicKey ||
             storedWallet.publicKey === expectedPublicKey);
          
          if (isExactMatch || isDerivedMatch || isAddressMatch) {
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

      // If no exact match found, try comprehensive recovery
      logger.warn('No exact wallet match found, attempting comprehensive recovery', {
        userId,
        expectedPublicKey,
        storedWalletsCount: storedWallets.length
      }, 'WalletRecoveryService');
      
      // Try comprehensive recovery as fallback
      logger.info('Attempting comprehensive recovery as fallback', { userId, expectedPublicKey }, 'WalletRecoveryService');
      const comprehensiveResult = await this.performComprehensiveRecovery(userId, expectedPublicKey);
      
      if (comprehensiveResult.success) {
        logger.info('Comprehensive wallet recovery succeeded', {
          userId,
          expectedPublicKey,
          recoveredAddress: comprehensiveResult.wallet?.address
        }, 'WalletRecoveryService');
        
        return comprehensiveResult;
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'No matching wallet found in local storage or comprehensive recovery'
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
   * Create a new wallet and store it securely with seed phrase
   */
  static async createAndStoreWallet(userId: string): Promise<WalletRecoveryResult> {
    try {
      logger.info('Creating new wallet with seed phrase', { userId }, 'WalletRecoveryService');

      // Generate mnemonic and derive keypair from it
      const { generateWalletFromMnemonic } = await import('./derive');
      const walletResult = generateWalletFromMnemonic(); // Generates new mnemonic
      
      const wallet = {
        address: walletResult.address,
        publicKey: walletResult.publicKey,
        privateKey: walletResult.secretKey
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

      // Store the mnemonic securely
      const mnemonicStored = await this.storeMnemonic(userId, walletResult.mnemonic);
      if (!mnemonicStored) {
        logger.warn('Failed to store mnemonic, but wallet was created', { userId }, 'WalletRecoveryService');
        // Don't fail the entire operation, wallet can still be used with private key
      }

      logger.info('New wallet created and stored with seed phrase', { 
        userId, 
        address: wallet.address,
        mnemonicStored 
      }, 'WalletRecoveryService');
      
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
      
      // 1. First try the existing comprehensive recovery
      const comprehensiveResult = await this.performComprehensiveRecovery(userId, expectedAddress);
      
      if (comprehensiveResult.success) {
        logger.info('Successfully recovered database wallet', { 
          userId, 
          recoveredAddress: comprehensiveResult.wallet!.address,
          expectedAddress
        }, 'WalletRecoveryService');
        return comprehensiveResult;
      }
      
      // 2. If comprehensive recovery failed, try alternative methods
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
      
      // 4. Generate recovery report for debugging
      logger.error('WALLET RECOVERY FAILED', { 
        userId, 
        expectedAddress,
        comprehensiveError: comprehensiveResult.errorMessage,
        alternativeError: alternativeResult.errorMessage
      }, 'WalletRecoveryService');
      
      // If all recovery methods failed, return error with detailed information
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
  static async performComprehensiveRecovery(userId: string, expectedAddress: string): Promise<WalletRecoveryResult> {
    try {
      logger.debug('Starting comprehensive recovery', { userId, expectedAddress }, 'WalletRecoveryService');
      
      // 0. Try to migrate old production wallets first
      const migrationResult = await this.migrateOldProductionWallets(userId);
      if (migrationResult) {
        logger.info('Old wallet migrated successfully, proceeding with recovery', { userId, expectedAddress }, 'WalletRecoveryService');
      } else {
        // If migration failed, try to generate missing credentials for existing database wallet
        const userData = await firebaseDataService.user.getCurrentUser(userId);
        if (userData?.wallet_address && userData.wallet_address === expectedAddress) {
          logger.warn('Migration failed but database wallet exists, generating new credentials', { 
            userId, 
            expectedAddress 
          }, 'WalletRecoveryService');
          
          const generated = await this.generateMissingWalletCredentials(userId, expectedAddress);
          if (generated) {
            logger.info('Generated new wallet credentials for existing database wallet', { userId }, 'WalletRecoveryService');
            // Return the new wallet as a successful recovery
            const newWallet = await this.getStoredWallets(userId);
            if (newWallet.length > 0) {
      return {
        success: true,
        wallet: newWallet[0]
      };
            }
          }
        }
      }
      
      // 1. Clean up test wallets
      await this.cleanupTestWallets(userId);
      
      // 2. Try to find wallet in all storage formats
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
        errorMessage: `No wallet credentials found for address ${expectedAddress}. This usually happens when:\n\n1. The app was reinstalled and wallet data was lost\n2. The wallet was created on a different device\n3. The wallet was never properly saved to this device\n\nPlease restore your wallet using your seed phrase or create a new wallet.`,
        requiresUserAction: true
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
      logger.debug('Starting mnemonic recovery', { userId, expectedAddress }, 'WalletRecoveryService');
      
      const keysToCheck = [
        `mnemonic_${userId}`,
        'wallet_mnemonic',
        `seed_phrase_${userId}`,
        'wallet_seed_phrase'
      ];
      
      for (const key of keysToCheck) {
        try {
          logger.debug('Checking mnemonic key', { userId, key }, 'WalletRecoveryService');
          
          const mnemonicData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (mnemonicData) {
            logger.debug('Found mnemonic data', { userId, key, dataLength: mnemonicData.length }, 'WalletRecoveryService');
            
            let mnemonic: string;
            try {
              const parsed = JSON.parse(mnemonicData);
              mnemonic = parsed.mnemonic || parsed.seedPhrase || mnemonicData;
              logger.debug('Parsed mnemonic from JSON', { userId, key, mnemonicLength: mnemonic.length }, 'WalletRecoveryService');
            } catch {
              mnemonic = mnemonicData;
              logger.debug('Using raw mnemonic data', { userId, key, mnemonicLength: mnemonic.length }, 'WalletRecoveryService');
            }
            
            // Validate mnemonic format
            const { validateBip39Mnemonic } = await import('./derive');
      const validation = validateBip39Mnemonic(mnemonic);
            
      if (!validation.isValid) {
        logger.warn('Invalid mnemonic format', { userId, key }, 'WalletRecoveryService');
              continue;
            }
            
            logger.info('Valid mnemonic found, trying derivation paths', { userId, key }, 'WalletRecoveryService');
            const derivationResult = await this.tryDerivationPaths(mnemonic, expectedAddress);
            if (derivationResult.success) {
              logger.info('✅ Mnemonic recovery succeeded', { userId, key, address: derivationResult.wallet?.address }, 'WalletRecoveryService');
              return derivationResult;
            } else {
              logger.debug('Mnemonic derivation failed', { userId, key, error: derivationResult.errorMessage }, 'WalletRecoveryService');
            }
          } else {
            logger.debug('No mnemonic data found', { userId, key }, 'WalletRecoveryService');
          }
        } catch (error) {
          logger.debug('Error checking mnemonic key', { userId, key, error: error instanceof Error ? error.message : String(error) }, 'WalletRecoveryService');
          // Continue to next key
        }
      }
      
      logger.warn('No valid mnemonic found or derivation failed', { userId, expectedAddress }, 'WalletRecoveryService');
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
      
      // Try different derivation methods for Solana
      const derivationMethods = [
        // Standard Solana derivation (m/44'/501'/0'/0')
        async () => {
          const seed = await bip39.mnemonicToSeed(mnemonic);
          return Keypair.fromSeed(seed.slice(0, 32));
        },
        // Alternative derivation with different seed length
        async () => {
          const seed = await bip39.mnemonicToSeed(mnemonic);
          return Keypair.fromSeed(seed.slice(0, 64).slice(0, 32));
        },
        // Try with BIP44 derivation path for Solana
        async () => {
          const { deriveKeypairFromMnemonic } = await import('./derive');
          return deriveKeypairFromMnemonic(mnemonic, "m/44'/501'/0'/0'");
        },
        // Try with different BIP44 path
        async () => {
          const { deriveKeypairFromMnemonic } = await import('./derive');
          return deriveKeypairFromMnemonic(mnemonic, "m/44'/501'/0'");
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
   * Restore wallet from seed phrase
   */
  static async restoreWalletFromSeedPhrase(userId: string, seedPhrase: string, expectedAddress?: string): Promise<WalletRecoveryResult> {
    try {
      logger.info('Restoring wallet from seed phrase', { userId, expectedAddress }, 'WalletRecoveryService');
      
      // Validate mnemonic
      const { validateBip39Mnemonic, deriveKeypairFromMnemonic } = await import('./derive');
      const validation = validateBip39Mnemonic(seedPhrase);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: WalletRecoveryError.INVALID_PRIVATE_KEY,
          errorMessage: 'Invalid seed phrase'
        };
      }
      
      // Try different derivation paths
      const derivationPaths = [
        "m/44'/501'/0'/0'",  // Standard Solana
        "m/44'/501'/0'",      // Alternative
        "m/44'/501'"          // Fallback
      ];
      
      for (const path of derivationPaths) {
        try {
          const keypair = deriveKeypairFromMnemonic(seedPhrase, path);
          const derivedAddress = keypair.publicKey.toBase58();
          
          // If expected address provided, check if it matches
          if (expectedAddress && derivedAddress !== expectedAddress) {
            logger.debug('Derived address does not match expected', { 
              derivedAddress, 
              expectedAddress, 
              path 
            }, 'WalletRecoveryService');
            continue;
          }
          
          // Store the recovered wallet
          const wallet = {
            address: derivedAddress,
            publicKey: derivedAddress,
            privateKey: Buffer.from(keypair.secretKey).toString('base64')
          };
          
          const stored = await this.storeWallet(userId, wallet);
          if (stored) {
            // Store the mnemonic
            await this.storeMnemonic(userId, seedPhrase);
            
            logger.info('✅ Wallet restored from seed phrase', { 
              userId, 
              address: derivedAddress, 
              path 
            }, 'WalletRecoveryService');
            
            return {
              success: true,
              wallet
            };
          }
        } catch (error) {
          logger.debug('Derivation path failed', { path, error: error instanceof Error ? error.message : String(error) }, 'WalletRecoveryService');
        }
      }
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: expectedAddress ? 
          `Seed phrase does not generate the expected wallet address ${expectedAddress}` :
          'Failed to derive wallet from seed phrase'
      };
      
    } catch (error) {
      logger.error('Failed to restore wallet from seed phrase', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Emergency recovery for lost funds - tries to find the original wallet
   * This is specifically for cases where funds were lost due to wallet address changes
   */
  static async emergencyFundRecovery(userId: string, originalAddress: string): Promise<WalletRecoveryResult> {
    try {
      logger.error('🚨 EMERGENCY FUND RECOVERY - Attempting to recover lost funds', { 
        userId, 
        originalAddress,
        warning: 'User may have lost access to funds due to wallet address change'
      }, 'WalletRecoveryService');
      
      // Get all possible mnemonic storage locations
      const mnemonicKeys = [
        `mnemonic_${userId}`,
        'wallet_mnemonic',
        `seed_phrase_${userId}`,
        'wallet_seed_phrase',
        'user_mnemonic',
        'backup_phrase',
        'wallet_backup',
        'recovery_phrase'
      ];
      
      // Try to find any stored mnemonic
      for (const key of mnemonicKeys) {
        try {
          const mnemonicData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (mnemonicData) {
            logger.info('Found potential mnemonic for emergency recovery', { 
              userId, 
              key,
              hasData: !!mnemonicData
            }, 'WalletRecoveryService');
            
            // Parse mnemonic
            let mnemonic: string;
            try {
              const parsed = JSON.parse(mnemonicData);
              mnemonic = parsed.mnemonic || parsed.seedPhrase || parsed.seed_phrase || mnemonicData;
            } catch {
              mnemonic = mnemonicData;
            }
            
            if (mnemonic && typeof mnemonic === 'string' && mnemonic.split(' ').length >= 12) {
              logger.info('Valid mnemonic found, trying all derivation paths', { 
                userId, 
                key,
                mnemonicLength: mnemonic.split(' ').length
              }, 'WalletRecoveryService');
              
              // Try comprehensive derivation paths
              const derivationPaths = [
                "m/44'/501'/0'/0'",     // Standard Solana
                "m/44'/501'/0'",        // Alternative Solana
                "m/44'/501'/0'/0'/0'",  // Extended path
                "m/44'/501'/0'/0'/1'",  // Alternative index
                "m/44'/501'/1'/0'",     // Different account
                "m/44'/501'/0'/1'",     // Different change
                "m/44'/501'/0'/0'/2'",  // More indices
                "m/44'/501'/0'/0'/3'",
                "m/44'/501'/0'/0'/4'",
                "m/44'/501'/0'/0'/5'",
                "m/44'/501'/2'/0'",     // More accounts
                "m/44'/501'/3'/0'",
                "m/44'/501'/4'/0'",
                "m/44'/501'/5'/0'"
              ];
              
              for (const path of derivationPaths) {
                try {
                  const { deriveKeypairFromMnemonic } = await import('./derive');
                  const keypair = deriveKeypairFromMnemonic(mnemonic, path);
                  const derivedAddress = keypair.publicKey.toBase58();
                  
                  logger.debug('Trying derivation path', { 
                    path, 
                    derivedAddress, 
                    originalAddress,
                    matches: derivedAddress === originalAddress
                  }, 'WalletRecoveryService');
                  
                  if (derivedAddress === originalAddress) {
                    logger.info('🎉 FOUND ORIGINAL WALLET! Funds can be recovered!', { 
                      userId, 
                      originalAddress,
                      derivationPath: path,
                      key,
                      success: true
                    }, 'WalletRecoveryService');
                    
                    // Store the original wallet credentials
                    const originalWallet = {
                      address: derivedAddress,
                      publicKey: derivedAddress,
                      privateKey: Buffer.from(keypair.secretKey).toString('base64')
                    };
                    
                    const stored = await this.storeWallet(userId, originalWallet);
                    if (stored) {
                      await this.storeMnemonic(userId, mnemonic);
                      
                      // Update database to restore original address
                      await firebaseDataService.user.updateUser(userId, {
                        wallet_address: originalAddress,
                        wallet_public_key: originalAddress,
                        wallet_status: 'healthy',
                        wallet_has_private_key: true,
                        wallet_has_seed_phrase: true,
                        wallet_type: 'app-generated',
                        wallet_migration_status: 'funds_recovered' as any,
                      } as any);
                      
                      logger.info('✅ ORIGINAL WALLET RECOVERED AND RESTORED!', { 
                        userId, 
                        address: derivedAddress,
                        fundsRecovered: true
                      }, 'WalletRecoveryService');
                      
                      return {
                        success: true,
                        wallet: originalWallet
                      };
                    }
                  }
                } catch (derivationError) {
                  logger.debug('Derivation path failed', { path, error: derivationError }, 'WalletRecoveryService');
                }
              }
            }
          }
        } catch (keyError) {
          logger.debug('Error checking mnemonic key', { key, error: keyError }, 'WalletRecoveryService');
        }
      }
      
      logger.error('❌ EMERGENCY RECOVERY FAILED - Could not find original wallet', { 
        userId, 
        originalAddress,
        warning: 'User funds may be permanently lost'
      }, 'WalletRecoveryService');
      
      return {
        success: false,
        error: WalletRecoveryError.DATABASE_MISMATCH,
        errorMessage: 'Emergency recovery failed - no valid mnemonic found that generates the original wallet address'
      };
      
    } catch (error) {
      logger.error('Emergency fund recovery failed', error, 'WalletRecoveryService');
      return {
        success: false,
        error: WalletRecoveryError.STORAGE_CORRUPTION,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Attempt to recover the original wallet by trying common derivation paths
   * This preserves user funds by finding the original private key
   */
  static async attemptOriginalWalletRecovery(userId: string, expectedAddress: string): Promise<boolean> {
    try {
      logger.info('Attempting to recover original wallet to preserve user funds', { 
        userId, 
        expectedAddress 
      }, 'WalletRecoveryService');
      
      // Try to find any stored mnemonic or seed phrase in various formats
      const mnemonicKeys = [
        `mnemonic_${userId}`,
        'wallet_mnemonic',
        `seed_phrase_${userId}`,
        'wallet_seed_phrase',
        'user_mnemonic',
        'backup_phrase'
      ];
      
      for (const key of mnemonicKeys) {
        try {
          const mnemonicData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (mnemonicData) {
            logger.debug('Found potential mnemonic data', { userId, key }, 'WalletRecoveryService');
            
            // Try to parse as mnemonic
            let mnemonic: string;
            try {
              const parsed = JSON.parse(mnemonicData);
              mnemonic = parsed.mnemonic || parsed.seedPhrase || parsed.seed_phrase || mnemonicData;
            } catch {
              mnemonic = mnemonicData;
            }
            
            if (mnemonic && typeof mnemonic === 'string' && mnemonic.split(' ').length >= 12) {
              logger.info('Found valid mnemonic, attempting to derive original wallet', { 
                userId, 
                key,
                mnemonicLength: mnemonic.split(' ').length
              }, 'WalletRecoveryService');
              
              // Try multiple derivation paths to find the original wallet
              const derivationPaths = [
                "m/44'/501'/0'/0'",  // Standard Solana
                "m/44'/501'/0'",     // Alternative Solana
                "m/44'/501'/0'/0'/0'", // Extended path
                "m/44'/501'/0'/0'/1'", // Alternative index
                "m/44'/501'/1'/0'",  // Different account
                "m/44'/501'/0'/1'"   // Different change
              ];
              
              for (const path of derivationPaths) {
                try {
                  const { deriveKeypairFromMnemonic } = await import('./derive');
                  const keypair = deriveKeypairFromMnemonic(mnemonic, path);
                  const derivedAddress = keypair.publicKey.toBase58();
                  
                  if (derivedAddress === expectedAddress) {
                    logger.info('✅ FOUND ORIGINAL WALLET! Preserving user funds', { 
                      userId, 
                      expectedAddress,
                      derivationPath: path,
                      key
                    }, 'WalletRecoveryService');
                    
                    // Store the original wallet credentials
                    const originalWallet = {
                      address: derivedAddress,
                      publicKey: derivedAddress,
                      privateKey: Buffer.from(keypair.secretKey).toString('base64')
                    };
                    
                    const stored = await this.storeWallet(userId, originalWallet);
                    if (stored) {
                      await this.storeMnemonic(userId, mnemonic);
                      
                      logger.info('✅ Original wallet recovered and stored successfully', { 
                        userId, 
                        address: derivedAddress 
                      }, 'WalletRecoveryService');
                      
                      return true;
                    }
                  }
                } catch (derivationError) {
                  logger.debug('Derivation path failed', { path, error: derivationError }, 'WalletRecoveryService');
                }
              }
            }
          }
        } catch (keyError) {
          logger.debug('Error checking mnemonic key', { key, error: keyError }, 'WalletRecoveryService');
        }
      }
      
      logger.warn('Could not recover original wallet - no valid mnemonic found', { 
        userId, 
        expectedAddress 
      }, 'WalletRecoveryService');
      
      return false;
      
    } catch (error) {
      logger.error('Failed to attempt original wallet recovery', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Generate wallet credentials for existing database wallets that were never saved locally
   * This handles the case where wallet was created before proper storage was implemented
   */
  static async generateMissingWalletCredentials(userId: string, expectedAddress: string): Promise<boolean> {
    try {
      logger.info('Generating missing wallet credentials for existing database wallet', { 
        userId, 
        expectedAddress 
      }, 'WalletRecoveryService');
      
      // Check if wallet is already in new format
      const newFormatWallet = await SecureStore.getItemAsync(`wallet_${userId}`);
      if (newFormatWallet) {
        logger.debug('Wallet already in new format, skipping generation', { userId }, 'WalletRecoveryService');
        return true;
      }
      
      // First, try to recover the original wallet to preserve user funds
      const originalRecovered = await this.attemptOriginalWalletRecovery(userId, expectedAddress);
      if (originalRecovered) {
        logger.info('✅ Original wallet recovered successfully - user funds preserved', { 
          userId, 
          expectedAddress 
        }, 'WalletRecoveryService');
        return true;
      }
      
      // If original recovery failed, this is a critical case - we need to generate new credentials
      // This should only happen for wallets created before proper storage was implemented
      logger.error('CRITICAL: Cannot recover original wallet - user will lose access to funds', { 
        userId, 
        expectedAddress,
        warning: 'This should not happen if wallet was created by the app'
      }, 'WalletRecoveryService');
      
      // Generate new wallet credentials as last resort
      const { generateWalletFromMnemonic } = await import('./derive');
      const walletResult = generateWalletFromMnemonic();
      
      const newWallet = {
        address: walletResult.address,
        publicKey: walletResult.publicKey,
        privateKey: walletResult.secretKey
      };
      
      // Store the new wallet credentials
      const stored = await this.storeWallet(userId, newWallet);
      if (!stored) {
        logger.error('Failed to store generated wallet credentials', { userId }, 'WalletRecoveryService');
        return false;
      }
      
      // Store the mnemonic
      if (walletResult.mnemonic) {
        await this.storeMnemonic(userId, walletResult.mnemonic);
      }
      
      // Update the database with the new wallet address
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: newWallet.address,
        wallet_public_key: newWallet.publicKey,
        wallet_status: 'healthy',
        wallet_has_private_key: true,
        wallet_has_seed_phrase: true,
        wallet_type: 'app-generated',
        wallet_migration_status: 'credentials_generated' as any,
      } as any);
      
      logger.error('CRITICAL: Generated new wallet - user may lose access to original funds', { 
        userId, 
        oldAddress: expectedAddress,
        newAddress: newWallet.address,
        warning: 'User should contact support immediately'
      }, 'WalletRecoveryService');
      
      return true;
      
    } catch (error) {
      logger.error('Failed to generate missing wallet credentials', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Migrate old production wallets to new storage format
   */
  static async migrateOldProductionWallets(userId: string): Promise<boolean> {
    try {
      logger.info('Starting migration of old production wallets', { userId }, 'WalletRecoveryService');
      
      // Get user data from database
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      if (!userData?.wallet_address) {
        logger.debug('No wallet address in database, skipping migration', { userId }, 'WalletRecoveryService');
        return false;
      }
      
      const expectedAddress = userData.wallet_address;
      
      // Check if wallet is already in new format
      const newFormatWallet = await SecureStore.getItemAsync(`wallet_${userId}`);
      if (newFormatWallet) {
        logger.debug('Wallet already in new format, skipping migration', { userId }, 'WalletRecoveryService');
        return true;
      }
      
      // Try to find wallet in old storage formats
      const migrationKeys = [
        'wallet_private_key',
        `private_key_${userId}`,
        'wallet_mnemonic',
        `mnemonic_${userId}`,
        `seed_phrase_${userId}`
      ];
      
      let migrated = false;
      
      for (const key of migrationKeys) {
        try {
          const oldData = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          
          if (oldData) {
            logger.debug('Found old wallet data', { userId, key }, 'WalletRecoveryService');
            
            // Try to parse as private key
            try {
              const privateKeyArray = JSON.parse(oldData);
              const privateKeyBuffer = Buffer.from(privateKeyArray);
              const keypair = Keypair.fromSecretKey(privateKeyBuffer);
              const derivedAddress = keypair.publicKey.toBase58();
              
              if (derivedAddress === expectedAddress) {
                logger.info('✅ Found matching old wallet, migrating to new format', { 
                  userId, 
                  key, 
                  address: derivedAddress 
                }, 'WalletRecoveryService');
                
                // Store in new format
                const migrated = await this.storeWallet(userId, {
                  address: derivedAddress,
                  publicKey: derivedAddress,
                  privateKey: Buffer.from(keypair.secretKey).toString('base64')
                });
                
                if (migrated) {
                  logger.info('✅ Old wallet migrated successfully', { userId, address: derivedAddress }, 'WalletRecoveryService');
                  
                  // Clean up old storage after successful migration
                  await this.cleanupOldStorageAfterMigration(userId, key);
                  
                  return true;
                }
              }
            } catch (parseError) {
              // Try as mnemonic
              try {
                const mnemonic = oldData.includes('{') ? JSON.parse(oldData).mnemonic || oldData : oldData;
                
                if (mnemonic && typeof mnemonic === 'string' && mnemonic.split(' ').length >= 12) {
                  const { deriveKeypairFromMnemonic } = await import('./derive');
                  const keypair = deriveKeypairFromMnemonic(mnemonic, "m/44'/501'/0'/0'");
                  const derivedAddress = keypair.publicKey.toBase58();
                  
                  if (derivedAddress === expectedAddress) {
                    logger.info('✅ Found matching old mnemonic, migrating to new format', { 
                      userId, 
                      key, 
                      address: derivedAddress 
                    }, 'WalletRecoveryService');
                    
                    // Store wallet and mnemonic in new format
                    const walletStored = await this.storeWallet(userId, {
                      address: derivedAddress,
                      publicKey: derivedAddress,
                      privateKey: Buffer.from(keypair.secretKey).toString('base64')
                    });
                    
                    if (walletStored) {
                      await this.storeMnemonic(userId, mnemonic);
                      logger.info('✅ Old mnemonic migrated successfully', { userId, address: derivedAddress }, 'WalletRecoveryService');
                      return true;
                    }
                  }
                }
              } catch (mnemonicError) {
                logger.debug('Failed to parse as mnemonic', { key, error: mnemonicError }, 'WalletRecoveryService');
              }
            }
          }
        } catch (error) {
          logger.debug('Error checking old storage key', { key, error: error instanceof Error ? error.message : String(error) }, 'WalletRecoveryService');
        }
      }
      
      // Try AsyncStorage migration
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const storedWalletsData = await AsyncStorage.getItem('storedWallets');
        
        if (storedWalletsData) {
          const storedWalletsArray = JSON.parse(storedWalletsData);
          
          for (const wallet of storedWalletsArray) {
            const secretKey = wallet.secretKey || wallet.privateKey;
            if (secretKey && secretKey !== '' && wallet.address === expectedAddress) {
              logger.info('✅ Found matching AsyncStorage wallet, migrating to new format', { 
                userId, 
                address: wallet.address 
              }, 'WalletRecoveryService');
              
              // Parse and store in new format
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
              
              if (derivedAddress === expectedAddress) {
                const migrated = await this.storeWallet(userId, {
                  address: derivedAddress,
                  publicKey: derivedAddress,
                  privateKey: Buffer.from(keypair.secretKey).toString('base64')
                });
                
                if (migrated) {
                  logger.info('✅ AsyncStorage wallet migrated successfully', { userId, address: derivedAddress }, 'WalletRecoveryService');
                  return true;
                }
              }
            }
          }
        }
      } catch (asyncError) {
        logger.debug('Error checking AsyncStorage for migration', { error: asyncError }, 'WalletRecoveryService');
      }
      
      logger.warn('No old wallet found to migrate', { userId, expectedAddress }, 'WalletRecoveryService');
      return false;
      
    } catch (error) {
      logger.error('Failed to migrate old production wallets', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Clean up old storage after successful migration
   */
  static async cleanupOldStorageAfterMigration(userId: string, migratedKey: string): Promise<void> {
    try {
      logger.info('Cleaning up old storage after migration', { userId, migratedKey }, 'WalletRecoveryService');
      
      // List of old keys to clean up
      const oldKeys = [
        'wallet_private_key',
        `private_key_${userId}`,
        'wallet_mnemonic',
        `mnemonic_${userId}`,
        `seed_phrase_${userId}`
      ];
      
      // Don't clean up the key that was just migrated
      const keysToClean = oldKeys.filter(key => key !== migratedKey);
      
      for (const key of keysToClean) {
        try {
          await SecureStore.deleteItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'WeSplitWalletData'
          });
          logger.debug('Cleaned up old storage key', { userId, key }, 'WalletRecoveryService');
        } catch (error) {
          logger.debug('Failed to clean up old storage key', { userId, key, error }, 'WalletRecoveryService');
        }
      }
      
      // Also clean up AsyncStorage if it was migrated
      if (migratedKey.includes('AsyncStorage')) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.removeItem('storedWallets');
          logger.debug('Cleaned up AsyncStorage after migration', { userId }, 'WalletRecoveryService');
        } catch (error) {
          logger.debug('Failed to clean up AsyncStorage', { userId, error }, 'WalletRecoveryService');
        }
      }
      
    } catch (error) {
      logger.error('Failed to cleanup old storage after migration', error, 'WalletRecoveryService');
    }
  }

  /**
   * Clean up test/external wallets from AsyncStorage
   */
  static async cleanupTestWallets(userId: string): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const storedWalletsData = await AsyncStorage.getItem('storedWallets');
      
      if (storedWalletsData) {
        const storedWalletsArray = JSON.parse(storedWalletsData);
        // SECURITY: Remove secret keys from wallets before storing in AsyncStorage
        // Secret keys should NEVER be stored in AsyncStorage
        const sanitizedWallets = storedWalletsArray.map((wallet: any) => {
          const { secretKey, privateKey, secret, ...sanitizedWallet } = wallet;
          return sanitizedWallet; // Only keep non-sensitive metadata
        });
        
        // Filter out wallets without addresses (invalid)
        const validWallets = sanitizedWallets.filter((wallet: any) => {
          return wallet.address && wallet.address !== '';
        });
        
        if (validWallets.length !== storedWalletsArray.length) {
          logger.info('Cleaning up test wallets and removing secret keys from AsyncStorage', { 
            userId,
            originalCount: storedWalletsArray.length,
            validCount: validWallets.length,
            removedCount: storedWalletsArray.length - validWallets.length
          }, 'WalletRecoveryService');
          
          // SECURITY: Only store non-sensitive wallet metadata in AsyncStorage
          await AsyncStorage.setItem('storedWallets', JSON.stringify(validWallets));
        } else if (storedWalletsArray.some((w: any) => w.secretKey || w.privateKey || w.secret)) {
          // If wallets have secret keys, sanitize them
          logger.info('Removing secret keys from wallets in AsyncStorage', { 
            userId,
            walletCount: validWallets.length
          }, 'WalletRecoveryService');
          
          await AsyncStorage.setItem('storedWallets', JSON.stringify(validWallets));
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup test wallets', error, 'WalletRecoveryService');
    }
  }

  /**
   * Test method to debug wallet recovery issues
   */
  static async debugWalletRecovery(userId: string): Promise<void> {
    try {
      logger.info('🔍 Starting comprehensive wallet recovery debug', { userId }, 'WalletRecoveryService');
      
      // Get user data from database
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      const expectedAddress = userData?.wallet_address;
      
      if (!expectedAddress) {
        logger.error('❌ No wallet address in database', { userId }, 'WalletRecoveryService');
        return;
      }
      
      logger.info('📊 Database wallet address', { userId, expectedAddress }, 'WalletRecoveryService');
      
      // Debug AsyncStorage
      await this.debugAsyncStorageData(userId);
      
      // Try comprehensive recovery
      const result = await this.performComprehensiveRecovery(userId, expectedAddress);
      
      if (result.success) {
        logger.info('✅ Wallet recovery debug succeeded', { 
          userId, 
          recoveredAddress: result.wallet?.address,
          expectedAddress,
          matches: result.wallet?.address === expectedAddress
        }, 'WalletRecoveryService');
      } else {
        logger.error('❌ Wallet recovery debug failed', { 
          userId, 
          expectedAddress,
          error: result.error,
          errorMessage: result.errorMessage
        }, 'WalletRecoveryService');
      }
      
    } catch (error) {
      logger.error('❌ Wallet recovery debug error', error, 'WalletRecoveryService');
    }
  }

  /**
   * Debug method to inspect AsyncStorage data
   */
  static async debugAsyncStorageData(userId: string): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const storedWalletsData = await AsyncStorage.getItem('storedWallets');
      
      if (storedWalletsData) {
        const storedWalletsArray = JSON.parse(storedWalletsData);
        logger.info('🔍 AsyncStorage Debug Data', { 
          userId,
          rawDataLength: storedWalletsData.length,
          parsedArrayLength: storedWalletsArray.length,
          firstWallet: storedWalletsArray[0] ? {
            keys: Object.keys(storedWalletsArray[0]),
            hasAddress: !!storedWalletsArray[0].address,
            addressValue: storedWalletsArray[0].address,
            // SECURITY: Do not log secret key metadata (hasSecretKey, secretKeyType, secretKeyLength)
            // This information could be useful to attackers
          } : null
        }, 'WalletRecoveryService');
      } else {
        logger.info('🔍 AsyncStorage Debug Data - No data found', { userId }, 'WalletRecoveryService');
      }
    } catch (error) {
      logger.error('Failed to debug AsyncStorage data', error, 'WalletRecoveryService');
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

  /**
   * Store mnemonic securely for a user
   */
  static async storeMnemonic(userId: string, mnemonic: string): Promise<boolean> {
    try {
      logger.info('Storing mnemonic for user', { userId }, 'WalletRecoveryService');

      // Validate mnemonic format
      const { validateBip39Mnemonic } = await import('./derive');
      const validation = validateBip39Mnemonic(mnemonic);
      
      if (!validation.isValid) {
        logger.error('Invalid mnemonic format', { userId }, 'WalletRecoveryService');
        return false;
      }

      // Primary: secure vault
      const ok = await secureVault.store(userId, 'mnemonic', mnemonic);
      if (!ok) {
        // Fallback: SecureStore
        const userMnemonicKey = `mnemonic_${userId}`;
        await SecureStore.setItemAsync(userMnemonicKey, mnemonic, {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData'
        });
      }

      logger.info('Mnemonic stored successfully', { userId }, 'WalletRecoveryService');
      return true;
    } catch (error) {
      logger.error('Failed to store mnemonic', error, 'WalletRecoveryService');
      return false;
    }
  }

  /**
   * Create cloud backup if enabled (async, non-blocking)
   */
  private static async createCloudBackupIfEnabled(userId: string): Promise<void> {
    try {
      // Check if user has enabled cloud backup
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      if (userData?.wallet_backup_enabled && userData?.wallet_backup_password_hash) {
        // Note: In production, we'd need to get the password from secure storage
        // For now, we'll skip automatic backup creation
        // User can manually create backup from settings
        logger.debug('Cloud backup enabled but password not available for automatic backup', { userId }, 'WalletRecoveryService');
      }
    } catch (error) {
      // Silent fail - backup is optional
      logger.debug('Cloud backup check failed', error, 'WalletRecoveryService');
    }
  }

  /**
   * Get stored mnemonic for a user
   */
  static async getStoredMnemonic(userId: string): Promise<string | null> {
    try {
      // Primary: secure vault first
      const fromVault = await secureVault.get(userId, 'mnemonic');
      if (fromVault) {
        logger.debug('Found user mnemonic in secure vault', { userId }, 'WalletRecoveryService');
        return fromVault;
      }

      // Fallbacks: Check for user-specific mnemonic first
      const userMnemonicKey = `mnemonic_${userId}`;
      const userMnemonic = await SecureStore.getItemAsync(userMnemonicKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      
      if (userMnemonic) {
        logger.debug('Found user-specific mnemonic', { userId }, 'WalletRecoveryService');
        return userMnemonic;
      }

      // Check for legacy seed phrase
      const legacySeedPhraseKey = `seed_phrase_${userId}`;
      const legacySeedPhrase = await SecureStore.getItemAsync(legacySeedPhraseKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      
      if (legacySeedPhrase) {
        logger.debug('Found legacy seed phrase', { userId }, 'WalletRecoveryService');
        return legacySeedPhrase;
      }

      // Check for global wallet mnemonic
      const globalMnemonic = await SecureStore.getItemAsync('wallet_mnemonic', {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      
      if (globalMnemonic) {
        logger.debug('Found global wallet mnemonic', { userId }, 'WalletRecoveryService');
        return globalMnemonic;
      }

      logger.debug('No mnemonic found for user', { userId }, 'WalletRecoveryService');
      return null;
    } catch (error) {
      logger.error('Failed to get stored mnemonic', error, 'WalletRecoveryService');
      return null;
    }
  }
}

export const walletRecoveryService = WalletRecoveryService;
