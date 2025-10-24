/**
 * Manual Split Creation Service
 * Handles the creation of splits from manual entry (not OCR AI)
 * Focused service for manual bill creation process
 */

import { ProcessedBillData } from '../../types/billAnalysis';
import { SplitStorageService, Split } from '../splits/splitStorageService';
import { consolidatedBillAnalysisService } from './consolidatedBillAnalysisService';
import { logger } from '../core';
import { ServiceErrorHandler } from '../../utils/core/serviceErrorHandler';

export interface ManualSplitCreationData {
  processedBillData: ProcessedBillData;
  currentUser: any;
  billName: string;
  totalAmount: string;
  participants: any[];
  selectedSplitType?: string;
}

export interface ManualSplitCreationResult {
  success: boolean;
  split?: Split;
  splitWallet?: any; // Add wallet information
  error?: string;
}

export class ManualSplitCreationService {
  /**
   * Create a split from manual entry data
   */
  static async createManualSplit(data: ManualSplitCreationData): Promise<ManualSplitCreationResult> {
    return ServiceErrorHandler.handleServiceError(
      async () => {
        logger.info('Creating manual split', {
          title: data.processedBillData.title,
          totalAmount: data.processedBillData.totalAmount,
          participantsCount: data.processedBillData.participants.length
        });

      // Ensure required fields are always present for validation
      const processedDataForValidation = {
        ...data.processedBillData,
        location: data.processedBillData.location || '',
        time: data.processedBillData.time || new Date().toISOString().split('T')[1].split('.')[0],
        settings: data.processedBillData.settings || {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal',
          currency: 'USDC',
          taxIncluded: true
        }
      };
      
      // Validate the processed data
      const validation = consolidatedBillAnalysisService.validateProcessedBillData(processedDataForValidation);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // OPTIMIZED: Wallet creation moved to split type selection (FairSplit/DegenLock screens)
      // Removed wallet creation logic - focuses on split creation only

      // Ensure the creator is included as a participant - NO WALLET CREATION
      const allParticipants = [...data.processedBillData.participants];
      
      // Check if creator is already in participants, if not add them
      const creatorExists = allParticipants.some(p => p.id === data.currentUser.id.toString());
      if (!creatorExists) {
        allParticipants.push({
          id: data.currentUser.id.toString(),
          name: data.currentUser.name,
          walletAddress: '', // Empty until wallet is created
          wallet_address: '', // Empty until wallet is created
          amountOwed: 0, // Will be calculated
          status: 'accepted', // Creator should be accepted, not pending
          items: []
        });
      }

      // Create split data
      const splitData = {
        billId: data.processedBillData.id,
        title: data.processedBillData.title,
        description: `Manual split for ${data.processedBillData.title}`,
        totalAmount: data.processedBillData.totalAmount,
        currency: data.processedBillData.currency,
        // Remove splitType field entirely - will be set when user chooses in SplitDetailsScreen
        status: 'pending' as const, // Split starts as pending until user confirms repartition
        creatorId: data.currentUser.id.toString(),
        creatorName: data.currentUser.name,
        participants: allParticipants.map(p => ({
          userId: p.id,
          name: p.name,
          email: '',
          walletAddress: p.walletAddress || p.wallet_address || '',
          amountOwed: p.amountOwed,
          amountPaid: 0,
          status: p.id === data.currentUser.id.toString() ? 'accepted' as const : 'pending' as const,
          avatar: p.id === data.currentUser.id.toString() ? data.currentUser.avatar : undefined,
        })),
        items: data.processedBillData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          participants: item.participants,
        })),
        merchant: {
          name: data.processedBillData.merchant,
          address: data.processedBillData.location || '',
          phone: '',
        },
        date: data.processedBillData.date,
        // walletId and walletAddress removed - will be set when wallet is created in FairSplit/DegenLock
      };

      // Create the split in the database
      const createResult = await SplitStorageService.createSplit(splitData);
      
      if (createResult.success && createResult.split) {
        logger.info('Manual split created successfully', { splitId: createResult.split.id }, 'manualSplitCreationService');
        
        return {
          success: true,
          split: createResult.split,
          // splitWallet removed - will be created in FairSplit/DegenLock screens
        };
      } else {
        return {
          success: false,
          error: createResult.error || 'Failed to create split'
        };
      }
      },
      {
        screen: 'ManualSplitCreation',
        function: 'createManualSplit',
        operation: 'create manual split',
        userId: data.currentUser.id
      },
      {
        returnErrorResult: true,
        errorCode: 'MANUAL_SPLIT_CREATION_ERROR'
      }
    );
  }
}

export default ManualSplitCreationService;
