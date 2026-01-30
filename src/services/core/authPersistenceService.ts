/**
 * Authentication Persistence Service
 * Manages email, phone number, and local app PIN storage for authentication flow
 * SECURITY: PIN is stored in the same way as the wallet (react-native-keychain when available)
 * so it persists across app opens like the user's private key. Falls back to SecureStore in Expo Go.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { logger } from '../analytics/loggingService';

const EMAIL_STORAGE_KEY = 'wesplit_user_email';
const PHONE_STORAGE_KEY = 'wesplit_user_phone';
const PIN_STORAGE_KEY_PREFIX = 'wesplit_user_pin_';
const PIN_KEYCHAIN_SERVICE_PREFIX = 'wesplit-pin-'; // same Keychain persistence as wallet
const PIN_LOGIN_EMAIL_PREFIX = 'wesplit_pin_login_email_';

let Keychain: any = null;
async function getKeychain(): Promise<any> {
  if (Keychain === null) {
    try {
      Keychain = await import('react-native-keychain');
    } catch {
      Keychain = undefined;
    }
  }
  return Keychain;
}

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
  
  /**
   * Save a 6-digit app PIN for the given user.
   * SECURITY: PIN is never stored in plaintext. We store a SHA-256 hash.
   * Uses the same storage as the wallet (react-native-keychain with AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY)
   * so the PIN persists across app opens like the user's private key. Fallback: SecureStore (e.g. Expo Go).
   */
  static async savePin(userId: string, pin: string, email?: string | null): Promise<void> {
    try {
      if (!userId || !pin) {
        logger.warn('Attempted to save PIN with missing userId or pin', { hasUserId: !!userId, hasPin: !!pin }, 'AuthPersistenceService');
        return;
      }

      const trimmedPin = pin.trim();
      if (!/^\d{6}$/.test(trimmedPin)) {
        logger.warn('Attempted to save invalid PIN format (must be 6 digits)', { length: trimmedPin.length }, 'AuthPersistenceService');
        return;
      }

      const hashInput = `${userId}:${trimmedPin}`;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashInput
      );

      const kc = await getKeychain();
      if (kc?.setGenericPassword) {
        const service = `${PIN_KEYCHAIN_SERVICE_PREFIX}${userId}`;
        const opts: any = {
          service,
          accessible: kc.ACCESSIBLE?.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY ?? kc.ACCESSIBLE?.AFTER_FIRST_UNLOCK,
        };
        await kc.setGenericPassword('pin', hash, opts);
        logger.info('App PIN hash saved to Keychain (same persistence as wallet)', { userId }, 'AuthPersistenceService');
      } else {
        await SecureStore.setItemAsync(`${PIN_STORAGE_KEY_PREFIX}${userId}`, hash, {
          requireAuthentication: false,
        });
        logger.info('App PIN hash saved to SecureStore fallback', { userId }, 'AuthPersistenceService');
      }
    } catch (error) {
      logger.error('Failed to save app PIN', { error, userId }, 'AuthPersistenceService');
      throw error;
    }
  }

  /**
   * Store email -> userId for PIN-only sign-in when user returns (we remember their email).
   */
  static async savePinLoginData(email: string, userId: string): Promise<void> {
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !userId) return;
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        normalized
      );
      const storageKey = `${PIN_LOGIN_EMAIL_PREFIX}${keyHash.substring(0, 32)}`;
      await SecureStore.setItemAsync(storageKey, JSON.stringify({ userId }), { requireAuthentication: false });
      logger.debug('PIN login data saved for email', { email: normalized.substring(0, 5) + '...' }, 'AuthPersistenceService');
    } catch (error) {
      logger.error('Failed to save PIN login data', { error }, 'AuthPersistenceService');
    }
  }

  /**
   * Get userId for PIN-only sign-in when we have stored email.
   */
  static async getPinLoginData(email: string): Promise<{ userId: string } | null> {
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return null;
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        normalized
      );
      const storageKey = `${PIN_LOGIN_EMAIL_PREFIX}${keyHash.substring(0, 32)}`;
      const raw = await SecureStore.getItemAsync(storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as { userId?: string };
      return data.userId ? { userId: data.userId } : null;
    } catch (error) {
      logger.error('Failed to get PIN login data', { error }, 'AuthPersistenceService');
      return null;
    }
  }

  /**
   * Verify PIN when we only have email (returning user). Returns userId if valid.
   */
  static async verifyPinByEmail(email: string, pin: string): Promise<string | null> {
    const data = await this.getPinLoginData(email);
    if (!data?.userId) return null;
    const valid = await this.verifyPin(data.userId, pin);
    return valid ? data.userId : null;
  }

  /**
   * Clear email -> userId PIN login data (e.g. on logout).
   */
  static async clearPinLoginData(email: string): Promise<void> {
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return;
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        normalized
      );
      const storageKey = `${PIN_LOGIN_EMAIL_PREFIX}${keyHash.substring(0, 32)}`;
      await SecureStore.deleteItemAsync(storageKey);
      logger.info('PIN login data cleared for email', { email: normalized.substring(0, 5) + '...' }, 'AuthPersistenceService');
    } catch (error) {
      logger.error('Failed to clear PIN login data', { error }, 'AuthPersistenceService');
    }
  }

  /**
   * Check if a PIN has been set for the given user.
   * Reads from Keychain first (same as wallet), then SecureStore (fallback + migration from old installs).
   */
  static async hasPin(userId: string): Promise<boolean> {
    try {
      if (!userId) return false;
      const kc = await getKeychain();
      if (kc?.getGenericPassword) {
        const service = `${PIN_KEYCHAIN_SERVICE_PREFIX}${userId}`;
        const creds = await kc.getGenericPassword({ service });
        if (creds?.password) return true;
      }
      const storageKey = `${PIN_STORAGE_KEY_PREFIX}${userId}`;
      const storedHash = await SecureStore.getItemAsync(storageKey);
      if (storedHash) {
        await this.migratePinToKeychain(userId, storedHash);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to check if app PIN exists', { error, userId }, 'AuthPersistenceService');
      return false;
    }
  }

  /** Migrate PIN hash from SecureStore to Keychain so it persists like the wallet. */
  private static async migratePinToKeychain(userId: string, hash: string): Promise<void> {
    try {
      const kc = await getKeychain();
      if (!kc?.setGenericPassword) return;
      const service = `${PIN_KEYCHAIN_SERVICE_PREFIX}${userId}`;
      const opts: any = {
        service,
        accessible: kc.ACCESSIBLE?.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY ?? kc.ACCESSIBLE?.AFTER_FIRST_UNLOCK,
      };
      await kc.setGenericPassword('pin', hash, opts);
      await SecureStore.deleteItemAsync(`${PIN_STORAGE_KEY_PREFIX}${userId}`);
      logger.info('PIN migrated from SecureStore to Keychain', { userId }, 'AuthPersistenceService');
    } catch (e) {
      logger.warn('PIN migration to Keychain failed (non-fatal)', { userId }, 'AuthPersistenceService');
    }
  }

  /**
   * Verify a candidate PIN for the given user.
   * Returns true only if a stored hash exists and matches.
   * Reads from Keychain first (same as wallet), then SecureStore (fallback + migration).
   */
  static async verifyPin(userId: string, pin: string): Promise<boolean> {
    try {
      if (!userId || !pin) return false;
      const trimmedPin = pin.trim();
      if (!/^\d{6}$/.test(trimmedPin)) return false;

      let storedHash: string | null = null;
      const kc = await getKeychain();
      if (kc?.getGenericPassword) {
        const service = `${PIN_KEYCHAIN_SERVICE_PREFIX}${userId}`;
        const creds = await kc.getGenericPassword({ service });
        storedHash = creds?.password ?? null;
      }
      if (!storedHash) {
        storedHash = await SecureStore.getItemAsync(`${PIN_STORAGE_KEY_PREFIX}${userId}`);
        if (storedHash) await this.migratePinToKeychain(userId, storedHash);
      }
      if (!storedHash) return false;

      const hashInput = `${userId}:${trimmedPin}`;
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashInput
      );
      const matches = storedHash === computedHash;
      if (matches) {
        logger.info('App PIN verification succeeded', { userId }, 'AuthPersistenceService');
      } else {
        logger.warn('App PIN verification failed', { userId }, 'AuthPersistenceService');
      }
      return matches;
    } catch (error) {
      logger.error('Error verifying app PIN', { error, userId }, 'AuthPersistenceService');
      return false;
    }
  }

  /**
   * Clear stored PIN for a user (e.g., on logout or PIN reset).
   * Clears both Keychain and SecureStore so the PIN is fully removed.
   */
  static async clearPin(userId: string): Promise<void> {
    try {
      if (!userId) return;
      const kc = await getKeychain();
      if (kc?.resetGenericPassword) {
        await kc.resetGenericPassword({ service: `${PIN_KEYCHAIN_SERVICE_PREFIX}${userId}` });
      }
      await SecureStore.deleteItemAsync(`${PIN_STORAGE_KEY_PREFIX}${userId}`);
      logger.info('Stored app PIN cleared (Keychain + SecureStore)', { userId }, 'AuthPersistenceService');
    } catch (error) {
      logger.error('Failed to clear stored app PIN', { error, userId }, 'AuthPersistenceService');
      throw error;
    }
  }
}
