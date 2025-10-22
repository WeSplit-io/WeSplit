import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { GroupWithDetails, Expense, GroupMember } from '../types';
import { logger } from '../services/core';

// Custom hook for group data management with caching and automatic refetching
export const useGroupData = (groupId: number | null) => {
  const { state, loadGroupDetails, refreshGroup } = useApp();
  const { groups } = state;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get group from context state (cached data)
  const group = groupId ? groups.find(g => g.id === groupId) : null;

  // Load group details with caching
  const loadGroup = useCallback(async (forceRefresh: boolean = false) => {
    if (!groupId) {return;}
    
    setLoading(true);
    setError(null);
    
    try {
      await loadGroupDetails(groupId, forceRefresh);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load group';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [groupId, loadGroupDetails]);

  // Refresh group data - FIXED: Remove problematic dependencies
  const refresh = useCallback(async () => {
    if (!groupId) {return;}
    // Call refreshGroup directly from AppContext to avoid dependency issues
    await refreshGroup(groupId);
  }, [groupId]);

  // Auto-load group data when groupId changes
  useEffect(() => {
    if (groupId && !group) {
      loadGroup();
    }
  }, [groupId, group]); // Remove loadGroup dependency to prevent infinite loops

  return {
    group,
    loading,
    error,
    loadGroup,
    refresh,
    // Computed values
    totalExpenses: group?.expenses.length || 0,
    totalAmount: group?.totalAmount || 0,
    memberCount: group?.members.length || 0,
    userBalance: group?.userBalance || 0
  };
};

// Hook for managing group list with caching
export const useGroupList = () => {
  const { state, loadUserGroups } = useApp();
  const { groups, isLoading, currentUser } = state;
  
  const [refreshing, setRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load user groups with optional force refresh
  const loadGroups = useCallback(async (forceRefresh: boolean = false) => {
    if (!currentUser?.id) {return;}
    
    try {
      await loadUserGroups(forceRefresh);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }, [currentUser?.id, loadUserGroups]);

  // Refresh groups (force reload)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGroups(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadGroups]);

  // Auto-load groups when user changes or when returning to app after logout
  useEffect(() => {
    if (currentUser?.id && groups.length === 0 && !isLoading && !hasInitialized) {
      // Only load groups if we don't have any, not currently loading, and haven't initialized yet
      setHasInitialized(true);
      loadUserGroups();
    }
  }, [currentUser?.id, hasInitialized]); // Remove loadUserGroups dependency to prevent infinite loops

  // Add a function to check if groups need to be refreshed
  const shouldRefreshGroups = useCallback(() => {
    // Only refresh if we have no groups or if it's been more than 5 minutes
    return groups.length === 0;
  }, [groups.length]);

  // Reset initialization state when user changes (for logout/login scenarios)
  useEffect(() => {
    if (!currentUser?.id) {
      setHasInitialized(false);
    }
  }, [currentUser?.id]);

  return {
    groups,
    loading: isLoading,
    refreshing,
    loadGroups,
    refresh,
    shouldRefreshGroups,
    // Computed values
    totalGroups: groups.length,
    hasGroups: groups.length > 0,
    groupsWithExpenses: groups.filter(g => g.expenses.length > 0)
  };
};

// Hook for expense operations with automatic group updates
export const useExpenseOperations = (groupId: number | string) => {
  const { createExpense, updateExpense, deleteExpense, refreshGroup, state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get group data from context - handle both string and number IDs
  const group = state.groups.find(g => g.id === groupId || g.id === Number(groupId) || g.id === String(groupId));

  // Create expense and refresh group data
  const handleCreateExpense = useCallback(async (expenseData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Starting expense creation', { groupId, expenseData, group }, 'useGroupData');
      
      const expense = await createExpense({
        ...expenseData,
        group_id: groupId
      });
      
      logger.info('Expense created successfully, refreshing group', { expense }, 'useGroupData');
      
      // Refresh group to get updated data - convert to number for refreshGroup
      const numericGroupId = typeof groupId === 'string' ? parseInt(groupId) || 0 : groupId;
      await refreshGroup(numericGroupId);
      
      logger.info('Group refreshed successfully', null, 'useGroupData');
      
      return expense;
    } catch (err) {
      console.error('❌ useExpenseOperations: Error creating expense:', err);
      console.error('❌ useExpenseOperations: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        name: err instanceof Error ? err.name : 'Unknown error type'
      });
      const errorMessage = err instanceof Error ? err.message : 'Failed to create expense';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId, createExpense, refreshGroup, group]);

  // Update expense and refresh group data
  const handleUpdateExpense = useCallback(async (expenseId: number, expenseData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedExpense = {
        ...expenseData,
        id: expenseId,
        group_id: groupId
      };
      const numericGroupId = typeof groupId === 'string' ? parseInt(groupId) || 0 : groupId;
      await updateExpense(numericGroupId, updatedExpense);
      await refreshGroup(numericGroupId);
      return updatedExpense;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update expense';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId, updateExpense, refreshGroup]);

  // Delete expense and refresh group data
  const handleDeleteExpense = useCallback(async (expenseId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const numericGroupId = typeof groupId === 'string' ? parseInt(groupId) || 0 : groupId;
      await deleteExpense(numericGroupId, expenseId);
      await refreshGroup(numericGroupId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete expense';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId, deleteExpense, refreshGroup]);

  // Get group members from context instead of making API calls
  const getGroupMembers = useCallback(() => {
    return group?.members || [];
  }, [group?.members]);

  // Get expenses from context
  const getGroupExpenses = useCallback(() => {
    return group?.expenses || [];
  }, [group?.expenses]);

  return {
    loading,
    error,
    group,
    createExpense: handleCreateExpense,
    updateExpense: handleUpdateExpense,
    deleteExpense: handleDeleteExpense,
    getGroupMembers,
    getGroupExpenses,
    clearError: () => setError(null)
  };
};

// Hook for navigation parameter standardization
export const useNavigationParams = () => {
  const createGroupParams = (group: GroupWithDetails) => ({
    groupId: group.id,
    groupName: group.name,
    groupIcon: group.icon,
    groupColor: group.color
  });

  const createExpenseParams = (expense: Expense) => ({
    expenseId: expense.id,
    amount: expense.amount,
    currency: expense.currency,
    description: expense.description
  });

  const createMemberParams = (member: GroupMember) => ({
    contact: member,
    memberId: member.id,
    memberName: member.name
  });

  return {
    createGroupParams,
    createExpenseParams,
    createMemberParams
  };
}; 