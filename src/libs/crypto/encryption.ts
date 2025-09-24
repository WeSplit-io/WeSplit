/**
 * Encryption Utilities
 * Centralized encryption and decryption functions
 */

import * as CryptoJS from 'crypto-js';

/**
 * Encrypt data with AES
 */
export function encrypt(data: string, key: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, key).toString();
    return encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt data with AES
 */
export function decrypt(encryptedData: string, key: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!result) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Generate a random encryption key
 */
function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

/**
 * Hash data with SHA-256
 */
export function hash(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Hash data with SHA-1
 */
function hashSHA1(data: string): string {
  return CryptoJS.SHA1(data).toString();
}

/**
 * Generate HMAC
 */
export function generateHMAC(data: string, key: string): string {
  return CryptoJS.HmacSHA256(data, key).toString();
}

/**
 * Verify HMAC
 */
function verifyHMAC(data: string, key: string, hmac: string): boolean {
  const computedHMAC = generateHMAC(data, key);
  return computedHMAC === hmac;
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(length: number): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * Generate random string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate secure random number
 */
export function generateSecureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = generateSecureRandom() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate nonce for authentication
 */
function generateNonce(): string {
  return generateRandomString(32);
}

/**
 * Generate salt for password hashing
 */
function generateSalt(): string {
  return generateRandomBytes(16);
}

/**
 * Hash password with salt
 */
export function hashPassword(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
}

/**
 * Verify password
 */
function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Encrypt object to string
 */
function encryptObject(obj: any, key: string): string {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString, key);
}

/**
 * Decrypt string to object
 */
function decryptObject<T>(encryptedData: string, key: string): T {
  const jsonString = decrypt(encryptedData, key);
  return JSON.parse(jsonString);
}

/**
 * Create checksum for data integrity
 */
export function createChecksum(data: string): string {
  return hash(data);
}

/**
 * Verify checksum
 */
function verifyChecksum(data: string, checksum: string): boolean {
  const computedChecksum = createChecksum(data);
  return computedChecksum === checksum;
}
