/**
 * Split Data Migration Service
 * Migrates existing splits to use unified mockup data
 */

import { MockupDataService } from '../data/mockupData';
import { SplitStorageService, Split } from './splitStorageService';
import { logger } from './loggingService';

export class SplitDataMigrationService {
  /**
   * Migrate all existing splits to use unified mockup data
   */
  static async migrateAllSplits(): Promise<{
    success: boolean;
    migrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      console.log('🔄 SplitDataMigrationService: Starting migration of all splits...');

      // Get all splits (this is a simplified approach - in production you'd want pagination)
      const result = await SplitStorageService.getSplitsByStatus('active');
      
      if (!result.success || !result.splits) {
        return {
          success: false,
          migrated: 0,
          errors: ['Failed to retrieve splits for migration']
        };
      }

      const splits = result.splits;
      console.log(`🔄 SplitDataMigrationService: Found ${splits.length} splits to migrate`);

      for (const split of splits) {
        try {
          const migrationResult = await this.migrateSplit(split);
          if (migrationResult.success) {
            migrated++;
            console.log(`✅ Migrated split: ${split.id} (${split.title})`);
          } else {
            errors.push(`Failed to migrate split ${split.id}: ${migrationResult.error}`);
          }
        } catch (error) {
          const errorMsg = `Error migrating split ${split.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      console.log(`🔄 SplitDataMigrationService: Migration completed. Migrated: ${migrated}, Errors: ${errors.length}`);

      return {
        success: errors.length === 0,
        migrated,
        errors
      };

    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ SplitDataMigrationService:', errorMsg);
      
      return {
        success: false,
        migrated,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Migrate a single split to use unified mockup data
   */
  static async migrateSplit(split: Split): Promise<{ success: boolean; error?: string }> {
    try {
      const mockupData = MockupDataService.getPrimaryBillData();
      
      // Check if split needs migration
      const needsMigration = 
        split.totalAmount !== mockupData.totalAmount ||
        split.title !== mockupData.title ||
        split.merchant?.name !== mockupData.merchant;

      if (!needsMigration) {
        console.log(`⏭️ Split ${split.id} already uses unified data, skipping migration`);
        return { success: true };
      }

      console.log(`🔄 Migrating split ${split.id}:`, {
        oldAmount: split.totalAmount,
        newAmount: mockupData.totalAmount,
        oldTitle: split.title,
        newTitle: mockupData.title
      });

      // Update split with unified mockup data
      const updateData: Partial<Split> = {
        totalAmount: mockupData.totalAmount,
        title: mockupData.title,
        merchant: {
          name: mockupData.merchant,
          address: mockupData.location,
        },
        date: mockupData.date,
        // Update participant amounts for fair splits
        participants: split.splitType === 'fair' 
          ? split.participants.map(p => ({
              ...p,
              amountOwed: mockupData.totalAmount / split.participants.length
            }))
          : split.participants // For degen splits, keep original amounts
      };

      const updateResult = await SplitStorageService.updateSplit(split.id, updateData);
      
      if (updateResult.success) {
        logger.info('Split migrated successfully', {
          splitId: split.id,
          oldAmount: split.totalAmount,
          newAmount: mockupData.totalAmount
        }, 'SplitDataMigrationService');
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: updateResult.error || 'Failed to update split' 
        };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to migrate split', error, 'SplitDataMigrationService');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a new split with unified mockup data
   */
  static async createUnifiedSplit(
    creatorId: string,
    creatorName: string,
    splitType: 'fair' | 'degen',
    participants: Array<{
      userId: string;
      name: string;
      email?: string;
      walletAddress: string;
    }>
  ): Promise<{ success: boolean; split?: Split; error?: string }> {
    try {
      const mockupData = MockupDataService.getPrimaryBillData();
      
      const splitData: Omit<Split, 'id' | 'createdAt' | 'updatedAt' | 'firebaseDocId'> = {
        billId: mockupData.id,
        title: mockupData.title,
        description: `Split for ${mockupData.title}`,
        totalAmount: mockupData.totalAmount,
        currency: mockupData.currency,
        splitType,
        status: 'draft',
        creatorId,
        creatorName,
        participants: participants.map(p => ({
          userId: p.userId,
          name: p.name,
          email: p.email,
          walletAddress: p.walletAddress,
          amountOwed: splitType === 'fair' 
            ? mockupData.totalAmount / participants.length 
            : mockupData.totalAmount, // For degen, each participant owes the full amount
          amountPaid: 0,
          status: 'pending' as const,
        })),
        merchant: {
          name: mockupData.merchant,
          address: mockupData.location,
        },
        date: mockupData.date,
      };

      const result = await SplitStorageService.createSplit(splitData);
      
      if (result.success) {
        logger.info('Unified split created successfully', {
          splitId: result.split?.id,
          splitType,
          totalAmount: mockupData.totalAmount
        }, 'SplitDataMigrationService');
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create unified split', error, 'SplitDataMigrationService');
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Validate that all splits use unified mockup data
   */
  static async validateUnifiedData(): Promise<{
    isUnified: boolean;
    inconsistentSplits: Array<{
      id: string;
      title: string;
      issues: string[];
    }>;
  }> {
    try {
      const result = await SplitStorageService.getSplitsByStatus('active');
      
      if (!result.success || !result.splits) {
        return {
          isUnified: false,
          inconsistentSplits: [{
            id: 'error',
            title: 'Failed to retrieve splits',
            issues: ['Could not fetch splits for validation']
          }]
        };
      }

      const mockupData = MockupDataService.getPrimaryBillData();
      const inconsistentSplits: Array<{
        id: string;
        title: string;
        issues: string[];
      }> = [];

      for (const split of result.splits) {
        const issues: string[] = [];

        if (split.totalAmount !== mockupData.totalAmount) {
          issues.push(`Amount mismatch: ${split.totalAmount} vs ${mockupData.totalAmount}`);
        }

        if (split.title !== mockupData.title) {
          issues.push(`Title mismatch: "${split.title}" vs "${mockupData.title}"`);
        }

        if (split.merchant?.name !== mockupData.merchant) {
          issues.push(`Merchant mismatch: "${split.merchant?.name}" vs "${mockupData.merchant}"`);
        }

        if (issues.length > 0) {
          inconsistentSplits.push({
            id: split.id,
            title: split.title,
            issues
          });
        }
      }

      return {
        isUnified: inconsistentSplits.length === 0,
        inconsistentSplits
      };

    } catch (error) {
      logger.error('Failed to validate unified data', error, 'SplitDataMigrationService');
      return {
        isUnified: false,
        inconsistentSplits: [{
          id: 'error',
          title: 'Validation failed',
          issues: [error instanceof Error ? error.message : 'Unknown error']
        }]
      };
    }
  }
}

export default SplitDataMigrationService;
