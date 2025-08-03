/**
 * Hybrid data service that tries Firebase first, then falls back to SQLite
 * This allows for a gradual migration from SQLite to Firebase
 */

import { 
  User, 
  Group, 
  GroupWithDetails, 
  GroupMember, 
  UserContact, 
  Expense, 
  ExpenseSplit,
  InviteLinkData,
  SettlementResult,
  SettlementCalculation,
  ReminderStatus,
  ApiResponse 
} from '../types';
import { firebaseDataService } from './firebaseDataService';
import { dataService } from './dataService';

// Hybrid data service that tries Firebase first, then falls back to SQLite
export const hybridDataService = {
  user: {
    getCurrentUser: async (userId: string): Promise<User> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for getCurrentUser'); }
        return await firebaseDataService.user.getCurrentUser(userId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for getCurrentUser'); }
        return await dataService.user.getCurrentUser(userId);
      }
    },

    createUser: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for createUser'); }
        return await firebaseDataService.user.createUserIfNotExists(userData);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for createUser'); }
        return await dataService.user.createUser(userData);
      }
    },

    updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for updateUser'); }
        return await firebaseDataService.user.updateUser(userId, updates);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for updateUser'); }
        return await dataService.user.updateUser(userId, updates);
      }
    },

    getUserContacts: async (userId: string): Promise<UserContact[]> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for getUserContacts'); }
        return await firebaseDataService.user.getUserContacts(userId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for getUserContacts:', error); }
        throw error;
      }
    }
  },

  group: {
    getUserGroups: async (userId: string, forceRefresh: boolean = false): Promise<GroupWithDetails[]> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for getUserGroups for user:', userId); }
        if (__DEV__) { console.log('🔄 Hybrid: About to call firebaseDataService.group.getUserGroups'); }
        const firebaseGroups = await firebaseDataService.group.getUserGroups(userId, forceRefresh);
        
        if (__DEV__) { console.log('🔄 Hybrid: Firebase returned', firebaseGroups.length, 'groups'); }
        return firebaseGroups;
        
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for getUserGroups:', error); }
        // Return empty array instead of falling back to SQLite
        return [];
      }
    },

    getGroupDetails: async (groupId: string, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for getGroupDetails'); }
        return await firebaseDataService.group.getGroupDetails(groupId, forceRefresh);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for getGroupDetails:', error); }
        throw error;
      }
    },

    getGroupMembers: async (groupId: string, forceRefresh: boolean = false): Promise<GroupMember[]> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for getGroupMembers'); }
        return await firebaseDataService.group.getGroupMembers(groupId, forceRefresh);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for getGroupMembers:', error); }
        throw error;
      }
    },

    createGroup: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'expense_count' | 'expenses_by_currency'>): Promise<Group> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for createGroup'); }
        return await firebaseDataService.group.createGroup(groupData);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for createGroup:', error); }
        throw error;
      }
    },

    updateGroup: async (groupId: string, userId: string, updates: Partial<Group>): Promise<{ message: string; group: Group }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for updateGroup'); }
        return await firebaseDataService.group.updateGroup(groupId, userId, updates);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for updateGroup:', error); }
        throw error;
      }
    },

    deleteGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for deleteGroup'); }
        return await firebaseDataService.group.deleteGroup(groupId, userId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for deleteGroup:', error); }
        throw error;
      }
    },



    generateInviteLink: async (groupId: string, userId: string): Promise<InviteLinkData> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for generateInviteLink'); }
        return await firebaseDataService.group.generateInviteLink(groupId, userId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for generateInviteLink:', error); }
        throw error;
      }
    },

    joinGroupViaInvite: async (inviteCode: string, userId: string): Promise<{ message: string; groupId: string; groupName: string }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for joinGroupViaInvite'); }
        const result = await firebaseDataService.group.joinGroupViaInvite(inviteCode, userId);
        return {
          message: result.message,
          groupId: result.groupId,
          groupName: result.groupName
        };
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for joinGroupViaInvite:', error); }
        throw error;
      }
    },

    leaveGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for leaveGroup'); }
        return await firebaseDataService.group.leaveGroup(groupId, userId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for leaveGroup:', error); }
        throw error;
      }
    }
  },

  expense: {
    getGroupExpenses: async (groupId: string, forceRefresh: boolean = false): Promise<Expense[]> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for getGroupExpenses'); }
        return await firebaseDataService.expense.getGroupExpenses(groupId, forceRefresh);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for getGroupExpenses:', error); }
        throw error;
      }
    },

    createExpense: async (expenseData: any): Promise<Expense> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for createExpense'); }
        return await firebaseDataService.expense.createExpense(expenseData);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for createExpense:', error); }
        throw error;
      }
    },

    updateExpense: async (expenseId: string, updates: Partial<Expense>): Promise<Expense> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for updateExpense'); }
        return await firebaseDataService.expense.updateExpense(expenseId, updates);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for updateExpense:', error); }
        throw error;
      }
    },

    deleteExpense: async (expenseId: string, groupId: string): Promise<{ message: string }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Using Firebase only for deleteExpense'); }
        return await firebaseDataService.expense.deleteExpense(expenseId, groupId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed for deleteExpense:', error); }
        throw error;
      }
    }
  },

  settlement: {
    getSettlementCalculation: async (groupId: string): Promise<SettlementCalculation[]> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for getSettlementCalculation'); }
        return await firebaseDataService.settlement.getSettlementCalculation(groupId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for getSettlementCalculation'); }
        return await dataService.settlement.getSettlementCalculation(groupId);
      }
    },

    settleGroupExpenses: async (groupId: string, userId: string, settlementType: 'individual' | 'full' = 'individual'): Promise<SettlementResult> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for settleGroupExpenses'); }
        return await firebaseDataService.settlement.settleGroupExpenses(groupId, userId, settlementType);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for settleGroupExpenses'); }
        return await dataService.settlement.settleGroupExpenses(groupId, userId, settlementType);
      }
    },

    recordPersonalSettlement: async (
      groupId: string,
      userId: string,
      recipientId: string,
      amount: number,
      currency: string = 'USDC'
    ): Promise<{ success: boolean; message: string }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for recordPersonalSettlement'); }
        return await firebaseDataService.settlement.recordPersonalSettlement(groupId, userId, recipientId, amount, currency);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for recordPersonalSettlement'); }
        return await dataService.settlement.recordPersonalSettlement(groupId, userId, recipientId, amount, currency);
      }
    },

    getReminderStatus: async (groupId: string, userId: string): Promise<ReminderStatus> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for getReminderStatus'); }
        return await firebaseDataService.settlement.getReminderStatus(groupId, userId);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for getReminderStatus'); }
        return await dataService.settlement.getReminderStatus(groupId, userId);
      }
    },

    sendPaymentReminder: async (
      groupId: string,
      senderId: string,
      recipientId: string,
      amount: number
    ): Promise<{ success: boolean; message: string; recipientName: string; amount: number }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for sendPaymentReminder'); }
        return await firebaseDataService.settlement.sendPaymentReminder(groupId, senderId, recipientId, amount);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for sendPaymentReminder'); }
        return await dataService.settlement.sendPaymentReminder(groupId, senderId, recipientId, amount);
      }
    },

    sendBulkPaymentReminders: async (
      groupId: string,
      senderId: string,
      debtors: { recipientId: string; amount: number; name: string }[]
    ): Promise<{ 
      success: boolean; 
      message: string; 
      results: { recipientId: string; recipientName: string; amount: number; success: boolean }[];
      totalAmount: number;
    }> => {
      try {
        if (__DEV__) { console.log('🔄 Hybrid: Trying Firebase for sendBulkPaymentReminders'); }
        return await firebaseDataService.settlement.sendBulkPaymentReminders(groupId, senderId, debtors);
      } catch (error) {
        if (__DEV__) { console.log('🔄 Hybrid: Firebase failed, falling back to SQLite for sendBulkPaymentReminders'); }
        return await dataService.settlement.sendBulkPaymentReminders(groupId, senderId, debtors);
      }
    }
  },

  // Add transformers and cache from dataService
  transformers: dataService.transformers,
  cache: dataService.cache
}; 