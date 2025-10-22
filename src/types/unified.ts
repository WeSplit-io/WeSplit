/**
 * Unified Types
 * Centralized type definitions for the application
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// Transaction types
export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  memo?: string;
  group_id?: string;
  transaction_method?: string;
  recipient_name?: string;
  sender_name?: string;
}

// Split types
export interface Split {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  splitType: 'fair' | 'custom';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  creatorId: string;
  creatorName: string;
  participants: SplitParticipant[];
  items: SplitItem[];
  merchant: {
    name: string;
    location?: string;
  };
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitParticipant {
  userId: string;
  name: string;
  email: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'accepted' | 'declined';
  avatar?: string;
}

export interface SplitItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  participants: string[];
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  user_id: string;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  userId: string;
}

export type NotificationType = 
  | 'general'
  | 'payment_received'
  | 'payment_sent'
  | 'split_invite'
  | 'split_accepted'
  | 'split_declined'
  | 'split_paid'
  | 'payment_request'
  | 'payment_reminder';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  data?: any;
}

// Wallet types
export interface WalletInfo {
  address: string;
  publicKey: string;
  balance: number;
  currency: string;
}

export interface UserWalletBalance {
  solBalance: number;
  usdcBalance: number;
  totalUSD: number;
  address: string;
  isConnected: boolean;
}

// Contact types
export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  walletAddress?: string;
  isFavorite: boolean;
  created_at: string;
}

// Group types
export interface Group {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joined_at: string;
}

// Bill analysis types
export interface ProcessedBillData {
  id: string;
  title: string;
  merchant: string;
  location: string;
  date: string;
  time: string;
  currency: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  tip: number;
  items: BillItem[];
  participants: BillParticipant[];
  splitType: 'fair' | 'custom';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  participants: string[];
}

export interface BillParticipant {
  userId: string;
  name: string;
  email: string;
  wallet_address: string;
  amountOwed: number;
  status: 'pending' | 'accepted' | 'declined';
  items: string[];
}

// Split wallet types
export interface SplitWallet {
  id: string;
  address: string;
  balance: number;
  currency: string;
  participants: SplitWalletParticipant[];
  created_at: string;
  updated_at: string;
}

export interface SplitWalletParticipant {
  userId: string;
  name: string;
  walletAddress: string;
  share: number;
  isActive: boolean;
}

// Export all types
export type {
  User,
  Transaction,
  Split,
  SplitParticipant,
  SplitItem,
  Notification,
  NotificationData,
  NotificationType,
  NotificationPayload,
  WalletInfo,
  UserWalletBalance,
  Contact,
  Group,
  GroupMember,
  ProcessedBillData,
  BillItem,
  BillParticipant,
  SplitWallet,
  SplitWalletParticipant
};