/**
 * Vault Authentication Helper
 * Ensures Face ID authentication before vault access
 * Used by screens that access vault data directly
 * 
 * Note: In simulators or when Keychain fails, this returns false
 * but vault access will still work using SecureStore fallback
 */

import { secureVault } from './secureVault';
import { logger } from '../analytics/loggingService';

/**
 * Ensure vault is authenticated before accessing vault data
 * This will trigger Face ID/Touch ID OR device passcode if cache is empty/expired
 * 
 * Returns true if Keychain authentication succeeded, false otherwise.
 * Note: Returning false doesn't mean vault access will fail - SecureStore fallback will work.
 * 
 * In simulators: Returns false (Keychain doesn't work), but SecureStore fallback works fine.
 */
export async function ensureVaultAuthenticated(): Promise<boolean> {
  try {
    // Pre-authenticate to ensure AES key is cached (if Keychain is available)
    const authenticated = await secureVault.preAuthenticate();
    
    if (authenticated) {
      logger.debug('Vault authentication successful (Keychain)', {}, 'VaultAuthHelper');
      return true;
    } else {
      // This is okay - SecureStore fallback will work
      // Common in simulators or when user cancels authentication
      logger.debug('Vault authentication not available (will use SecureStore fallback)', {}, 'VaultAuthHelper');
      return false;
    }
  } catch (error) {
    // Even if authentication fails, SecureStore fallback will work
    logger.debug('Vault authentication error (will use SecureStore fallback)', error, 'VaultAuthHelper');
    return false;
  }
}

