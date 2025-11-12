/**
 * Split Navigation Helpers
 * 
 * Provides utility functions for creating consistent navigation parameters
 * for split-related screens. Ensures clean code and prevents duplication.
 */

import { ProcessedBillData, BillAnalysisResult } from '../../types/billAnalysis';
import { UnifiedBillData } from '../../types/splitNavigation';
import { SplitDetailsNavigationParams } from '../../types/splitNavigation';

/**
 * Default bill settings for new splits
 */
const DEFAULT_BILL_SETTINGS = {
  allowPartialPayments: true,
  requireAllAccept: false,
  autoCalculate: true,
  splitMethod: 'equal' as const,
  currency: 'USDC',
  taxIncluded: true,
} as const;

/**
 * Creates navigation parameters for SplitDetailsScreen from ProcessedBillData
 * 
 * This function ensures consistent data structure across both OCR and manual flows,
 * preventing duplication and ensuring type safety.
 * 
 * @param processedBillData - The processed bill data to navigate with
 * @param analysisResult - Optional analysis result metadata
 * @param isManualCreation - Whether this is from manual creation (true) or OCR (false)
 * @param imageUri - Optional image URI for OCR flows
 * @returns Navigation parameters for SplitDetailsScreen
 */
export function createSplitDetailsNavigationParams(
  processedBillData: ProcessedBillData,
  options: {
    analysisResult?: BillAnalysisResult;
    isManualCreation: boolean;
    imageUri?: string;
  }
): SplitDetailsNavigationParams {
  const { analysisResult, isManualCreation, imageUri } = options;

  // Transform items to navigation format
  const billItems = (processedBillData.items || []).map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity || 1,
    category: item.category || 'Other',
    participants: item.participants || [],
  }));

  // Transform participants to navigation format
  const billParticipants = (processedBillData.participants || []).map(p => ({
    id: p.id,
    name: p.name,
    walletAddress: p.walletAddress || p.wallet_address || '',
    status: p.status || 'pending',
    amountOwed: p.amountOwed || 0,
    items: p.items || [],
  }));

  // Create billData structure
  const billData: UnifiedBillData = {
    id: processedBillData.id,
    title: processedBillData.title,
    totalAmount: processedBillData.totalAmount,
    currency: processedBillData.currency,
    date: processedBillData.date,
    merchant: processedBillData.merchant,
    ...(imageUri && { billImageUrl: imageUri }),
    items: billItems,
    participants: billParticipants,
    settings: processedBillData.settings || DEFAULT_BILL_SETTINGS,
  };

  // Create navigation parameters - only include necessary data
  const navigationParams: SplitDetailsNavigationParams = {
    // Bill data structures (required)
    billData,
    processedBillData,
    
    // Analysis result (optional, only if provided)
    ...(analysisResult && { analysisResult }),
    
    // Flow identification
    isNewBill: true,
    isManualCreation,
    
    // Image URI (optional, only for OCR flows)
    ...(imageUri && { imageUri }),
  };

  return navigationParams;
}

/**
 * Validates ProcessedBillData before navigation
 * 
 * @param processedBillData - The data to validate
 * @returns Validation result with error message if invalid
 */
export function validateProcessedBillDataForNavigation(
  processedBillData: ProcessedBillData | null | undefined
): { isValid: boolean; error?: string } {
  if (!processedBillData) {
    return { isValid: false, error: 'Processed bill data is required' };
  }

  if (!processedBillData.title || processedBillData.title.trim().length === 0) {
    return { isValid: false, error: 'Bill title is required' };
  }

  if (!processedBillData.totalAmount || processedBillData.totalAmount <= 0) {
    return { isValid: false, error: 'Bill total amount must be greater than 0' };
  }

  if (!processedBillData.currency) {
    return { isValid: false, error: 'Bill currency is required' };
  }

  if (!processedBillData.date) {
    return { isValid: false, error: 'Bill date is required' };
  }

  return { isValid: true };
}

/**
 * Generates a unique bill ID
 * 
 * @returns A unique bill identifier
 */
export function generateBillId(): string {
  return `split_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

