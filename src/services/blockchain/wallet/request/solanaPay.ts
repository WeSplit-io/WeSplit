/**
 * Solana Pay Utilities for USDC
 * Handles creation and parsing of Solana Pay URIs for USDC transactions
 */

import { PublicKey } from '@solana/web3.js';
import { USDC_MINT, TOKEN_DECIMALS } from '../../../config/constants/tokens';

export interface SolanaPayParams {
  recipient: string;
  amount?: number;
  reference?: string;
  label?: string;
  message?: string;
  memo?: string;
}

export interface ParsedSolanaPayUri {
  recipient: string;
  amount?: number;
  reference?: string;
  label?: string;
  message?: string;
  memo?: string;
  splToken?: string;
  isValid: boolean;
  error?: string;
}

/**
 * Create a Solana Pay URI for USDC
 */
export function createSolanaPayUri(params: SolanaPayParams): string {
  const { recipient, amount, reference, label, message, memo } = params;
  
  // Validate recipient address
  try {
    new PublicKey(recipient);
  } catch (error) {
    throw new Error('Invalid recipient address');
  }
  
  // Build the base URL
  let uri = `solana:${recipient}`;
  const queryParams: string[] = [];
  
  // Add SPL token parameter (USDC)
  queryParams.push(`spl-token=${USDC_MINT.toString()}`);
  
  // Add amount if specified
  if (amount && amount > 0) {
    // Convert to smallest unit (6 decimals for USDC)
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS));
    queryParams.push(`amount=${amountInSmallestUnit}`);
  }
  
  // Add reference if specified
  if (reference) {
    queryParams.push(`reference=${encodeURIComponent(reference)}`);
  }
  
  // Add label if specified
  if (label) {
    queryParams.push(`label=${encodeURIComponent(label)}`);
  }
  
  // Add message if specified
  if (message) {
    queryParams.push(`message=${encodeURIComponent(message)}`);
  }
  
  // Add memo if specified
  if (memo) {
    queryParams.push(`memo=${encodeURIComponent(memo)}`);
  }
  
  // Combine URI with query parameters
  if (queryParams.length > 0) {
    uri += `?${queryParams.join('&')}`;
  }
  
  return uri;
}

/**
 * Parse a Solana Pay URI
 */
export function parseSolanaPayUri(uri: string): ParsedSolanaPayUri {
  try {
    // Remove any whitespace
    uri = uri.trim();
    
    // Check if it's a Solana Pay URI
    if (!uri.startsWith('solana:')) {
      // Try to parse as raw address
      try {
        new PublicKey(uri);
        return {
          recipient: uri,
          isValid: true,
        };
      } catch (error) {
        return {
          recipient: '',
          isValid: false,
          error: 'Invalid Solana address or URI format',
        };
      }
    }
    
    // Parse the URI
    const url = new URL(uri);
    const recipient = url.pathname;
    
    // Validate recipient address
    try {
      new PublicKey(recipient);
    } catch (error) {
      return {
        recipient: '',
        isValid: false,
        error: 'Invalid recipient address in URI',
      };
    }
    
    // Parse query parameters
    const params = new URLSearchParams(url.search);
    const splToken = params.get('spl-token');
    const amount = params.get('amount');
    const reference = params.get('reference');
    const label = params.get('label');
    const message = params.get('message');
    const memo = params.get('memo');
    
    // Validate SPL token (must be USDC)
    if (splToken && splToken !== USDC_MINT.toString()) {
      return {
        recipient,
        isValid: false,
        error: `Unsupported token: ${splToken}. Only USDC is supported.`,
      };
    }
    
    // Parse amount
    let parsedAmount: number | undefined;
    if (amount) {
      const amountNum = parseInt(amount, 10);
      if (isNaN(amountNum) || amountNum < 0) {
        return {
          recipient,
          isValid: false,
          error: 'Invalid amount in URI',
        };
      }
      // Convert from smallest unit to USDC units
      parsedAmount = amountNum / Math.pow(10, TOKEN_DECIMALS);
    }
    
    return {
      recipient,
      amount: parsedAmount,
      reference: reference || undefined,
      label: label || undefined,
      message: message || undefined,
      memo: memo || undefined,
      splToken: splToken || undefined,
      isValid: true,
    };
  } catch (error) {
    return {
      recipient: '',
      isValid: false,
      error: `Failed to parse URI: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a USDC request URI
 */
export function createUsdcRequestUri(params: {
  recipient: string;
  amount?: number;
  label?: string;
  message?: string;
}): string {
  return createSolanaPayUri({
    ...params,
    message: params.message || 'USDC payment request',
    label: params.label || 'WeSplit Payment',
  });
}

/**
 * Create a USDC deposit URI (for funding)
 */
export function createUsdcDepositUri(params: {
  recipient: string;
  label?: string;
  message?: string;
}): string {
  return createSolanaPayUri({
    ...params,
    message: params.message || 'Top up your WeSplit balance',
    label: params.label || 'WeSplit Deposit',
  });
}

/**
 * Validate if a URI is a valid USDC Solana Pay URI
 */
export function isValidUsdcSolanaPayUri(uri: string): boolean {
  const parsed = parseSolanaPayUri(uri);
  return parsed.isValid && (!parsed.splToken || parsed.splToken === USDC_MINT.toString());
}
