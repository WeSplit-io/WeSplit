/**
 * Participant Mapper Utilities
 * Centralized participant transformation logic
 */

import { roundUsdcAmount } from '../../../utils/ui/format';
import { PARTICIPANT_STATUS, DEFAULTS } from '../constants/splitConstants';
import type { SplitWalletParticipant } from '../types';

export interface ParticipantInput {
  userId: string;
  id?: string;
  name: string;
  walletAddress: string;
  wallet_address?: string;
  amountOwed: number;
  amountPaid?: number;
  status?: string;
}

/**
 * Map participant input to split wallet participant format
 */
export function mapParticipantToSplitWallet(
  participant: ParticipantInput,
  options: {
    roundAmount?: boolean;
    defaultStatus?: string;
  } = {}
): Omit<SplitWalletParticipant, 'amountPaid' | 'status' | 'transactionSignature' | 'paidAt'> {
  const {
    roundAmount = true,
    defaultStatus = PARTICIPANT_STATUS.PENDING,
  } = options;

  return {
    userId: participant.userId || participant.id || '',
    name: participant.name || 'Unknown',
    walletAddress: participant.walletAddress || participant.wallet_address || '',
    amountOwed: roundAmount ? roundUsdcAmount(participant.amountOwed) : participant.amountOwed,
  };
}

/**
 * Map multiple participants to split wallet format
 */
export function mapParticipantsToSplitWallet(
  participants: ParticipantInput[],
  options: {
    roundAmount?: boolean;
    defaultStatus?: string;
  } = {}
): Omit<SplitWalletParticipant, 'amountPaid' | 'status' | 'transactionSignature' | 'paidAt'>[] {
  return participants.map(p => mapParticipantToSplitWallet(p, options));
}

/**
 * Validate participant data
 */
export function validateParticipant(participant: ParticipantInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!participant.userId && !participant.id) {
    errors.push('Participant userId is required');
  }

  if (!participant.name || participant.name.trim() === '') {
    errors.push('Participant name is required');
  }

  if (!participant.walletAddress && !participant.wallet_address) {
    errors.push('Participant walletAddress is required');
  }

  if (typeof participant.amountOwed !== 'number' || participant.amountOwed < 0) {
    errors.push('Participant amountOwed must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple participants
 */
export function validateParticipants(participants: ParticipantInput[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!participants || participants.length === 0) {
    errors.push('At least one participant is required');
    return { isValid: false, errors };
  }

  participants.forEach((p, index) => {
    const validation = validateParticipant(p);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        errors.push(`Participant ${index + 1}: ${error}`);
      });
    }
  });

  // Check for duplicate userIds
  const userIds = new Set<string>();
  participants.forEach((p, index) => {
    const userId = p.userId || p.id;
    if (userId) {
      if (userIds.has(userId)) {
        errors.push(`Participant ${index + 1}: Duplicate userId ${userId}`);
      }
      userIds.add(userId);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
