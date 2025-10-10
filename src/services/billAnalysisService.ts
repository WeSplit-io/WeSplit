/**
 * Bill Analysis Service
 * Handles processing of structured bill data from OCR analysis
 */

import { 
  BillAnalysisData, 
  ProcessedBillData, 
  ExtendedBillItem, 
  BillParticipant,
  BillSplitSettings 
} from '../types/billAnalysis';
import { calculateEqualSplit } from '../utils/currencyUtils';

export class BillAnalysisService {
  /**
   * Process raw bill analysis data into frontend-ready format
   */
  static processBillData(analysisData: BillAnalysisData, currentUser?: { id: string; name: string; wallet_address: string }): ProcessedBillData {
    const billId = this.generateBillId();
    
    // Convert items to extended format
    const extendedItems: ExtendedBillItem[] = analysisData.transaction.items.map((item, index) => ({
      id: `${billId}_item_${index}`,
      name: item.name,
      price: item.price,
      quantity: 1, // Default to 1, could be enhanced to detect quantities
      category: this.categorizeItem(item.name),
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

    // Default settings
    const defaultSettings: BillSplitSettings = {
      allowPartialPayments: true,
      requireAllAccept: false,
      autoCalculate: true,
      splitMethod: 'equal',
      taxIncluded: true,
    };

    return {
      id: billId,
      title: `${analysisData.store.name} - ${this.formatDate(analysisData.transaction.date)}`,
      merchant: analysisData.store.name,
      location: this.formatLocation(analysisData.store.location),
      date: this.formatDate(analysisData.transaction.date),
      time: analysisData.transaction.time,
      currency: analysisData.currency,
      totalAmount: analysisData.transaction.order_total,
      subtotal: analysisData.transaction.sub_total,
      tax: analysisData.transaction.sales_tax,
      items: extendedItems,
      participants: defaultParticipants,
      settings: defaultSettings,
      originalAnalysis: analysisData,
    };
  }

  /**
   * Generate a unique bill ID
   * Use consistent format that matches other services
   */
  private static generateBillId(): string {
    return `split_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Categorize items based on their names
   */
  private static categorizeItem(itemName: string): string {
    const name = itemName.toLowerCase();
    
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
    if (name.includes('sauce') || name.includes('dressing') || name.includes('mayo') || name.includes('ketchup')) {
      return 'Condiments';
    }
    
    return 'Other';
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
   * Calculate equal split amounts
   */
  static calculateEqualSplit(totalAmount: number, participantCount: number): number {
    return calculateEqualSplit(totalAmount, participantCount);
  }

  /**
   * Calculate split by items
   */
  static calculateItemBasedSplit(
    items: ExtendedBillItem[], 
    participants: BillParticipant[]
  ): { [participantId: string]: number } {
    const amounts: { [participantId: string]: number } = {};
    
    // Initialize amounts
    participants.forEach(participant => {
      amounts[participant.id] = 0;
    });

    // Calculate based on item assignments
    items.forEach(item => {
      if (item.participants.length === 0) {
        // If no participants assigned, split equally among all
        const amountPerPerson = item.price / participants.length;
        participants.forEach(participant => {
          amounts[participant.id] += amountPerPerson;
        });
      } else {
        // Split among assigned participants
        const amountPerPerson = item.price / item.participants.length;
        item.participants.forEach(participantId => {
          amounts[participantId] += amountPerPerson;
        });
      }
    });

    return amounts;
  }

  /**
   * Validate bill data
   */
  static validateBillData(data: ProcessedBillData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim() === '') {
      errors.push('Bill title is required');
    }

    if (!data.merchant || data.merchant.trim() === '') {
      errors.push('Merchant name is required');
    }

    if (data.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (!data.participants || data.participants.length === 0) {
      errors.push('At least one participant is required');
    }

    // Validate items
    data.items.forEach((item, index) => {
      if (!item.name || item.name.trim() === '') {
        errors.push(`Item ${index + 1} name is required`);
      }
      if (item.price < 0) {
        errors.push(`Item ${index + 1} price cannot be negative`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update participant amounts based on split method
   */
  static updateParticipantAmounts(
    data: ProcessedBillData,
    splitMethod: 'equal' | 'by_items' | 'manual'
  ): ProcessedBillData {
    const updatedData = { ...data };
    
    switch (splitMethod) {
      case 'equal':
        const equalAmount = this.calculateEqualSplit(data.totalAmount, data.participants.length);
        updatedData.participants = data.participants.map(participant => ({
          ...participant,
          amountOwed: equalAmount,
        }));
        break;
        
      case 'by_items':
        const itemAmounts = this.calculateItemBasedSplit(data.items, data.participants);
        updatedData.participants = data.participants.map(participant => ({
          ...participant,
          amountOwed: itemAmounts[participant.id] || 0,
        }));
        break;
        
      case 'manual':
        // Manual amounts are set by user, no automatic calculation
        break;
    }

    return updatedData;
  }

  /**
   * Add participant to bill
   */
  static addParticipant(
    data: ProcessedBillData,
    participant: Omit<BillParticipant, 'id' | 'amountOwed' | 'items'>
  ): ProcessedBillData {
    const newParticipant: BillParticipant = {
      ...participant,
      id: `${data.id}_participant_${data.participants.length + 1}`,
      amountOwed: 0,
      items: [],
    };

    const updatedData = {
      ...data,
      participants: [...data.participants, newParticipant],
    };

    // Recalculate amounts based on current split method
    return this.updateParticipantAmounts(updatedData, data.settings.splitMethod);
  }

  /**
   * Remove participant from bill
   */
  static removeParticipant(data: ProcessedBillData, participantId: string): ProcessedBillData {
    const updatedData = {
      ...data,
      participants: data.participants.filter(p => p.id !== participantId),
    };

    // Recalculate amounts based on current split method
    return this.updateParticipantAmounts(updatedData, data.settings.splitMethod);
  }

  /**
   * Assign item to participant
   */
  static assignItemToParticipant(
    data: ProcessedBillData,
    itemId: string,
    participantId: string
  ): ProcessedBillData {
    const updatedData = { ...data };
    
    // Update item participants
    updatedData.items = data.items.map(item => {
      if (item.id === itemId) {
        const newParticipants = item.participants.includes(participantId)
          ? item.participants.filter(id => id !== participantId)
          : [...item.participants, participantId];
        
        return {
          ...item,
          participants: newParticipants,
        };
      }
      return item;
    });

    // Recalculate amounts if using item-based split
    if (data.settings.splitMethod === 'by_items') {
      return this.updateParticipantAmounts(updatedData, 'by_items');
    }

    return updatedData;
  }
}
