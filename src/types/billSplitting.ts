// Bill Splitting Types

export interface SplitParticipant {
  id: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'paid' | 'confirmed' | 'locked' | 'invited';
  transactionSignature?: string;
  paidAt?: string;
  pendingSignature?: string;
  pendingSince?: string;
  pendingAmount?: number;
}

export interface BillParticipant {
  id: string;
  name: string;
  walletAddress: string;
  items: BillItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'confirmed';
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category?: string;
}

export interface Split {
  id: string;
  name: string;
  description?: string;
  totalAmount: number;
  currency: string;
  splitMethod: 'equal' | 'manual';
  participants: SplitParticipant[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  groupId?: string;
  billData?: any;
}

export interface SplitWallet {
  id: string;
  walletAddress: string;
  publicKey: string;
  status: 'active' | 'inactive' | 'locked';
  participants: SplitWalletParticipant[];
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  groupId?: string;
  splitId?: string;
}

export interface SplitWalletParticipant {
  userId: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'paid' | 'confirmed' | 'locked' | 'invited';
  transactionSignature?: string;
  paidAt?: string;
  pendingSignature?: string;
  pendingSince?: string;
  pendingAmount?: number;
}

export interface SplitWalletResult {
  success: boolean;
  wallet?: SplitWallet;
  error?: string;
  transactionSignature?: string;
}

export interface SplitResult {
  success: boolean;
  split?: Split;
  error?: string;
}

export interface SplitInvitation {
  id: string;
  splitId: string;
  userId: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
}
