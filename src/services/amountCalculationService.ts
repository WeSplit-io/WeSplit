/**
 * Amount Calculation Service
 * Centralized service for all amount calculations in fair split handling
 * Eliminates code duplication and ensures consistency across the application
 */

import { calculateEqualSplit } from '../utils/currencyUtils';

export interface Participant {
  id: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  amountLocked: number;
  status: 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined' | 'paid';
}

export interface AmountCalculationResult {
  amountPerPerson: number;
  totalAmount: number;
  participantCount: number;
  isValid: boolean;
  errors: string[];
}

export class AmountCalculationService {
  /**
   * Calculate equal split amount per person
   * @param totalAmount Total bill amount
   * @param participantCount Number of participants
   * @returns Amount each person should pay
   */
  static calculateEqualSplit(totalAmount: number, participantCount: number): number {
    return calculateEqualSplit(totalAmount, participantCount);
  }

  /**
   * Calculate participant amounts based on split method
   * @param totalAmount Total bill amount
   * @param participants Array of participants
   * @param method Split method ('equal' or 'manual')
   * @returns Updated participants with calculated amounts
   */
  static calculateParticipantAmounts(
    totalAmount: number,
    participants: Participant[],
    method: 'equal' | 'manual' = 'equal'
  ): Participant[] {
    if (!participants || participants.length === 0) {
      console.warn('AmountCalculationService: No participants provided');
      return [];
    }

    if (method === 'equal') {
      const amountPerPerson = this.calculateEqualSplit(totalAmount, participants.length);
      return participants.map(participant => ({
        ...participant,
        amountOwed: amountPerPerson
      }));
    }

    // For manual method, keep existing amounts but validate they sum to total
    return participants;
  }

  /**
   * Validate that participant amounts sum to total amount
   * @param participants Array of participants
   * @param totalAmount Expected total amount
   * @param tolerance Allowed difference (default: 0.01)
   * @returns Validation result
   */
  static validateAmounts(
    participants: Participant[],
    totalAmount: number,
    tolerance: number = 0.01
  ): AmountCalculationResult {
    const errors: string[] = [];
    
    if (!participants || participants.length === 0) {
      errors.push('No participants provided');
      return {
        amountPerPerson: 0,
        totalAmount,
        participantCount: 0,
        isValid: false,
        errors
      };
    }

    const totalAssigned = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    const difference = Math.abs(totalAssigned - totalAmount);
    
    if (difference > tolerance) {
      errors.push(
        `Total assigned amounts (${totalAssigned.toFixed(6)}) do not match bill total (${totalAmount.toFixed(6)}). Difference: ${difference.toFixed(6)}`
      );
    }

    // Check for negative amounts
    const negativeAmounts = participants.filter(p => p.amountOwed < 0);
    if (negativeAmounts.length > 0) {
      errors.push(`Participants with negative amounts: ${negativeAmounts.map(p => p.name).join(', ')}`);
    }

    // Check for zero amounts (might be valid for manual splits)
    const zeroAmounts = participants.filter(p => p.amountOwed === 0);
    if (zeroAmounts.length > 0 && zeroAmounts.length === participants.length) {
      errors.push('All participants have zero amounts assigned');
    }

    const amountPerPerson = this.calculateEqualSplit(totalAmount, participants.length);

    return {
      amountPerPerson,
      totalAmount,
      participantCount: participants.length,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate remaining amount for a participant
   * @param participant Participant object
   * @returns Remaining amount to be paid
   */
  static calculateRemainingAmount(participant: Participant): number {
    const remaining = participant.amountOwed - participant.amountPaid;
    return Math.max(0, remaining);
  }

  /**
   * Calculate total collected amount from all participants
   * @param participants Array of participants
   * @returns Total amount collected
   */
  static calculateTotalCollected(participants: Participant[]): number {
    return participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }

  /**
   * Calculate total remaining amount from all participants
   * @param participants Array of participants
   * @returns Total amount remaining to be collected
   */
  static calculateTotalRemaining(participants: Participant[]): number {
    return participants.reduce((sum, p) => sum + this.calculateRemainingAmount(p), 0);
  }

  /**
   * Calculate completion percentage
   * @param participants Array of participants
   * @param totalAmount Total bill amount
   * @returns Completion percentage (0-100)
   */
  static calculateCompletionPercentage(participants: Participant[], totalAmount: number): number {
    if (totalAmount <= 0) return 0;
    
    const totalCollected = this.calculateTotalCollected(participants);
    const percentage = (totalCollected / totalAmount) * 100;
    
    return Math.min(100, Math.max(0, Math.round(percentage * 100) / 100));
  }

  /**
   * Get participants who have paid their full amount
   * @param participants Array of participants
   * @returns Array of participants who have paid
   */
  static getPaidParticipants(participants: Participant[]): Participant[] {
    return participants.filter(p => p.amountPaid >= p.amountOwed && p.amountOwed > 0);
  }

  /**
   * Get participants who still owe money
   * @param participants Array of participants
   * @returns Array of participants who still owe money
   */
  static getOwingParticipants(participants: Participant[]): Participant[] {
    return participants.filter(p => this.calculateRemainingAmount(p) > 0);
  }

  /**
   * Check if all participants have paid
   * @param participants Array of participants
   * @returns True if all participants have paid their full amount
   */
  static areAllParticipantsPaid(participants: Participant[]): boolean {
    return participants.every(p => p.amountPaid >= p.amountOwed && p.amountOwed > 0);
  }

  /**
   * Repair participant amounts (fix zero amounts, negative amounts, etc.)
   * @param participants Array of participants
   * @param totalAmount Total bill amount
   * @param method Split method
   * @returns Repaired participants array
   */
  static repairParticipantAmounts(
    participants: Participant[],
    totalAmount: number,
    method: 'equal' | 'manual' = 'equal'
  ): Participant[] {
    if (!participants || participants.length === 0) {
      return [];
    }

    return participants.map(participant => {
      // Fix negative amounts
      if (participant.amountOwed < 0) {
        console.warn(`AmountCalculationService: Fixing negative amount for ${participant.name}: ${participant.amountOwed}`);
        participant.amountOwed = 0;
      }

      // Fix zero amounts for equal splits
      if (participant.amountOwed === 0 && method === 'equal' && totalAmount > 0) {
        const correctAmount = this.calculateEqualSplit(totalAmount, participants.length);
        console.warn(`AmountCalculationService: Fixing zero amount for ${participant.name}, setting to: ${correctAmount}`);
        participant.amountOwed = correctAmount;
      }

      // Ensure amountPaid is not negative
      if (participant.amountPaid < 0) {
        console.warn(`AmountCalculationService: Fixing negative amountPaid for ${participant.name}: ${participant.amountPaid}`);
        participant.amountPaid = 0;
      }

      return participant;
    });
  }
}

export default AmountCalculationService;
