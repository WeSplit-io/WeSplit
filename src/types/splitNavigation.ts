/**
 * Unified data structures for split navigation
 * Ensures consistent data flow across all split-related screens
 */

import { ProcessedBillData, BillAnalysisResult } from './billAnalysis';
import { Split } from '../services/splitStorageService';
import { SplitWallet } from '../services/split';

/**
 * Unified bill data structure for navigation
 */
export interface UnifiedBillData {
  id: string;
  title: string;
  totalAmount: number;
  currency: string;
  date: string;
  merchant?: string;
  location?: string;
  items?: any[];
  participants?: any[];
  billImageUrl?: string;
  settings?: any;
}

/**
 * Unified participant data structure
 */
export interface UnifiedParticipant {
  id: string;
  name: string;
  walletAddress: string;
  status: 'pending' | 'accepted' | 'declined' | 'paid' | 'locked';
  amountOwed?: number;
  amountPaid?: number;
  userId?: string; // For compatibility with DegenLock
  avatar?: string; // For compatibility with DegenLock
}

/**
 * Navigation parameters for split screens
 */
export interface SplitNavigationParams {
  // Core data
  billData?: UnifiedBillData;
  processedBillData?: ProcessedBillData;
  analysisResult?: BillAnalysisResult;
  
  // Split data
  splitData?: Split;
  splitWallet?: SplitWallet;
  
  // Participants
  participants?: UnifiedParticipant[];
  totalAmount?: number;
  
  // Degen-specific
  selectedParticipant?: UnifiedParticipant;
  
  // Metadata
  splitId?: string;
  isEditing?: boolean;
}

/**
 * Navigation parameters for SplitDetailsScreen
 */
export interface SplitDetailsNavigationParams extends SplitNavigationParams {
  billData?: UnifiedBillData;
  processedBillData?: ProcessedBillData;
  analysisResult?: BillAnalysisResult;
  splitId?: string;
  splitData?: Split;
  isEditing?: boolean;
  selectedContact?: any; // Contact selected from ContactsScreen
  isFromNotification?: boolean; // Whether opened from notification
  notificationId?: string; // Notification ID for deletion after join
  shareableLink?: string; // Shareable link for deep link invitations
  splitInvitationData?: string; // Encoded split invitation data from deep links
}

/**
 * Navigation parameters for FairSplitScreen
 */
export interface FairSplitNavigationParams extends SplitNavigationParams {
  billData?: UnifiedBillData;
  processedBillData?: ProcessedBillData;
  splitData?: Split;
  splitWallet?: SplitWallet;
}

/**
 * Navigation parameters for DegenLockScreen
 */
export interface DegenLockNavigationParams extends SplitNavigationParams {
  billData?: UnifiedBillData;
  participants?: UnifiedParticipant[];
  totalAmount?: number;
  processedBillData?: ProcessedBillData;
  splitData?: Split;
  splitWallet?: SplitWallet;
}

/**
 * Navigation parameters for DegenSpinScreen
 */
export interface DegenSpinNavigationParams extends SplitNavigationParams {
  billData?: UnifiedBillData;
  participants?: UnifiedParticipant[];
  totalAmount?: number;
  splitWallet?: SplitWallet;
  processedBillData?: ProcessedBillData;
  splitData?: Split;
}

/**
 * Navigation parameters for DegenResultScreen
 */
export interface DegenResultNavigationParams extends SplitNavigationParams {
  billData?: UnifiedBillData;
  participants?: UnifiedParticipant[];
  totalAmount?: number;
  selectedParticipant?: UnifiedParticipant;
  splitWallet?: SplitWallet;
  processedBillData?: ProcessedBillData;
  splitData?: Split;
}

/**
 * Helper functions for data conversion
 */
export class SplitDataConverter {
  /**
   * Convert ProcessedBillData to UnifiedBillData
   */
  static processBillDataToUnified(processedBillData: ProcessedBillData): UnifiedBillData {
    return {
      id: processedBillData.id,
      title: processedBillData.title,
      totalAmount: processedBillData.totalAmount,
      currency: processedBillData.currency,
      date: processedBillData.date,
      merchant: processedBillData.merchant,
      location: processedBillData.location,
      items: processedBillData.items,
      participants: processedBillData.participants,
    };
  }

  /**
   * Convert Split to UnifiedBillData
   */
  static splitToUnified(split: Split): UnifiedBillData {
    return {
      id: split.billId,
      title: split.title,
      totalAmount: split.totalAmount,
      currency: split.currency,
      date: split.date,
      merchant: split.merchant?.name,
      participants: split.participants,
    };
  }

  /**
   * Convert participants to unified format
   */
  static participantsToUnified(participants: any[]): UnifiedParticipant[] {
    return participants.map(p => ({
      id: p.id || p.userId,
      name: p.name,
      walletAddress: p.walletAddress,
      status: p.status || 'pending',
      amountOwed: p.amountOwed || 0,
      amountPaid: p.amountPaid || 0,
      userId: p.userId || p.id,
      avatar: p.avatar || '👤',
    }));
  }

  /**
   * Convert unified participants to DegenLock format
   */
  static unifiedToDegenLock(participants: UnifiedParticipant[]): any[] {
    return participants.map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId || p.walletAddress,
      avatar: p.avatar || '👤',
    }));
  }
}
