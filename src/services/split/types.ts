/**
 * Shared types for Split Wallet Services
 * Prevents circular import dependencies
 */

export interface DegenRouletteAuditEntry {
  selectedAt: string;
  requestedByUserId?: string;
  entropySource?: string;
  seed?: string;
  participantIds: string[];
  lockedParticipantIds: string[];
  loserUserId: string;
  totalParticipants: number;
}

export interface SplitWallet {
  id: string;
  billId: string;
  creatorId: string;
  walletAddress: string;
  publicKey: string;
  // SECURITY: Private keys are NEVER stored in Firebase
  // The creator stores the split wallet's private key locally on their device
  totalAmount: number;
  currency: string;
  status: 'active' | 'locked' | 'completed' | 'cancelled' | 'spinning_completed' | 'closed';
  participants: SplitWalletParticipant[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string; // When the split was completed
  firebaseDocId?: string; // Firebase document ID for direct access
  degenWinner?: { // For degen splits - stores the winner information (legacy)
    userId: string;
    name: string;
    selectedAt: string;
    requestedByUserId?: string;
    entropySource?: string;
    seed?: string;
  };
  degenLoser?: { // For degen splits - stores the loser information (selected participant is the LOSER)
    userId: string;
    name: string;
    selectedAt: string;
    requestedByUserId?: string;
    entropySource?: string;
    seed?: string;
  };
  rouletteAudit?: DegenRouletteAuditEntry[];
}

export interface SplitWalletParticipant {
  userId: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'locked' | 'paid' | 'failed';
  transactionSignature?: string;
  pendingSignature?: string;
  pendingSince?: string;
  pendingAmount?: number;
  paidAt?: string;
}

export interface SplitWalletResult {
  success: boolean;
  wallet?: SplitWallet;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionSignature?: string;
  amount?: number;
  error?: string;
  message?: string;
  signature?: string; // alias used in some call sites
}
