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

// ✅ CRITICAL: Declare these variables BEFORE the early Expo Go detection code below
// This ensures the variables exist when we try to set them at module load time
const KEYCHAIN_SERVICE = 'wesplit-aes-key';
const KEY_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const KEY_CACHE_REFRESH_BUFFER = 1 * 60 * 1000; // 1 minute before expiry - proactive refresh buffer

// Cache AES key in memory after first Face ID authentication
let cachedAesKey: Uint8Array | null = null;
let keyCacheExpiry: number = 0;

// Global authentication state to prevent multiple prompts
let isAuthenticated: boolean = false;
let authenticationPromise: Promise<boolean> | null = null;
// ✅ FIX: Track if Keychain is unavailable to prevent repeated authentication attempts
let keychainUnavailable: boolean = false;

// ✅ FIX: Detect Expo Go at module load time and set flag immediately
// This prevents any authentication attempts when Keychain is unavailable
const isExpoGoEnvironment = isExpoGo();
if (isExpoGoEnvironment) {
  keychainUnavailable = true;
  isAuthenticated = true;
  keyCacheExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  logger.info('⚠️ [FACE_ID] Expo Go detected at module load - Keychain not available, using SecureStore fallback', {
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    note: 'Expo Go does not support Keychain. All authentication checks will be skipped. Using SecureStore which does not require Face ID.'
  }, 'SecureVault');
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

// Promise lock for getOrCreateAesKey to prevent concurrent Keychain access
// This is critical on Android where multiple screens might call secureVault.get/store simultaneously
let keyRetrievalPromise: Promise<Uint8Array | null> | null = null;

// ✅ CRITICAL: Request deduplication map to prevent multiple simultaneous authentication requests
// Key: operation type ('get' | 'store'), Value: Promise that resolves when operation completes
const pendingOperations = new Map<string, Promise<any>>();

// ✅ FIX: Result cache to prevent duplicate SecureStore reads for recently retrieved values
// Key: operation key (e.g., "get:userId:privateKey"), Value: { result, timestamp }
// Cache duration: 5 seconds (enough to deduplicate sequential calls during wallet recovery)
const resultCache = new Map<string, { result: any; timestamp: number }>();
const RESULT_CACHE_DURATION = 5000; // 5 seconds

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
  // ✅ FIX: If Keychain is already marked as unavailable, return immediately
  // This prevents repeated logging and checks when Keychain is unavailable
  if (keychainUnavailable) {
    logger.debug('secureVault: Keychain already marked as unavailable, skipping', {
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    }, 'SecureVault');
    return null;
  }
  
  // Skip Keychain in Expo Go
  if (isExpoGo()) {
    keychainUnavailable = true; // Mark Keychain as unavailable
    isAuthenticated = true; // Mark as authenticated to prevent repeated attempts
    keyCacheExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    logger.info('⚠️ [FACE_ID] Expo Go detected - Keychain not available, using SecureStore fallback', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      note: 'Expo Go does not support Keychain. Using SecureStore which does not require Face ID. Marked as authenticated to prevent repeated attempts.'
    }, 'SecureVault');
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
        // ✅ FIX: Only log once when Keychain becomes unavailable
        if (!keychainUnavailable) {
          keychainUnavailable = true; // Mark Keychain as unavailable
          logger.info('⚠️ [FACE_ID] Keychain not available (Expo Go or unsupported platform) - using SecureStore fallback', {
            platform: Platform.OS,
            isExpoGo: isExpoGo(),
            timestamp: new Date().toISOString(),
            note: 'Keychain unavailable. Will use SecureStore which does not require Face ID. Setting flag to prevent repeated attempts.'
          }, 'SecureVault');
        }
        logger.debug('secureVault: Keychain not available, will use SecureStore fallback', {}, 'SecureVault');
        // ✅ FIX: Mark as authenticated to prevent repeated authentication attempts
        // SecureStore doesn't require Face ID, so we can mark as "authenticated"
        isAuthenticated = true;
        // Set a long expiry so we don't keep checking
        keyCacheExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        return null;
      }
      
      // This will trigger Face ID/Touch ID OR device passcode if biometrics aren't available
      // Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE automatically falls back to passcode
      // On Android, this will use fingerprint or device passcode
      // ⚠️ WARNING: On Android, this ALWAYS prompts for biometrics, even if key exists
      logger.info('🔐 [FACE_ID] About to trigger Knox Face ID / Biometric authentication', { 
        platform: Platform.OS,
        forceReauth,
        hasCache: !!cachedAesKey,
        timestamp: new Date().toISOString(),
        note: 'This call will prompt user for Face ID/Touch ID/fingerprint or device passcode'
      }, 'SecureVault');
      
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
        logger.info('✅ [FACE_ID] Knox Face ID authentication SUCCESSFUL - User verified', { 
          platform: Platform.OS,
          cacheDuration: KEY_CACHE_DURATION / 1000 / 60, // minutes
          cacheExpiresAt: new Date(keyCacheExpiry).toISOString(),
          timestamp: new Date().toISOString(),
          note: 'User successfully authenticated with Face ID/Touch ID/fingerprint. Cache set for 30 minutes.'
        }, 'SecureVault');
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
      logger.info('🔐 [FACE_ID] Creating new AES key - will trigger Knox Face ID / Biometric authentication', { 
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        note: 'First time setup - user will be prompted to set up Face ID/Touch ID/fingerprint'
      }, 'SecureVault');
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
      logger.info('✅ [FACE_ID] New AES key created and Face ID setup SUCCESSFUL - User verified', { 
        platform: Platform.OS,
        cacheDuration: KEY_CACHE_DURATION / 1000 / 60, // minutes
        cacheExpiresAt: new Date(keyCacheExpiry).toISOString(),
        timestamp: new Date().toISOString(),
        note: 'User successfully set up Face ID/Touch ID/fingerprint. Cache set for 30 minutes.'
      }, 'SecureVault');
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
        logger.warn('❌ [FACE_ID] User CANCELLED Knox Face ID / Biometric authentication', { 
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          errorMessage: errorMessage,
          note: 'User declined Face ID prompt. Will use SecureStore fallback.'
        }, 'SecureVault');
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
        logger.warn('❌ [FACE_ID] Knox Face ID / Biometric authentication FAILED', { 
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          error: errorMessage,
          errorType: e?.name || 'Unknown',
          note: 'Face ID prompt failed or was rejected. Will use SecureStore fallback.'
        }, 'SecureVault');
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
  keychainUnavailable = false; // Reset Keychain availability flag
  logger.debug('secureVault: AES key cache cleared', {}, 'SecureVault');
}

/**
 * Check if user is currently authenticated (cache is valid)
 * Also returns false if authentication is in progress to prevent duplicate prompts
 * 
 * ✅ FIX: Proactive cache refresh - triggers background refresh if cache is about to expire
 */
export function isVaultAuthenticated(): boolean {
  // If authentication is in progress, consider it not authenticated yet
  // This prevents multiple screens from triggering authentication simultaneously
  if (authenticationPromise) {
    return false;
  }
  
  // ✅ FIX: If Keychain is not available (Expo Go), mark as authenticated
  // This prevents repeated authentication attempts when Keychain is unavailable
  // SecureStore doesn't require Face ID, so we can consider it "authenticated"
  if (keychainUnavailable && isAuthenticated) {
    logger.debug('✅ [FACE_ID] Keychain unavailable - using SecureStore (no Face ID needed)', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      note: 'Keychain is not available. Using SecureStore fallback which does not require Face ID.'
    }, 'SecureVault');
    return true; // Consider authenticated since SecureStore doesn't need Face ID
  }
  
  const timeUntilExpiry = keyCacheExpiry - Date.now();
  // ✅ FIX: Also check if Keychain is unavailable (even without cachedAesKey)
  // When Keychain is unavailable, we mark isAuthenticated=true but don't have cachedAesKey
  const isCacheValid = isAuthenticated && (
    (cachedAesKey !== null && Date.now() < keyCacheExpiry) || // Normal case: have cached key
    (keychainUnavailable && Date.now() < keyCacheExpiry) // Keychain unavailable: still authenticated
  );
  
  // ✅ FIX: Proactive cache refresh - if cache is valid but about to expire (within buffer),
  // trigger a background refresh to prevent expiry during active operations
  if (isCacheValid && timeUntilExpiry < KEY_CACHE_REFRESH_BUFFER && timeUntilExpiry > 0) {
    // Trigger background refresh (don't block - fire and forget)
    // This ensures cache is refreshed before it expires, preventing Face ID prompts
    logger.info('🔄 [FACE_ID] Proactive cache refresh triggered - extending cache to prevent Face ID prompt', {
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000), // seconds
      refreshBuffer: KEY_CACHE_REFRESH_BUFFER / 1000, // seconds
      timestamp: new Date().toISOString(),
      note: 'Cache is about to expire. Refreshing in background to prevent Face ID prompt during active operations.'
    }, 'SecureVault');
    ensureAuthentication().catch(() => {
      // Ignore errors - if refresh fails, cache will expire and next operation will trigger auth
      logger.debug('secureVault: Background cache refresh failed (non-critical)', {}, 'SecureVault');
    });
  }
  
  return isCacheValid;
}

async function encryptAesGcm(key: Uint8Array, plaintextUtf8: string): Promise<{ iv: string; ct: string } | null> {
  try {
    const iv = getRandomBytes(12);
    
    // Try Web Crypto API (available in React Native with polyfill or newer versions)
    const crypto = globalThis.crypto || (global as any).crypto;
    if (crypto?.subtle) {
      try {
        const subtle = crypto.subtle;
        // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
        const keyBuffer = new Uint8Array(key);
        const cryptoKey = await subtle.importKey('raw', keyBuffer as BufferSource, 'AES-GCM', false, ['encrypt']);
        const enc = new TextEncoder().encode(plaintextUtf8);
        // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
        const ivBuffer = new Uint8Array(iv);
        const encBuffer = new Uint8Array(enc);
        const ctBuf = await subtle.encrypt({ name: 'AES-GCM', iv: ivBuffer as BufferSource }, cryptoKey, encBuffer as BufferSource);
        return { iv: Buffer.from(iv).toString('base64'), ct: Buffer.from(new Uint8Array(ctBuf)).toString('base64') };
      } catch (subtleError) {
        logger.warn('secureVault: Web Crypto subtle failed, trying alternative', { error: subtleError }, 'SecureVault');
      }
    }
    
    // Fallback: Use SecureStore directly (no encryption needed, SecureStore encrypts)
    // This is acceptable since SecureStore uses Keychain which is already encrypted
    logger.warn('secureVault: Web Crypto not available, encryption will be handled by SecureStore', {}, 'SecureVault');
    // Return null to trigger SecureStore fallback
    return null;
  } catch (e) {
    logger.error('secureVault: encrypt failed', e, 'SecureVault');
    return null;
  }
}

async function decryptAesGcm(key: Uint8Array, ivB64: string, ctB64: string): Promise<string | null> {
  try {
    const iv = Uint8Array.from(Buffer.from(ivB64, 'base64'));
    const ctBuf = Uint8Array.from(Buffer.from(ctB64, 'base64'));
    
    // Try Web Crypto API
    const crypto = globalThis.crypto || (global as any).crypto;
    if (crypto?.subtle) {
      try {
        const subtle = crypto.subtle;
        // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
        const keyBuffer = new Uint8Array(key);
        const cryptoKey = await subtle.importKey('raw', keyBuffer as BufferSource, 'AES-GCM', false, ['decrypt']);
        // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
        const ivBuffer = new Uint8Array(iv);
        // Create new Uint8Array to ensure proper ArrayBuffer backing for TypeScript
        const ctBuffer = new Uint8Array(ctBuf);
        const pt = await subtle.decrypt({ name: 'AES-GCM', iv: ivBuffer as BufferSource }, cryptoKey, ctBuffer as BufferSource);
        return new TextDecoder().decode(pt);
      } catch (subtleError) {
        logger.warn('secureVault: Web Crypto subtle decrypt failed', { error: subtleError }, 'SecureVault');
      }
    }
    
    // If Web Crypto fails, return null (data might be in SecureStore)
    logger.warn('secureVault: Web Crypto not available for decryption', {}, 'SecureVault');
    return null;
  } catch (e) {
    logger.error('secureVault: decrypt failed', e, 'SecureVault');
    return null;
  }
}

// Helper function to ensure authentication - used by both get/store and preAuthenticate
async function ensureAuthentication(forceReauth: boolean = false): Promise<boolean> {
  // ✅ FIX: If Keychain is unavailable (Expo Go), skip ALL authentication logic immediately
  // This MUST be the first check - before any logging or async operations
  if (keychainUnavailable) {
    // Log at debug level to verify the check is working
    logger.debug('secureVault: Keychain unavailable, skipping ensureAuthentication entirely', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      keychainUnavailable,
      isAuthenticated
    }, 'SecureVault');
    // Return immediately without any async operations
    return false; // Return false but isAuthenticated is already true, so operations will use SecureStore
  }
  
  // ✅ CRITICAL: Check if authentication is already in progress FIRST
  // This prevents multiple screens from triggering authentication simultaneously
  if (!forceReauth && authenticationPromise) {
    logger.info('⏳ [FACE_ID] Authentication already in progress - waiting for existing request', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      note: 'Another authentication is in progress. Waiting to avoid duplicate Face ID prompts.'
    }, 'SecureVault');
    logger.debug('secureVault: Authentication already in progress, waiting...', {}, 'SecureVault');
    try {
      return await authenticationPromise;
    } catch (e) {
      // If the in-progress authentication failed, we'll start a new one below
      logger.debug('secureVault: In-progress authentication failed, starting new one', {}, 'SecureVault');
    }
  }

  // If already authenticated and cache is valid, return immediately
  // Check this AFTER checking for in-progress auth to avoid race conditions
  // ✅ FIX: Also check for keychainUnavailable (when Keychain is not available, we don't have cachedAesKey)
  if (!forceReauth && isAuthenticated && (
    (cachedAesKey !== null && Date.now() < keyCacheExpiry) || // Normal case: have cached key
    (keychainUnavailable && Date.now() < keyCacheExpiry) // Keychain unavailable: still authenticated
  )) {
    const cacheExpiresIn = keyCacheExpiry - Date.now();
    const authType = keychainUnavailable ? 'SecureStore (no Face ID needed)' : 'Face ID cached';
    logger.info('✅ [FACE_ID] Already authenticated - skipping Face ID prompt', {
      platform: Platform.OS,
      cacheExpiresIn: Math.round(cacheExpiresIn / 1000), // seconds
      cacheExpiresAt: new Date(keyCacheExpiry).toISOString(),
      timestamp: new Date().toISOString(),
      authType,
      keychainUnavailable,
      note: keychainUnavailable 
        ? 'Keychain unavailable. Using SecureStore fallback (no Face ID needed).'
        : `Cache still valid for ${Math.round(cacheExpiresIn / 1000 / 60)} minutes. No Face ID prompt needed.`
    }, 'SecureVault');
    logger.debug('secureVault: Already authenticated, skipping re-authentication', {
      cacheExpiresIn: keyCacheExpiry - Date.now()
    }, 'SecureVault');
    return true;
  }

  // Start new authentication
  logger.info('🔐 [FACE_ID] Starting authentication flow - may trigger Face ID prompt', {
    platform: Platform.OS,
    forceReauth,
    hasCache: !!cachedAesKey,
    cacheExpired: cachedAesKey ? Date.now() >= keyCacheExpiry : true,
    timestamp: new Date().toISOString(),
    note: 'This will check cache first, then trigger Face ID if needed'
  }, 'SecureVault');
  
  authenticationPromise = (async () => {
    try {
      const key = await getOrCreateAesKey(forceReauth);
      if (key !== null) {
        // ✅ FIX: Atomic cache set - set cache BEFORE resolving promise
        // This ensures cache is available immediately after authentication completes
        // preventing race conditions where multiple operations check cache before it's set
        cachedAesKey = key;
        keyCacheExpiry = Date.now() + KEY_CACHE_DURATION;
        isAuthenticated = true;
        
        // ✅ FIX: Small delay to ensure cache is fully set before promise resolves
        // This prevents race conditions where operations check cache immediately after auth
        await new Promise(resolve => setTimeout(resolve, 10));
        
        logger.info('✅ [FACE_ID] Authentication flow completed successfully', {
          platform: Platform.OS,
          cacheExpiresIn: KEY_CACHE_DURATION / 1000 / 60, // minutes
          cacheExpiresAt: new Date(keyCacheExpiry).toISOString(),
          timestamp: new Date().toISOString(),
          note: 'User authenticated. Cache valid for 30 minutes. No more Face ID prompts until cache expires.'
        }, 'SecureVault');
        logger.info('secureVault: Authentication successful, cache set atomically', {
          cacheExpiresIn: KEY_CACHE_DURATION / 1000 / 60 // minutes
        }, 'SecureVault');
        return true;
      }
      // If Keychain fails (e.g., simulator, user cancelled), that's okay
      // SecureStore fallback will still work for vault access
      // ✅ FIX: Mark as authenticated even if Keychain is not available
      // This prevents repeated authentication attempts when Keychain is unavailable
      // SecureStore doesn't require Face ID, so we can mark as "authenticated" to prevent loops
      keychainUnavailable = true; // Mark Keychain as unavailable
      isAuthenticated = true; // Mark as authenticated to prevent repeated attempts
      keyCacheExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours - long expiry since no Keychain
      logger.info('⚠️ [FACE_ID] Authentication flow completed - Keychain not available, using SecureStore fallback', {
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        note: 'This is normal in Expo Go or if user cancelled. App will work with SecureStore fallback. Marked as authenticated to prevent repeated attempts.'
      }, 'SecureVault');
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
}

export const secureVault = {
  // Store cleartext using Keychain+MMKV, fallback to SecureStore cleartext
  async store(userId: string, name: 'mnemonic' | 'privateKey', value: string): Promise<boolean> {
    // ✅ CRITICAL: Deduplicate simultaneous store operations for the same key
    // This prevents multiple Face ID prompts when multiple screens try to store simultaneously
    const operationKey = `store:${userId}:${name}`;
    if (pendingOperations.has(operationKey)) {
      logger.debug('secureVault: Store operation already in progress, waiting...', { userId, name, platform: Platform.OS }, 'SecureVault');
      await pendingOperations.get(operationKey);
      // After waiting, check if the operation succeeded by trying to read
      // If it failed, we'll retry below
    }

    const storePromise = (async () => {
      try {
        // ✅ CRITICAL: Ensure authentication is complete before accessing vault
      // This prevents multiple Face ID prompts when multiple operations happen simultaneously
        // If cache is expired, trigger authentication through centralized path
        // ✅ FIX: Skip authentication check entirely if Keychain is unavailable
        if (!keychainUnavailable && !isVaultAuthenticated()) {
          // Wait for in-progress authentication OR trigger new one if needed
          // This ensures all authentication goes through preAuthenticate() which prevents duplicates
      if (authenticationPromise) {
            logger.info('⏳ [FACE_ID] Store operation waiting for in-progress authentication', {
              userId,
              name,
              platform: Platform.OS,
              timestamp: new Date().toISOString(),
              note: 'Another operation is authenticating. Waiting to avoid duplicate Face ID prompts.'
            }, 'SecureVault');
        logger.debug('secureVault: Authentication in progress, waiting...', { platform: Platform.OS }, 'SecureVault');
        await authenticationPromise;
          } else {
            // No authentication in progress and cache expired - trigger authentication
            // This will be coordinated by ensureAuthentication() to prevent duplicates
            logger.info('🔐 [FACE_ID] Store operation requires authentication - cache expired', {
              userId,
              name,
              platform: Platform.OS,
              timestamp: new Date().toISOString(),
              note: 'Cache expired. Will trigger Face ID authentication before storing.'
            }, 'SecureVault');
            logger.debug('secureVault: Cache expired, triggering authentication...', { platform: Platform.OS }, 'SecureVault');
            await ensureAuthentication();
          }
        } else if (keychainUnavailable) {
          logger.debug('✅ [FACE_ID] Store operation - Keychain unavailable, using SecureStore (no auth needed)', {
            userId,
            name,
            platform: Platform.OS,
            timestamp: new Date().toISOString()
          }, 'SecureVault');
        } else {
          logger.debug('✅ [FACE_ID] Store operation using cached authentication - no Face ID prompt needed', {
            userId,
            name,
            platform: Platform.OS,
            cacheExpiresIn: keyCacheExpiry - Date.now(),
            timestamp: new Date().toISOString()
          }, 'SecureVault');
      }
      
      // ✅ Check cache first to avoid unnecessary Keychain access on Android
      // Only call getOrCreateAesKey if we don't have a valid cached key
      let key: Uint8Array | null = null;
      if (cachedAesKey && Date.now() < keyCacheExpiry) {
        key = cachedAesKey;
        logger.debug('secureVault: Using cached key for store operation', { platform: Platform.OS }, 'SecureVault');
      } else if (keychainUnavailable) {
        // ✅ FIX: If Keychain is unavailable, don't call getOrCreateAesKey
        // It will just return null and log again, which we want to avoid
        logger.debug('secureVault: Keychain unavailable, skipping getOrCreateAesKey for store operation', { platform: Platform.OS }, 'SecureVault');
        key = null; // Will use SecureStore fallback
      } else {
        // Cache expired - getOrCreateAesKey will use keyRetrievalPromise to prevent duplicates
        key = await getOrCreateAesKey();
      }
      
      const kv = await getStorage();
      if (key && kv) {
        const enc = await encryptAesGcm(key, value);
        if (enc) {
          // Encryption succeeded, store in MMKV
          kv.set(`${name}_ct_${userId}`, enc.ct);
          kv.set(`${name}_iv_${userId}`, enc.iv);
          return true;
        }
        // Encryption failed (Web Crypto not available), fall through to SecureStore
        logger.debug('secureVault: Encryption failed, falling back to SecureStore', { platform: Platform.OS }, 'SecureVault');
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
      } finally {
        // Remove from pending operations map
        pendingOperations.delete(operationKey);
    }
    })();

    // Store the promise for deduplication
    pendingOperations.set(operationKey, storePromise);
    return await storePromise;
  },

  async get(userId: string, name: 'mnemonic' | 'privateKey'): Promise<string | null> {
    const operationKey = `get:${userId}:${name}`;
    
    // ✅ FIX: Check result cache first to avoid duplicate SecureStore reads
    // This prevents multiple calls to SecureStore when wallet recovery runs multiple times
    const cached = resultCache.get(operationKey);
    if (cached && (Date.now() - cached.timestamp) < RESULT_CACHE_DURATION) {
      logger.debug('secureVault: Returning cached result (avoiding duplicate SecureStore read)', { 
        userId, 
        name, 
        platform: Platform.OS,
        cacheAge: Date.now() - cached.timestamp,
        timestamp: new Date().toISOString()
      }, 'SecureVault');
      return cached.result;
    }
    
    // ✅ CRITICAL: Deduplicate simultaneous get operations for the same key
    // This prevents multiple Face ID prompts when multiple screens try to get simultaneously
    // Also prevents duplicate SecureStore reads when Keychain is unavailable
    if (pendingOperations.has(operationKey)) {
      logger.debug('secureVault: Get operation already in progress, waiting for existing request...', { 
        userId, 
        name, 
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      }, 'SecureVault');
      return await pendingOperations.get(operationKey);
    }

    const getPromise = (async () => {
      try {
        // ✅ CRITICAL: Ensure authentication is complete before accessing vault
      // This prevents multiple Face ID prompts when DashboardScreen and walletService
      // both try to access the vault simultaneously on first login
        // If cache is expired, trigger authentication through centralized path
        // ✅ FIX: Skip authentication check entirely if Keychain is unavailable
        if (!keychainUnavailable && !isVaultAuthenticated()) {
          // Wait for in-progress authentication OR trigger new one if needed
          // This ensures all authentication goes through preAuthenticate() which prevents duplicates
      if (authenticationPromise) {
            logger.info('⏳ [FACE_ID] Get operation waiting for in-progress authentication', {
              userId,
              name,
              platform: Platform.OS,
              timestamp: new Date().toISOString(),
              note: 'Another operation is authenticating. Waiting to avoid duplicate Face ID prompts.'
            }, 'SecureVault');
        logger.debug('secureVault: Authentication in progress, waiting...', { platform: Platform.OS }, 'SecureVault');
        await authenticationPromise;
          } else {
            // No authentication in progress and cache expired - trigger authentication
            // This will be coordinated by ensureAuthentication() to prevent duplicates
            logger.info('🔐 [FACE_ID] Get operation requires authentication - cache expired', {
              userId,
              name,
              platform: Platform.OS,
              timestamp: new Date().toISOString(),
              note: 'Cache expired. Will trigger Face ID authentication before retrieving.'
            }, 'SecureVault');
            logger.debug('secureVault: Cache expired, triggering authentication...', { platform: Platform.OS }, 'SecureVault');
            await ensureAuthentication();
          }
        } else if (keychainUnavailable) {
          logger.debug('✅ [FACE_ID] Get operation - Keychain unavailable, using SecureStore (no auth needed)', {
            userId,
            name,
            platform: Platform.OS,
            timestamp: new Date().toISOString()
          }, 'SecureVault');
        } else {
          logger.debug('✅ [FACE_ID] Get operation using cached authentication - no Face ID prompt needed', {
            userId,
            name,
            platform: Platform.OS,
            cacheExpiresIn: keyCacheExpiry - Date.now(),
            timestamp: new Date().toISOString()
          }, 'SecureVault');
      }
      
      // ✅ Check cache first to avoid unnecessary Keychain access on Android
      // Only call getOrCreateAesKey if we don't have a valid cached key
      let key: Uint8Array | null = null;
      if (cachedAesKey && Date.now() < keyCacheExpiry) {
        key = cachedAesKey;
        logger.debug('secureVault: Using cached key for get operation', { platform: Platform.OS }, 'SecureVault');
      } else if (keychainUnavailable) {
        // ✅ FIX: If Keychain is unavailable, don't call getOrCreateAesKey
        // It will just return null and log again, which we want to avoid
        logger.debug('secureVault: Keychain unavailable, skipping getOrCreateAesKey for get operation', { platform: Platform.OS }, 'SecureVault');
        key = null; // Will use SecureStore fallback
      } else {
          // Cache expired - getOrCreateAesKey will use keyRetrievalPromise to prevent duplicates
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
      } finally {
        // Remove from pending operations map
        pendingOperations.delete(operationKey);
      }
    })();

    // Store the promise for deduplication
    pendingOperations.set(operationKey, getPromise);
    
    // ✅ FIX: Cache the result to prevent duplicate SecureStore reads
    const result = await getPromise;
    resultCache.set(operationKey, { result, timestamp: Date.now() });
    
    // Clean up old cache entries periodically (every 10 seconds)
    if (resultCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of resultCache.entries()) {
        if (now - value.timestamp > RESULT_CACHE_DURATION) {
          resultCache.delete(key);
        }
      }
    }
    
    return result;
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
    // ✅ FIX: If Keychain is unavailable (Expo Go), return immediately without any async operations
    // This prevents unnecessary authentication flow logs and delays
    if (keychainUnavailable) {
      logger.debug('secureVault: Keychain unavailable, skipping preAuthenticate', {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      }, 'SecureVault');
      return false; // Return false but isAuthenticated is already true, so operations will use SecureStore
    }
    
    try {
      return await ensureAuthentication(forceReauth);
    } catch (e) {
      authenticationPromise = null;
      isAuthenticated = false;
      logger.warn('secureVault: pre-authentication error (will use SecureStore fallback)', e, 'SecureVault');
      return false;
    }
  },

  /**
   * ✅ FIX: Batch store operation - stores multiple keys with a single authentication
   * This prevents multiple Face ID prompts when storing related keys (e.g., userId, emailHash, phoneHash)
   * 
   * @param operations Array of store operations to perform
   * @returns Array of results (true if stored successfully, false otherwise)
   */
  async batchStore(
    operations: Array<{ userId: string; name: 'mnemonic' | 'privateKey'; value: string }>
  ): Promise<boolean[]> {
    if (operations.length === 0) {
      return [];
    }

    // ✅ CRITICAL: Authenticate once for all operations
    // This ensures only ONE Face ID prompt for the entire batch
    // ✅ FIX: Skip authentication check entirely if Keychain is unavailable
    if (!keychainUnavailable && !isVaultAuthenticated()) {
      if (authenticationPromise) {
        logger.info('⏳ [FACE_ID] Batch store waiting for in-progress authentication', {
          operationCount: operations.length,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          note: 'Another authentication is in progress. Waiting to avoid duplicate Face ID prompts.'
        }, 'SecureVault');
        logger.debug('secureVault: Authentication in progress, waiting for batch store...', { 
          operationCount: operations.length,
          platform: Platform.OS 
        }, 'SecureVault');
        await authenticationPromise;
      } else {
        logger.info('🔐 [FACE_ID] Batch store requires authentication - will trigger Face ID once for all operations', {
          operationCount: operations.length,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          note: `Storing ${operations.length} keys. Will authenticate once, then store all keys without additional Face ID prompts.`
        }, 'SecureVault');
        logger.debug('secureVault: Cache expired, triggering authentication for batch store...', { 
          operationCount: operations.length,
          platform: Platform.OS 
        }, 'SecureVault');
        await ensureAuthentication();
      }
    } else {
      logger.info('✅ [FACE_ID] Batch store using cached authentication - no Face ID prompt needed', {
        operationCount: operations.length,
        platform: Platform.OS,
        cacheExpiresIn: keyCacheExpiry - Date.now(),
        timestamp: new Date().toISOString(),
        note: `Storing ${operations.length} keys. Cache still valid, no Face ID prompt needed.`
      }, 'SecureVault');
    }

    // Get key once for all operations
    let key: Uint8Array | null = null;
    if (cachedAesKey && Date.now() < keyCacheExpiry) {
      key = cachedAesKey;
      logger.debug('secureVault: Using cached key for batch store operation', { 
        operationCount: operations.length,
        platform: Platform.OS 
      }, 'SecureVault');
    } else if (keychainUnavailable) {
      // ✅ FIX: If Keychain is unavailable, don't call getOrCreateAesKey
      // It will just return null and log again, which we want to avoid
      logger.debug('secureVault: Keychain unavailable, skipping getOrCreateAesKey for batch store operation', { 
        operationCount: operations.length,
        platform: Platform.OS 
      }, 'SecureVault');
      key = null; // Will use SecureStore fallback
    } else {
      key = await getOrCreateAesKey();
    }

    // Store all keys in parallel (they all use the same authenticated key)
    const kv = await getStorage();
    const results = await Promise.allSettled(
      operations.map(async (op) => {
        try {
          if (key && kv) {
            const enc = await encryptAesGcm(key, op.value);
            if (enc) {
              // Encryption succeeded, store in MMKV
              kv.set(`${op.name}_ct_${op.userId}`, enc.ct);
              kv.set(`${op.name}_iv_${op.userId}`, enc.iv);
              return true;
            }
            // Encryption failed (Web Crypto not available), fall through to SecureStore
            logger.debug('secureVault: Encryption failed for batch store, falling back to SecureStore', { 
              userId: op.userId,
              name: op.name,
              platform: Platform.OS 
            }, 'SecureVault');
          }
          // Fallback to SecureStore cleartext
          await loadDeps();
          if (SecureStore?.setItemAsync) {
            const k = `${op.name}_${op.userId}`;
            await SecureStore.setItemAsync(k, op.value, {
              requireAuthentication: false,
              keychainService: 'WeSplitWalletData',
            });
            return true;
          }
          return false;
        } catch (e) {
          logger.error('secureVault: batchStore failed for operation', { 
            userId: op.userId,
            name: op.name,
            error: e 
          }, 'SecureVault');
          return false;
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    logger.info('secureVault: Batch store completed', { 
      totalOperations: operations.length,
      successfulOperations: successCount,
      platform: Platform.OS 
    }, 'SecureVault');

    return results.map(r => r.status === 'fulfilled' ? r.value : false);
  },
};

export type SecureVault = typeof secureVault;


