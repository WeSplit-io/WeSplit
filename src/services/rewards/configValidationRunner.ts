/**
 * Configuration Validation Runner
 * 
 * This service validates all reward-related configurations to ensure they are correct.
 * Should be called during app startup, in tests, or in CI/CD pipeline.
 * 
 * Usage:
 * ```typescript
 * import { validateAllRewardConfigs } from './configValidationRunner';
 * 
 * const errors = await validateAllRewardConfigs();
 * if (errors.length > 0) {
 *   console.error('Configuration errors found:', errors);
 *   // Handle errors (throw, log, etc.)
 * }
 * ```
 */

import { logger } from '../analytics/loggingService';
import { validateRewardConfig } from './seasonRewardsConfig';
import { validateBadgeConfig } from './badgeConfig';
import { validateAssetConfig } from './assetConfig';
import { validateReferralConfig } from './referralConfig';

export interface ValidationResult {
  configName: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Validate all reward-related configurations
 * 
 * @returns Array of validation results for each config
 */
export async function validateAllRewardConfigs(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  logger.info('Starting reward configuration validation', {}, 'ConfigValidationRunner');

  // Validate season rewards config
  try {
    const rewardErrors = validateRewardConfig();
    results.push({
      configName: 'seasonRewardsConfig',
      isValid: rewardErrors.length === 0,
      errors: rewardErrors
    });
    if (rewardErrors.length > 0) {
      logger.error('Season rewards config validation failed', { errors: rewardErrors }, 'ConfigValidationRunner');
    } else {
      logger.info('Season rewards config validation passed', {}, 'ConfigValidationRunner');
    }
  } catch (error) {
    logger.error('Failed to validate season rewards config', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    }, 'ConfigValidationRunner');
    results.push({
      configName: 'seasonRewardsConfig',
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
    });
  }

  // Validate badge config
  try {
    const badgeErrors = validateBadgeConfig();
    results.push({
      configName: 'badgeConfig',
      isValid: badgeErrors.length === 0,
      errors: badgeErrors
    });
    if (badgeErrors.length > 0) {
      logger.error('Badge config validation failed', { errors: badgeErrors }, 'ConfigValidationRunner');
    } else {
      logger.info('Badge config validation passed', {}, 'ConfigValidationRunner');
    }
  } catch (error) {
    logger.error('Failed to validate badge config', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    }, 'ConfigValidationRunner');
    results.push({
      configName: 'badgeConfig',
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
    });
  }

  // Validate asset config
  try {
    const assetErrors = validateAssetConfig();
    results.push({
      configName: 'assetConfig',
      isValid: assetErrors.length === 0,
      errors: assetErrors
    });
    if (assetErrors.length > 0) {
      logger.error('Asset config validation failed', { errors: assetErrors }, 'ConfigValidationRunner');
    } else {
      logger.info('Asset config validation passed', {}, 'ConfigValidationRunner');
    }
  } catch (error) {
    logger.error('Failed to validate asset config', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    }, 'ConfigValidationRunner');
    results.push({
      configName: 'assetConfig',
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
    });
  }

  // Validate referral config
  try {
    const referralErrors = validateReferralConfig();
    results.push({
      configName: 'referralConfig',
      isValid: referralErrors.length === 0,
      errors: referralErrors
    });
    if (referralErrors.length > 0) {
      logger.error('Referral config validation failed', { errors: referralErrors }, 'ConfigValidationRunner');
    } else {
      logger.info('Referral config validation passed', {}, 'ConfigValidationRunner');
    }
  } catch (error) {
    logger.error('Failed to validate referral config', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    }, 'ConfigValidationRunner');
    results.push({
      configName: 'referralConfig',
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
    });
  }

  // Summary
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const invalidConfigs = results.filter(r => !r.isValid).length;

  if (totalErrors === 0) {
    logger.info('All reward configurations are valid', {
      configsChecked: results.length,
      totalErrors: 0
    }, 'ConfigValidationRunner');
  } else {
    logger.error('Reward configuration validation found errors', {
      configsChecked: results.length,
      invalidConfigs,
      totalErrors
    }, 'ConfigValidationRunner');
  }

  return results;
}

/**
 * Check if all configurations are valid
 * 
 * @returns True if all configs are valid, false otherwise
 */
export async function areAllConfigsValid(): Promise<boolean> {
  const results = await validateAllRewardConfigs();
  return results.every(r => r.isValid);
}

/**
 * Get all validation errors from all configs
 * 
 * @returns Array of all error messages
 */
export async function getAllValidationErrors(): Promise<string[]> {
  const results = await validateAllRewardConfigs();
  const allErrors: string[] = [];
  
  results.forEach(result => {
    if (!result.isValid) {
      allErrors.push(`[${result.configName}] ${result.errors.join(', ')}`);
    }
  });
  
  return allErrors;
}

