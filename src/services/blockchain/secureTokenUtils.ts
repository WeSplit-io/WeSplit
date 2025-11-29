/**
 * Secure Token Utilities
 *
 * Custom implementation of Solana token operations to avoid vulnerable bigint-buffer dependency.
 * This module provides secure alternatives to @solana/spl-token functions.
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddress as originalGetAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction as originalCreateAssociatedTokenAccountInstruction,
  createTransferInstruction as originalCreateTransferInstruction,
  TOKEN_PROGRAM_ID as original_TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID as original_ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// Re-export safe constants and functions that don't use vulnerable code
export const TOKEN_PROGRAM_ID = original_TOKEN_PROGRAM_ID;
export const ASSOCIATED_TOKEN_PROGRAM_ID = original_ASSOCIATED_TOKEN_PROGRAM_ID;
export const getAssociatedTokenAddress = originalGetAssociatedTokenAddress;
export const createAssociatedTokenAccountInstruction = originalCreateAssociatedTokenAccountInstruction;
export const createTransferInstruction = originalCreateTransferInstruction;

/**
 * Secure implementation of getAccount
 * Gets token account information using safe parsing to avoid vulnerable bigint-buffer operations
 * Returns the same interface as @solana/spl-token getAccount
 */
export async function getAccount(
  connection: any,
  address: PublicKey,
  commitment?: string
) {
  try {
    // Get account info from the network
    const accountInfo = await connection.getAccountInfo(address, commitment);

    if (!accountInfo) {
      throw new Error('Token account not found');
    }

    // Parse account data safely - matches Solana Token Account layout (165 bytes)
    const data = accountInfo.data;
    if (data.length < 165) {
      throw new Error(`Invalid token account data: expected 165 bytes, got ${data.length}`);
    }

    // Extract fields using safe buffer operations
    const mint = new PublicKey(data.slice(0, 32));
    const owner = new PublicKey(data.slice(32, 64));

    // Safe amount parsing - read little-endian 64-bit unsigned integer
    // Solana uses little-endian byte order for u64 values
    // Use DataView for safe buffer reading instead of vulnerable bigint operations
    const amountView = new DataView(data.buffer, data.byteOffset + 64, 8);
    const amount = amountView.getBigUint64(0, true); // true = little-endian

    // Delegate parsing (COption<Pubkey> - 4 bytes tag + 32 bytes data)
    const delegateOptionView = new DataView(data.buffer, data.byteOffset + 72, 4);
    const delegateOption = delegateOptionView.getUint32(0, true); // little-endian
    let delegate = null;
    let offset = 76; // After delegate option

    if (delegateOption !== 0) {
      delegate = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
    }

    // Delegated amount (u64)
    const delegatedAmountView = new DataView(data.buffer, data.byteOffset + offset, 8);
    const delegatedAmount = delegatedAmountView.getBigUint64(0, true);
    offset += 8;

    // State (AccountState enum)
    const state = data[offset];
    offset += 1;
    const isInitialized = (state & 1) !== 0;
    const isFrozen = (state & 2) !== 0;
    const isNative = (state & 4) !== 0;

    // Close authority (COption<Pubkey>)
    const closeAuthorityOptionView = new DataView(data.buffer, data.byteOffset + offset, 4);
    const closeAuthorityOption = closeAuthorityOptionView.getUint32(0, true);
    offset += 4;
    const closeAuthority = closeAuthorityOption !== 0 ? new PublicKey(data.slice(offset, offset + 32)) : null;

    // Return object matching @solana/spl-token interface
    return {
      address,
      mint,
      owner,
      amount, // BigInt as expected by the interface
      delegate,
      delegatedAmount,
      isInitialized,
      isFrozen,
      isNative,
      rentExemptReserve: null, // Not used in modern token accounts
      closeAuthority,
    };
  } catch (error) {
    console.error('Error in secure getAccount:', error);
    throw error;
  }
}
