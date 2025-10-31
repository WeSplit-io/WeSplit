import { logger } from '../analytics/loggingService';

let Keychain: any;
let MMKV: any;
let SecureStore: any;

// Lazy-load dependencies to avoid bundler issues in web/tests
async function loadDeps() {
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
const storage = (() => {
  try {
    // Defer creating until MMKV is loaded at runtime
    return null as any;
  } catch {
    return null as any;
  }
})();

async function getStorage() {
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
  await loadDeps();
  if (!Keychain) return null;
  try {
    const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (existing && existing.password) {
      return Uint8Array.from(Buffer.from(existing.password, 'base64'));
    }
    const key = getRandomBytes(32);
    await Keychain.setGenericPassword('mnemonic', Buffer.from(key).toString('base64'), {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE && Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL && (Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE || Keychain.ACCESS_CONTROL.DEVICE_PASSCODE_OR_BIOMETRY),
      securityLevel: Keychain.SECURITY_LEVEL && Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
    return key;
  } catch (e) {
    logger.warn('secureVault: failed to get/create AES key', e, 'SecureVault');
    return null;
  }
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
};

export type SecureVault = typeof secureVault;


