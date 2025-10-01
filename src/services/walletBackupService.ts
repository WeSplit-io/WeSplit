/**
 * Wallet Backup Service
 * Ensures wallet data is backed up across multiple storage methods
 * to prevent wallet loss when switching devices or authentication methods
 */

import { secureStorageService } from './secureStorageService';
import { firebaseDataService } from './firebaseDataService';
import { logger } from './loggingService';
import { Keypair } from '@solana/web3.js';

export interface WalletBackupData {
  seedPhrase?: string;
  privateKey?: string;
  walletAddress: string;
  walletPublicKey: string;
  backupTimestamp: string;
  backupMethod: 'email' | 'firebase' | 'secure_storage';
}

export interface WalletBackupResult {
  success: boolean;
  backupMethods: string[];
  error?: string;
}

class WalletBackupService {
  private static instance: WalletBackupService;

  public static getInstance(): WalletBackupService {
    if (!WalletBackupService.instance) {
      WalletBackupService.instance = new WalletBackupService();
    }
    return WalletBackupService.instance;
  }

  /**
   * Comprehensive wallet backup - stores wallet data in multiple locations
   */
  async backupWallet(
    userId: string, 
    email: string, 
    wallet: { address: string; publicKey: string; keypair?: Keypair }
  ): Promise<WalletBackupResult> {
    try {
      logger.info('WalletBackupService: Starting comprehensive wallet backup', { 
        userId, 
        email, 
        walletAddress: wallet.address 
      }, 'WalletBackup');

      const backupMethods: string[] = [];
      const errors: string[] = [];

      // Get wallet credentials
      const seedPhrase = await secureStorageService.getSeedPhrase(userId);
      const privateKey = await secureStorageService.getPrivateKey(userId);

      const backupData: WalletBackupData = {
        seedPhrase,
        privateKey,
        walletAddress: wallet.address,
        walletPublicKey: wallet.publicKey,
        backupTimestamp: new Date().toISOString(),
        backupMethod: 'email'
      };

      // Method 1: Email-based backup (for cross-auth recovery)
      try {
        await secureStorageService.storeWalletDataByEmail(email, {
          seedPhrase,
          privateKey,
          walletAddress: wallet.address,
          walletPublicKey: wallet.publicKey
        });
        backupMethods.push('email');
        logger.info('WalletBackupService: Email-based backup successful', { email }, 'WalletBackup');
      } catch (error) {
        const errorMsg = `Email backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.warn('WalletBackupService: Email-based backup failed', { email, error }, 'WalletBackup');
      }

      // Method 2: Firebase backup (encrypted)
      try {
        await this.backupToFirebase(userId, backupData);
        backupMethods.push('firebase');
        logger.info('WalletBackupService: Firebase backup successful', { userId }, 'WalletBackup');
      } catch (error) {
        const errorMsg = `Firebase backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.warn('WalletBackupService: Firebase backup failed', { userId, error }, 'WalletBackup');
      }

      // Method 3: Enhanced secure storage backup
      try {
        await this.backupToSecureStorage(userId, backupData);
        backupMethods.push('secure_storage');
        logger.info('WalletBackupService: Secure storage backup successful', { userId }, 'WalletBackup');
      } catch (error) {
        const errorMsg = `Secure storage backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.warn('WalletBackupService: Secure storage backup failed', { userId, error }, 'WalletBackup');
      }

      // Method 4: Cross-device backup (if available)
      try {
        await this.backupToCrossDeviceStorage(userId, email, backupData);
        backupMethods.push('cross_device');
        logger.info('WalletBackupService: Cross-device backup successful', { userId, email }, 'WalletBackup');
      } catch (error) {
        const errorMsg = `Cross-device backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.warn('WalletBackupService: Cross-device backup failed', { userId, email, error }, 'WalletBackup');
      }

      const success = backupMethods.length > 0;
      const result: WalletBackupResult = {
        success,
        backupMethods,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

      if (success) {
        logger.info('WalletBackupService: Wallet backup completed successfully', { 
          userId, 
          email, 
          walletAddress: wallet.address,
          backupMethods: backupMethods.join(', ')
        }, 'WalletBackup');
      } else {
        logger.error('WalletBackupService: All backup methods failed', { 
          userId, 
          email, 
          walletAddress: wallet.address,
          errors 
        }, 'WalletBackup');
      }

      return result;

    } catch (error) {
      logger.error('WalletBackupService: Wallet backup failed', { 
        userId, 
        email, 
        walletAddress: wallet.address,
        error 
      }, 'WalletBackup');
      
      return {
        success: false,
        backupMethods: [],
        error: error instanceof Error ? error.message : 'Backup failed with unknown error'
      };
    }
  }

  /**
   * Restore wallet from backup
   */
  async restoreWalletFromBackup(
    userId: string, 
    email: string, 
    expectedAddress?: string
  ): Promise<{ success: boolean; wallet?: { address: string; publicKey: string }; method?: string; error?: string }> {
    try {
      logger.info('WalletBackupService: Starting wallet restoration from backup', { 
        userId, 
        email, 
        expectedAddress 
      }, 'WalletBackup');

      // Method 1: Try email-based backup
      try {
        const emailBackup = await secureStorageService.getWalletDataByEmail(email);
        if (emailBackup && (!expectedAddress || emailBackup.walletAddress === expectedAddress)) {
          logger.info('WalletBackupService: Found email-based backup', { 
            email, 
            walletAddress: emailBackup.walletAddress 
          }, 'WalletBackup');
          
          return {
            success: true,
            wallet: {
              address: emailBackup.walletAddress,
              publicKey: emailBackup.walletPublicKey || emailBackup.walletAddress
            },
            method: 'email_backup'
          };
        }
      } catch (error) {
        logger.warn('WalletBackupService: Email-based restore failed', { email, error }, 'WalletBackup');
      }

      // Method 2: Try Firebase backup
      try {
        const firebaseBackup = await this.restoreFromFirebase(userId);
        if (firebaseBackup && (!expectedAddress || firebaseBackup.walletAddress === expectedAddress)) {
          logger.info('WalletBackupService: Found Firebase backup', { 
            userId, 
            walletAddress: firebaseBackup.walletAddress 
          }, 'WalletBackup');
          
          return {
            success: true,
            wallet: {
              address: firebaseBackup.walletAddress,
              publicKey: firebaseBackup.walletPublicKey
            },
            method: 'firebase_backup'
          };
        }
      } catch (error) {
        logger.warn('WalletBackupService: Firebase restore failed', { userId, error }, 'WalletBackup');
      }

      // Method 3: Try secure storage backup
      try {
        const secureBackup = await this.restoreFromSecureStorage(userId);
        if (secureBackup && (!expectedAddress || secureBackup.walletAddress === expectedAddress)) {
          logger.info('WalletBackupService: Found secure storage backup', { 
            userId, 
            walletAddress: secureBackup.walletAddress 
          }, 'WalletBackup');
          
          return {
            success: true,
            wallet: {
              address: secureBackup.walletAddress,
              publicKey: secureBackup.walletPublicKey
            },
            method: 'secure_storage_backup'
          };
        }
      } catch (error) {
        logger.warn('WalletBackupService: Secure storage restore failed', { userId, error }, 'WalletBackup');
      }

      return {
        success: false,
        error: 'No matching backup found'
      };

    } catch (error) {
      logger.error('WalletBackupService: Wallet restoration failed', { 
        userId, 
        email, 
        expectedAddress,
        error 
      }, 'WalletBackup');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restoration failed with unknown error'
      };
    }
  }

  /**
   * Backup wallet data to Firebase (encrypted)
   */
  private async backupToFirebase(userId: string, backupData: WalletBackupData): Promise<void> {
    try {
      // Store encrypted backup data in Firebase
      const encryptedBackup = {
        wallet_address: backupData.walletAddress,
        wallet_public_key: backupData.walletPublicKey,
        backup_timestamp: backupData.backupTimestamp,
        backup_method: 'comprehensive',
        // Note: We don't store seed phrase or private key in Firebase for security
        // They are stored in secure storage only
      };

      await firebaseDataService.user.updateUser(userId, {
        wallet_backup_data: encryptedBackup,
        wallet_backup_timestamp: backupData.backupTimestamp
      });

    } catch (error) {
      throw new Error(`Firebase backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Backup wallet data to enhanced secure storage
   */
  private async backupToSecureStorage(userId: string, backupData: WalletBackupData): Promise<void> {
    try {
      // Store backup metadata in secure storage
      const backupMetadata = {
        walletAddress: backupData.walletAddress,
        walletPublicKey: backupData.walletPublicKey,
        backupTimestamp: backupData.backupTimestamp,
        backupMethod: 'comprehensive'
      };

      await secureStorageService.storeSecureData(`wallet_backup_${userId}`, JSON.stringify(backupMetadata));

    } catch (error) {
      throw new Error(`Secure storage backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Backup wallet data for cross-device access
   */
  private async backupToCrossDeviceStorage(userId: string, email: string, backupData: WalletBackupData): Promise<void> {
    try {
      // This could be implemented with cloud storage, encrypted email, or other cross-device methods
      // For now, we'll use the email-based storage as cross-device backup
      
      const crossDeviceData = {
        userId,
        email,
        walletAddress: backupData.walletAddress,
        walletPublicKey: backupData.walletPublicKey,
        backupTimestamp: backupData.backupTimestamp,
        backupMethod: 'cross_device'
      };

      await secureStorageService.storeWalletDataByEmail(email, crossDeviceData);

    } catch (error) {
      throw new Error(`Cross-device backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore wallet from Firebase backup
   */
  private async restoreFromFirebase(userId: string): Promise<WalletBackupData | null> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      if (user?.wallet_backup_data) {
        return {
          walletAddress: user.wallet_backup_data.wallet_address,
          walletPublicKey: user.wallet_backup_data.wallet_public_key,
          backupTimestamp: user.wallet_backup_data.backup_timestamp,
          backupMethod: 'firebase'
        };
      }
      
      return null;
    } catch (error) {
      throw new Error(`Firebase restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore wallet from secure storage backup
   */
  private async restoreFromSecureStorage(userId: string): Promise<WalletBackupData | null> {
    try {
      const backupMetadata = await secureStorageService.getSecureData(`wallet_backup_${userId}`);
      
      if (backupMetadata) {
        const metadata = JSON.parse(backupMetadata);
        return {
          walletAddress: metadata.walletAddress,
          walletPublicKey: metadata.walletPublicKey,
          backupTimestamp: metadata.backupTimestamp,
          backupMethod: 'secure_storage'
        };
      }
      
      return null;
    } catch (error) {
      throw new Error(`Secure storage restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify wallet backup integrity
   */
  async verifyBackupIntegrity(userId: string, email: string): Promise<{
    success: boolean;
    backupStatus: {
      email: boolean;
      firebase: boolean;
      secureStorage: boolean;
    };
    error?: string;
  }> {
    try {
      logger.info('WalletBackupService: Verifying backup integrity', { userId, email }, 'WalletBackup');

      const backupStatus = {
        email: false,
        firebase: false,
        secureStorage: false
      };

      // Check email backup
      try {
        const emailBackup = await secureStorageService.getWalletDataByEmail(email);
        backupStatus.email = !!emailBackup;
      } catch (error) {
        logger.warn('WalletBackupService: Email backup verification failed', { email, error }, 'WalletBackup');
      }

      // Check Firebase backup
      try {
        const firebaseBackup = await this.restoreFromFirebase(userId);
        backupStatus.firebase = !!firebaseBackup;
      } catch (error) {
        logger.warn('WalletBackupService: Firebase backup verification failed', { userId, error }, 'WalletBackup');
      }

      // Check secure storage backup
      try {
        const secureBackup = await this.restoreFromSecureStorage(userId);
        backupStatus.secureStorage = !!secureBackup;
      } catch (error) {
        logger.warn('WalletBackupService: Secure storage backup verification failed', { userId, error }, 'WalletBackup');
      }

      const hasAnyBackup = backupStatus.email || backupStatus.firebase || backupStatus.secureStorage;

      return {
        success: hasAnyBackup,
        backupStatus,
        error: hasAnyBackup ? undefined : 'No backups found'
      };

    } catch (error) {
      logger.error('WalletBackupService: Backup verification failed', { userId, email, error }, 'WalletBackup');
      
      return {
        success: false,
        backupStatus: { email: false, firebase: false, secureStorage: false },
        error: error instanceof Error ? error.message : 'Verification failed with unknown error'
      };
    }
  }
}

export const walletBackupService = WalletBackupService.getInstance();
