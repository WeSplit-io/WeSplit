import { logger } from '../analytics/loggingService';

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
      const mmkvModule = await import('react-native-mmkv');
      // react-native-mmkv v4 exports MMKV class - use createMMKV or default export
      MMKV = (mmkvModule as any).default || (mmkvModule as any).MMKV || mmkvModule.createMMKV;
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

async function getOrCreateAesKey(): Promise<Uint8Array | null> {
  // Skip Keychain in Expo Go
  if (isExpoGo()) {
    return null;
  }
  
  // ✅ Check cache first - prevents multiple Face ID prompts
  if (cachedAesKey && Date.now() < keyCacheExpiry) {
    logger.debug('secureVault: Using cached AES key', {}, 'SecureVault');
    return cachedAesKey; // No Face ID prompt!
  }
  
  await loadDeps();
  if (!Keychain) return null;
  try {
    // This will trigger Face ID/Touch ID OR device passcode if biometrics aren't available
    // Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE automatically falls back to passcode
    const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (existing && existing.password) {
      const key = Uint8Array.from(Buffer.from(existing.password, 'base64'));
      // ✅ Cache the key after successful authentication
      cachedAesKey = key;
      keyCacheExpiry = Date.now() + KEY_CACHE_DURATION;
      logger.debug('secureVault: AES key retrieved and cached', {}, 'SecureVault');
      return key;
    }
    // Create new key if it doesn't exist
    const key = getRandomBytes(32);
    // Note: BIOMETRY_ANY_OR_DEVICE_PASSCODE will:
    // 1. Try Face ID/Touch ID if available
    // 2. Fall back to device passcode if biometrics aren't available
    // 3. This ensures users without biometrics can still use the app
    await Keychain.setGenericPassword('mnemonic', Buffer.from(key).toString('base64'), {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE && Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL && (Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE || Keychain.ACCESS_CONTROL.DEVICE_PASSCODE_OR_BIOMETRY),
      securityLevel: Keychain.SECURITY_LEVEL && Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
    // ✅ Cache the newly created key
    cachedAesKey = key;
    keyCacheExpiry = Date.now() + KEY_CACHE_DURATION;
    logger.debug('secureVault: New AES key created and cached', {}, 'SecureVault');
    return key;
  } catch (e) {
    // If Keychain access fails (e.g., user cancelled, no passcode), log and return null
    // The fallback to SecureStore will handle this case
    logger.warn('secureVault: failed to get/create AES key from Keychain', e, 'SecureVault');
    logger.debug('secureVault: Will fall back to SecureStore for vault access', {}, 'SecureVault');
    return null;
  }
}

/**
 * Clear the cached AES key (useful for logout or security)
 */
export function clearAesKeyCache(): void {
  cachedAesKey = null;
  keyCacheExpiry = 0;
  logger.debug('secureVault: AES key cache cleared', {}, 'SecureVault');
}

async function encryptAesGcm(key: Uint8Array, plaintextUtf8: string): Promise<{ iv: string; ct: string } | null> {
  try {
    const iv = getRandomBytes(12);
    // Prefer SubtleCrypto if available
    if (globalThis.crypto?.subtle) {
      const subtle = globalThis.crypto.subtle;
      // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
      const keyBuffer = new Uint8Array(key);
      const cryptoKey = await subtle.importKey('raw', keyBuffer as BufferSource, 'AES-GCM', false, ['encrypt']);
      const enc = new TextEncoder().encode(plaintextUtf8);
      // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
      const ivBuffer = new Uint8Array(iv);
      const encBuffer = new Uint8Array(enc);
      const ctBuf = await subtle.encrypt({ name: 'AES-GCM', iv: ivBuffer as BufferSource }, cryptoKey, encBuffer as BufferSource);
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
      // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
      const keyBuffer = new Uint8Array(key);
      const cryptoKey = await subtle.importKey('raw', keyBuffer as BufferSource, 'AES-GCM', false, ['decrypt']);
      // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
      const ivBuffer = new Uint8Array(iv);
      // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
      const ctBuffer = new Uint8Array(ctBuf);
      const pt = await subtle.decrypt({ name: 'AES-GCM', iv: ivBuffer as BufferSource }, cryptoKey, ctBuffer as BufferSource);
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
      const key = await getOrCreateAesKey();
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
      const key = await getOrCreateAesKey();
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
   */
  async preAuthenticate(): Promise<boolean> {
    try {
      const key = await getOrCreateAesKey();
      if (key !== null) {
        return true;
      }
      // If Keychain fails (e.g., simulator, user cancelled), that's okay
      // SecureStore fallback will still work for vault access
      logger.debug('secureVault: Keychain authentication not available, will use SecureStore fallback', {}, 'SecureVault');
      return false;
    } catch (e) {
      logger.warn('secureVault: pre-authentication failed (will use SecureStore fallback)', e, 'SecureVault');
      return false;
    }
  },
};

export type SecureVault = typeof secureVault;


