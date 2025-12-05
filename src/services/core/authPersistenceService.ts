/**
 * Authentication Persistence Service
 * Manages email and phone number storage for authentication flow
 * SECURITY: Uses SecureStore for sensitive data storage
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../analytics/loggingService';

const EMAIL_STORAGE_KEY = 'wesplit_user_email';
const PHONE_STORAGE_KEY = 'wesplit_user_phone';

export class AuthPersistenceService {
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

  /**
   * Save phone number to secure storage
   * SECURITY: Uses SecureStore for sensitive data storage
   */
  static async savePhone(phone: string): Promise<void> {
    try {
      if (phone && phone.trim()) {
        await SecureStore.setItemAsync(PHONE_STORAGE_KEY, phone.trim(), {
          requireAuthentication: false, // Phone is less sensitive than private keys
        });
        logger.debug('Phone saved to secure storage', { phone: phone.substring(0, 5) + '...' }, 'EmailPersistenceService');
      }
    } catch (error) {
      logger.error('Failed to save phone to secure storage', { error }, 'EmailPersistenceService');
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
        logger.debug('Phone loaded from secure storage', { phone: phone.substring(0, 5) + '...' }, 'EmailPersistenceService');
      }
      return phone;
    } catch (error) {
      logger.error('Failed to load phone from secure storage', { error }, 'EmailPersistenceService');
      return null;
    }
  }

  /**
   * Clear stored phone number (for logout)
   */
  static async clearPhone(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PHONE_STORAGE_KEY);
      logger.info('Stored phone cleared', null, 'EmailPersistenceService');
    } catch (error) {
      logger.error('Failed to clear stored phone', { error }, 'EmailPersistenceService');
      throw error;
    }
  }

}
