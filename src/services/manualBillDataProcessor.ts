/**
 * Manual Bill Data Processor
 * Processes manually created bill data to match the same format as OCR AI processing
 * Ensures seamless integration with the existing split creation flow
 */

import { 
  BillAnalysisData, 
  ProcessedBillData, 
  ExtendedBillItem, 
  BillParticipant,
  BillSplitSettings 
} from '../types/billAnalysis';

export interface ManualBillInput {
  category: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  location?: string;
  description?: string;
}

export class ManualBillDataProcessor {
  /**
   * Process manual bill input into the same format as OCR AI processing
   */
  static processManualBillData(
    manualInput: BillAnalysisData,
    currentUser?: { id: string; name: string; wallet_address: string }
  ): ProcessedBillData {
    const billId = this.generateBillId();
    
    console.log('🔄 ManualBillDataProcessor: Processing manual bill data:', {
      merchant: manualInput.store.name,
      total: manualInput.transaction.order_total,
      currency: manualInput.currency,
      category: manualInput.category
    });

    // Convert items to extended format (same as OCR processing)
    const extendedItems: ExtendedBillItem[] = manualInput.transaction.items.map((item, index) => ({
      id: `${billId}_item_${index}`,
      name: item.name,
      price: item.price,
      quantity: 1, // Default to 1 for manual entries
      category: this.categorizeItem(item.name, manualInput.category),
      participants: [], // Will be populated when participants are added
      isSelected: true, // All items selected by default
    }));

    // Create default participants with real user data if available
    const defaultParticipants: BillParticipant[] = [
      {
        id: currentUser ? currentUser.id : `${billId}_participant_1`,
        name: currentUser ? currentUser.name : 'You',
        walletAddress: currentUser ? currentUser.wallet_address : 'Your wallet address',
        status: 'accepted',
        amountOwed: 0, // Will be calculated based on split method
        items: [],
      }
    ];

    // Default settings (same as OCR processing)
    const defaultSettings: BillSplitSettings = {
      allowPartialPayments: true,
      requireAllAccept: false,
      autoCalculate: true,
      splitMethod: 'equal',
      taxIncluded: true,
    };

    const processedData: ProcessedBillData = {
      id: billId,
      title: `${manualInput.store.name} - ${this.formatDate(manualInput.transaction.date)}`,
      merchant: manualInput.store.name,
      location: this.formatLocation(manualInput.store.location),
      date: this.formatDate(manualInput.transaction.date),
      time: manualInput.transaction.time,
      currency: manualInput.currency,
      totalAmount: manualInput.transaction.order_total,
      subtotal: manualInput.transaction.sub_total,
      tax: manualInput.transaction.sales_tax,
      items: extendedItems,
      participants: defaultParticipants,
      settings: defaultSettings,
      originalAnalysis: manualInput,
    };

    console.log('✅ ManualBillDataProcessor: Successfully processed manual bill data:', {
      billId: processedData.id,
      title: processedData.title,
      totalAmount: processedData.totalAmount,
      itemsCount: processedData.items.length,
      participantsCount: processedData.participants.length
    });

    return processedData;
  }

  /**
   * Create manual bill data from simple input
   */
  static createManualBillData(
    input: ManualBillInput,
    currentUser?: { id: string; name: string; wallet_address: string }
  ): BillAnalysisData {
    return {
      category: input.category,
      country: 'USA', // Default, could be enhanced with location detection
      currency: input.currency,
      store: {
        name: input.name,
        location: {
          address: input.location || '',
          city: '',
          state: '',
          zip_code: '',
          phone: '',
        },
        store_id: `manual_${Date.now()}`,
      },
      transaction: {
        date: input.date.toISOString().split('T')[0],
        time: input.date.toLocaleTimeString(),
        order_id: `manual_${Date.now()}`,
        employee: '',
        items: [
          {
            name: input.name,
            price: input.amount,
          },
        ],
        sub_total: input.amount,
        sales_tax: 0,
        order_total: input.amount,
        calculated_total: input.amount,
      },
    };
  }

  /**
   * Generate a unique bill ID (same format as OCR processing)
   */
  private static generateBillId(): string {
    return `split_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Categorize items based on their names and main category
   */
  private static categorizeItem(itemName: string, mainCategory: string): string {
    const name = itemName.toLowerCase();
    
    // Use main category as base, then refine based on item name
    switch (mainCategory.toLowerCase()) {
      case 'food & drinks':
        if (name.includes('burger') || name.includes('sandwich') || name.includes('wrap')) {
          return 'Main Course';
        }
        if (name.includes('fry') || name.includes('fries') || name.includes('chips')) {
          return 'Sides';
        }
        if (name.includes('soda') || name.includes('drink') || name.includes('beverage') || name.includes('coffee')) {
          return 'Beverages';
        }
        if (name.includes('dessert') || name.includes('cake') || name.includes('ice cream')) {
          return 'Desserts';
        }
        if (name.includes('salad') || name.includes('vegetable')) {
          return 'Salads & Vegetables';
        }
        return 'Food Items';
        
      case 'travel & transport':
        if (name.includes('flight') || name.includes('plane') || name.includes('airline')) {
          return 'Flight';
        }
        if (name.includes('hotel') || name.includes('accommodation')) {
          return 'Accommodation';
        }
        if (name.includes('taxi') || name.includes('uber') || name.includes('lyft')) {
          return 'Transportation';
        }
        if (name.includes('rental') || name.includes('car')) {
          return 'Car Rental';
        }
        return 'Travel';
        
      case 'events & entertainment':
        if (name.includes('ticket') || name.includes('concert') || name.includes('show')) {
          return 'Tickets';
        }
        if (name.includes('movie') || name.includes('cinema') || name.includes('film')) {
          return 'Movies';
        }
        if (name.includes('game') || name.includes('gaming')) {
          return 'Gaming';
        }
        return 'Entertainment';
        
      case 'shopping & essentials':
        if (name.includes('clothing') || name.includes('shirt') || name.includes('dress')) {
          return 'Clothing';
        }
        if (name.includes('grocery') || name.includes('food') || name.includes('supermarket')) {
          return 'Groceries';
        }
        if (name.includes('electronics') || name.includes('phone') || name.includes('computer')) {
          return 'Electronics';
        }
        return 'Shopping';
        
      case 'housing & utilities':
        if (name.includes('rent') || name.includes('mortgage')) {
          return 'Housing';
        }
        if (name.includes('electric') || name.includes('water') || name.includes('gas')) {
          return 'Utilities';
        }
        if (name.includes('internet') || name.includes('wifi') || name.includes('cable')) {
          return 'Internet & Cable';
        }
        return 'Housing';
        
      default:
        return 'Other';
    }
  }

  /**
   * Format date from various formats to a consistent format
   */
  private static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  }

  /**
   * Format location information
   */
  private static formatLocation(location: any): string {
    if (!location) return '';
    
    const parts = [
      location.city,
      location.state,
      location.zip_code
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Validate manual bill input
   */
  static validateManualInput(input: ManualBillInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim() === '') {
      errors.push('Bill name is required');
    }

    if (!input.amount || input.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!input.currency || input.currency.trim() === '') {
      errors.push('Currency is required');
    }

    if (!input.category || input.category.trim() === '') {
      errors.push('Category is required');
    }

    if (!input.date || isNaN(input.date.getTime())) {
      errors.push('Valid date is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert manual bill to split creation format
   */
  static convertToSplitData(
    processedData: ProcessedBillData,
    splitType: 'fair' | 'degen',
    creatorId: string
  ) {
    return {
      billId: processedData.id,
      title: processedData.title,
      description: `Split for ${processedData.title}`,
      totalAmount: processedData.totalAmount,
      currency: processedData.currency,
      splitType,
      status: 'draft' as const,
      creatorId,
      participants: processedData.participants.map(p => ({
        userId: p.id,
        name: p.name,
        email: '', // Email not available in BillParticipant type
        walletAddress: p.walletAddress,
        amountOwed: splitType === 'fair' 
          ? processedData.totalAmount / processedData.participants.length 
          : processedData.totalAmount,
        amountPaid: 0,
        status: 'pending' as const,
      })),
      merchant: {
        name: processedData.merchant,
        address: processedData.location,
      },
      date: processedData.date,
    };
  }

  /**
   * Get category suggestions based on merchant name
   */
  static getCategorySuggestions(merchantName: string): string[] {
    const name = merchantName.toLowerCase();
    const suggestions: string[] = [];

    // Food & Drinks
    if (name.includes('restaurant') || name.includes('cafe') || name.includes('bar') || 
        name.includes('pizza') || name.includes('burger') || name.includes('coffee')) {
      suggestions.push('Food & Drinks');
    }

    // Travel & Transport
    if (name.includes('hotel') || name.includes('airline') || name.includes('taxi') || 
        name.includes('uber') || name.includes('lyft') || name.includes('rental')) {
      suggestions.push('Travel & Transport');
    }

    // Events & Entertainment
    if (name.includes('cinema') || name.includes('theater') || name.includes('concert') || 
        name.includes('stadium') || name.includes('arena')) {
      suggestions.push('Events & Entertainment');
    }

    // Shopping & Essentials
    if (name.includes('store') || name.includes('shop') || name.includes('market') || 
        name.includes('mall') || name.includes('supermarket')) {
      suggestions.push('Shopping & Essentials');
    }

    // Housing & Utilities
    if (name.includes('electric') || name.includes('water') || name.includes('gas') || 
        name.includes('internet') || name.includes('cable')) {
      suggestions.push('Housing & Utilities');
    }

    // Default suggestions if no matches
    if (suggestions.length === 0) {
      suggestions.push('Food & Drinks', 'Shopping & Essentials', 'Other');
    }

    return suggestions;
  }
}

export default ManualBillDataProcessor;
