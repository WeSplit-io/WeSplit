import { logger } from '../analytics/loggingService';
import { Platform } from 'react-native';

let Keychain: any;
let MMKV: any;
let SecureStore: any;

// Check if we're in Expo Go (native modules not available)
function isExpoGo(): boolean {
  try {
    // Method 1: Check Constants.appOwnership
    const { Constants } = require('expo-constants');
    if (Constants?.appOwnership === 'expo') {
      return true;
    }
    
    // Method 2: Check for ExpoGo module
    // @ts-ignore
    if (typeof expo !== 'undefined' && expo.modules?.ExpoGo !== undefined) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Lazy-load dependencies to avoid bundler issues in web/tests
async function loadDeps() {
  // Skip native modules in Expo Go - they're not supported
  if (isExpoGo()) {
    logger.debug('secureVault: Expo Go detected, skipping native modules', {}, 'SecureVault');
    // Only load SecureStore which works in Expo Go
    if (!SecureStore) {
      try {
        SecureStore = await import('expo-secure-store');
      } catch (e) {
        // optional
      }
    }
    return;
  }

  // Load native modules for development/production builds
  if (!Keychain) {
    try {
      Keychain = await import('react-native-keychain');
    } catch (e) {
      logger.warn('secureVault: Keychain not available', e, 'SecureVault');
    }
  }
  if (!MMKV) {
    try {
      MMKV = (await import('react-native-mmkv')).MMKV;
    } catch (e) {
      logger.warn('secureVault: MMKV not available', e, 'SecureVault');
    }
  }
  if (!SecureStore) {
    try {
      SecureStore = await import('expo-secure-store');
    } catch (e) {
      // optional
    }
  }
}

const KEYCHAIN_SERVICE = 'wesplit-aes-key';
const KEY_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cache AES key in memory after first Face ID authentication
let cachedAesKey: Uint8Array | null = null;
let keyCacheExpiry: number = 0;

// Global authentication state to prevent multiple prompts
let isAuthenticated: boolean = false;
let authenticationPromise: Promise<boolean> | null = null;

// Promise lock for getOrCreateAesKey to prevent concurrent Keychain access
// This is critical on Android where multiple screens might call secureVault.get/store simultaneously
let keyRetrievalPromise: Promise<Uint8Array | null> | null = null;

const storage = (() => {
  try {
    // Defer creating until MMKV is loaded at runtime
    return null as any;
  } catch {
    return null as any;
  }
})();

async function getStorage() {
  // Skip MMKV in Expo Go
  if (isExpoGo()) {
    return null;
  }
  
  await loadDeps();
  try {
    if (MMKV) {
      // Create or reuse
      // eslint-disable-next-line new-cap
      return new MMKV({ id: 'wesplit_vault' });
    }
  } catch (e) {
    logger.warn('secureVault: failed to init MMKV', e, 'SecureVault');
  }
  return null;
}

function getRandomBytes(length: number): Uint8Array {
  // Use crypto.getRandomValues if available, fallback to Node crypto if present
  try {
    const { getRandomValues } = globalThis.crypto || {} as any;
    if (getRandomValues) {
      const arr = new Uint8Array(length);
      getRandomValues(arr);
      return arr;
    }
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    return new Uint8Array(nodeCrypto.randomBytes(length));
  } catch {}
  // Worst-case fallback: pseudo-random (not ideal, but avoids crashes)
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

async function getOrCreateAesKey(forceReauth: boolean = false): Promise<Uint8Array | null> {
  // Skip Keychain in Expo Go
  if (isExpoGo()) {
    return null;
  }
  
  // ✅ CRITICAL: Check cache FIRST before any Keychain access
  // On Android, Keychain.getGenericPassword() will ALWAYS prompt for biometrics
  // even if we have a cached key, so we must return cached key immediately
  if (!forceReauth && cachedAesKey && Date.now() < keyCacheExpiry) {
    logger.debug('secureVault: Using cached AES key (skipping Keychain access)', { 
      platform: Platform.OS,
      cacheAge: Date.now() - (keyCacheExpiry - KEY_CACHE_DURATION),
      expiresIn: keyCacheExpiry - Date.now()
    }, 'SecureVault');
    return cachedAesKey; // No Face ID prompt! This is critical on Android
  }
  
  // ✅ CRITICAL: Prevent concurrent Keychain access on Android
  // If multiple screens call secureVault.get/store simultaneously when cache is expired,
  // they would all trigger biometric prompts. This lock ensures only one Keychain access happens.
  if (!forceReauth && keyRetrievalPromise) {
    logger.debug('secureVault: Key retrieval already in progress, waiting...', { 
      platform: Platform.OS 
    }, 'SecureVault');
    return await keyRetrievalPromise;
  }
  
  // If we reach here, cache is invalid/expired or forceReauth is true
  // Now we need to access Keychain, which will trigger biometrics
  // Create a promise lock to prevent concurrent access
  
  keyRetrievalPromise = (async (): Promise<Uint8Array | null> => {
    try {
      await loadDeps();
      if (!Keychain) {
        logger.debug('secureVault: Keychain not available, will use SecureStore fallback', {}, 'SecureVault');
        return null;
      }
      
      // This will trigger Face ID/Touch ID OR device passcode if biometrics aren't available
      // Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE automatically falls back to passcode
      // On Android, this will use fingerprint or device passcode
      // ⚠️ WARNING: On Android, this ALWAYS prompts for biometrics, even if key exists
      logger.debug('secureVault: Accessing Keychain (will trigger biometrics)', { 
        platform: Platform.OS,
        forceReauth,
        hasCache: !!cachedAesKey
      }, 'SecureVault');
      
      const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      if (existing && existing.password) {
        const key = Uint8Array.from(Buffer.from(existing.password, 'base64'));
        // ✅ Cache the key after successful authentication
        cachedAesKey = key;
        keyCacheExpiry = Date.now() + KEY_CACHE_DURATION;
        isAuthenticated = true;
        logger.info('secureVault: AES key retrieved and cached successfully', { 
          platform: Platform.OS,
          cacheDuration: KEY_CACHE_DURATION / 1000 / 60 // minutes
        }, 'SecureVault');
        return key;
      }
      // Create new key if it doesn't exist
      const key = getRandomBytes(32);
      // Note: BIOMETRY_ANY_OR_DEVICE_PASSCODE will:
      // 1. Try Face ID/Touch ID if available (iOS)
      // 2. Try fingerprint if available (Android)
      // 3. Fall back to device passcode if biometrics aren't available
      // 4. This ensures users without biometrics can still use the app
      await Keychain.setGenericPassword('mnemonic', Buffer.from(key).toString('base64'), {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE && Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL && (Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE || Keychain.ACCESS_CONTROL.DEVICE_PASSCODE_OR_BIOMETRY),
        securityLevel: Keychain.SECURITY_LEVEL && Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      });
      // ✅ Cache the newly created key
      cachedAesKey = key;
      keyCacheExpiry = Date.now() + KEY_CACHE_DURATION;
      isAuthenticated = true;
      logger.info('secureVault: New AES key created and cached successfully', { 
        platform: Platform.OS,
        cacheDuration: KEY_CACHE_DURATION / 1000 / 60 // minutes
      }, 'SecureVault');
      return key;
    } catch (e: any) {
      // If Keychain access fails (e.g., user cancelled, no passcode), log and return null
      // The fallback to SecureStore will handle this case
      const errorMessage = e?.message || String(e);
      const isUserCancelled = errorMessage.includes('cancel') || errorMessage.includes('Cancel') || errorMessage.includes('UserCancel');
      
      if (isUserCancelled) {
        logger.debug('secureVault: User cancelled Keychain authentication', { platform: Platform.OS }, 'SecureVault');
        // On Android, if user cancels, we should NOT clear the cache
        // so they can try again without being prompted immediately
        // Only clear cache if forceReauth was true
        if (forceReauth) {
          cachedAesKey = null;
          keyCacheExpiry = 0;
          isAuthenticated = false;
        }
      } else {
        logger.warn('secureVault: failed to get/create AES key from Keychain', { platform: Platform.OS, error: e }, 'SecureVault');
      }
      logger.debug('secureVault: Will fall back to SecureStore for vault access', {}, 'SecureVault');
      // Don't clear cache on error - might be temporary issue
      if (!isUserCancelled) {
        isAuthenticated = false;
      }
      return null;
    } finally {
      // Clear the promise lock after completion
      keyRetrievalPromise = null;
    }
  })();
  
  return await keyRetrievalPromise;
}

/**
 * Clear the cached AES key (useful for logout or security)
 */
export function clearAesKeyCache(): void {
  cachedAesKey = null;
  keyCacheExpiry = 0;
  isAuthenticated = false;
  authenticationPromise = null;
  keyRetrievalPromise = null; // Clear key retrieval promise lock
  logger.debug('secureVault: AES key cache cleared', {}, 'SecureVault');
}

/**
 * Check if user is currently authenticated (cache is valid)
 */
export function isVaultAuthenticated(): boolean {
  return isAuthenticated && cachedAesKey !== null && Date.now() < keyCacheExpiry;
}

async function encryptAesGcm(key: Uint8Array, plaintextUtf8: string): Promise<{ iv: string; ct: string } | null> {
  try {
    const iv = getRandomBytes(12);
    // Prefer SubtleCrypto if available
    if (globalThis.crypto?.subtle) {
      const subtle = globalThis.crypto.subtle;
      const cryptoKey = await subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
      const enc = new TextEncoder().encode(plaintextUtf8);
      const ctBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc);
      return { iv: Buffer.from(iv).toString('base64'), ct: Buffer.from(new Uint8Array(ctBuf)).toString('base64') };
    }
    // Fallback using Node crypto (Hermes may not have it; guarded above)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
    const ct = Buffer.concat([cipher.update(plaintextUtf8, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { iv: Buffer.from(iv).toString('base64'), ct: Buffer.concat([ct, tag]).toString('base64') };
  } catch (e) {
    logger.error('secureVault: encrypt failed', e, 'SecureVault');
    return null;
  }
}

async function decryptAesGcm(key: Uint8Array, ivB64: string, ctB64: string): Promise<string | null> {
  try {
    const iv = Uint8Array.from(Buffer.from(ivB64, 'base64'));
    const ctBuf = Uint8Array.from(Buffer.from(ctB64, 'base64'));
    if (globalThis.crypto?.subtle) {
      const subtle = globalThis.crypto.subtle;
      const cryptoKey = await subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
      const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ctBuf);
      return new TextDecoder().decode(pt);
    }
    // Node fallback with tag concatenated at end (last 16 bytes)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    const tagLen = 16;
    const data = Buffer.from(ctBuf);
    const body = data.slice(0, data.length - tagLen);
    const tag = data.slice(data.length - tagLen);
    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(body), decipher.final()]);
    return pt.toString('utf8');
  } catch (e) {
    logger.error('secureVault: decrypt failed', e, 'SecureVault');
    return null;
  }
}

export const secureVault = {
  // Store cleartext using Keychain+MMKV, fallback to SecureStore cleartext
  async store(userId: string, name: 'mnemonic' | 'privateKey', value: string): Promise<boolean> {
    try {
      // ✅ Check cache first to avoid unnecessary Keychain access on Android
      // Only call getOrCreateAesKey if we don't have a valid cached key
      let key: Uint8Array | null = null;
      if (cachedAesKey && Date.now() < keyCacheExpiry) {
        key = cachedAesKey;
        logger.debug('secureVault: Using cached key for store operation', { platform: Platform.OS }, 'SecureVault');
      } else {
        key = await getOrCreateAesKey();
      }
      
      const kv = await getStorage();
      if (key && kv) {
        const enc = await encryptAesGcm(key, value);
        if (!enc) throw new Error('encryption failed');
        kv.set(`${name}_ct_${userId}`, enc.ct);
        kv.set(`${name}_iv_${userId}`, enc.iv);
        return true;
      }
      // Fallback to SecureStore cleartext (existing behavior)
      await loadDeps();
      if (SecureStore?.setItemAsync) {
        const k = `${name}_${userId}`;
        await SecureStore.setItemAsync(k, value, {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData',
        });
        return true;
      }
      return false;
    } catch (e) {
      logger.error('secureVault: store failed', e, 'SecureVault');
      return false;
    }
  },

  async get(userId: string, name: 'mnemonic' | 'privateKey'): Promise<string | null> {
    try {
      // ✅ Check cache first to avoid unnecessary Keychain access on Android
      // Only call getOrCreateAesKey if we don't have a valid cached key
      let key: Uint8Array | null = null;
      if (cachedAesKey && Date.now() < keyCacheExpiry) {
        key = cachedAesKey;
        logger.debug('secureVault: Using cached key for get operation', { platform: Platform.OS }, 'SecureVault');
      } else {
        key = await getOrCreateAesKey();
      }
      
      const kv = await getStorage();
      if (key && kv) {
        const ct = kv.getString(`${name}_ct_${userId}`);
        const iv = kv.getString(`${name}_iv_${userId}`);
        if (ct && iv) {
          const pt = await decryptAesGcm(key, iv, ct);
          if (pt) return pt;
        }
      }
      // Fallback to SecureStore
      await loadDeps();
      if (SecureStore?.getItemAsync) {
        const k = `${name}_${userId}`;
        const v = await SecureStore.getItemAsync(k, {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData',
        });
        if (v) return v;
      }
      return null;
    } catch (e) {
      logger.error('secureVault: get failed', e, 'SecureVault');
      return null;
    }
  },

  async clear(userId: string, name: 'mnemonic' | 'privateKey'): Promise<void> {
    try {
      const kv = await getStorage();
      if (kv) {
        kv.delete(`${name}_ct_${userId}`);
        kv.delete(`${name}_iv_${userId}`);
      }
      await loadDeps();
      if (SecureStore?.deleteItemAsync) {
        await SecureStore.deleteItemAsync(`${name}_${userId}`);
      }
    } catch (e) {
      logger.warn('secureVault: clear failed', e, 'SecureVault');
    }
  },

  /**
   * Pre-authenticate and cache the AES key (call this before dashboard)
   * This ensures Face ID is prompted once before any vault access
   * 
   * Note: In simulators or when Keychain fails, this will return false
   * but the app can still work using SecureStore fallback
   * 
   * This function is idempotent - if already authenticated, it returns immediately
   */
  async preAuthenticate(forceReauth: boolean = false): Promise<boolean> {
    try {
      // If already authenticated and cache is valid, return immediately
      if (!forceReauth && isVaultAuthenticated()) {
        logger.debug('secureVault: Already authenticated, skipping re-authentication', {}, 'SecureVault');
        return true;
      }

      // If there's already an authentication in progress, wait for it
      if (!forceReauth && authenticationPromise) {
        logger.debug('secureVault: Authentication already in progress, waiting...', {}, 'SecureVault');
        return await authenticationPromise;
      }

      // Start new authentication
      authenticationPromise = (async () => {
        try {
          const key = await getOrCreateAesKey(forceReauth);
          if (key !== null) {
            isAuthenticated = true;
            return true;
          }
          // If Keychain fails (e.g., simulator, user cancelled), that's okay
          // SecureStore fallback will still work for vault access
          isAuthenticated = false;
          logger.debug('secureVault: Keychain authentication not available, will use SecureStore fallback', {}, 'SecureVault');
          return false;
        } catch (e) {
          isAuthenticated = false;
          logger.warn('secureVault: pre-authentication failed (will use SecureStore fallback)', e, 'SecureVault');
          return false;
        } finally {
          // Clear the promise after completion
          authenticationPromise = null;
        }
      })();

      return await authenticationPromise;
    } catch (e) {
      authenticationPromise = null;
      isAuthenticated = false;
      logger.warn('secureVault: pre-authentication error (will use SecureStore fallback)', e, 'SecureVault');
      return false;
    }
  },
};

export type SecureVault = typeof secureVault;


