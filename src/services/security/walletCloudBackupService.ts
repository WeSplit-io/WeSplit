/**
 * Wallet Cloud Backup Service
 * Provides encrypted cloud backup and restore functionality for wallet recovery
 * across app reinstalls and device changes
 */

import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { walletExportService } from '../blockchain/wallet/walletExportService';
import { walletRecoveryService } from '../blockchain/wallet/walletRecoveryService';
import { Keypair } from '@solana/web3.js';

// Use Web Crypto API for encryption
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptWithPassword(data: string, password: string): Promise<{ encrypted: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKeyFromPassword(password, salt);
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(data)
  );

  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

async function decryptWithPassword(encrypted: string, salt: string, iv: string, password: string): Promise<string> {
  const saltBuffer = Uint8Array.from(Buffer.from(salt, 'base64'));
  const ivBuffer = Uint8Array.from(Buffer.from(iv, 'base64'));
  const encryptedBuffer = Uint8Array.from(Buffer.from(encrypted, 'base64'));

  const key = await deriveKeyFromPassword(password, saltBuffer);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export interface WalletBackupData {
  walletAddress: string;
  seedPhrase?: string;
  privateKey?: string;
  publicKey: string;
  createdAt: string;
  version: string;
}

export interface WalletBackupResult {
  success: boolean;
  backupId?: string;
  error?: string;
}

export interface WalletRestoreResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
    privateKey: string;
  };
  error?: string;
}

class WalletCloudBackupService {
  private static readonly BACKUP_COLLECTION = 'wallet_backups';
  private static readonly BACKUP_VERSION = '1.0';

  /**
   * Create encrypted cloud backup of wallet
   * Requires user password for encryption
   */
  async createBackup(
    userId: string,
    password: string
  ): Promise<WalletBackupResult> {
    try {
      logger.info('Creating wallet cloud backup', { userId }, 'WalletCloudBackupService');

      // Export wallet data
      const exportResult = await walletExportService.exportWallet(userId, undefined, {
        includeSeedPhrase: true,
        includePrivateKey: true,
      });

      if (!exportResult.success || !exportResult.walletAddress) {
        return {
          success: false,
          error: 'Failed to export wallet data for backup',
        };
      }

      // Prepare backup data
      const backupData: WalletBackupData = {
        walletAddress: exportResult.walletAddress,
        publicKey: exportResult.walletAddress,
        seedPhrase: exportResult.seedPhrase,
        privateKey: exportResult.privateKey,
        createdAt: new Date().toISOString(),
        version: WalletCloudBackupService.BACKUP_VERSION,
      };

      // Encrypt backup data
      const encrypted = await encryptWithPassword(
        JSON.stringify(backupData),
        password
      );

      // Store encrypted backup in Firebase
      const { db } = await import('../../config/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      const backupId = `backup_${userId}_${Date.now()}`;
      const backupRef = doc(db, WalletCloudBackupService.BACKUP_COLLECTION, backupId);

      await setDoc(backupRef, {
        userId,
        encrypted: encrypted.encrypted,
        salt: encrypted.salt,
        iv: encrypted.iv,
        walletAddress: exportResult.walletAddress, // Store unencrypted for quick lookup
        createdAt: new Date().toISOString(),
        version: WalletCloudBackupService.BACKUP_VERSION,
      });

      // Update user record with backup info
      await firebaseDataService.user.updateUser(userId, {
        wallet_backup_exists: true,
        wallet_backup_created_at: new Date().toISOString(),
      } as any);

      logger.info('Wallet cloud backup created successfully', { 
        userId, 
        backupId,
        walletAddress: exportResult.walletAddress 
      }, 'WalletCloudBackupService');

      return {
        success: true,
        backupId,
      };
    } catch (error) {
      logger.error('Failed to create wallet cloud backup', error, 'WalletCloudBackupService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Restore wallet from cloud backup
   * Requires user password for decryption
   */
  async restoreFromBackup(
    userId: string,
    password: string
  ): Promise<WalletRestoreResult> {
    try {
      logger.info('Restoring wallet from cloud backup', { userId }, 'WalletCloudBackupService');

      // Get encrypted backup from Firebase
      const { db } = await import('../../config/firebase/firebase');
      const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

      const backupsRef = collection(db, WalletCloudBackupService.BACKUP_COLLECTION);
      const q = query(
        backupsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'No backup found for this user',
        };
      }

      const backupDoc = querySnapshot.docs[0];
      const backupData = backupDoc.data();

      // Decrypt backup data
      const decrypted = await decryptWithPassword(
        backupData.encrypted,
        backupData.salt,
        backupData.iv,
        password
      );

      const walletData: WalletBackupData = JSON.parse(decrypted);

      // Validate wallet data
      if (!walletData.walletAddress || (!walletData.seedPhrase && !walletData.privateKey)) {
        return {
          success: false,
          error: 'Invalid backup data',
        };
      }

      // Restore wallet
      let restoreResult;

      if (walletData.seedPhrase) {
        // Restore from seed phrase (preferred)
        restoreResult = await walletRecoveryService.restoreWalletFromSeedPhrase(
          userId,
          walletData.seedPhrase,
          walletData.walletAddress
        );
      } else if (walletData.privateKey) {
        // Restore from private key
        const keypair = Keypair.fromSecretKey(Buffer.from(walletData.privateKey, 'base64'));
        const address = keypair.publicKey.toBase58();

        if (address !== walletData.walletAddress) {
          return {
            success: false,
            error: 'Private key does not match wallet address',
          };
        }

        const stored = await walletRecoveryService.storeWallet(userId, {
          address,
          publicKey: address,
          privateKey: walletData.privateKey,
        });

        if (!stored) {
          return {
            success: false,
            error: 'Failed to store restored wallet',
          };
        }

        restoreResult = {
          success: true,
          wallet: {
            address,
            publicKey: address,
            privateKey: walletData.privateKey,
          },
        };
      } else {
        return {
          success: false,
          error: 'Backup data missing wallet credentials',
        };
      }

      if (restoreResult.success && restoreResult.wallet) {
        logger.info('Wallet restored from cloud backup successfully', { 
          userId, 
          walletAddress: restoreResult.wallet.address 
        }, 'WalletCloudBackupService');

        return restoreResult;
      } else {
        return {
          success: false,
          error: restoreResult.errorMessage || 'Failed to restore wallet',
        };
      }
    } catch (error) {
      logger.error('Failed to restore wallet from cloud backup', error, 'WalletCloudBackupService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if backup exists for user
   */
  async hasBackup(userId: string): Promise<boolean> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { collection, query, where, limit, getDocs } = await import('firebase/firestore');

      const backupsRef = collection(db, WalletCloudBackupService.BACKUP_COLLECTION);
      const q = query(
        backupsRef,
        where('userId', '==', userId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      logger.error('Failed to check backup existence', error, 'WalletCloudBackupService');
      return false;
    }
  }

  /**
   * Delete backup (for security)
   */
  async deleteBackup(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const backupsRef = collection(db, WalletCloudBackupService.BACKUP_COLLECTION);
      const q = query(backupsRef, where('userId', '==', userId));

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => doc.ref.delete());

      await Promise.all(deletePromises);

      // Update user record
      await firebaseDataService.user.updateUser(userId, {
        wallet_backup_exists: false,
      } as any);

      logger.info('Wallet backup deleted successfully', { userId }, 'WalletCloudBackupService');

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete wallet backup', error, 'WalletCloudBackupService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const walletCloudBackupService = new WalletCloudBackupService();

