/**
 * Split Data Validation Service
 * Provides comprehensive validation and consistency checks for split data
 */

import { SplitWallet, SplitWalletParticipant } from './split';
import { priceManagementService } from './priceManagementService';
import { MockupDataService } from '../data/mockupData';

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

    if (!wallet.billId || wallet.billId.trim() === '') {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Bill ID is missing or empty',
        severity: 'critical',
        fixable: false
      });
    }

    if (!wallet.creatorId || wallet.creatorId.trim() === '') {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Creator ID is missing or empty',
        severity: 'critical',
        fixable: false
      });
    }

    if (!wallet.walletAddress || wallet.walletAddress.trim() === '') {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Wallet address is missing or empty',
        severity: 'critical',
        fixable: false
      });
    }

    if (wallet.totalAmount <= 0) {
      issues.push({
        type: 'error',
        category: 'wallet',
        message: 'Total amount must be greater than 0',
        severity: 'critical',
        fixable: true,
        suggestedFix: 'Set total amount to a positive value'
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
    // Check against authoritative price
    const authoritativePrice = priceManagementService.getBillPrice(wallet.billId);
    if (authoritativePrice) {
      const difference = Math.abs(authoritativePrice.amount - wallet.totalAmount);
      if (difference > 0.01) {
        issues.push({
          type: 'warning',
          category: 'price',
          message: `Wallet amount (${wallet.totalAmount}) differs from authoritative price (${authoritativePrice.amount})`,
          severity: 'medium',
          fixable: true,
          suggestedFix: 'Update wallet amount to match authoritative price'
        });
      }
    }

    // Check against mockup data
    const mockupAmount = MockupDataService.getBillAmount();
    const mockupDifference = Math.abs(mockupAmount - wallet.totalAmount);
    if (mockupDifference > 0.01) {
      issues.push({
        type: 'info',
        category: 'price',
        message: `Wallet amount (${wallet.totalAmount}) differs from mockup data (${mockupAmount})`,
        severity: 'low',
        fixable: true,
        suggestedFix: 'Consider using mockup data for consistency'
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

    // Check total participant amounts
    const totalParticipantAmounts = wallet.participants.reduce((sum, p) => sum + p.amountOwed, 0);
    const difference = Math.abs(totalParticipantAmounts - wallet.totalAmount);
    if (difference > 0.01) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Participant amounts total (${totalParticipantAmounts}) doesn't match wallet total (${wallet.totalAmount})`,
        severity: 'high',
        fixable: true,
        suggestedFix: 'Recalculate participant amounts to match wallet total'
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

    if (participant.amountOwed < 0) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Participant ${index + 1} has negative amount owed (${participant.amountOwed})`,
        severity: 'high',
        fixable: true,
        suggestedFix: 'Set amount owed to a positive value'
      });
    }

    if (participant.amountPaid < 0) {
      issues.push({
        type: 'error',
        category: 'participants',
        message: `Participant ${index + 1} has negative amount paid (${participant.amountPaid})`,
        severity: 'high',
        fixable: true,
        suggestedFix: 'Set amount paid to a positive value'
      });
    }

    if (participant.amountPaid > participant.amountOwed) {
      issues.push({
        type: 'warning',
        category: 'participants',
        message: `Participant ${index + 1} has paid more (${participant.amountPaid}) than they owe (${participant.amountOwed})`,
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Verify payment amounts'
      });
    }

    // Check for data corruption: amountOwed = 0 but amountPaid > 0
    if (participant.amountOwed === 0 && participant.amountPaid > 0) {
      issues.push({
        type: 'error',
        category: 'data_consistency',
        message: `Participant ${index + 1} has corrupted data: amountOwed=0 but amountPaid=${participant.amountPaid}`,
        severity: 'critical',
        fixable: true,
        suggestedFix: 'Recalculate amountOwed based on wallet total and participant count'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'locked', 'paid', 'failed'];
    if (!validStatuses.includes(participant.status)) {
      issues.push({
        type: 'warning',
        category: 'participants',
        message: `Participant ${index + 1} has invalid status: ${participant.status}`,
        severity: 'medium',
        fixable: true,
        suggestedFix: `Set status to one of: ${validStatuses.join(', ')}`
      });
    }
  }

  /**
   * Validate data consistency
   */
  private static validateDataConsistency(wallet: SplitWallet, issues: ValidationIssue[]): void {
    // Check if all participants have the same amountOwed (for equal splits)
    if (wallet.participants.length > 1) {
      const firstAmount = wallet.participants[0].amountOwed;
      const allEqual = wallet.participants.every(p => Math.abs(p.amountOwed - firstAmount) < 0.01);
      
      if (!allEqual) {
        issues.push({
          type: 'info',
          category: 'data_consistency',
          message: 'Participant amounts are not equal - this may be intentional for manual splits',
          severity: 'low',
          fixable: false
        });
      }
    }

    // Check wallet status consistency
    const validStatuses = ['active', 'locked', 'completed', 'cancelled'];
    if (!validStatuses.includes(wallet.status)) {
      issues.push({
        type: 'warning',
        category: 'wallet',
        message: `Invalid wallet status: ${wallet.status}`,
        severity: 'medium',
        fixable: true,
        suggestedFix: `Set status to one of: ${validStatuses.join(', ')}`
      });
    }

    // Check timestamp consistency
    if (wallet.updatedAt && wallet.createdAt) {
      const created = new Date(wallet.createdAt);
      const updated = new Date(wallet.updatedAt);
      
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
