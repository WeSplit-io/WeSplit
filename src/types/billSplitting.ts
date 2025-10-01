/**
 * Bill Splitting Types
 * Defines the data structures for the bill splitting system
 */

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  participants: string[]; // User IDs who are splitting this item
}

export interface BillParticipant {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  status: 'pending' | 'accepted' | 'declined';
  amountOwed: number;
  items: string[]; // Bill item IDs this participant is responsible for
  joinedAt?: string;
  respondedAt?: string;
}

export interface BillSplit {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  date: string;
  location?: string;
  merchant?: string;
  billImageUrl?: string;
  processedImageUrl?: string; // URL of the processed/OCR result image
  
  // OCR Processing Results
  ocrResults?: {
    rawText: string;
    extractedItems: BillItem[];
    totalAmount: number;
    confidence: number;
    processingDate: string;
  };
  
  // Participants
  participants: BillParticipant[];
  createdBy: string; // User ID of creator
  createdAt: string;
  updatedAt: string;
  
  // Status
  status: 'draft' | 'pending' | 'active' | 'completed' | 'cancelled';
  
  // Settings
  settings: {
    allowPartialPayments: boolean;
    requireAllAccept: boolean;
    autoCalculate: boolean;
    splitMethod: 'equal' | 'by_items' | 'custom';
  };
}

export interface BillSplitSummary {
  id: string;
  title: string;
  totalAmount: number;
  currency: string;
  date: string;
  participantCount: number;
  acceptedCount: number;
  status: BillSplit['status'];
  createdBy: string;
  createdAt: string;
}

export interface OCRProcessingResult {
  success: boolean;
  rawText: string;
  extractedItems: BillItem[];
  totalAmount: number;
  confidence: number;
  processingTime: number;
  error?: string;
}

export interface BillSplitCreationData {
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  date: string;
  location?: string;
  merchant?: string;
  billImageUrl?: string;
  items: BillItem[];
  participants: Omit<BillParticipant, 'id' | 'status' | 'amountOwed' | 'items'>[];
  settings: BillSplit['settings'];
}

export interface BillSplitUpdateData {
  title?: string;
  description?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  location?: string;
  merchant?: string;
  items?: BillItem[];
  participants?: BillParticipant[];
  settings?: Partial<BillSplit['settings']>;
}

export interface ParticipantResponse {
  participantId: string;
  status: 'accepted' | 'declined';
  respondedAt: string;
  message?: string;
}

export interface BillSplitFilters {
  status?: BillSplit['status'][];
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  createdBy?: string;
  participantId?: string;
}

export interface BillSplitStats {
  totalSplits: number;
  totalAmount: number;
  averageAmount: number;
  pendingSplits: number;
  completedSplits: number;
  totalOwed: number;
  totalOwedToYou: number;
}

// Navigation types for bill splitting screens
export interface BillSplitNavigationParams {
  SplitsList: undefined;
  BillCamera: undefined;
  BillProcessing: {
    imageUri: string;
    billData?: Partial<BillSplitCreationData>;
  };
  SplitDetails: {
    splitId?: string;
    billData?: BillSplitCreationData;
  };
  SplitSettings: {
    splitId: string;
  };
  ParticipantManagement: {
    splitId: string;
  };
}
