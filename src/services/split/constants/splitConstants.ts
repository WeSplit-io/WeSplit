/**
 * Split Constants
 * Centralized constants for split wallet operations
 */

// Status constants
export const SPLIT_WALLET_STATUS = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SPINNING_COMPLETED: 'spinning_completed',
  CLOSED: 'closed',
} as const;

export const PARTICIPANT_STATUS = {
  PENDING: 'pending',
  LOCKED: 'locked',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

export const SPLIT_STORAGE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PAID: 'paid',
  INVITED: 'invited',
  DECLINED: 'declined',
} as const;

// Cache constants
export const CACHE_TTL = {
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  SHORT: 1 * 60 * 1000, // 1 minute
  LONG: 10 * 60 * 1000, // 10 minutes
} as const;

// Validation constants
export const VALIDATION_TOLERANCE = {
  AMOUNT: 0.01, // 0.01 USDC tolerance for rounding
  BALANCE: 0.001, // 0.001 USDC tolerance for balance checks
} as const;

// Retry constants
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BACKOFF_BASE: 100, // Base delay in ms
  BACKOFF_MULTIPLIER: 2, // Exponential backoff multiplier
} as const;

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_FOUND: 'Split wallet not found',
  PARTICIPANT_NOT_FOUND: 'Participant not found in split wallet',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_AMOUNT: 'Invalid payment amount',
  ALREADY_PAID: 'Participant has already paid their full share',
  ALREADY_LOCKED: 'Participant has already locked their funds',
  WALLET_EXISTS: 'A split wallet already exists for this bill',
  INVALID_STATUS: 'Invalid status transition',
  VALIDATION_FAILED: 'Validation failed',
} as const;

// Default values
export const DEFAULTS = {
  CURRENCY: 'USDC',
  PARTICIPANT_AMOUNT_PAID: 0,
  PARTICIPANT_STATUS: PARTICIPANT_STATUS.PENDING,
} as const;

// Type exports
export type SplitWalletStatus = typeof SPLIT_WALLET_STATUS[keyof typeof SPLIT_WALLET_STATUS];
export type ParticipantStatus = typeof PARTICIPANT_STATUS[keyof typeof PARTICIPANT_STATUS];
export type SplitStorageStatus = typeof SPLIT_STORAGE_STATUS[keyof typeof SPLIT_STORAGE_STATUS];
