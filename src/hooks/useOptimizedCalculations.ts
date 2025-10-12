/**
 * Optimized Calculations Hook
 * Provides memoized calculations for expensive operations
 */

import { useMemo, useCallback } from 'react';

export interface CalculationDependencies {
  participants?: any[];
  totalAmount?: number;
  splitMethod?: 'equal' | 'manual';
  balances?: any[];
  currentUserId?: string;
}

export const useOptimizedCalculations = (deps: CalculationDependencies) => {
  const {
    participants = [],
    totalAmount = 0,
    splitMethod = 'equal',
    balances = [],
    currentUserId
  } = deps;

  // Memoized total calculations
  const totals = useMemo(() => {
    if (!participants.length) {
      return {
        totalLocked: 0,
        totalAssigned: 0,
        totalPaid: 0
      };
    }

    return {
      totalLocked: participants.reduce((sum, p) => sum + (p.amountLocked || 0), 0),
      totalAssigned: participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0),
      totalPaid: participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0)
    };
  }, [participants]);

  // Memoized validation checks
  const validation = useMemo(() => {
    if (!participants.length) {
      return {
        hasInvalidAmounts: false,
        hasZeroAmounts: false,
        isValid: true
      };
    }

    const hasInvalidAmounts = participants.some(p => !p.amountOwed || p.amountOwed <= 0);
    const hasZeroAmounts = participants.some(p => p.amountOwed === 0);
    const isValid = !hasInvalidAmounts && !hasZeroAmounts;

    return {
      hasInvalidAmounts,
      hasZeroAmounts,
      isValid
    };
  }, [participants]);

  // Memoized balance calculations
  const balanceCalculations = useMemo(() => {
    if (!balances.length || !currentUserId) {
      return {
        currentUserBalance: 0,
        totalOwed: 0,
        totalOwedTo: 0,
        settlementTransactions: []
      };
    }

    const currentUserBalance = balances.find(b => b.userId === currentUserId)?.amount || 0;
    const totalOwed = balances
      .filter(b => b.userId === currentUserId && b.amount < 0)
      .reduce((sum, b) => sum + Math.abs(b.amount), 0);
    const totalOwedTo = balances
      .filter(b => b.userId === currentUserId && b.amount > 0)
      .reduce((sum, b) => sum + b.amount, 0);

    // Calculate settlement transactions (simplified)
    const settlementTransactions = balances
      .filter(b => b.userId === currentUserId)
      .map(balance => ({
        to: balance.userId,
        amount: Math.abs(balance.amount),
        type: balance.amount < 0 ? 'pay' : 'receive'
      }));

    return {
      currentUserBalance,
      totalOwed,
      totalOwedTo,
      settlementTransactions
    };
  }, [balances, currentUserId]);

  // Memoized participant calculations
  const participantCalculations = useMemo(() => {
    if (!participants.length || !totalAmount) {
      return {
        equalAmount: 0,
        participantCount: 0,
        canSplit: false
      };
    }

    const participantCount = participants.length;
    const equalAmount = totalAmount / participantCount;
    const canSplit = participantCount > 0 && totalAmount > 0;

    return {
      equalAmount,
      participantCount,
      canSplit
    };
  }, [participants, totalAmount]);

  // Memoized split method calculations
  const splitCalculations = useMemo(() => {
    if (splitMethod === 'equal' && participants.length > 0 && totalAmount > 0) {
      const equalAmount = totalAmount / participants.length;
      return participants.map(participant => ({
        ...participant,
        amountOwed: equalAmount
      }));
    }
    return participants;
  }, [splitMethod, participants, totalAmount]);

  // Memoized callback functions
  const calculateTotalLocked = useCallback(() => {
    return totals.totalLocked;
  }, [totals.totalLocked]);

  const calculateTotalAssigned = useCallback(() => {
    return totals.totalAssigned;
  }, [totals.totalAssigned]);

  const calculateTotalPaid = useCallback((walletParticipants: any[]) => {
    return walletParticipants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }, []);

  const hasInvalidAmounts = useCallback(() => {
    return validation.hasInvalidAmounts;
  }, [validation.hasInvalidAmounts]);

  const hasZeroAmounts = useCallback(() => {
    return validation.hasZeroAmounts;
  }, [validation.hasZeroAmounts]);

  return {
    // Calculated values
    totals,
    validation,
    balanceCalculations,
    participantCalculations,
    splitCalculations,
    
    // Callback functions
    calculateTotalLocked,
    calculateTotalAssigned,
    calculateTotalPaid,
    hasInvalidAmounts,
    hasZeroAmounts,
    
    // Direct access to memoized values
    totalLocked: totals.totalLocked,
    totalAssigned: totals.totalAssigned,
    totalPaid: totals.totalPaid,
    hasInvalidAmountsValue: validation.hasInvalidAmounts,
    hasZeroAmountsValue: validation.hasZeroAmounts,
    isValid: validation.isValid,
    currentUserBalance: balanceCalculations.currentUserBalance,
    totalOwed: balanceCalculations.totalOwed,
    totalOwedTo: balanceCalculations.totalOwedTo,
    settlementTransactions: balanceCalculations.settlementTransactions,
    equalAmount: participantCalculations.equalAmount,
    participantCount: participantCalculations.participantCount,
    canSplit: participantCalculations.canSplit
  };
};
