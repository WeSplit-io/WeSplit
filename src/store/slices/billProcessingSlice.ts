/**
 * Bill Processing State Slice
 * Manages bill analysis and processing state
 */

import { StateCreator } from 'zustand';
import { BillProcessingState, BillProcessingActions, AppStore } from '../types';
import { logger } from '../../services/loggingService';

export const createBillProcessingSlice: StateCreator<
  AppStore,
  [],
  [],
  BillProcessingState & BillProcessingActions
> = (set, get) => ({
  // Initial state
  isProcessing: false,
  processingResult: null,
  extractedItems: [],
  totalAmount: 0,
  merchant: '',
  date: '',
  selectedCategory: 'restaurant',
  billName: '',
  isLoading: false,
  error: null,

  // Actions
  setProcessing: (processing: boolean) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        isProcessing: processing,
      },
    }));
  },

  setProcessingResult: (result: any) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        processingResult: result,
        isProcessing: false,
        error: null,
      },
    }));

    logger.info('Bill processing result set', { 
      hasResult: !!result,
      itemCount: result?.items?.length || 0 
    }, 'BillProcessingSlice');
  },

  setExtractedItems: (items: any[]) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        extractedItems: items,
        totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        error: null,
      },
    }));

    logger.info('Extracted items set', { itemCount: items.length }, 'BillProcessingSlice');
  },

  addExtractedItem: (item: any) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        extractedItems: [...state.billProcessing.extractedItems, item],
        totalAmount: state.billProcessing.totalAmount + (item.price * item.quantity),
        error: null,
      },
    }));

    logger.info('Extracted item added', { itemName: item.name }, 'BillProcessingSlice');
  },

  updateExtractedItem: (itemId: string, updates: any) => {
    set((state) => {
      const updatedItems = state.billProcessing.extractedItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        billProcessing: {
          ...state.billProcessing,
          extractedItems: updatedItems,
          totalAmount: newTotalAmount,
          error: null,
        },
      };
    });

    logger.info('Extracted item updated', { itemId, updates: Object.keys(updates) }, 'BillProcessingSlice');
  },

  removeExtractedItem: (itemId: string) => {
    set((state) => {
      const updatedItems = state.billProcessing.extractedItems.filter(item => item.id !== itemId);
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        billProcessing: {
          ...state.billProcessing,
          extractedItems: updatedItems,
          totalAmount: newTotalAmount,
          error: null,
        },
      };
    });

    logger.info('Extracted item removed', { itemId }, 'BillProcessingSlice');
  },

  setTotalAmount: (amount: number) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        totalAmount: amount,
        error: null,
      },
    }));
  },

  setMerchant: (merchant: string) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        merchant,
        error: null,
      },
    }));
  },

  setDate: (date: string) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        date,
        error: null,
      },
    }));
  },

  setSelectedCategory: (category: string) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        selectedCategory: category,
        error: null,
      },
    }));
  },

  setBillName: (name: string) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        billName: name,
        error: null,
      },
    }));
  },

  setBillProcessingLoading: (loading: boolean) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        isLoading: loading,
      },
    }));
  },

  setBillProcessingError: (error: string | null) => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        error,
      },
    }));
  },

  clearBillProcessingError: () => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        error: null,
      },
    }));
  },

  resetBillProcessing: () => {
    set((state) => ({
      billProcessing: {
        isProcessing: false,
        processingResult: null,
        extractedItems: [],
        totalAmount: 0,
        merchant: '',
        date: '',
        selectedCategory: 'restaurant',
        billName: '',
        isLoading: false,
        error: null,
      },
    }));

    logger.info('Bill processing state reset', null, 'BillProcessingSlice');
  },

  processBill: async (imageUri: string, processingMethod: 'ai' | 'mock' = 'ai') => {
    set((state) => ({
      billProcessing: {
        ...state.billProcessing,
        isProcessing: true,
        isLoading: true,
        error: null,
      },
    }));

    try {
      // This would need to be implemented based on your bill processing service
      // const result = await billProcessingService.processBill(imageUri, processingMethod);
      const result = {
        success: true,
        items: [
          {
            id: '1',
            name: 'Sample Item',
            price: 10.00,
            quantity: 1,
            category: 'food',
            participants: [],
          },
        ],
        totalAmount: 10.00,
        merchant: 'Sample Restaurant',
        date: new Date().toISOString().split('T')[0],
      };
      
      set((state) => ({
        billProcessing: {
          ...state.billProcessing,
          isProcessing: false,
          isLoading: false,
          processingResult: result,
          extractedItems: result.items,
          totalAmount: result.totalAmount,
          merchant: result.merchant,
          date: result.date,
          error: null,
        },
      }));

      logger.info('Bill processed successfully', { 
        processingMethod,
        itemCount: result.items.length,
        totalAmount: result.totalAmount 
      }, 'BillProcessingSlice');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process bill';
      
      set((state) => ({
        billProcessing: {
          ...state.billProcessing,
          isProcessing: false,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to process bill', { 
        processingMethod,
        error: errorMessage 
      }, 'BillProcessingSlice');

      return { success: false, error: errorMessage };
    }
  },
});
