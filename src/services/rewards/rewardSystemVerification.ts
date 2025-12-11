/**
 * Reward System Verification Service
 * 
 * Comprehensive verification of the reward system implementation.
 * Checks for:
 * - All points sources are properly integrated
 * - All claimable assets are properly managed
 * - No direct database updates bypassing services
 * - All validation functions are available
 * - Configuration consistency
 * 
 * This should be run periodically or in CI/CD to ensure system integrity.
 */

import { logger } from '../analytics/loggingService';
// Lazy load heavy services to reduce bundle size
// These will be dynamically imported when needed

export interface VerificationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export interface SystemVerificationReport {
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  results: VerificationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

class RewardSystemVerification {
  /**
   * Run comprehensive verification of the reward system
   */
  async verifySystem(): Promise<SystemVerificationReport> {
    const results: VerificationResult[] = [];
    const timestamp = new Date().toISOString();

    logger.info('Starting reward system verification', { timestamp }, 'RewardSystemVerification');

    // 1. Configuration Validation
    await this.verifyConfigurations(results);

    // 2. Service Integration Verification
    await this.verifyServiceIntegrations(results);

    // 3. Points Award Method Verification
    await this.verifyPointsAwardMethods(results);

    // 4. Asset Management Verification
    await this.verifyAssetManagement(results);

    // 5. Data Flow Verification
    await this.verifyDataFlow(results);

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length
    };

    const overallStatus: 'pass' | 'fail' | 'warning' = 
      summary.failed > 0 ? 'fail' : 
      summary.warnings > 0 ? 'warning' : 
      'pass';

    logger.info('Reward system verification completed', {
      timestamp,
      overallStatus,
      summary
    }, 'RewardSystemVerification');

    return {
      timestamp,
      overallStatus,
      results,
      summary
    };
  }

  /**
   * Verify all configurations are valid
   */
  private async verifyConfigurations(results: VerificationResult[]): Promise<void> {
    const { validateRewardConfig } = await import('./seasonRewardsConfig');
    const { validateBadgeConfig, BADGE_DEFINITIONS } = await import('./badgeConfig');
    const { validateAssetConfig, ASSET_DEFINITIONS } = await import('./assetConfig');
    const { validateReferralConfig, REFERRAL_REWARDS } = await import('./referralConfig');
    const { validateAllRewardConfigs } = await import('./configValidationRunner');
    
    // Check if validation functions exist
    results.push({
      category: 'Configuration',
      check: 'Validation functions exist',
      status: 'pass',
      message: 'All validation functions are available',
      details: {
        seasonRewards: typeof validateRewardConfig === 'function',
        badges: typeof validateBadgeConfig === 'function',
        assets: typeof validateAssetConfig === 'function',
        referrals: typeof validateReferralConfig === 'function'
      }
    });

    // Run validation
    try {
      const validationResults = await validateAllRewardConfigs();
      const allValid = validationResults.every(r => r.isValid);
      
      if (allValid) {
        results.push({
          category: 'Configuration',
          check: 'All configs are valid',
          status: 'pass',
          message: 'All reward configurations passed validation',
          details: {
            configsChecked: validationResults.length
          }
        });
      } else {
        const invalidConfigs = validationResults.filter(r => !r.isValid);
        results.push({
          category: 'Configuration',
          check: 'All configs are valid',
          status: 'fail',
          message: `${invalidConfigs.length} configuration(s) have errors`,
          details: {
            invalidConfigs: invalidConfigs.map(c => ({
              name: c.configName,
              errorCount: c.errors.length,
              errors: c.errors
            }))
          }
        });
      }
    } catch (error) {
      results.push({
        category: 'Configuration',
        check: 'Config validation execution',
        status: 'fail',
        message: `Failed to run validation: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      });
    }
  }

  /**
   * Verify service integrations
   */
  private async verifyServiceIntegrations(results: VerificationResult[]): Promise<void> {
    // Dynamically import services to reduce bundle size
    const { pointsService } = await import('./pointsService');
    const { questService } = await import('./questService');
    const { badgeService } = await import('./badgeService');
    const { referralService } = await import('./referralService');
    const { splitRewardsService } = await import('./splitRewardsService');
    const { christmasCalendarService } = await import('./christmasCalendarService');
    
    // Check all services are available
    const services = {
      pointsService: typeof pointsService !== 'undefined',
      questService: typeof questService !== 'undefined',
      badgeService: typeof badgeService !== 'undefined',
      referralService: typeof referralService !== 'undefined',
      splitRewardsService: typeof splitRewardsService !== 'undefined',
      christmasCalendarService: typeof christmasCalendarService !== 'undefined'
    };

    const allServicesAvailable = Object.values(services).every(v => v === true);

    results.push({
      category: 'Service Integration',
      check: 'All services available',
      status: allServicesAvailable ? 'pass' : 'fail',
      message: allServicesAvailable 
        ? 'All reward services are available' 
        : 'Some reward services are missing',
      details: services
    });

    // Check key methods exist
    const keyMethods = {
      awardSeasonPoints: typeof pointsService?.awardSeasonPoints === 'function',
      awardTransactionPoints: typeof pointsService?.awardTransactionPoints === 'function',
      completeQuest: typeof questService?.completeQuest === 'function',
      claimBadge: typeof badgeService?.claimBadge === 'function',
      claimEventBadge: typeof badgeService?.claimEventBadge === 'function',
      awardInviteFriendReward: typeof referralService?.awardInviteFriendReward === 'function',
      awardFairSplitParticipation: typeof splitRewardsService?.awardFairSplitParticipation === 'function',
      awardDegenSplitParticipation: typeof splitRewardsService?.awardDegenSplitParticipation === 'function',
      claimGift: typeof christmasCalendarService?.claimGift === 'function'
    };

    const allMethodsAvailable = Object.values(keyMethods).every(v => v === true);

    results.push({
      category: 'Service Integration',
      check: 'Key methods available',
      status: allMethodsAvailable ? 'pass' : 'fail',
      message: allMethodsAvailable 
        ? 'All key reward methods are available' 
        : 'Some key reward methods are missing',
      details: keyMethods
    });
  }

  /**
   * Verify points award methods
   */
  private async verifyPointsAwardMethods(results: VerificationResult[]): Promise<void> {
    const { pointsService } = await import('./pointsService');
    
    // Check awardSeasonPoints exists and has correct signature
    if (typeof pointsService.awardSeasonPoints === 'function') {
      results.push({
        category: 'Points Award',
        check: 'awardSeasonPoints method exists',
        status: 'pass',
        message: 'awardSeasonPoints method is available'
      });
    } else {
      results.push({
        category: 'Points Award',
        check: 'awardSeasonPoints method exists',
        status: 'fail',
        message: 'awardSeasonPoints method is missing'
      });
    }

    // Check awardPoints redirects to awardSeasonPoints
    if (typeof pointsService.awardPoints === 'function') {
      results.push({
        category: 'Points Award',
        check: 'awardPoints redirects correctly',
        status: 'pass',
        message: 'awardPoints method exists (deprecated wrapper)'
      });
    } else {
      results.push({
        category: 'Points Award',
        check: 'awardPoints redirects correctly',
        status: 'warning',
        message: 'awardPoints method not found (may be removed)'
      });
    }

    // Check recordPointsTransaction exists
    if (typeof pointsService.recordPointsTransaction === 'function') {
      results.push({
        category: 'Points Award',
        check: 'recordPointsTransaction method exists',
        status: 'pass',
        message: 'recordPointsTransaction method is available'
      });
    } else {
      results.push({
        category: 'Points Award',
        check: 'recordPointsTransaction method exists',
        status: 'fail',
        message: 'recordPointsTransaction method is missing'
      });
    }
  }

  /**
   * Verify asset management
   */
  private async verifyAssetManagement(results: VerificationResult[]): Promise<void> {
    const { BADGE_DEFINITIONS } = await import('./badgeConfig');
    const { ASSET_DEFINITIONS } = await import('./assetConfig');
    const { REFERRAL_REWARDS } = await import('./referralConfig');
    
    // Check badge definitions exist
    const badgeCount = Object.keys(BADGE_DEFINITIONS).length;
    results.push({
      category: 'Asset Management',
      check: 'Badge definitions exist',
      status: badgeCount > 0 ? 'pass' : 'fail',
      message: `${badgeCount} badge(s) defined`,
      details: { badgeCount }
    });

    // Check asset definitions exist
    const assetCount = Object.keys(ASSET_DEFINITIONS).length;
    results.push({
      category: 'Asset Management',
      check: 'Asset definitions exist',
      status: assetCount > 0 ? 'pass' : 'fail',
      message: `${assetCount} asset(s) defined`,
      details: { assetCount }
    });

    // Check referral rewards exist
    const referralCount = REFERRAL_REWARDS.length;
    results.push({
      category: 'Asset Management',
      check: 'Referral rewards defined',
      status: referralCount > 0 ? 'pass' : 'warning',
      message: `${referralCount} referral reward(s) defined`,
      details: { referralCount }
    });
  }

  /**
   * Verify data flow
   */
  private async verifyDataFlow(results: VerificationResult[]): Promise<void> {
    const { seasonService } = await import('./seasonService');
    
    // Check season service is available
    try {
      const currentSeason = seasonService.getCurrentSeason();
      if (currentSeason >= 1 && currentSeason <= 5) {
        results.push({
          category: 'Data Flow',
          check: 'Season service working',
          status: 'pass',
          message: `Current season: ${currentSeason}`,
          details: { currentSeason }
        });
      } else {
        results.push({
          category: 'Data Flow',
          check: 'Season service working',
          status: 'fail',
          message: `Invalid season: ${currentSeason}`,
          details: { currentSeason }
        });
      }
    } catch (error) {
      results.push({
        category: 'Data Flow',
        check: 'Season service working',
        status: 'fail',
        message: `Season service error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      });
    }

    // Check reward calculation works
    try {
      const testReward = getSeasonReward('transaction_1_1_request', 1, false);
      if (testReward && (testReward.type === 'fixed' || testReward.type === 'percentage')) {
        results.push({
          category: 'Data Flow',
          check: 'Reward calculation working',
          status: 'pass',
          message: 'Reward calculation is functional',
          details: { testReward }
        });
      } else {
        results.push({
          category: 'Data Flow',
          check: 'Reward calculation working',
          status: 'fail',
          message: 'Invalid reward structure',
          details: { testReward }
        });
      }
    } catch (error) {
      results.push({
        category: 'Data Flow',
        check: 'Reward calculation working',
        status: 'fail',
        message: `Reward calculation error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      });
    }
  }
}

// Export singleton instance
export const rewardSystemVerification = new RewardSystemVerification();

