import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { GroupWithDetails, Expense, GroupMember } from '../types';

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
    if (!groupId) return;
    
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

  // Refresh group data
  const refresh = useCallback(async () => {
    if (!groupId) return;
    await refreshGroup(groupId);
  }, [groupId, refreshGroup]);

  // Auto-load group data when groupId changes
  useEffect(() => {
    if (groupId && !group) {
      loadGroup();
    }
  }, [groupId, group, loadGroup]);

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

  // Load user groups with optional force refresh
  const loadGroups = useCallback(async (forceRefresh: boolean = false) => {
    if (!currentUser?.id) return;
    
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

  // Auto-load groups when user changes
  useEffect(() => {
    if (currentUser?.id && groups.length === 0) {
      loadGroups();
    }
  }, [currentUser?.id, groups.length, loadGroups]);

  return {
    groups,
    loading: isLoading,
    refreshing,
    loadGroups,
    refresh,
    // Computed values
    totalGroups: groups.length,
    hasGroups: groups.length > 0,
    groupsWithExpenses: groups.filter(g => g.expenses.length > 0)
  };
};

// Hook for expense operations with automatic group updates
export const useExpenseOperations = (groupId: number) => {
  const { createExpense, updateExpense, deleteExpense, refreshGroup, state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get group data from context
  const group = state.groups.find(g => g.id === groupId);

  // Create expense and refresh group data
  const handleCreateExpense = useCallback(async (expenseData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const expense = await createExpense({
        ...expenseData,
        group_id: groupId
      });
      
      // Refresh group to get updated data
      await refreshGroup(groupId);
      
      return expense;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create expense';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId, createExpense, refreshGroup]);

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
      await updateExpense(groupId, updatedExpense);
      await refreshGroup(groupId);
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
      await deleteExpense(groupId, expenseId);
      await refreshGroup(groupId);
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