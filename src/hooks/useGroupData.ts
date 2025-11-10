import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Group, GroupMember } from '../types';
// GroupWithDetails and Expense don't exist - using Group and GroupMember instead
import { logger } from '../services/core';

// Custom hook for group data management with caching and automatic refetching
export const useGroupData = (groupId: number | null) => {
  // AppContext doesn't have loadGroupDetails, refreshGroup, or groups
  // const { groups } = state;
  const groups: Group[] = [];
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get group from context state (cached data)
  const group = groupId ? groups.find(g => g.id === String(groupId)) : null;

  // Load group details with caching
  const loadGroup = useCallback(async (_forceRefresh: boolean = false) => {
    if (!groupId) {return;}
    
    setLoading(true);
    setError(null);
    
    try {
      // loadGroupDetails doesn't exist in AppContext
      // await loadGroupDetails(groupId, forceRefresh);
      logger.warn('loadGroupDetails not implemented', { groupId }, 'useGroupData');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load group';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Refresh group data - FIXED: Remove problematic dependencies
  const refresh = useCallback(async () => {
    if (!groupId) {return;}
    // refreshGroup doesn't exist in AppContext
    // await refreshGroup(groupId);
    logger.warn('refreshGroup not implemented', { groupId }, 'useGroupData');
  }, [groupId]);

  // Auto-load group data when groupId changes - use ref to prevent infinite loops
  const loadGroupRef = useRef(loadGroup);
  useEffect(() => {
    loadGroupRef.current = loadGroup;
  }, [loadGroup]);
  
  useEffect(() => {
    if (groupId && !group) {
      loadGroupRef.current();
    }
  }, [groupId, group]); // loadGroup is accessed via ref to prevent infinite loops

  return {
    group,
    loading,
    error,
    loadGroup,
    refresh,
    // Computed values
    totalExpenses: 0, // group?.expenses doesn't exist
    totalAmount: 0, // group?.totalAmount doesn't exist
    memberCount: group?.members.length || 0,
    userBalance: 0 // group?.userBalance doesn't exist
  };
};

// Hook for managing group list with caching
export const useGroupList = () => {
  const { state } = useApp();
  // AppContext doesn't have loadUserGroups or groups
  // const { groups, isLoading, currentUser } = state;
  const groups: Group[] = [];
  const isLoading = false;
  const currentUser = state.currentUser;
  
  const [refreshing, setRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load user groups with optional force refresh
  const loadGroups = useCallback(async (_forceRefresh: boolean = false) => {
    if (!currentUser?.id) {return;}
    
    try {
      // loadUserGroups doesn't exist in AppContext
      // await loadUserGroups(forceRefresh);
      logger.warn('loadUserGroups not implemented', null, 'useGroupData');
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }, [currentUser?.id]);

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
      // loadUserGroups doesn't exist
      // loadUserGroups();
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
    groupsWithExpenses: [] // groups don't have expenses property
  };
};

// Hook for expense operations with automatic group updates
export const useExpenseOperations = (groupId: number | string) => {
  // AppContext doesn't have createExpense, updateExpense, deleteExpense, refreshGroup, or groups
  // const { createExpense, updateExpense, deleteExpense, refreshGroup, state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get group data - groups don't exist in state
  // const group = state.groups.find(g => g.id === groupId || g.id === Number(groupId) || g.id === String(groupId));
  const group: Group | null = null;

  // Create expense and refresh group data
  const handleCreateExpense = useCallback(async (expenseData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Starting expense creation', { groupId, expenseData, group }, 'useGroupData');
      
      // createExpense doesn't exist
      // const expense = await createExpense({
      //   ...expenseData,
      //   group_id: groupId
      // });
      throw new Error('createExpense not implemented');
      
      // logger.info('Expense created successfully, refreshing group', { expense }, 'useGroupData');
      
      // Refresh group to get updated data - convert to number for refreshGroup
      // const numericGroupId = typeof groupId === 'string' ? parseInt(groupId) || 0 : groupId;
      // await refreshGroup(numericGroupId);
      
      logger.info('Group refreshed successfully', null, 'useGroupData');
      
      // expense is not defined since createExpense doesn't exist
      // return expense;
      return null;
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
  }, [groupId]);

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
      // updateExpense and refreshGroup don't exist
      // const numericGroupId = typeof groupId === 'string' ? parseInt(groupId) || 0 : groupId;
      // await updateExpense(numericGroupId, updatedExpense);
      // await refreshGroup(numericGroupId);
      throw new Error('updateExpense not implemented');
      return updatedExpense;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update expense';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Delete expense and refresh group data
  const handleDeleteExpense = useCallback(async (_expenseId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // deleteExpense and refreshGroup don't exist
      // const numericGroupId = typeof groupId === 'string' ? parseInt(groupId) || 0 : groupId;
      // await deleteExpense(numericGroupId, expenseId);
      // await refreshGroup(numericGroupId);
      throw new Error('deleteExpense not implemented');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete expense';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Get group members from context instead of making API calls
  const getGroupMembers = useCallback(() => {
    // group is null, return empty array
    return [];
  }, []);

  // Get expenses from context
  const getGroupExpenses = useCallback(() => {
    // groups don't have expenses property
    return [];
  }, []);

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
  const createGroupParams = (group: Group) => ({
    groupId: group.id,
    groupName: group.name,
    // group.icon and group.color don't exist
    groupIcon: undefined,
    groupColor: undefined
  });

  // Expense type doesn't exist - using any for now
  const createExpenseParams = (expense: any) => ({
    expenseId: expense.id,
    amount: expense.amount,
    currency: expense.currency,
    description: expense.description
  });

  const createMemberParams = (member: GroupMember) => ({
    contact: member,
    // GroupMember doesn't have id property
    memberId: member.userId,
    memberName: member.name
  });

  return {
    createGroupParams,
    createExpenseParams,
    createMemberParams
  };
}; 