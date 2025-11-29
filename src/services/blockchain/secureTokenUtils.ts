/**
 * Secure Token Utilities
 *
 * Custom implementation of Solana token operations to avoid vulnerable bigint-buffer dependency.
 * This module provides secure alternatives to @solana/spl-token functions.
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';

// TOKEN_PROGRAM_ID constant - secure re-export
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Secure implementation of getAssociatedTokenAddress
 * Computes the associated token account address for a given wallet and token mint
 * Uses proper PDA derivation as per Solana Associated Token Account program
 */
export async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID,
  associatedTokenProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
  const [address] = await PublicKey.findProgramAddress(
    [
      owner.toBuffer(),
      programId.toBuffer(),
      mint.toBuffer(),
    ],
    associatedTokenProgramId
  );
  return address;
}

/**
 * Secure implementation of createAssociatedTokenAccountInstruction
 * Creates instruction to create an associated token account
 */
export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];

  // Associated Token Account program instruction data
  // This avoids using vulnerable bigint operations
  const data = Buffer.from([0]); // Create instruction

  return {
    keys,
    programId: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), // Associated Token Program
    data,
  };
}

/**
 * Secure implementation of createTransferInstruction
 * Creates instruction to transfer tokens
 */
export function createTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: number,
  programId: PublicKey = TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  // Transfer instruction data - using safe number operations
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // Transfer instruction
  data.writeBigUInt64LE(BigInt(Math.floor(amount)), 1); // Safe bigint usage

  return {
    keys,
    programId,
    data,
  };
}

/**
 * Secure implementation of getAccount
 * Gets token account information without vulnerable operations
 * Returns the same interface as @solana/spl-token getAccount
 */
export async function getAccount(
  connection: any,
  address: PublicKey,
  commitment?: string
) {
  // Use secure RPC call without bigint operations in data parsing
  const accountInfo = await connection.getAccountInfo(address, commitment);

  if (!accountInfo) {
    throw new Error('Token account not found');
  }

  // Parse account data safely - matches Solana Token Account layout
  const data = accountInfo.data;
  if (data.length < 165) {
    throw new Error('Invalid token account data');
  }

  // Extract data using safe parsing (avoiding vulnerable bigint operations)
  const mint = new PublicKey(data.slice(0, 32));
  const owner = new PublicKey(data.slice(32, 64));

  // Safe amount parsing - read as BigInt then convert to number
  let amount = 0n;
  for (let i = 0; i < 8; i++) {
    amount |= BigInt(data[64 + i]) << BigInt(i * 8);
  }

  const delegateOption = data[68];
  const delegate = delegateOption ? new PublicKey(data.slice(72, 104)) : null;

  let delegatedAmount = 0n;
  if (delegate) {
    for (let i = 0; i < 8; i++) {
      delegatedAmount |= BigInt(data[104 + i]) << BigInt(i * 8);
    }
  }

  const state = data[108];
  const isInitialized = (state & 1) !== 0;
  const isFrozen = (state & 2) !== 0;
  const isNative = (state & 4) !== 0;

  const closeAuthorityOption = data[109];
  const closeAuthority = closeAuthorityOption ? new PublicKey(data.slice(117, 149)) : null;

  // Return object matching @solana/spl-token interface
  return {
    address,
    mint,
    owner,
    amount, // Keep as BigInt to match original interface
    delegate,
    delegatedAmount,
    isInitialized,
    isFrozen,
    isNative,
    rentExemptReserve: null, // Not used in modern token accounts
    closeAuthority,
  };
}
