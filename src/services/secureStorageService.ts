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