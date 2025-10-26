/**
 * Split Data Validation Service
 * Provides comprehensive validation and consistency checks for split data
 */

import { SplitWallet, SplitWalletParticipant } from '../../types/unified';
import { priceManagementService } from '../../services/core/priceManagementService';

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'price' | 'participants' | 'wallet' | 'data_consistency';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixable: boolean;
  suggestedFix?: string;
}

export class SplitDataValidationService {
  /**
   * Validate split wallet data comprehensively
   */
  static validateSplitWallet(wallet: SplitWallet): ValidationResult {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Validate basic wallet structure
    this.validateWalletStructure(wallet, issues);
    
    // Validate price consistency
    this.validatePriceConsistency(wallet, issues);
    
    // Validate participant data
    this.validateParticipantData(wallet, issues);
    
    // Validate data consistency
    this.validateDataConsistency(wallet, issues);

    // Generate recommendations
    this.generateRecommendations(issues, recommendations);

    return {
      isValid: issues.filter(i => i.type === 'error' || i.severity === 'critical').length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Validate wallet structure
   */
  private static validateWalletStructure(wallet: SplitWallet, issues: ValidationIssue[]): void {
    if (!wallet.id || wallet.id.trim() === '') {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Wallet ID is missing or empty',
        severity: 'critical',
        fixable: false
      });
    }

    if (!wallet.address || wallet.address.trim() === '') {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Wallet address is missing or empty',
        severity: 'critical',
        fixable: false
      });
    }

    if (wallet.balance < 0) {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Wallet balance cannot be negative',
        severity: 'critical',
        fixable: true,
        suggestedFix: 'Set balance to a non-negative value'
      });
    }

    if (!wallet.currency || wallet.currency.trim() === '') {
      issues.push({
        type: 'warning',
        category: 'wallet',
        message: 'Currency is missing or empty',
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Set currency to USDC'
      });
    }

    if (!wallet.participants || wallet.participants.length === 0) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: 'No participants found in wallet',
        severity: 'critical',
        fixable: false
      });
    }
  }

  /**
   * Validate price consistency
   */
  private static validatePriceConsistency(wallet: SplitWallet, issues: ValidationIssue[]): void {
    // Check wallet balance consistency
    if (wallet.balance < 0) {
      issues.push({
        type: 'error',
        category: 'price',
        message: `Wallet balance (${wallet.balance}) cannot be negative`,
        severity: 'critical',
        fixable: true,
        suggestedFix: 'Set balance to a non-negative value'
      });
    }

    // Check if balance is reasonable (not too high)
    if (wallet.balance > 1000000) { // 1M USDC limit
      issues.push({
        type: 'warning',
        category: 'price',
        message: `Wallet balance (${wallet.balance}) seems unusually high`,
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Verify balance amount'
      });
    }
  }

  /**
   * Validate participant data
   */
  private static validateParticipantData(wallet: SplitWallet, issues: ValidationIssue[]): void {
    if (!wallet.participants || wallet.participants.length === 0) {
      return; // Already handled in structure validation
    }

    // Check total participant shares
    const totalShares = wallet.participants.reduce((sum, p) => sum + p.share, 0);
    if (totalShares <= 0) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Total participant shares (${totalShares}) must be greater than 0`,
        severity: 'high',
        fixable: true,
        suggestedFix: 'Set participant shares to positive values'
      });
    }

    // Check individual participant data
    wallet.participants.forEach((participant, index) => {
      this.validateIndividualParticipant(participant, index, issues);
    });

    // Check for duplicate participants
    const userIds = wallet.participants.map(p => p.userId);
    const duplicateUserIds = userIds.filter((id, index) => userIds.indexOf(id) !== index);
    if (duplicateUserIds.length > 0) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Found duplicate participants: ${duplicateUserIds.join(', ')}`,
        severity: 'high',
        fixable: true,
        suggestedFix: 'Remove duplicate participants'
      });
    }
  }

  /**
   * Validate individual participant
   */
  private static validateIndividualParticipant(participant: SplitWalletParticipant, index: number, issues: ValidationIssue[]): void {
    if (!participant.userId || participant.userId.trim() === '') {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Participant ${index + 1} has missing or empty user ID`,
        severity: 'critical',
        fixable: false
      });
    }

    if (!participant.name || participant.name.trim() === '') {
      issues.push({
        type: 'warning',
        category: 'participants',
        message: `Participant ${index + 1} has missing or empty name`,
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Set participant name'
      });
    }

    if (!participant.walletAddress || participant.walletAddress.trim() === '') {
      issues.push({
        type: 'warning',
        category: 'participants',
        message: `Participant ${index + 1} has missing or empty wallet address`,
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Set participant wallet address'
      });
    }

    if (participant.share < 0) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Participant ${index + 1} has negative share (${participant.share})`,
        severity: 'high',
        fixable: true,
        suggestedFix: 'Set share to a positive value'
      });
    }

    if (participant.share === 0) {
      issues.push({
        type: 'warning',
        category: 'participants',
        message: `Participant ${index + 1} has zero share`,
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Set share to a positive value'
      });
    }

    // Validate isActive status
    if (typeof participant.isActive !== 'boolean') {
      issues.push({
        type: 'warning',
        category: 'participants',
        message: `Participant ${index + 1} has invalid isActive status: ${participant.isActive}`,
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Set isActive to true or false'
      });
    }
  }

  /**
   * Validate data consistency
   */
  private static validateDataConsistency(wallet: SplitWallet, issues: ValidationIssue[]): void {
    // Check if all participants have the same share (for equal splits)
    if (wallet.participants.length > 1) {
      const firstShare = wallet.participants[0].share;
      const allEqual = wallet.participants.every(p => Math.abs(p.share - firstShare) < 0.01);
      
      if (!allEqual) {
        issues.push({
          type: 'info',
          category: 'data_consistency',
          message: 'Participant shares are not equal - this may be intentional for manual splits',
          severity: 'low',
          fixable: false
        });
      }
    }

    // Check timestamp consistency
    if (wallet.updated_at && wallet.created_at) {
      const created = new Date(wallet.created_at);
      const updated = new Date(wallet.updated_at);
      
      if (updated < created) {
        issues.push({
          type: 'warning',
          category: 'data_consistency',
          message: 'Updated timestamp is before created timestamp',
          severity: 'medium',
          fixable: true,
          suggestedFix: 'Fix timestamp ordering'
        });
      }
    }

    // Check if all participants are active
    const inactiveParticipants = wallet.participants.filter(p => !p.isActive);
    if (inactiveParticipants.length > 0) {
      issues.push({
        type: 'info',
        category: 'data_consistency',
        message: `${inactiveParticipants.length} participants are inactive`,
        severity: 'low',
        fixable: true,
        suggestedFix: 'Consider activating participants or removing inactive ones'
      });
    }
  }

  /**
   * Generate recommendations based on issues
   */
  private static generateRecommendations(issues: ValidationIssue[], recommendations: string[]): void {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');

    if (criticalIssues.length > 0) {
      recommendations.push('Fix critical issues immediately - these prevent the split from functioning');
    }

    if (highIssues.length > 0) {
      recommendations.push('Address high-severity issues to ensure data integrity');
    }

    if (mediumIssues.length > 0) {
      recommendations.push('Consider fixing medium-severity issues for better user experience');
    }

    if (issues.filter(i => i.category === 'price').length > 0) {
      recommendations.push('Use centralized price management service for consistent pricing');
    }

    if (issues.filter(i => i.category === 'participants').length > 0) {
      recommendations.push('Validate participant data before creating split wallets');
    }

    if (issues.filter(i => i.fixable).length > 0) {
      recommendations.push('Use the repair functions to automatically fix fixable issues');
    }
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(validationResult: ValidationResult): string {
    const { isValid, issues } = validationResult;
    
    if (isValid && issues.length === 0) {
      return '✅ All validations passed - split data is consistent and valid';
    }

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    let summary = `❌ Validation failed with ${issues.length} issues:\n`;
    
    if (criticalCount > 0) {summary += `  🔴 ${criticalCount} critical issues\n`;}
    if (highCount > 0) {summary += `  🟠 ${highCount} high-severity issues\n`;}
    if (mediumCount > 0) {summary += `  🟡 ${mediumCount} medium-severity issues\n`;}
    if (lowCount > 0) {summary += `  🔵 ${lowCount} low-severity issues\n`;}

    return summary.trim();
  }
}

export default SplitDataValidationService;
