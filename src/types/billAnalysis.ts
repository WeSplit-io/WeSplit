/**
 * Types for bill analysis data structure from OCR processing
 */

export interface BillItem {
  name: string;
  price: number;
}

export interface StoreLocation {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
}

export interface Store {
  name: string;
  location: StoreLocation;
  store_id: string;
}

export interface Transaction {
  date: string;
  time: string;
  order_id: string;
  employee: string;
  items: BillItem[];
  sub_total: number;
  sales_tax: number;
  order_total: number;
  calculated_total: number;
}

export interface BillAnalysisData {
  category: string;
  country: string;
  currency: string;
  store: Store;
  transaction: Transaction;
}

/**
 * Extended bill item for frontend use
 */
export interface ExtendedBillItem extends BillItem {
  id: string;
  quantity: number;
  category: string;
  participants: string[]; // Array of participant IDs
  isSelected: boolean;
}

/**
 * Processed bill data for split creation
 */
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
  items: ExtendedBillItem[];
  participants: BillParticipant[];
  settings: BillSplitSettings;
  originalAnalysis: BillAnalysisData;
}

export interface BillParticipant {
  id: string;
  name: string;
  walletAddress: string;
  status: 'pending' | 'accepted' | 'declined';
  amountOwed: number;
  items: string[]; // Array of item IDs this participant is responsible for
}

export interface BillSplitSettings {
  allowPartialPayments: boolean;
  requireAllAccept: boolean;
  autoCalculate: boolean;
  splitMethod: 'equal' | 'by_items' | 'manual';
  taxIncluded: boolean;
}

/**
 * Bill analysis result with processing status
 */
export interface BillAnalysisResult {
  success: boolean;
  data?: BillAnalysisData;
  error?: string;
  processingTime: number;
  confidence: number;
  rawText?: string;
}
