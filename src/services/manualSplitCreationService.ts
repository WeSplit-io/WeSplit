/**
 * Manual Split Creation Service
 * Handles the creation of splits from manual entry (not OCR AI)
 * Focused service for manual bill creation process
 */

import { ProcessedBillData } from '../types/billAnalysis';
import { SplitStorageService, Split } from './splitStorageService';
import { SplitWalletService } from './split';
import { consolidatedBillAnalysisService } from './consolidatedBillAnalysisService';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';

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
        console.log('🔍 ManualSplitCreationService: Creating manual split:', {
          title: data.processedBillData.title,
          totalAmount: data.processedBillData.totalAmount,
          participantsCount: data.processedBillData.participants.length
        });

      // Validate the processed data
      const validation = consolidatedBillAnalysisService.validateIncomingData(data.processedBillData as any);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create wallet first
      const walletResult = await SplitWalletService.createSplitWallet(
        data.processedBillData.id,
        data.currentUser.id.toString(),
        data.processedBillData.totalAmount,
        data.processedBillData.currency || 'USDC',
        data.processedBillData.participants.map(p => ({
          userId: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
        }))
      );

      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Failed to create split wallet'
        };
      }

      console.log('✅ ManualSplitCreationService: Wallet created successfully:', {
        walletId: walletResult.wallet.id,
        walletAddress: walletResult.wallet.walletAddress
      });

      // Ensure the creator is included as a participant
      const allParticipants = [...data.processedBillData.participants];
      
      // Check if creator is already in participants, if not add them
      const creatorExists = allParticipants.some(p => p.id === data.currentUser.id.toString());
      if (!creatorExists) {
        allParticipants.push({
          id: data.currentUser.id.toString(),
          name: data.currentUser.name,
          walletAddress: data.currentUser.wallet_address || '',
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
        splitType: 'fair' as const,
        status: 'pending' as const, // Split starts as pending until user confirms repartition
        creatorId: data.currentUser.id.toString(),
        creatorName: data.currentUser.name,
        participants: allParticipants.map(p => ({
          userId: p.id,
          name: p.name,
          email: '',
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
          amountPaid: 0,
          status: p.id === data.currentUser.id.toString() ? 'accepted' as const : 'pending' as const,
        })),
        items: data.processedBillData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          participants: item.participants,
        })),
        merchant: {
          name: data.processedBillData.merchant,
          address: data.processedBillData.location,
          phone: '',
        },
        date: data.processedBillData.date,
        walletId: walletResult.wallet.id,
        walletAddress: walletResult.wallet.walletAddress,
      };

      // Create the split in the database
      const createResult = await SplitStorageService.createSplit(splitData);
      
      if (createResult.success && createResult.split) {
        console.log('✅ ManualSplitCreationService: Manual split created successfully:', createResult.split.id);
        
        return {
          success: true,
          split: createResult.split,
          splitWallet: walletResult.wallet
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
