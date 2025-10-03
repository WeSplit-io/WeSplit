/**
 * Bill Data Processor
 * Processes incoming AI/OCR bill data and converts it to unified format
 */

import { MockupDataService, MockupBillData, MockupBillItem, MockupParticipant } from '../data/mockupData';

export interface IncomingBillData {
  category: string;
  country: string;
  currency: string;
  store: {
    name: string;
    location: {
      address: string;
      city: string;
      state: string;
      zip_code: string;
      phone: string;
    };
    store_id: string;
  };
  transaction: {
    date: string;
    time: string;
    order_id: string;
    employee: string;
    items: Array<{
      name: string;
      price: number;
    }>;
    sub_total: number;
    sales_tax: number;
    order_total: number;
    calculated_total: number;
  };
}

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
  originalData?: IncomingBillData; // Keep original for reference
}

export class BillDataProcessor {
  /**
   * Process incoming AI/OCR bill data into unified format
   */
  static processIncomingBillData(
    incomingData: IncomingBillData,
    currentUser?: { id: string; name: string; email: string; wallet_address: string }
  ): ProcessedBillData {
    try {
      console.log('🔄 BillDataProcessor: Processing incoming bill data:', {
        merchant: incomingData.store.name,
        total: incomingData.transaction.order_total,
        itemsCount: incomingData.transaction.items.length
      });

      // Generate unique bill ID
      const billId = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Process items
      const processedItems: MockupBillItem[] = incomingData.transaction.items.map((item, index) => ({
        id: `item_${billId}_${index}`,
        name: item.name,
        price: item.price,
        quantity: 1, // Default to 1, could be enhanced to detect quantities
        category: this.categorizeItem(item.name),
        participants: [], // Will be populated when participants are added
        isSelected: true,
      }));

      // Create default participants (current user + one friend)
      const participants: MockupParticipant[] = this.createDefaultParticipants(
        currentUser,
        incomingData.transaction.order_total
      );

      // Format date
      const formattedDate = this.formatDate(incomingData.transaction.date);

      // Create location string
      const location = `${incomingData.store.location.city}, ${incomingData.store.location.state}`;

      const processedData: ProcessedBillData = {
        id: billId,
        title: `${incomingData.store.name} - ${formattedDate}`,
        merchant: incomingData.store.name,
        location: location,
        date: formattedDate,
        time: incomingData.transaction.time,
        currency: incomingData.currency,
        totalAmount: incomingData.transaction.order_total,
        subtotal: incomingData.transaction.sub_total,
        tax: incomingData.transaction.sales_tax,
        tip: this.calculateTip(incomingData.transaction.order_total, incomingData.transaction.sub_total),
        items: processedItems,
        participants: participants,
        settings: {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal',
          taxIncluded: true,
        },
        originalData: incomingData, // Keep original for reference
      };

      console.log('✅ BillDataProcessor: Successfully processed bill data:', {
        billId: processedData.id,
        title: processedData.title,
        totalAmount: processedData.totalAmount,
        itemsCount: processedData.items.length,
        participantsCount: processedData.participants.length
      });

      return processedData;

    } catch (error) {
      console.error('❌ BillDataProcessor: Error processing incoming bill data:', error);
      
      // Fallback to mockup data if processing fails
      console.log('🔄 BillDataProcessor: Falling back to mockup data');
      return this.getFallbackData();
    }
  }

  /**
   * Get fallback mockup data if processing fails
   */
  static getFallbackData(): ProcessedBillData {
    const mockupData = MockupDataService.getPrimaryBillData();
    
    return {
      id: mockupData.id,
      title: mockupData.title,
      merchant: mockupData.merchant,
      location: mockupData.location,
      date: mockupData.date,
      time: mockupData.time,
      currency: mockupData.currency,
      totalAmount: mockupData.totalAmount,
      subtotal: mockupData.subtotal,
      tax: mockupData.tax,
      tip: mockupData.tip,
      items: mockupData.items,
      participants: mockupData.participants,
      settings: mockupData.settings,
    };
  }

  /**
   * Categorize item based on name
   */
  private static categorizeItem(itemName: string): string {
    const name = itemName.toLowerCase();
    
    if (name.includes('burger') || name.includes('sandwich') || name.includes('pizza') || name.includes('pasta')) {
      return 'main';
    } else if (name.includes('salad') || name.includes('soup') || name.includes('appetizer')) {
      return 'appetizer';
    } else if (name.includes('drink') || name.includes('soda') || name.includes('coffee') || name.includes('wine') || name.includes('beer')) {
      return 'beverage';
    } else if (name.includes('dessert') || name.includes('cake') || name.includes('ice cream') || name.includes('pie')) {
      return 'dessert';
    } else if (name.includes('side') || name.includes('fry') || name.includes('chips')) {
      return 'side';
    } else {
      return 'other';
    }
  }

  /**
   * Create default participants
   */
  private static createDefaultParticipants(
    currentUser?: { id: string; name: string; email: string; wallet_address: string },
    totalAmount?: number
  ): MockupParticipant[] {
    const participants: MockupParticipant[] = [];

    // Add current user if available
    if (currentUser) {
      participants.push({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        walletAddress: currentUser.wallet_address,
        amountOwed: totalAmount ? totalAmount / 2 : 37.50, // Default to 2 participants
        amountPaid: 0,
        isPaid: false,
        isLocked: false,
        amountLocked: 0,
      });
    }

    // Add a default friend
    participants.push({
      id: 'friend_001',
      name: 'Friend',
      email: 'friend@example.com',
      walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      amountOwed: totalAmount ? totalAmount / 2 : 37.50,
      amountPaid: 0,
      isPaid: false,
      isLocked: false,
      amountLocked: 0,
    });

    return participants;
  }

  /**
   * Format date from various formats
   */
  private static formatDate(dateString: string): string {
    try {
      // Handle different date formats
      let date: Date;
      
      if (dateString.includes('/')) {
        // Format: "2/11/2017"
        const [month, day, year] = dateString.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateString.includes('-')) {
        // Format: "2017-02-11"
        date = new Date(dateString);
      } else {
        // Try parsing as is
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }

      // Format as "15 Jan. 2025"
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.warn('BillDataProcessor: Error formatting date, using current date:', error);
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  /**
   * Calculate tip amount
   */
  private static calculateTip(orderTotal: number, subtotal: number): number {
    const tip = orderTotal - subtotal;
    return tip > 0 ? tip : 0;
  }

  /**
   * Validate incoming bill data
   */
  static validateIncomingData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.store?.name) {
      errors.push('Store name is required');
    }

    if (!data.transaction?.order_total || data.transaction.order_total <= 0) {
      errors.push('Valid order total is required');
    }

    if (!data.transaction?.items || data.transaction.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (!data.currency) {
      errors.push('Currency is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert processed data back to split creation format
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
        email: p.email,
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
}

export default BillDataProcessor;
