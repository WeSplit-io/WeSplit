/**
 * Split Validation Service
 * Centralized validation logic for split wallet operations
 */

import { logger } from '../core';
import { ERROR_MESSAGES, VALIDATION_TOLERANCE, PARTICIPANT_STATUS } from './constants/splitConstants';
import { validateParticipant, validateParticipants } from './utils/participantMapper';
import { isValidStatusTransition } from './utils/statusMapper';
import type { SplitWalletParticipant } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CreationParams {
  billId: string;
  creatorId: string;
  totalAmount: number;
  currency?: string;
  participants: Omit<SplitWalletParticipant, 'amountPaid' | 'status' | 'transactionSignature' | 'paidAt'>[];
}

/**
 * Validate split creation parameters
 * 
 * @param params - Creation parameters including billId, creatorId, totalAmount, currency, and participants
 * @returns Promise resolving to ValidationResult with isValid flag and array of error messages
 * 
 * @example
 * ```typescript
 * const validation = await validateCreationParams({
 *   billId: 'bill_123',
 *   creatorId: 'user_456',
 *   totalAmount: 100,
 *   currency: 'USDC',
 *   participants: [{ userId: 'user_789', walletAddress: '...', amountOwed: 50 }]
 * });
 * 
 * if (!validation.isValid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * ```
 */
export async function validateCreationParams(params: CreationParams): Promise<ValidationResult> {
  const errors: string[] = [];

  // Validate billId
  if (!params.billId || typeof params.billId !== 'string' || params.billId.trim() === '') {
    errors.push('Bill ID is required and must be a non-empty string');
  }

  // Validate creatorId
  if (!params.creatorId || typeof params.creatorId !== 'string' || params.creatorId.trim() === '') {
    errors.push('Creator ID is required and must be a non-empty string');
  }

  // Validate totalAmount
  if (typeof params.totalAmount !== 'number' || params.totalAmount <= 0) {
    errors.push('Total amount is required and must be a positive number');
  }

  // Validate currency
  if (params.currency && typeof params.currency !== 'string') {
    errors.push('Currency must be a string');
  }

  // Validate participants
  if (!params.participants || !Array.isArray(params.participants)) {
    errors.push('Participants parameter is required and must be an array');
  } else if (params.participants.length === 0) {
    errors.push('At least one participant is required');
  } else {
    // Validate each participant
    // ✅ FIX: Convert to ParticipantInput format for validation (handles both SplitWalletParticipant and ParticipantInput)
    const participantsForValidation = params.participants.map((p, index) => ({
      userId: p.userId || '',
      id: p.userId || '',
      name: p.name || 'Unknown',
      walletAddress: p.walletAddress || '',
      wallet_address: p.walletAddress || '',
      amountOwed: p.amountOwed || 0,
    }));
    const participantValidation = validateParticipants(participantsForValidation);
    if (!participantValidation.isValid) {
      errors.push(...participantValidation.errors);
    }

    // Validate total amounts match
    const totalAmountOwed = params.participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    const difference = Math.abs(totalAmountOwed - params.totalAmount);
    if (difference > VALIDATION_TOLERANCE.AMOUNT) {
      errors.push(
        `Total amountOwed (${totalAmountOwed}) does not match totalAmount (${params.totalAmount}). Difference: ${difference}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate wallet address format
 * 
 * @param address - Solana wallet address to validate
 * @returns ValidationResult with isValid flag and error messages if invalid
 * 
 * @example
 * ```typescript
 * const validation = validateWalletAddress('11111111111111111111111111111111');
 * if (!validation.isValid) {
 *   console.error('Invalid address:', validation.errors);
 * }
 * ```
 */
export function validateWalletAddress(address: string): ValidationResult {
  const errors: string[] = [];

  if (!address || typeof address !== 'string') {
    errors.push('Wallet address is required and must be a string');
    return { isValid: false, errors };
  }

  // Remove common invalid values
  const invalidValues = ['No wallet address', 'Unknown wallet', '', 'null', 'undefined'];
  if (invalidValues.includes(address.toLowerCase())) {
    errors.push('Invalid wallet address value');
    return { isValid: false, errors };
  }

  // Check if it's a valid Solana public key format
  try {
    const { PublicKey } = require('@solana/web3.js');
    new PublicKey(address);
  } catch {
    errors.push(`Invalid Solana wallet address format: ${address}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate participant amounts
 */
export function validateAmounts(
  amountPaid: number,
  amountOwed: number,
  allowOverpayment: boolean = false
): ValidationResult {
  const errors: string[] = [];

  if (typeof amountPaid !== 'number' || amountPaid < 0) {
    errors.push('Amount paid must be a non-negative number');
  }

  if (typeof amountOwed !== 'number' || amountOwed < 0) {
    errors.push('Amount owed must be a non-negative number');
  }

  if (!allowOverpayment && amountPaid > amountOwed) {
    errors.push(`Amount paid (${amountPaid}) exceeds amount owed (${amountOwed})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate status transition
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  splitType: 'fair' | 'degen' | 'spend' = 'fair'
): ValidationResult {
  const errors: string[] = [];

  if (!isValidStatusTransition(currentStatus, newStatus, splitType)) {
    errors.push(
      `Invalid status transition from '${currentStatus}' to '${newStatus}' for ${splitType} split`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate participant payment
 */
export function validateParticipantPayment(
  participant: SplitWalletParticipant,
  paymentAmount: number
): ValidationResult {
  const errors: string[] = [];

  // Check if already fully paid
  if (participant.status === PARTICIPANT_STATUS.PAID || participant.amountPaid >= participant.amountOwed) {
    errors.push(ERROR_MESSAGES.ALREADY_PAID);
  }

  // Check if already locked (for degen splits)
  if (participant.status === PARTICIPANT_STATUS.LOCKED) {
    errors.push(ERROR_MESSAGES.ALREADY_LOCKED);
  }

  // Validate payment amount
  if (paymentAmount <= 0) {
    errors.push(ERROR_MESSAGES.INVALID_AMOUNT);
  }

  // Validate amounts
  const amountValidation = validateAmounts(
    (participant.amountPaid || 0) + paymentAmount,
    participant.amountOwed,
    false
  );
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate wallet exists and is accessible
 */
export async function validateWalletAccess(
  walletId: string,
  userId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    const { SplitWalletQueries } = await import('./SplitWalletQueries');
    const walletResult = await SplitWalletQueries.getSplitWallet(walletId);

    if (!walletResult.success || !walletResult.wallet) {
      errors.push(ERROR_MESSAGES.WALLET_NOT_FOUND);
      return { isValid: false, errors };
    }

    const wallet = walletResult.wallet;

    // Check if user is creator or participant
    const isCreator = wallet.creatorId === userId;
    const isParticipant = wallet.participants.some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      errors.push('User is not authorized to access this split wallet');
    }
  } catch (error) {
    errors.push(`Failed to validate wallet access: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate participant exists in wallet
 */
export function validateParticipantInWallet(
  wallet: { participants: SplitWalletParticipant[] },
  participantId: string
): ValidationResult {
  const errors: string[] = [];

  const participant = wallet.participants.find(p => p.userId === participantId);
  if (!participant) {
    errors.push(ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
