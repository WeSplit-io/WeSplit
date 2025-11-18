/**
 * Phone Persistence Service
 * Manages phone number storage for authentication flow
 * SECURITY: Uses SecureStore for sensitive data storage
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../analytics/loggingService';

const PHONE_STORAGE_KEY = 'wesplit_user_phone';

export class PhonePersistenceService {
  /**
   * Save phone number to secure storage
   * SECURITY: Uses SecureStore instead of AsyncStorage for sensitive data
   * Phone number should be in E.164 format: +1234567890
   */
  static async savePhone(phone: string): Promise<void> {
    try {
      if (phone && phone.trim()) {
        await SecureStore.setItemAsync(PHONE_STORAGE_KEY, phone.trim(), {
          requireAuthentication: false, // Phone is less sensitive than private keys
        });
        logger.debug('Phone saved to secure storage', { phone: phone.substring(0, 5) + '...' }, 'PhonePersistenceService');
      }
    } catch (error) {
      logger.error('Failed to save phone to secure storage', { error }, 'PhonePersistenceService');
      throw error;
    }
  }

  /**
   * Load phone number from secure storage
   */
  static async loadPhone(): Promise<string | null> {
    try {
      const phone = await SecureStore.getItemAsync(PHONE_STORAGE_KEY);
      if (phone) {
        logger.debug('Phone loaded from secure storage', { phone: phone.substring(0, 5) + '...' }, 'PhonePersistenceService');
      }
      return phone;
    } catch (error) {
      logger.error('Failed to load phone from secure storage', { error }, 'PhonePersistenceService');
      return null;
    }
  }

  /**
   * Clear stored phone number (for logout)
   */
  static async clearPhone(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PHONE_STORAGE_KEY);
      logger.info('Stored phone cleared', null, 'PhonePersistenceService');
    } catch (error) {
      logger.error('Failed to clear stored phone', { error }, 'PhonePersistenceService');
      throw error;
    }
  }
}

