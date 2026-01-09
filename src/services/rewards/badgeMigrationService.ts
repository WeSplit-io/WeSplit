/**
 * Badge Migration Service
 * Provides functions to migrate badges from config to Firestore
 * Can be called from the app or admin screens
 */

import { badgeService } from './badgeService';
import { logger } from '../analytics/loggingService';

export interface MigrationResult {
  success: number;
  skipped: number;
  errors: Array<{ badgeId: string; error: string }>;
}

/**
 * Migrate all event/community badges to Firestore
 * This can be called from an admin screen or on app startup
 */
export async function migrateBadgesToFirestore(overwrite: boolean = false): Promise<MigrationResult> {
  try {
    logger.info('Starting badge migration to Firestore', { overwrite }, 'BadgeMigrationService');
    
    const result = await badgeService.migrateBadgesToFirestore(overwrite);
    
    logger.info('Badge migration completed', {
      success: result.success,
      skipped: result.skipped,
      errors: result.errors.length
    }, 'BadgeMigrationService');
    
    return result;
  } catch (error) {
    logger.error('Badge migration failed', { error }, 'BadgeMigrationService');
    throw error;
  }
}

/**
 * Test connection to Firestore badges collection
 */
export async function testBadgeConnection(): Promise<{ success: boolean; badgeCount: number; error?: string }> {
  return badgeService.testBadgeConnection();
}
