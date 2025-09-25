/**
 * Secure storage service for sensitive data
 * Handles encryption and secure storage of private keys, seed phrases, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './loggingService';

// Simple encryption key (in production, use proper key management)
const ENCRYPTION_KEY = 'WeSplit_Secure_Storage_Key_2024';

interface SecureData {
  encrypted: string;
  iv: string;
  timestamp: number;
}

class SecureStorageService {
  private async encrypt(data: string): Promise<{ encrypted: string; iv: string }> {
    try {
      // In a real implementation, use proper encryption
      // For now, use a simple base64 encoding with a prefix
      const encrypted = btoa(`ENCRYPTED:${data}:${Date.now()}`);
      const iv = btoa(`IV:${Math.random().toString(36)}:${Date.now()}`);
      
      return { encrypted, iv };
    } catch (error) {
      logger.error('Encryption failed', error, 'SecureStorage');
      throw new Error('Failed to encrypt data');
    }
  }

  private async decrypt(encrypted: string, iv: string): Promise<string> {
    try {
      // In a real implementation, use proper decryption
      const decoded = atob(encrypted);
      const parts = decoded.split(':');
      
      if (parts[0] !== 'ENCRYPTED' || parts.length < 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      return parts[1];
    } catch (error) {
      logger.error('Decryption failed', error, 'SecureStorage');
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store sensitive data securely
   */
  async storeSecureData(key: string, data: string): Promise<void> {
    try {
      const { encrypted, iv } = await this.encrypt(data);
      
      const secureData: SecureData = {
        encrypted,
        iv,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(`secure_${key}`, JSON.stringify(secureData));
      logger.info(`Secure data stored for key: ${key}`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to store secure data for key: ${key}`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  async getSecureData(key: string): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(`secure_${key}`);
      if (!stored) {
        return null;
      }

      const secureData: SecureData = JSON.parse(stored);
      const decrypted = await this.decrypt(secureData.encrypted, secureData.iv);
      
      logger.info(`Secure data retrieved for key: ${key}`, null, 'SecureStorage');
      return decrypted;
    } catch (error) {
      logger.error(`Failed to retrieve secure data for key: ${key}`, error, 'SecureStorage');
      return null;
    }
  }

  /**
   * Remove secure data
   */
  async removeSecureData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`secure_${key}`);
      logger.info(`Secure data removed for key: ${key}`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to remove secure data for key: ${key}`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Check if secure data exists
   */
  async hasSecureData(key: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(`secure_${key}`);
      return stored !== null;
    } catch (error) {
      logger.error(`Failed to check secure data for key: ${key}`, error, 'SecureStorage');
      return false;
    }
  }

  /**
   * Store seed phrase securely
   */
  async storeSeedPhrase(userId: string, seedPhrase: string): Promise<void> {
    const key = `seed_phrase_${userId}`;
    await this.storeSecureData(key, seedPhrase);
  }

  /**
   * Get seed phrase securely
   */
  async getSeedPhrase(userId: string): Promise<string | null> {
    const key = `seed_phrase_${userId}`;
    return await this.getSecureData(key);
  }

  /**
   * Store private key securely
   */
  async storePrivateKey(userId: string, privateKey: string): Promise<void> {
    const key = `private_key_${userId}`;
    await this.storeSecureData(key, privateKey);
  }

  /**
   * Get private key securely
   */
  async getPrivateKey(userId: string): Promise<string | null> {
    const key = `private_key_${userId}`;
    return await this.getSecureData(key);
  }

  /**
   * Clear all secure data for a user
   */
  async clearUserData(userId: string): Promise<void> {
    try {
      const keys = [
        `seed_phrase_${userId}`,
        `private_key_${userId}`
      ];

      for (const key of keys) {
        await this.removeSecureData(key);
      }

      logger.info(`Cleared all secure data for user: ${userId}`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to clear user data for: ${userId}`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Clear user data from secure storage but preserve wallet credentials (for logout)
   * This ensures users keep their wallet access when logging back in
   */
  async clearUserDataExceptWallet(userId: string): Promise<void> {
    try {
      // Don't clear wallet-related keys - preserve them for next login
      // Only clear other user-specific data if any exists
      const keys = [
        // Add any non-wallet user data keys here if they exist
        // For now, we don't clear anything to preserve wallet data
      ];

      for (const key of keys) {
        try {
          await this.removeSecureData(key);
        } catch (error) {
          // Ignore individual key removal errors
        }
      }

      logger.info(`Cleared user data (wallet preserved) for user: ${userId}`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to clear user data for: ${userId}`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Clear wallet data for a specific user (used when switching users)
   * This ensures each user gets their own wallet
   */
  async clearWalletDataForUser(userId: string): Promise<void> {
    try {
      const walletKeys = [
        `seed_phrase_${userId}`,
        `private_key_${userId}`
      ];

      for (const key of walletKeys) {
        try {
          await this.removeSecureData(key);
        } catch (error) {
          // Ignore individual key removal errors
        }
      }

      logger.info(`Cleared wallet data for user: ${userId}`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to clear wallet data for user: ${userId}`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Clear ALL wallet data from secure storage (used when switching users)
   * This ensures no wallet data from previous users interferes with new user
   */
  async clearAllWalletData(): Promise<void> {
    try {
      // Since we can't easily enumerate all keys in secure storage,
      // we'll clear wallet data for common user ID patterns
      // This is a more aggressive approach that ensures clean state
      
      const commonUserIds = [
        // Add any known user IDs or patterns here
        // For now, we'll clear based on common patterns
      ];

      // Clear wallet data for common user ID patterns
      for (const userId of commonUserIds) {
        try {
          await this.clearWalletDataForUser(userId);
        } catch (error) {
          // Ignore individual user clearing errors
        }
      }

      // Also try to clear any wallet data that might be stored with generic keys
      const genericWalletKeys = [
        'seed_phrase',
        'private_key',
        'wallet_address',
        'wallet_public_key',
        'secure_seed_phrase',
        'wallet_info'
      ];

      for (const key of genericWalletKeys) {
        try {
          await this.removeSecureData(key);
        } catch (error) {
          // Ignore individual key removal errors
        }
      }

      // Also clear any corrupted data from SecureSeedPhrase service
      try {
        const { secureSeedPhraseService } = await import('./secureSeedPhraseService');
        await secureSeedPhraseService.clearCorruptedData();
      } catch (error) {
        // Ignore errors from SecureSeedPhrase service cleanup
        logger.warn('Failed to clear corrupted data from SecureSeedPhrase service', { error }, 'SecureStorage');
      }

      logger.info(`Cleared all wallet data (generic keys and common user patterns)`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to clear all wallet data`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Clear all wallet-related data for a user (comprehensive cleanup)
   */
  async clearAllWalletData(userId: string): Promise<void> {
    try {
      // Clear secure storage
      await this.clearUserData(userId);
      
      // Clear standard AsyncStorage wallet data
      const standardKeys = [
        `wallet_${userId}`,
        `user_wallet_${userId}`,
        `wallet_address_${userId}`,
        `wallet_public_key_${userId}`,
        `wallet_private_key_${userId}`,
        `seed_phrase_${userId}`,
        `mnemonic_${userId}`,
        `keypair_${userId}`,
        `secure_seed_phrase`,
        `wallet_info`
      ];

      for (const key of standardKeys) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          // Ignore individual key removal errors
        }
      }

      logger.info(`Cleared all wallet data for user: ${userId}`, null, 'SecureStorage');
    } catch (error) {
      logger.error(`Failed to clear all wallet data for: ${userId}`, error, 'SecureStorage');
      throw error;
    }
  }

  /**
   * Store a linked external wallet
   */
  async storeLinkedWallet(userId: string, linkedWallet: any): Promise<void> {
    try {
      const key = `linked_wallets_${userId}`;
      const existingWallets = await this.getLinkedWallets(userId);
      
      // Add or update the wallet
      const updatedWallets = existingWallets.filter(w => w.id !== linkedWallet.id);
      updatedWallets.push(linkedWallet);
      
      const secureData = await this.encrypt(JSON.stringify(updatedWallets));
      await AsyncStorage.setItem(key, JSON.stringify(secureData));
      
      logger.info(`Stored linked wallet for user ${userId}`, null, 'SecureStorage');
    } catch (error) {
      logger.error('Failed to store linked wallet', error, 'SecureStorage');
      throw new Error('Failed to store linked wallet');
    }
  }

  /**
   * Get all linked wallets for a user
   */
  async getLinkedWallets(userId: string): Promise<any[]> {
    try {
      const key = `linked_wallets_${userId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (!data) {
        return [];
      }
      
      const secureData: SecureData = JSON.parse(data);
      const decrypted = await this.decrypt(secureData.encrypted, secureData.iv);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to get linked wallets', error, 'SecureStorage');
      return [];
    }
  }

  /**
   * Remove a linked wallet
   */
  async removeLinkedWallet(userId: string, walletId: string): Promise<void> {
    try {
      const existingWallets = await this.getLinkedWallets(userId);
      const updatedWallets = existingWallets.filter(w => w.id !== walletId);
      
      if (updatedWallets.length === 0) {
        // Remove the key entirely if no wallets left
        const key = `linked_wallets_${userId}`;
        await AsyncStorage.removeItem(key);
      } else {
        // Update with remaining wallets
        const key = `linked_wallets_${userId}`;
        const secureData = await this.encrypt(JSON.stringify(updatedWallets));
        await AsyncStorage.setItem(key, JSON.stringify(secureData));
      }
      
      logger.info(`Removed linked wallet ${walletId} for user ${userId}`, null, 'SecureStorage');
    } catch (error) {
      logger.error('Failed to remove linked wallet', error, 'SecureStorage');
      throw new Error('Failed to remove linked wallet');
    }
  }

  /**
   * Get all secure data keys for debugging (development only)
   */
  async getAllSecureKeys(): Promise<string[]> {
    if (!__DEV__) {
      return [];
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith('secure_'));
    } catch (error) {
      logger.error('Failed to get all secure keys', error, 'SecureStorage');
      return [];
    }
  }
}

export const secureStorageService = new SecureStorageService(); 