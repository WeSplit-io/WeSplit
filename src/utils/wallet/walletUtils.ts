/**
 * Utility functions for wallet address handling and validation
 */

/**
 * Format wallet address for display (truncate with ellipsis)
 */
export const formatWalletAddress = (address: string): string => {
  if (!address) {return 'No wallet';}
  if (address.length <= 12) {return address;}
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

/**
 * Validate if a string looks like a valid Solana wallet address
 */
export const isValidSolanaAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {return false;}
  
  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

/**
 * Check if two wallet addresses are the same (case-insensitive)
 */
export const areWalletAddressesEqual = (address1: string, address2: string): boolean => {
  if (!address1 || !address2) {return false;}
  return address1.toLowerCase() === address2.toLowerCase();
};

/**
 * Get wallet address status for display
 */
export const getWalletAddressStatus = (address: string): {
  status: 'valid' | 'invalid' | 'missing';
  displayText: string;
  color: string;
} => {
  if (!address) {
    return {
      status: 'missing',
      displayText: 'No wallet linked',
      color: '#FF6B6B' // Red for missing
    };
  }

  if (isValidSolanaAddress(address)) {
    return {
      status: 'valid',
      displayText: formatWalletAddress(address),
      color: '#4ECDC4' // Teal for valid
    };
  }

  return {
    status: 'invalid',
    displayText: 'Invalid wallet',
    color: '#FFA726' // Orange for invalid
  };
};

/**
 * Extract wallet address from various formats (QR codes, deep links, etc.)
 */
export const extractWalletAddress = (input: string): string | null => {
  if (!input) {return null;}

  // Remove common prefixes and suffixes
  const cleaned = input
    .replace(/^solana:/, '')
    .replace(/^sol:/, '')
    .replace(/^wallet:/, '')
    .trim();

  // Check if it's a valid address
  if (isValidSolanaAddress(cleaned)) {
    return cleaned;
  }

  // Try to extract from URL-like strings
  const urlMatch = cleaned.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
};

/**
 * Generate a short identifier for a wallet address (for debugging/logging)
 */
export const getWalletShortId = (address: string): string => {
  if (!address) {return 'no-wallet';}
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
