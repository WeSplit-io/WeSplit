/**
 * Bill Splitting Types
 * Types for bill splitting functionality
 */

export interface BillParticipant {
  id: string;
  name: string;
  wallet_address: string;
  amountOwed: number;
  items: string[];
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

export interface ProcessedBillData {
  title: string;
  location?: string;
  time?: string;
  totalAmount: number;
  currency: string;
  items: BillItem[];
  participants: BillParticipant[];
  settings?: BillSettings;
}

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

export interface BillSettings {
  splitMethod: 'equal' | 'manual';
  currency: string;
  taxRate?: number;
  tipRate?: number;
}

export interface BillSplitSummary {
  id: string;
  title: string;
  totalAmount: number;
  currency: string;
  participantCount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}