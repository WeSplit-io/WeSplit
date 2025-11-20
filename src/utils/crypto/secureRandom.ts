/**
 * Secure randomness helpers for roulette selection and other critical flows.
 * Falls back gracefully but records the entropy source so we know when
 * crypto-grade randomness wasn't available.
 */

export type SecureEntropySource = 'node-crypto' | 'expo-crypto' | 'math-random';

export interface SecureRandomIntResult {
  value: number;
  seedHex: string;
  source: SecureEntropySource;
}

const toHex = (bytes: Uint8Array): string => {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
};

const getRandomBytesFromNode = (length: number): Uint8Array | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    if (crypto?.randomBytes) {
      const buffer: Buffer = crypto.randomBytes(length);
      return new Uint8Array(buffer);
    }
  } catch (_error) {
    // Node crypto not available (likely in React Native runtime)
  }
  return null;
};

const getRandomBytesFromExpo = (length: number): Uint8Array | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoCrypto = require('expo-crypto');
    if (expoCrypto?.getRandomBytes) {
      const bytes = expoCrypto.getRandomBytes(length);
      // Some implementations return number[] instead of Uint8Array
      return bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    }
    if (expoCrypto?.getRandomBytesAsync) {
      // fall back to async version (will still resolve synchronously because we `deasync` using deasync??)
      // Instead of blocking, return null so caller falls back to Math.random
      // (handle asynchronously by invoking sync version only)
      return null;
    }
  } catch (_error) {
    // Expo crypto not available
  }
  return null;
};

const getFallbackRandomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

export const getSecureRandomInt = async (maxExclusive: number): Promise<SecureRandomIntResult> => {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive number');
  }

  const BYTE_LENGTH = 4; // 32 bits -> up to ~4B

  let bytes: Uint8Array | null = getRandomBytesFromNode(BYTE_LENGTH);
  let source: SecureEntropySource = 'node-crypto';

  if (!bytes) {
    bytes = getRandomBytesFromExpo(BYTE_LENGTH);
    source = 'expo-crypto';
  }

  if (!bytes) {
    bytes = getFallbackRandomBytes(BYTE_LENGTH);
    source = 'math-random';
  }

  // Convert bytes to a positive integer
  const dataView = new DataView(bytes.buffer);
  const unsignedInt = dataView.getUint32(0, false); // big-endian
  const value = unsignedInt % maxExclusive;

  return {
    value,
    seedHex: toHex(bytes),
    source,
  };
};

