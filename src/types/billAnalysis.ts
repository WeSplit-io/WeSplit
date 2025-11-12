/**
 * Bill Analysis Types
 * Types for bill processing and analysis functionality
 */

export interface BillAnalysisData {
  id: string;
  title: string;
  location?: string;
  time?: string;
  totalAmount: number;
  currency: string;
  items: BillItem[];
  participants: BillParticipant[];
  settings?: BillSettings;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  total: number;
  participants?: any;
}

export interface BillParticipant {
  id: string;
  name: string;
  wallet_address: string;
  walletAddress?: string;
  amountOwed: number;
  items: string[];
  status?: 'pending' | 'paid' | 'cancelled' | 'accepted';
}

export interface BillSettings {
  splitMethod: 'equal' | 'manual';
  currency: string;
  taxRate?: number;
  tipRate?: number;
  allowPartialPayments?: boolean;
  requireAllAccept?: boolean;
  autoCalculate?: boolean;
  taxIncluded?: boolean;
}

export interface BillAnalysisResult {
  success: boolean;
  data?: BillAnalysisData;
  error?: string;
  processingTime?: number;
  confidence?: number;
}

export interface ProcessedBillData {
  id: string;
  title: string;
  merchant: string;
  location?: string;
  date: string;
  time?: string;
  totalAmount: number;
  subtotal?: number;
  tax?: number;
  currency: string;
  items: BillItem[];
  participants: BillParticipant[];
  settings?: BillSettings;
  // OCR-extracted additional data
  merchantPhone?: string; // Merchant phone number from receipt
  receiptNumber?: string; // Receipt number from OCR
  // Validation warnings (optional, for user feedback)
  validationWarnings?: {
    itemsSumMismatch?: boolean; // Items sum doesn't match total
    subtotalTaxMismatch?: boolean; // Subtotal + tax doesn't match total
  };
  // OCR metadata
  ocrCategory?: string; // Category extracted by OCR
}

export interface OCRProcessingResult {
  success: boolean;
  data?: ProcessedBillData;
  error?: string;
}

export interface BillSplitCreationData {
  billData: BillAnalysisData;
  splitMethod: 'equal' | 'manual';
  participants: BillParticipant[];
}