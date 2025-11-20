/**
 * Fair Split Business Logic Hook
 * Contains all the business logic and calculations for FairSplitScreen
 */

import { useCallback } from 'react';
import { Participant } from '../../../services/core';
import { FairSplitState } from './useFairSplitState';
import { logger } from '../../../services/analytics/loggingService';

export interface FairSplitLogic {
  // Helper functions
  isCurrentUserCreator: () => boolean;
  calculateTotalLocked: (participants: Participant[]) => number;
  calculateTotalAssigned: (participants: Participant[]) => number;
  calculateTotalPaid: (walletParticipants: any[]) => number;
  hasInvalidAmounts: (participants: Participant[]) => boolean;
  hasZeroAmounts: (participants: Participant[]) => boolean;
  
  // Split operations
  handleSplitMethodChange: (method: 'equal' | 'manual') => void;
  handleParticipantEdit: (participant: Participant) => void;
  handleAmountEdit: (amount: string) => void;
  handleEditConfirm: () => void;
  handleEditCancel: () => void;
  
  // Payment operations
  handlePaymentStart: (amount: string) => void;
  handlePaymentCancel: () => void;
  handleTransferMethodSelect: (method: 'external-wallet' | 'in-app-wallet') => void;
  
  // Wallet operations
  handleWalletSelect: (wallet: {id: string, address: string, type: 'external' | 'in-app', name?: string}) => void;
  handleWalletLoad: () => Promise<void>;
}

export const useFairSplitLogic = (
  state: FairSplitState,
  currentUser: any,
  splitData: any,
  participants: Participant[],
  setParticipants: (participants: Participant[]) => void
): FairSplitLogic => {
  
  // Helper function to check if current user is the creator
  const isCurrentUserCreator = useCallback(() => {
    if (!currentUser || !splitData) {return false;}
    return splitData.creatorId === currentUser.id.toString();
  }, [currentUser, splitData]);

  // Helper functions for common calculations
  const calculateTotalLocked = useCallback((participants: Participant[]) => {
    return participants.reduce((sum, p) => sum + p.amountLocked, 0);
  }, []);

  const calculateTotalAssigned = useCallback((participants: Participant[]) => {
    return participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
  }, []);

  const calculateTotalPaid = useCallback((walletParticipants: any[]) => {
    return walletParticipants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }, []);

  const hasInvalidAmounts = useCallback((participants: Participant[]) => {
    return participants.some(p => !p.amountOwed || p.amountOwed <= 0);
  }, []);

  const hasZeroAmounts = useCallback((participants: Participant[]) => {
    return participants.some(p => p.amountOwed === 0);
  }, []);

  // Split operations
  const handleSplitMethodChange = useCallback((method: 'equal' | 'manual') => {
    state.setSplitMethod(method);
  }, [state]);

  const handleParticipantEdit = useCallback((participant: Participant) => {
    state.setEditingParticipant(participant);
    state.setEditAmount(participant.amountOwed?.toString() || '');
    state.setShowEditModal(true);
  }, [state]);

  const handleAmountEdit = useCallback((amount: string) => {
    state.setEditAmount(amount);
  }, [state]);

  const handleEditConfirm = useCallback(async () => {
    if (state.editingParticipant && state.editAmount) {
      const newAmount = parseFloat(state.editAmount);
      if (!isNaN(newAmount) && newAmount > 0) {
        const updatedParticipants = participants.map(p => 
          p.id === state.editingParticipant!.id 
            ? { ...p, amountOwed: newAmount }
            : p
        );
        setParticipants(updatedParticipants);
        
        // Persist the changes to the database
        try {
          if (splitData?.walletId) {
            const { SplitWalletManagement } = await import('../../../services/split/SplitWalletManagement');
            const participantsForUpdate = updatedParticipants.map(p => ({
              userId: p.id,
              name: p.name,
              walletAddress: p.walletAddress,
              amountOwed: p.amountOwed,
            }));
            
            const updateResult = await SplitWalletManagement.updateSplitWalletParticipants(
              splitData.walletId, 
              participantsForUpdate
            );
            
            if (!updateResult.success) {
              logger.error('Failed to update participant amounts in database', { error: updateResult.error }, 'FairSplitLogic');
              // Revert local changes if database update failed
              setParticipants(participants);
            } else {
              // Refresh completion data after successful update
              // Note: This will be handled by the parent component
            }
          }
        } catch (error) {
          logger.error('Error updating participant amounts', { error: error instanceof Error ? error.message : String(error) }, 'FairSplitLogic');
          // Revert local changes if database update failed
          setParticipants(participants);
        }
      }
    }
    state.setShowEditModal(false);
    state.setEditingParticipant(null);
    state.setEditAmount('');
  }, [state, participants, setParticipants, splitData]);

  const handleEditCancel = useCallback(() => {
    state.setShowEditModal(false);
    state.setEditingParticipant(null);
    state.setEditAmount('');
  }, [state]);

  // Payment operations
  const handlePaymentStart = useCallback((amount: string) => {
    state.setPaymentAmount(amount);
    state.setShowPaymentModal(true);
  }, [state]);

  const handlePaymentCancel = useCallback(() => {
    state.setShowPaymentModal(false);
    state.setPaymentAmount('');
  }, [state]);

  const handleTransferMethodSelect = useCallback((method: 'external-wallet' | 'in-app-wallet') => {
    state.setSelectedTransferMethod(method);
  }, [state]);

  // Wallet operations
  const handleWalletSelect = useCallback((wallet: {id: string, address: string, type: 'external' | 'in-app', name?: string}) => {
    state.setSelectedWallet(wallet);
  }, [state]);

  const handleWalletLoad = useCallback(async () => {
    state.setIsLoadingWallets(true);
    try {
      // Load external wallets and in-app wallet
      // This would contain the actual wallet loading logic
      // For now, we'll just simulate the loading
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Failed to load wallets', { error: error instanceof Error ? error.message : String(error) }, 'FairSplitLogic');
    } finally {
      state.setIsLoadingWallets(false);
    }
  }, [state]);

  return {
    // Helper functions
    isCurrentUserCreator,
    calculateTotalLocked,
    calculateTotalAssigned,
    calculateTotalPaid,
    hasInvalidAmounts,
    hasZeroAmounts,
    
    // Split operations
    handleSplitMethodChange,
    handleParticipantEdit,
    handleAmountEdit,
    handleEditConfirm,
    handleEditCancel,
    
    // Payment operations
    handlePaymentStart,
    handlePaymentCancel,
    handleTransferMethodSelect,
    
    // Wallet operations
    handleWalletSelect,
    handleWalletLoad,
  };
};
