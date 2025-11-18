/**
 * Address Validation Utilities
 * Centralized validation for blockchain addresses and identifiers
 */

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Ethereum addresses are 42 characters starting with 0x
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethRegex.test(address);
}

/**
 * Validate general blockchain address
 */
function isValidBlockchainAddress(address: string, chain: 'solana' | 'ethereum' = 'solana'): boolean {
  switch (chain) {
    case 'solana':
      return isValidSolanaAddress(address);
    case 'ethereum':
      return isValidEthereumAddress(address);
    default:
      return false;
  }
}

/**
 * Normalize address format
 */
function normalizeAddress(address: string, chain: 'solana' | 'ethereum' = 'solana'): string {
  if (!address) {return '';}
  
  const trimmed = address.trim();
  
  if (chain === 'ethereum') {
    return trimmed.toLowerCase();
  }
  
  return trimmed;
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (legacy - use phone.ts for E.164 validation)
 * @deprecated Use isValidPhoneNumber from './phone' for E.164 format validation
 */
function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (7-15 digits)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validate username format
 */
function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // Username should be 3-30 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 */
function isValidPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate transaction hash format
 */
function isValidTransactionHash(hash: string, chain: 'solana' | 'ethereum' = 'solana'): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  switch (chain) {
    case 'solana':
      // Solana transaction signatures are base58 encoded
      return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(hash);
    case 'ethereum':
      // Ethereum transaction hashes are 66 characters starting with 0x
      return /^0x[a-fA-F0-9]{64}$/.test(hash);
    default:
      return false;
  }
}

/**
 * Validate mnemonic phrase
 */
function isValidMnemonic(mnemonic: string): boolean {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return false;
  }

  const words = mnemonic.trim().split(/\s+/);
  
  // Valid mnemonic lengths are 12, 15, 18, 21, or 24 words
  const validLengths = [12, 15, 18, 21, 24];
  if (!validLengths.includes(words.length)) {
    return false;
  }

  // Each word should be lowercase and contain only letters
  const wordRegex = /^[a-z]+$/;
  return words.every(word => wordRegex.test(word));
}

/**
 * Validate private key format
 */
function isValidPrivateKey(privateKey: string, format: 'base64' | 'hex' = 'base64'): boolean {
  if (!privateKey || typeof privateKey !== 'string') {
    return false;
  }

  switch (format) {
    case 'base64':
      // Base64 encoded private key
      return /^[A-Za-z0-9+/]+=*$/.test(privateKey);
    case 'hex':
      // Hex encoded private key
      return /^[a-fA-F0-9]+$/.test(privateKey);
    default:
      return false;
  }
}

/**
 * Sanitize input string
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
}

/**
 * Validate amount format
 */
function isValidAmount(amount: string | number): boolean {
  if (typeof amount === 'number') {
    return amount > 0 && amount < Number.MAX_SAFE_INTEGER;
  }

  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    return !isNaN(parsed) && parsed > 0 && parsed < Number.MAX_SAFE_INTEGER;
  }

  return false;
}
