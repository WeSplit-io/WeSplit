// Bill Analysis Types

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category?: string;
}

export interface BillParticipant {
  id: string;
  name: string;
  walletAddress: string;
  items: BillItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'confirmed';
}

export interface BillData {
  id: string;
  merchant: string;
  date: string;
  totalAmount: number;
  currency: string;
  items: BillItem[];
  participants: BillParticipant[];
  tax?: number;
  tip?: number;
  isProcessed: boolean;
  source: 'manual' | 'ocr' | 'import';
  confidence?: number;
}

export interface ProcessedBillData extends BillData {
  isFallback: boolean;
  source: 'manual' | 'ocr' | 'import';
  confidence: number;
  processingTime: number;
  errors?: string[];
}

export interface DataSourceResult<T> {
  value: T;
  source: 'manual' | 'ocr' | 'import';
  confidence: number;
  isFallback: boolean;
}

export interface BillAnalysisResult {
  amount: DataSourceResult<number>;
  name: DataSourceResult<string>;
  currency: DataSourceResult<string>;
  date: DataSourceResult<string>;
  merchant: DataSourceResult<string>;
  participants: DataSourceResult<BillParticipant[]>;
}

export interface OCRConfig {
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
}

export interface BillProcessingOptions {
  autoDetectParticipants: boolean;
  requireConfirmation: boolean;
  defaultTaxRate: number;
  defaultTipRate: number;
}
