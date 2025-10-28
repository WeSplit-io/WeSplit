/**
 * Email Persistence Service
 * Manages email storage for authentication flow
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../analytics/loggingService';

const EMAIL_STORAGE_KEY = 'wesplit_user_email';

export class EmailPersistenceService {
  /**
   * Save email to persistent storage
   */
  static async saveEmail(email: string): Promise<void> {
    try {
      if (email && email.trim()) {
        await AsyncStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
        logger.debug('Email saved to storage', { email: email.trim() }, 'EmailPersistenceService');
      }
    } catch (error) {
      logger.error('Failed to save email to storage', { error, email }, 'EmailPersistenceService');
      throw error;
    }
  }

  /**
   * Load email from persistent storage
   */
  static async loadEmail(): Promise<string | null> {
    try {
      const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
      if (email) {
        logger.debug('Email loaded from storage', { email }, 'EmailPersistenceService');
      }
      return email;
    } catch (error) {
      logger.error('Failed to load email from storage', { error }, 'EmailPersistenceService');
      return null;
    }
  }

  /**
   * Clear stored email (for logout)
   */
  static async clearEmail(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EMAIL_STORAGE_KEY);
      logger.info('Stored email cleared', null, 'EmailPersistenceService');
    } catch (error) {
      logger.error('Failed to clear stored email', { error }, 'EmailPersistenceService');
      throw error;
    }
  }

}
