/**
 * Status Mapper Utilities
 * Centralized status conversion between split wallet and split storage
 */

import { PARTICIPANT_STATUS, SPLIT_STORAGE_STATUS } from '../constants/splitConstants';

/**
 * Map split wallet participant status to split storage status
 */
export function mapSplitWalletStatusToSplitStorage(splitWalletStatus: string): string {
  switch (splitWalletStatus) {
    case PARTICIPANT_STATUS.PENDING:
      return SPLIT_STORAGE_STATUS.PENDING;
    case PARTICIPANT_STATUS.LOCKED:
      return SPLIT_STORAGE_STATUS.ACCEPTED; // For degen splits, 'locked' means 'accepted' in split storage
    case PARTICIPANT_STATUS.PAID:
      return SPLIT_STORAGE_STATUS.PAID;
    case PARTICIPANT_STATUS.FAILED:
      return SPLIT_STORAGE_STATUS.PENDING; // Failed payments reset to pending
    default:
      return SPLIT_STORAGE_STATUS.PENDING;
  }
}

/**
 * Map split storage participant status to split wallet status
 */
export function mapSplitStorageStatusToSplitWallet(splitStorageStatus: string): string {
  switch (splitStorageStatus) {
    case SPLIT_STORAGE_STATUS.PENDING:
      return PARTICIPANT_STATUS.PENDING;
    case SPLIT_STORAGE_STATUS.ACCEPTED:
      return PARTICIPANT_STATUS.LOCKED; // For degen splits, 'accepted' means 'locked' in split wallet
    case SPLIT_STORAGE_STATUS.PAID:
      return PARTICIPANT_STATUS.PAID;
    case SPLIT_STORAGE_STATUS.INVITED:
      return PARTICIPANT_STATUS.PENDING; // Invited users are pending in split wallet
    case SPLIT_STORAGE_STATUS.DECLINED:
      return PARTICIPANT_STATUS.PENDING; // Declined users reset to pending
    default:
      return PARTICIPANT_STATUS.PENDING;
  }
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
  splitType: 'fair' | 'degen' | 'spend' = 'fair'
): boolean {
  const validTransitions: Record<string, string[]> = {
    [PARTICIPANT_STATUS.PENDING]: [PARTICIPANT_STATUS.LOCKED, PARTICIPANT_STATUS.PAID, PARTICIPANT_STATUS.FAILED],
    [PARTICIPANT_STATUS.LOCKED]: [PARTICIPANT_STATUS.PAID],
    [PARTICIPANT_STATUS.PAID]: [], // Paid is terminal
    [PARTICIPANT_STATUS.FAILED]: [PARTICIPANT_STATUS.PENDING], // Can retry from failed
  };

  const allowed = validTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
}
