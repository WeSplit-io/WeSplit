/**
 * Vault Authentication Helper
 * Ensures Face ID authentication before vault access
 * Used by screens that access vault data directly
 * 
 * Note: In simulators or when Keychain fails, this returns false
 * but vault access will still work using SecureStore fallback
 */

import { secureVault, isVaultAuthenticated } from './secureVault';
import { logger } from '../analytics/loggingService';

/**
 * Ensure vault is authenticated before accessing vault data
 * This will trigger Face ID/Touch ID OR device passcode if cache is empty/expired
 * 
 * Returns true if Keychain authentication succeeded, false otherwise.
 * Note: Returning false doesn't mean vault access will fail - SecureStore fallback will work.
 * 
 * In simulators: Returns false (Keychain doesn't work), but SecureStore fallback works fine.
 * 
 * This function is idempotent - if already authenticated, it returns immediately without prompting.
 * 
 * IMPORTANT: On Android, Keychain.getGenericPassword() ALWAYS prompts for biometrics,
 * so we MUST check the cache first to avoid multiple prompts during navigation.
 * The cache is shared across the entire app, so once authenticated, all screens
 * can use the cached key without triggering biometrics again.
 */
export async function ensureVaultAuthenticated(forceReauth: boolean = false): Promise<boolean> {
  try {
    // ✅ CRITICAL: Check cache FIRST before any Keychain access
    // On Android, this prevents multiple Face ID prompts during navigation
    if (!forceReauth && isVaultAuthenticated()) {
      logger.debug('Vault already authenticated (using cached key), skipping re-authentication', {}, 'VaultAuthHelper');
      return true;
    }

    // Pre-authenticate to ensure AES key is cached (if Keychain is available)
    // This will only trigger biometrics if cache is empty/expired
    const authenticated = await secureVault.preAuthenticate(forceReauth);
    
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

