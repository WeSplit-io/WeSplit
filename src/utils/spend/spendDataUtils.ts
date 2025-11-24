/**
 * SPEND Data Utilities
 * Centralized functions for extracting and formatting SPEND order data
 * Based on SP3ND Order JSON Schema
 */

import { Split } from '../../services/splits/splitStorageService';
import { SpendOrderData, SpendOrderItem } from '../../services/integrations/spend/SpendTypes';

/**
 * Extracted order data structure
 */
export interface ExtractedOrderData {
  orderData: Partial<SpendOrderData>;
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  store: string | null;
  items: SpendOrderItem[];
  totalAmount: number;
  userWallet: string | null;
  customerEmail: string | null;
}

/**
 * Extract SP3ND order data from split's externalMetadata
 * Handles multiple possible data structures according to SP3ND Order JSON Schema
 * 
 * @param split - Split object containing externalMetadata
 * @returns Extracted order data with proper typing
 */
export function extractOrderData(split: Split | null | undefined): ExtractedOrderData {
  // Default return structure
  const defaultData: ExtractedOrderData = {
    orderData: {},
    orderId: null,
    orderNumber: null,
    orderStatus: null,
    store: null,
    items: [],
    totalAmount: 0,
    userWallet: null,
    customerEmail: null,
  };

  if (!split?.externalMetadata) {
    return defaultData;
  }

  const externalMetadata = split.externalMetadata;
  const orderData = (externalMetadata.orderData || {}) as Partial<SpendOrderData>;

  // Extract items - prioritize orderData.items, fallback to split.items
  const items: SpendOrderItem[] = Array.isArray(orderData.items)
    ? orderData.items
    : Array.isArray(split.items)
    ? (split.items as SpendOrderItem[])
    : [];

  // Extract order identification (id takes precedence over order_number for orderId)
  const orderId = orderData.id || orderData.order_number || externalMetadata.orderId || null;
  const orderNumber = orderData.order_number || externalMetadata.orderNumber || null;

  // Extract status (normalize to string)
  const orderStatus = orderData.status || externalMetadata.orderStatus || null;

  // Extract store identifier
  const store = orderData.store || externalMetadata.store || null;

  // Extract total amount (prioritize orderData.total_amount)
  const totalAmount = orderData.total_amount ?? split.totalAmount ?? 0;

  // Extract user wallet
  const userWallet = orderData.user_wallet || externalMetadata.userWallet || null;

  // Extract customer email
  const customerEmail = orderData.customer_email || null;

  return {
    orderData,
    orderId,
    orderNumber,
    orderStatus,
    store,
    items,
    totalAmount,
    userWallet,
    customerEmail,
  };
}

/**
 * Format wallet address for display (truncated)
 * Example: "B3gt1234567890sdgux" -> "B3gt.....sdgux"
 */
export function formatWalletAddress(address: string | undefined | null): string {
  if (!address || address.length <= 12) return address || '';
  return `${address.substring(0, 4)}.....${address.substring(address.length - 4)}`;
}

/**
 * Participant interface for type safety
 */
export interface Participant {
  userId?: string;
  id?: string;
  amountPaid?: number;
  amountOwed?: number;
  [key: string]: any;
}

/**
 * Find user participant in participants array
 * Handles different participant structures (userId vs id)
 * 
 * @param participants - Array of participant objects
 * @param userId - User ID to find
 * @returns Found participant or null
 */
export function findUserParticipant(
  participants: Participant[],
  userId: string
): Participant | null {
  if (!Array.isArray(participants) || !userId) {
    return null;
  }

  return (
    participants.find((p: Participant) => {
      const participantId = p.userId || p.id || '';
      return participantId === userId || participantId === userId.toString();
    }) || null
  );
}

/**
 * Payment totals result
 */
export interface PaymentTotals {
  totalPaid: number;
  totalOwed: number;
  completionPercentage: number;
}

/**
 * Calculate payment totals from participants
 * 
 * @param participants - Array of participant objects
 * @param totalAmount - Total amount for the split (optional, for completion percentage)
 * @returns Payment totals including completion percentage
 */
export function calculatePaymentTotals(
  participants: Participant[],
  totalAmount?: number
): PaymentTotals {
  if (!Array.isArray(participants)) {
    return { totalPaid: 0, totalOwed: 0, completionPercentage: 0 };
  }

  const totalPaid = participants.reduce(
    (sum: number, p: Participant) => sum + (p.amountPaid || 0),
    0
  );
  const totalOwed = participants.reduce(
    (sum: number, p: Participant) => sum + (p.amountOwed || 0),
    0
  );

  // Calculate completion percentage if total amount is provided
  const completionPercentage =
    totalAmount && totalAmount > 0 ? Math.min((totalPaid / totalAmount) * 100, 100) : 0;

  return { totalPaid, totalOwed, completionPercentage };
}

