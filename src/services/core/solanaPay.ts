/**
 * Solana Pay USDC Implementation
 * Creates and parses Solana Pay URIs for USDC transactions
 */

import { PublicKey } from '@solana/web3.js';
import { USDC_MINT, USDC_DECIMALS } from '../../config/constants/tokens';
import { isValidSolanaAddress } from '../../utils/validation';

export interface SolanaPayRequest {
  recipient: string;
  amount?: number;
  label?: string;
  message?: string;
  reference?: string;
  splToken: string;
}

export interface ParsedSolanaPayUri {
  recipient: string;
  amount?: number;
  label?: string;
  message?: string;
  reference?: string;
  splToken: string;
  isValid: boolean;
  error?: string;
}

/**
 * Create a Solana Pay USDC request URI
 */
export function createUsdcRequestUri({
  recipient,
  amount,
  label,
  message,
  reference
}: {
  recipient: string;
  amount?: number;
  label?: string;
  message?: string;
  reference?: string;
}): string {
  // Validate recipient address
  if (!isValidSolanaAddress(recipient)) {
    throw new Error('Invalid Solana address');
  }

  // Build the Solana Pay URI
  const baseUrl = 'solana:';
  const params = new URLSearchParams();
  
  // Required parameters
  params.set('spl-token', USDC_MINT.toBase58());
  
  // Optional parameters
  if (amount !== undefined && amount > 0) {
    // Convert amount to smallest unit (6 decimals for USDC)
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, USDC_DECIMALS));
    params.set('amount', amountInSmallestUnit.toString());
  }
  
  if (label) {
    params.set('label', label);
  }
  
  if (message) {
    params.set('message', message);
  }
  
  if (reference) {
    params.set('reference', reference);
  }

  // Construct the full URI
  const queryString = params.toString();
  return `${baseUrl}${recipient}${queryString ? '?' + queryString : ''}`;
}

/**
 * Parse a Solana Pay URI
 */
export function parseUri(uri: string): ParsedSolanaPayUri {
  try {
    // Check if it's a Solana Pay URI
    if (!uri.startsWith('solana:')) {
      return {
        recipient: '',
        splToken: '',
        isValid: false,
        error: 'Not a Solana Pay URI'
      };
    }

    // Remove 'solana:' prefix
    const uriWithoutPrefix = uri.substring(7);
    
    // Split recipient and query parameters
    const [recipient, queryString] = uriWithoutPrefix.split('?');
    
    if (!recipient) {
      return {
        recipient: '',
        splToken: '',
        isValid: false,
        error: 'Missing recipient address'
      };
    }

    // Validate recipient address
    if (!isValidSolanaAddress(recipient)) {
      return {
        recipient,
        splToken: '',
        isValid: false,
        error: 'Invalid recipient address'
      };
    }

    // Parse query parameters
    const params = new URLSearchParams(queryString || '');
    const splToken = params.get('spl-token') || '';
    const amountParam = params.get('amount');
    const label = params.get('label') || undefined;
    const message = params.get('message') || undefined;
    const reference = params.get('reference') || undefined;

    // Validate SPL token (must be USDC)
    if (splToken !== USDC_MINT.toBase58()) {
      return {
        recipient,
        splToken,
        isValid: false,
        error: 'Only USDC transactions are supported'
      };
    }

    // Parse amount
    let amount: number | undefined;
    if (amountParam) {
      const amountInSmallestUnit = parseInt(amountParam, 10);
      if (isNaN(amountInSmallestUnit) || amountInSmallestUnit < 0) {
        return {
          recipient,
          splToken,
          isValid: false,
          error: 'Invalid amount'
        };
      }
      // Convert from smallest unit to human-readable amount
      amount = amountInSmallestUnit / Math.pow(10, USDC_DECIMALS);
    }

    return {
      recipient,
      amount,
      label,
      message,
      reference,
      splToken,
      isValid: true
    };
  } catch (error) {
    return {
      recipient: '',
      splToken: '',
      isValid: false,
      error: `Failed to parse URI: ${error}`
    };
  }
}

/**
 * Validate a Solana Pay URI
 */
export function validateSolanaPayUri(uri: string): boolean {
  const parsed = parseUri(uri);
  return parsed.isValid;
}

/**
 * Extract recipient address from any Solana Pay URI or raw address
 */
export function extractRecipientAddress(input: string): string | null {
  // If it's a Solana Pay URI, parse it
  if (input.startsWith('solana:')) {
    const parsed = parseUri(input);
    return parsed.isValid ? parsed.recipient : null;
  }
  
  // If it's a raw address, validate it
  if (isValidSolanaAddress(input)) {
    return input;
  }
  
  return null;
}

/**
 * Create a simple address QR (for display purposes)
 */
export function createAddressQr(address: string): string {
  if (!isValidSolanaAddress(address)) {
    throw new Error('Invalid Solana address');
  }
  
  return address;
}

/**
 * Check if a URI is a Solana Pay URI
 */
export function isSolanaPayUri(uri: string): boolean {
  return uri.startsWith('solana:');
}

/**
 * Get display amount for UI
 */
export function getDisplayAmount(amount: number): string {
  return amount.toFixed(USDC_DECIMALS);
}

/**
 * Get amount in smallest unit for transactions
 */
export function getAmountInSmallestUnit(amount: number): number {
  return Math.floor(amount * Math.pow(10, USDC_DECIMALS));
}
