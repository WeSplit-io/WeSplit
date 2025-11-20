/**
 * Split Wallet Security Service
 * Handles private key storage and security operations for split wallets
 * Part of the modularized SplitWalletService
 */

import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import type { DocumentReference } from 'firebase/firestore';
import { getUnifiedConfig } from '../../config/unified';
import { logger } from '../core';

const ENCRYPTION_VERSION = 'aes-256-cbc-v2' as const; // v2 uses faster HMAC key derivation
const ENCRYPTION_ALGORITHM = 'aes-256-cbc' as const;
// Using HMAC-based key derivation instead of PBKDF2 for much faster performance (~100x faster)
// Still secure for this use case: encryption key is in app config, data is in Firebase with security rules
// Legacy PBKDF2 iterations for backward compatibility with v1 encrypted keys
const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32; // 256-bit key
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;

interface EncryptedPrivateKeyPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  version: string;
  algorithm: typeof ENCRYPTION_ALGORITHM;
  iterations: number;
}

interface SharedPrivateKeyParticipant {
  userId?: string;
  name?: string;
}

interface SharedPrivateKeyDocument {
  encryptedPrivateKey?: EncryptedPrivateKeyPayload;
  participants?: SharedPrivateKeyParticipant[];
  splitType?: string;
  privateKey?: string;
  [key: string]: unknown;
}

export class SplitWalletSecurity {
  private static readonly PRIVATE_KEY_PREFIX = 'split_wallet_private_key_';
  private static readonly FAIR_SPLIT_PRIVATE_KEY_PREFIX = 'fair_split_private_key_';
  
  // In-memory cache for decrypted private keys (key: splitWalletId, value: decrypted key)
  // Cache expires after 5 minutes to balance performance and security
  private static privateKeyCache = new Map<string, { key: string; timestamp: number }>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  
  // Cache for encrypted payloads to avoid Firebase queries (key: splitWalletId, value: encrypted payload + participants)
  private static encryptedPayloadCache = new Map<string, { 
    payload: EncryptedPrivateKeyPayload | null; 
    plaintextKey: string | null;
    participants: SharedPrivateKeyParticipant[];
    timestamp: number;
  }>();
  private static readonly PAYLOAD_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Retrieve the base encryption secret from unified config
   */
  private static getBaseEncryptionSecret(): string {
    try {
      const config = getUnifiedConfig();
      if (config?.security?.encryptionKey) {
        return config.security.encryptionKey;
      }
    } catch (error) {
      logger.warn(
        'Failed to load encryption key from unified config',
        { error: error instanceof Error ? error.message : String(error) },
        'SplitWalletSecurity'
      );
    }

    // Fallback to prevent crashes – note that this should be overridden via config
    return 'wesplit-default-encryption-key';
  }

  /**
   * Derive AES key for a given split wallet
   * v2: Uses fast HMAC-based derivation (~100x faster than PBKDF2)
   * v1: Uses PBKDF2 for backward compatibility
   */
  private static deriveEncryptionKey(
    splitWalletId: string,
    salt: CryptoJS.lib.WordArray,
    iterations?: number,
    version?: string
  ): CryptoJS.lib.WordArray {
    const baseSecret = this.getBaseEncryptionSecret();
    const passphrase = `${baseSecret}:${splitWalletId}`;

    // v2 and newer: Use fast HMAC-based key derivation
    if (version === 'aes-256-cbc-v2') {
      // HMAC-SHA256 is much faster than PBKDF2 while still being secure
      // We use HMAC with the passphrase as key and salt as message
      // This produces a 256-bit key directly (HMAC-SHA256 output is 256 bits)
      const hmac = CryptoJS.HmacSHA256(salt, passphrase);
      // HMAC-SHA256 already produces 256 bits, but ensure it's in WordArray format
      return hmac;
    }
    
    // v1 or missing version: Use PBKDF2 for backward compatibility with old encrypted keys
    return CryptoJS.PBKDF2(passphrase, salt, {
      keySize: KEY_SIZE,
      iterations: iterations || PBKDF2_ITERATIONS
    });
  }

  /**
   * Encrypt split wallet private key using AES-256-CBC
   */
  private static encryptPrivateKey(
    splitWalletId: string,
    privateKey: string
  ): EncryptedPrivateKeyPayload {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES);
    const iv = CryptoJS.lib.WordArray.random(IV_SIZE_BYTES);
    // Use v2 fast HMAC-based key derivation
    const derivedKey = this.deriveEncryptionKey(splitWalletId, salt, undefined, ENCRYPTION_VERSION);
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(privateKey),
      derivedKey,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    return {
      ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
      iv: iv.toString(CryptoJS.enc.Base64),
      salt: salt.toString(CryptoJS.enc.Base64),
      version: ENCRYPTION_VERSION,
      algorithm: ENCRYPTION_ALGORITHM,
      iterations: 0 // Not used for v2, but kept for backward compatibility
    };
  }

  /**
   * Decrypt the stored encrypted payload
   */
  private static decryptEncryptedPrivateKey(
    splitWalletId: string,
    payload: EncryptedPrivateKeyPayload
  ): { success: boolean; privateKey?: string; error?: string } {
    try {
      if (!payload?.ciphertext || !payload?.salt || !payload?.iv) {
        return { success: false, error: 'Invalid encrypted payload' };
      }

      const salt = CryptoJS.enc.Base64.parse(payload.salt);
      const iv = CryptoJS.enc.Base64.parse(payload.iv);
      const ciphertext = CryptoJS.enc.Base64.parse(payload.ciphertext);

      // Use version to determine key derivation method (v2 = fast HMAC, v1 = PBKDF2)
      const version = payload.version || 'aes-256-cbc-v1';
      const derivedKey = this.deriveEncryptionKey(
        splitWalletId,
        salt,
        payload.iterations || PBKDF2_ITERATIONS,
        version
      );

      const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
      const decrypted = CryptoJS.AES.decrypt(cipherParams, derivedKey, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const privateKey = CryptoJS.enc.Utf8.stringify(decrypted);
      if (!privateKey || privateKey.trim().length === 0) {
        return { success: false, error: 'Decrypted private key is empty - decryption may have failed' };
      }

      return { success: true, privateKey };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to decrypt split wallet private key', {
        splitWalletId,
        error: errorMessage
      }, 'SplitWalletSecurity');
      return { 
        success: false, 
        error: `Failed to decrypt private key: ${errorMessage}` 
      };
    }
  }

  /**
   * Migrate legacy plaintext private key documents to encrypted payloads
   */
  private static async migratePlaintextPrivateKey(
    splitWalletId: string,
    privateKeyDocRef: DocumentReference,
    docData: SharedPrivateKeyDocument
  ): Promise<{ success: boolean; payload?: EncryptedPrivateKeyPayload }> {
    if (!docData?.privateKey) {
      return { success: false };
    }

    try {
      const encryptedPayload = this.encryptPrivateKey(splitWalletId, docData.privateKey);
      const { setDoc, deleteField } = await import('firebase/firestore');

      await setDoc(
        privateKeyDocRef,
        {
          encryptedPrivateKey: encryptedPayload,
          encryptionVersion: ENCRYPTION_VERSION,
          privateKey: deleteField(),
          migratedAt: new Date().toISOString()
        },
        { merge: true }
      );

      logger.info(
        'Migrated plaintext split wallet private key to encrypted storage',
        { splitWalletId },
        'SplitWalletSecurity'
      );

      return { success: true, payload: encryptedPayload };
    } catch (error) {
      logger.error(
        'Failed to migrate plaintext split wallet private key',
        {
          splitWalletId,
          error: error instanceof Error ? error.message : String(error)
        },
        'SplitWalletSecurity'
      );
      return { success: false };
    }
  }

  /**
   * Store Fair split wallet private key securely in local storage (creator-only access)
   * This is separate from the shared private key handling used for Degen splits
   * SECURITY: Private keys are NEVER stored in Firebase
   */
  static async storeFairSplitPrivateKey(
    splitWalletId: string, 
    creatorId: string, 
    privateKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!privateKey || typeof privateKey !== 'string') {
        return {
          success: false,
          error: 'Invalid private key provided',
        };
      }

      // Create a unique key for this Fair split wallet and creator combination
      const storageKey = `${this.FAIR_SPLIT_PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Store the private key securely without biometric authentication popup
      await SecureStore.setItemAsync(storageKey, privateKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });

      logger.info('Fair split wallet private key stored securely', {
        splitWalletId,
        creatorId,
        storageKey
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      logger.error('Failed to store Fair split wallet private key', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Store split wallet private key securely in local storage (shared access for Degen splits)
   * SECURITY: Private keys are NEVER stored in Firebase
   */
  static async storeSplitWalletPrivateKey(
    splitWalletId: string, 
    creatorId: string, 
    privateKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {

      if (!privateKey || typeof privateKey !== 'string') {
        return {
          success: false,
          error: 'Invalid private key provided',
        };
      }

      // Create a unique key for this split wallet and creator combination
      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Store the private key securely without biometric authentication popup
      await SecureStore.setItemAsync(storageKey, privateKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });


      logger.info('Split wallet private key stored securely', {
        splitWalletId,
        creatorId,
        storageKey
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      logger.error('Failed to store split wallet private key', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Verify if a user is the creator of a split wallet
   */
  static async isSplitWalletCreator(
    splitWalletId: string, 
    userId: string
  ): Promise<{ success: boolean; isCreator: boolean; error?: string }> {
    try {
      const { SplitWalletQueries } = await import('./SplitWalletQueries');
      const walletResult = await SplitWalletQueries.getSplitWallet(splitWalletId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          isCreator: false,
          error: 'Split wallet not found'
        };
      }
      
      const isCreator = walletResult.wallet.creatorId === userId;
      
      logger.debug('Creator verification result', {
        splitWalletId,
        userId,
        creatorId: walletResult.wallet.creatorId,
        isCreator
      }, 'SplitWalletSecurity');
      
      return {
        success: true,
        isCreator
      };
    } catch (error) {
      logger.error('Failed to verify split wallet creator', error, 'SplitWalletSecurity');
      return {
        success: false,
        isCreator: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if Fair split private key exists for creator
   */
  static async hasFairSplitPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; hasKey: boolean; error?: string }> {
    try {
      const storageKey = `${this.FAIR_SPLIT_PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      const privateKey = await SecureStore.getItemAsync(storageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      
      return {
        success: true,
        hasKey: !!privateKey,
      };
    } catch (error) {
      logger.error('Failed to check Fair split private key existence', error, 'SplitWalletSecurity');
      return {
        success: false,
        hasKey: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if local private key exists for split wallet
   */
  static async hasLocalPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; hasKey: boolean; error?: string }> {
    try {

      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Check if the key exists
      const privateKey = await SecureStore.getItemAsync(storageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      const hasKey = !!privateKey;


      return { 
        success: true, 
        hasKey 
      };

    } catch (error) {
      logger.error('Error checking for local private key', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to check for local private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        hasKey: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get Fair split wallet private key from local storage (creator-only access)
   * SECURITY: Only the creator can access the private key for fair splits
   */
  static async getFairSplitPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      logger.debug('Retrieving Fair split private key from local storage', {
        splitWalletId,
        creatorId
      }, 'SplitWalletSecurity');

      const storageKey = `${this.FAIR_SPLIT_PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Retrieve the private key from secure storage
      let privateKey;
      try {
        privateKey = await SecureStore.getItemAsync(storageKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitSplitWalletKeys'
        });
        
        logger.debug('Fair split private key retrieval result', {
          splitWalletId,
          creatorId,
          storageKey,
          hasPrivateKey: !!privateKey,
          privateKeyLength: privateKey?.length || 0
        }, 'SplitWalletSecurity');
      } catch (secureStoreError) {
        logger.error('SecureStore.getItemAsync failed for Fair split', {
          splitWalletId,
          creatorId,
          storageKey,
          error: secureStoreError instanceof Error ? secureStoreError.message : String(secureStoreError)
        }, 'SplitWalletSecurity');
        
        return {
          success: false,
          error: `Failed to access secure storage: ${secureStoreError instanceof Error ? secureStoreError.message : 'Unknown error'}`,
        };
      }
      
      if (!privateKey) {
        logger.warn('Fair split private key not found in secure storage', {
          splitWalletId,
          creatorId,
          storageKey
        }, 'SplitWalletSecurity');
        
        return {
          success: false,
          error: `Private key not found for Fair split wallet ${splitWalletId}. Only the creator can access this private key.`,
        };
      }

      logger.info('Fair split private key retrieved successfully', {
        splitWalletId,
        creatorId
      }, 'SplitWalletSecurity');

      return { 
        success: true, 
        privateKey 
      };

    } catch (error) {
      logger.error('Error retrieving Fair split private key', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to retrieve Fair split private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Pre-fetch encrypted private key payload from Firebase to warm up the cache
   * This should be called when a split wallet is loaded to avoid Firebase queries when user clicks "View Private Key"
   * @param splitWalletId - The split wallet ID
   * @returns Promise that resolves when the payload is cached (or fails silently)
   */
  static async preFetchPrivateKeyPayload(splitWalletId: string): Promise<void> {
    try {
      // Skip if already cached
      const cached = this.encryptedPayloadCache.get(splitWalletId);
      if (cached && (Date.now() - cached.timestamp) < this.PAYLOAD_CACHE_TTL_MS) {
        return; // Already cached
      }
      
      // Fetch from Firebase in the background
      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      const privateKeyDoc = await getDoc(privateKeyDocRef);
      
      if (privateKeyDoc.exists()) {
        const privateKeyData = privateKeyDoc.data() as SharedPrivateKeyDocument;
        const participantsList: SharedPrivateKeyParticipant[] = Array.isArray(privateKeyData.participants)
          ? privateKeyData.participants
          : [];
        
        // Cache the payload
        this.encryptedPayloadCache.set(splitWalletId, {
          payload: privateKeyData.encryptedPrivateKey || null,
          plaintextKey: privateKeyData.privateKey || null,
          participants: participantsList,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Silently fail - pre-fetch is optional
      logger.debug('Pre-fetch private key payload failed', {
        splitWalletId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletSecurity');
    }
  }

  /**
   * Get split wallet private key from Firebase (Degen Split) or local storage (Regular Split)
   * SECURITY: For Degen Split, all participants can access the private key. For regular splits, only the creator can access it.
   */
  static async getSplitWalletPrivateKey(
    splitWalletId: string, 
    requesterId: string
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      // Check cache first for instant retrieval
      const cacheKey = `${splitWalletId}_${requesterId}`;
      const cached = this.privateKeyCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
        logger.debug('Private key retrieved from cache', {
        splitWalletId,
        requesterId
      }, 'SplitWalletSecurity');
        return { success: true, privateKey: cached.key };
      }
      
      // Clean up expired cache entries
      if (this.privateKeyCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of this.privateKeyCache.entries()) {
          if (now - value.timestamp >= this.CACHE_TTL_MS) {
            this.privateKeyCache.delete(key);
          }
        }
      }
      
      // Check encrypted payload cache first to avoid Firebase query
      const cachedPayload = this.encryptedPayloadCache.get(splitWalletId);
      let privateKeyData: SharedPrivateKeyDocument | null = null;
      let participantsList: SharedPrivateKeyParticipant[] = [];
      
      if (cachedPayload && (Date.now() - cachedPayload.timestamp) < this.PAYLOAD_CACHE_TTL_MS) {
        // Use cached payload - skip Firebase query
        if (cachedPayload.plaintextKey) {
          // Legacy plaintext key from cache
          const isParticipant = cachedPayload.participants.some(
            p => p?.userId?.toString() === requesterId
          );
          if (!isParticipant) {
            return {
              success: false,
              error: 'User is not a participant in this Degen Split'
            };
          }
          
          this.privateKeyCache.set(cacheKey, {
            key: cachedPayload.plaintextKey,
            timestamp: Date.now()
          });
          
          return {
            success: true,
            privateKey: cachedPayload.plaintextKey
          };
        } else if (cachedPayload.payload) {
          // Encrypted payload from cache - verify participant and decrypt
          participantsList = cachedPayload.participants;
          const isParticipant = participantsList.some(
            p => p?.userId?.toString() === requesterId
          );
          
          if (!isParticipant) {
            return {
              success: false,
              error: 'User is not a participant in this Degen Split'
            };
          }
          
          // Decrypt using cached payload (no Firebase query needed)
          const decrypted = this.decryptEncryptedPrivateKey(splitWalletId, cachedPayload.payload);
          if (decrypted.success && decrypted.privateKey) {
            this.privateKeyCache.set(cacheKey, {
              key: decrypted.privateKey,
              timestamp: Date.now()
            });
            return {
              success: true,
              privateKey: decrypted.privateKey
            };
          } else {
            return {
              success: false,
              error: decrypted.error || 'Failed to decrypt shared private key'
            };
          }
        }
      }
      
      // Cache miss - fetch from Firebase
      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      let privateKeyDoc;
      let privateKeyDocRef: DocumentReference | null = null;
      try {
        privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
        privateKeyDoc = await getDoc(privateKeyDocRef);
      } catch (firebaseError) {
        logger.error('Firebase getDoc operation failed', {
          splitWalletId,
          requesterId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError)
        }, 'SplitWalletSecurity');
      }
      
      if (privateKeyDoc && privateKeyDoc.exists()) {
        privateKeyData = privateKeyDoc.data() as SharedPrivateKeyDocument;
        
        // Cache the payload for future requests
        participantsList = Array.isArray(privateKeyData.participants)
          ? privateKeyData.participants
          : [];
        
        this.encryptedPayloadCache.set(splitWalletId, {
          payload: privateKeyData.encryptedPrivateKey || null,
          plaintextKey: privateKeyData.privateKey || null,
          participants: participantsList,
          timestamp: Date.now()
        });
        
        // Verify the requester is a participant
        const isParticipant = participantsList.some(
          participant => participant?.userId?.toString() === requesterId
        );
        
        if (!isParticipant) {
          return {
            success: false,
            error: 'User is not a participant in this Degen Split'
          };
        }

        let decryptedKey: string | undefined;

        if (privateKeyData.encryptedPrivateKey) {
          // Validate encrypted payload structure (streamlined)
          const encryptedPayload = privateKeyData.encryptedPrivateKey;
          if (!encryptedPayload?.ciphertext || !encryptedPayload?.salt || !encryptedPayload?.iv) {
            return {
              success: false,
              error: 'Invalid encrypted private key format in database'
            };
          }
          
          const decrypted = this.decryptEncryptedPrivateKey(splitWalletId, encryptedPayload);
          if (decrypted.success && decrypted.privateKey) {
            decryptedKey = decrypted.privateKey;
        } else {
            return {
              success: false,
              error: decrypted.error || 'Failed to decrypt shared private key'
            };
          }
        } else if (privateKeyData.privateKey) {
          // Legacy plaintext storage – use it directly
          decryptedKey = privateKeyData.privateKey;
          
          // Optionally migrate to encrypted format in the background (non-blocking)
          if (privateKeyDocRef) {
            this.migratePlaintextPrivateKey(
            splitWalletId,
              privateKeyDocRef,
              privateKeyData
            ).catch(() => {
              // Silently fail migration - we already have the plaintext key
            });
          }
        } else {
          return {
            success: false,
            error: 'Shared private key not found for this split wallet'
          };
        }
        
        // Validate that we have a decrypted key
        if (!decryptedKey || decryptedKey.trim().length === 0) {
          return {
            success: false,
            error: 'Decrypted private key is empty or invalid'
          };
        }
        
        // Store in cache for future requests
        this.privateKeyCache.set(cacheKey, {
          key: decryptedKey,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          privateKey: decryptedKey
          };
      }
      
      // If not found in Firebase, this might be a Fair split wallet or an old Degen Split wallet
      
      // First, try to get it as a Fair split private key (creator-only access)
      const fairSplitResult = await this.getFairSplitPrivateKey(splitWalletId, requesterId);
      if (fairSplitResult.success && fairSplitResult.privateKey) {
        // Cache Fair split keys too
        this.privateKeyCache.set(cacheKey, {
          key: fairSplitResult.privateKey,
          timestamp: Date.now()
        });
        return fairSplitResult;
      }
      
      // If not a Fair split, try the old Degen Split format
      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${requesterId}`;
      
      // Retrieve the private key from secure storage with enhanced error handling
      let privateKey;
      try {
        privateKey = await SecureStore.getItemAsync(storageKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitSplitWalletKeys'
        });
      } catch (secureStoreError) {
        logger.error('SecureStore.getItemAsync failed', {
          splitWalletId,
          requesterId,
          error: secureStoreError instanceof Error ? secureStoreError.message : String(secureStoreError)
        }, 'SplitWalletSecurity');
        
        return {
          success: false,
          error: `Failed to access secure storage: ${secureStoreError instanceof Error ? secureStoreError.message : 'Unknown error'}`,
        };
      }
      
      if (!privateKey) {
        // Try alternative storage key formats for backward compatibility
        const alternativeKeys = [
          `${this.PRIVATE_KEY_PREFIX}${splitWalletId}`, // Original format without user ID
          `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${requesterId}`, // Current format
        ];
        
        for (const altKey of alternativeKeys) {
          if (altKey !== storageKey) {
            try {
              const altPrivateKey = await SecureStore.getItemAsync(altKey, {
                requireAuthentication: false,
                keychainService: 'WeSplitSplitWalletKeys'
              });
              if (altPrivateKey) {
                // Cache the found key
                this.privateKeyCache.set(cacheKey, {
                  key: altPrivateKey,
                  timestamp: Date.now()
                });
                return {
                  success: true,
                  privateKey: altPrivateKey
                };
              }
            } catch {
              // Silently continue to next alternative key
            }
          }
        }
        
        return {
          success: false,
          error: `Private key not found for Degen Split wallet ${splitWalletId}. This might be an old wallet created before shared private key access was implemented. Please contact the split creator to recreate the wallet.`,
        };
      }

      // Cache the retrieved key
      this.privateKeyCache.set(cacheKey, {
        key: privateKey,
        timestamp: Date.now()
      });

      return { 
        success: true, 
        privateKey 
      };

    } catch (error) {
      logger.error('Error retrieving split wallet private key', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to retrieve split wallet private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Store split wallet private key for all participants (Degen Split)
   * SECURITY: For Degen Split, all participants need access to the private key
   */
  static async storeSplitWalletPrivateKeyForAllParticipants(
    splitWalletId: string,
    participants: { userId: string; name: string }[],
    privateKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!privateKey || typeof privateKey !== 'string') {
        return {
          success: false,
          error: 'Invalid private key provided',
        };
      }

      if (!participants || participants.length === 0) {
        return {
          success: false,
          error: 'No participants provided',
        };
      }

      const encryptedPayload = this.encryptPrivateKey(splitWalletId, privateKey);

      // For Degen Split, store the encrypted private key in Firebase so all participants can access it
      const { db } = await import('../../config/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      
        await setDoc(privateKeyDocRef, {
          splitWalletId,
        encryptedPrivateKey: encryptedPayload,
          participants: participants.map(p => ({ userId: p.userId, name: p.name })),
          createdAt: new Date().toISOString(),
        splitType: 'degen',
        encryptionVersion: ENCRYPTION_VERSION
        });
        
      logger.info('Encrypted private key stored in Firebase for Degen Split', {
          splitWalletId,
          participantsCount: participants.length,
        encryptionVersion: ENCRYPTION_VERSION
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      logger.error('Error storing split wallet private key for all participants', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to store split wallet private key for all participants', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Keep shared private key participant list in sync (Degen Split)
   * Ensures newly invited participants can access the shared private key document
   */
  static async syncSharedPrivateKeyParticipants(
    splitWalletId: string,
    participants: { userId: string; name?: string }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!splitWalletId) {
        return {
          success: false,
          error: 'splitWalletId is required',
        };
      }

      if (!participants || participants.length === 0) {
        return {
          success: false,
          error: 'No participants provided to sync',
        };
      }

      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');

      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      const privateKeyDoc = await getDoc(privateKeyDocRef);

      if (!privateKeyDoc.exists()) {
        logger.warn('Shared private key document not found while syncing participants', {
          splitWalletId,
          participantsCount: participants.length
        }, 'SplitWalletSecurity');
        return {
          success: false,
          error: 'Shared private key record not found for this split wallet',
        };
      }

      const sanitizedParticipants = participants.map(participant => ({
        userId: participant.userId?.toString(),
        name: participant.name || 'Unknown Participant',
      }));

      await setDoc(
        privateKeyDocRef,
        {
          participants: sanitizedParticipants,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      logger.info('Shared private key participants synchronized', {
        splitWalletId,
        participantsCount: sanitizedParticipants.length
      }, 'SplitWalletSecurity');

      return { success: true };
    } catch (error) {
      logger.error('Error syncing shared private key participants', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to sync shared private key participants', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete split wallet private key for all participants (Degen Split)
   * Used when a Degen Split is completed or cancelled
   */
  static async deleteSplitWalletPrivateKeyForAllParticipants(
    splitWalletId: string,
    participants: { userId: string; name: string }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!participants || participants.length === 0) {
        return {
          success: false,
          error: 'No participants provided',
        };
      }

      // Delete the private key for each participant
      const deletePromises = participants.map(async (participant) => {
        const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${participant.userId}`;
        await SecureStore.deleteItemAsync(storageKey);
        
        logger.info('Split wallet private key deleted for participant', {
          splitWalletId,
          participantId: participant.userId,
          participantName: participant.name,
          storageKey
        }, 'SplitWalletSecurity');
      });

      await Promise.all(deletePromises);

      // Remove shared private key record from Firebase to avoid lingering secrets
      try {
        const { db } = await import('../../config/firebase/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');

        await deleteDoc(doc(db, 'splitWalletPrivateKeys', splitWalletId));

        logger.info('Shared private key record deleted from Firebase', {
          splitWalletId,
          participantsCount: participants.length
        }, 'SplitWalletSecurity');
      } catch (firebaseError) {
        logger.warn('Failed to delete shared private key record from Firebase', {
          splitWalletId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError)
        }, 'SplitWalletSecurity');
      }

      logger.info('Split wallet private key deleted for all participants', {
        splitWalletId,
        participantsCount: participants.length
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      logger.error('Error deleting split wallet private key for all participants', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to delete split wallet private key for all participants', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete split wallet private key from local storage
   * Used when a split is completed or cancelled
   */
  static async deleteSplitWalletPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {

      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Delete the private key from secure storage
      await SecureStore.deleteItemAsync(storageKey);


      logger.info('Split wallet private key deleted from local storage', {
        splitWalletId,
        creatorId
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      logger.error('Error deleting split wallet private key', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to delete split wallet private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * List all stored split wallet private keys for a creator
   * Used for debugging and cleanup purposes
   */
  static async listStoredPrivateKeys(
    _creatorId: string
  ): Promise<{ success: boolean; keys: string[]; error?: string }> {
    try {
      // SecureStore does not expose a key-listing API; best effort no-op
      await Promise.resolve();
      return {
        success: true,
        keys: [],
        error: 'SecureStore does not support listing all stored keys'
      };

    } catch (error) {
      logger.error('Error listing stored private keys', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletSecurity');
      logger.error('Failed to list stored private keys', error, 'SplitWalletSecurity');
      return {
        success: false,
        keys: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Clean up old private keys (for maintenance)
   * This would require maintaining a separate index of stored keys
   */
  static async cleanupOldPrivateKeys(
    olderThanDays: number = 30
  ): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
    try {
      logger.info('Private key cleanup requested', { olderThanDays }, 'SplitWalletSecurity');
      await Promise.resolve();
      return {
        success: true,
        cleanedCount: 0,
        error: 'Cleanup not implemented - requires key index'
      };

    } catch (error) {
      logger.error('Failed to cleanup old private keys', error, 'SplitWalletSecurity');
      return {
        success: false,
        cleanedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
