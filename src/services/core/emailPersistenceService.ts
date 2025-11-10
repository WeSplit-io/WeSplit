/**
 * Email Persistence Service
 * Manages email storage for authentication flow
 * SECURITY: Uses SecureStore for sensitive data storage
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../analytics/loggingService';

const EMAIL_STORAGE_KEY = 'wesplit_user_email';

export class EmailPersistenceService {
  /**
   * Save email to secure storage
   * SECURITY: Uses SecureStore instead of AsyncStorage for sensitive data
   */
  static async saveEmail(email: string): Promise<void> {
    try {
      if (email && email.trim()) {
        await SecureStore.setItemAsync(EMAIL_STORAGE_KEY, email.trim(), {
          requireAuthentication: false, // Email is less sensitive than private keys
        });
        logger.debug('Email saved to secure storage', { email: email.substring(0, 5) + '...' }, 'EmailPersistenceService');
      }
    } catch (error) {
      logger.error('Failed to save email to secure storage', { error }, 'EmailPersistenceService');
      throw error;
    }
  }

  /**
   * Load email from secure storage
   */
  static async loadEmail(): Promise<string | null> {
    try {
      const email = await SecureStore.getItemAsync(EMAIL_STORAGE_KEY);
      if (email) {
        logger.debug('Email loaded from secure storage', { email: email.substring(0, 5) + '...' }, 'EmailPersistenceService');
      }
      return email;
    } catch (error) {
      logger.error('Failed to load email from secure storage', { error }, 'EmailPersistenceService');
      return null;
    }
  }

  /**
   * Clear stored email (for logout)
   */
  static async clearEmail(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(EMAIL_STORAGE_KEY);
      logger.info('Stored email cleared', null, 'EmailPersistenceService');
    } catch (error) {
      logger.error('Failed to clear stored email', { error }, 'EmailPersistenceService');
      throw error;
    }
  }

}
