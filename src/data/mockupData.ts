/**
 * Unified Mockup Data Service
 * Provides consistent mockup data across all split methods for AI integration preparation
 */

export interface MockupBillData {
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
  tip?: number;
  items: MockupBillItem[];
  participants: MockupParticipant[];
  settings: {
    allowPartialPayments: boolean;
    requireAllAccept: boolean;
    autoCalculate: boolean;
    splitMethod: 'equal' | 'manual' | 'degen';
    taxIncluded: boolean;
  };
}

export interface MockupBillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  participants: string[];
  isSelected: boolean;
}

export interface MockupParticipant {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  isPaid: boolean;
  isLocked?: boolean; // For degen splits
  amountLocked?: number; // For degen splits
}

export interface MockupSplitData {
  id: string;
  billId: string;
  title: string;
  description: string;
  totalAmount: number;
  currency: string;
  splitType: 'fair' | 'degen';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  creatorId: string;
  participants: MockupParticipant[];
  createdAt: string;
  updatedAt: string;
}

export class MockupDataService {
  // Primary mockup data - this is the single source of truth
  private static readonly PRIMARY_BILL_DATA: MockupBillData = {
    id: 'mockup_bill_001',
    title: 'Dinner at The Golden Spoon',
    merchant: 'The Golden Spoon',
    location: 'San Francisco, CA',
    date: '2025-01-15',
    time: '7:30 PM',
    currency: 'USDC',
    totalAmount: 75.00, // Consistent amount across all screens
    subtotal: 65.00,
    tax: 6.50,
    tip: 3.50,
    items: [
      {
        id: 'item_001',
        name: 'Grilled Salmon',
        price: 28.00,
        quantity: 1,
        category: 'main',
        participants: ['user_001', 'user_002'],
        isSelected: true,
      },
      {
        id: 'item_002',
        name: 'Caesar Salad',
        price: 16.00,
        quantity: 1,
        category: 'appetizer',
        participants: ['user_001'],
        isSelected: true,
      },
      {
        id: 'item_003',
        name: 'Pasta Carbonara',
        price: 24.00,
        quantity: 1,
        category: 'main',
        participants: ['user_002'],
        isSelected: true,
      },
      {
        id: 'item_004',
        name: 'Tiramisu',
        price: 12.00,
        quantity: 1,
        category: 'dessert',
        participants: ['user_001', 'user_002'],
        isSelected: true,
      },
      {
        id: 'item_005',
        name: 'Wine - Pinot Noir',
        price: 18.00,
        quantity: 1,
        category: 'beverage',
        participants: ['user_001', 'user_002'],
        isSelected: true,
      },
    ],
    participants: [
      {
        id: 'user_001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        amountOwed: 37.50, // Equal split: $75 / 2
        amountPaid: 0,
        isPaid: false,
        isLocked: false,
        amountLocked: 0,
      },
      {
        id: 'user_002',
        name: 'Bob Smith',
        email: 'bob@example.com',
        walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        amountOwed: 37.50, // Equal split: $75 / 2
        amountPaid: 0,
        isPaid: false,
        isLocked: false,
        amountLocked: 0,
      },
    ],
    settings: {
      allowPartialPayments: true,
      requireAllAccept: false,
      autoCalculate: true,
      splitMethod: 'equal',
      taxIncluded: true,
    },
  };


  /**
   * Get the primary mockup bill data (consistent across all screens)
   */
  static getPrimaryBillData(): MockupBillData {
    return { ...this.PRIMARY_BILL_DATA };
  }

  /**
   * Get mockup data by ID (only primary data available)
   */
  static getBillDataById(id: string): MockupBillData | null {
    if (id === this.PRIMARY_BILL_DATA.id) {
      return this.getPrimaryBillData();
    }
    return null;
  }

  /**
   * Get consistent bill name (always returns the same value)
   */
  static getBillName(): string {
    return this.PRIMARY_BILL_DATA.title;
  }

  /**
   * Get consistent bill amount (always returns the same value)
   */
  static getBillAmount(): number {
    return this.PRIMARY_BILL_DATA.totalAmount;
  }

  /**
   * Get consistent bill date (always returns the same value)
   */
  static getBillDate(): string {
    return this.PRIMARY_BILL_DATA.date;
  }

  /**
   * Get consistent merchant name (always returns the same value)
   */
  static getMerchantName(): string {
    return this.PRIMARY_BILL_DATA.merchant;
  }

  /**
   * Get consistent location (always returns the same value)
   */
  static getLocation(): string {
    return this.PRIMARY_BILL_DATA.location;
  }

  /**
   * Get consistent participants (always returns the same data)
   */
  static getParticipants(): MockupParticipant[] {
    return [...this.PRIMARY_BILL_DATA.participants];
  }

  /**
   * Create a split data object from bill data
   */
  static createSplitData(
    billData: MockupBillData,
    splitType: 'fair' | 'degen',
    creatorId: string
  ): MockupSplitData {
    const now = new Date().toISOString();
    
    return {
      id: `split_${billData.id}_${Date.now()}`,
      billId: billData.id,
      title: billData.title,
      description: `Split for ${billData.title}`,
      totalAmount: billData.totalAmount,
      currency: billData.currency,
      splitType,
      status: 'draft',
      creatorId,
      participants: billData.participants.map(p => ({
        ...p,
        amountOwed: splitType === 'fair' ? billData.totalAmount / billData.participants.length : billData.totalAmount,
        amountPaid: 0,
        isPaid: false,
        isLocked: splitType === 'degen' ? false : undefined,
        amountLocked: splitType === 'degen' ? 0 : undefined,
      })),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get all available mockup data sets (only primary data)
   */
  static getAllMockupData(): MockupBillData[] {
    return [this.getPrimaryBillData()];
  }

  /**
   * Validate that all screens are using consistent data
   */
  static validateDataConsistency(): {
    isConsistent: boolean;
    inconsistencies: string[];
    recommendations: string[];
  } {
    const inconsistencies: string[] = [];
    const recommendations: string[] = [];

    // Check if primary data is being used consistently
    const primaryData = this.getPrimaryBillData();
    
    // Validate total amount consistency
    if (primaryData.totalAmount !== 75.00) {
      inconsistencies.push(`Primary bill amount is ${primaryData.totalAmount}, expected 75.00`);
    }

    // Validate participant count
    if (primaryData.participants.length !== 2) {
      inconsistencies.push(`Participant count is ${primaryData.participants.length}, expected 2`);
    }

    // Validate equal split amounts
    const expectedAmountPerPerson = primaryData.totalAmount / primaryData.participants.length;
    const hasInconsistentAmounts = primaryData.participants.some(
      p => Math.abs(p.amountOwed - expectedAmountPerPerson) > 0.01
    );
    
    if (hasInconsistentAmounts) {
      inconsistencies.push('Participant amounts are not equal for fair split');
    }

    // Recommendations
    if (inconsistencies.length === 0) {
      recommendations.push('Data consistency is maintained across all screens');
    } else {
      recommendations.push('Use MockupDataService.getPrimaryBillData() for all screens');
      recommendations.push('Replace FallbackDataService with MockupDataService for consistent data');
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      recommendations,
    };
  }
}

// Export default instance for easy access
export default MockupDataService;
