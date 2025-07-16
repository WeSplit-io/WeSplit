/**
 * Firebase-based data service for WeSplit
 * Replaces SQLite backend API calls with Firestore operations
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
import { firestoreService } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Data transformation utilities
export const firebaseDataTransformers = {
  // Transform Firestore timestamp to ISO string
  timestampToISO: (timestamp: Timestamp | null): string => {
    return timestamp?.toDate().toISOString() || new Date().toISOString();
  },

  // Transform ISO string to Firestore timestamp
  isoToTimestamp: (isoString: string): Timestamp => {
    return Timestamp.fromDate(new Date(isoString));
  },

  // Transform Firestore document to User
  firestoreToUser: (doc: any): User => ({
    id: doc.id,
    name: doc.data().name || '',
    email: doc.data().email || '',
    wallet_address: doc.data().wallet_address || '',
    wallet_public_key: doc.data().wallet_public_key || '',
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    avatar: doc.data().avatar || ''
  }),

  // Transform User to Firestore data
  userToFirestore: (user: User): any => ({
    name: user.name,
    email: user.email,
    wallet_address: user.wallet_address,
    wallet_public_key: user.wallet_public_key,
    created_at: serverTimestamp(),
    avatar: user.avatar
  }),

  // Transform Firestore document to Group
  firestoreToGroup: (doc: any): Group => ({
    id: doc.id, // Keep as string for Firebase compatibility
    name: doc.data().name || '',
    description: doc.data().description || '',
    category: doc.data().category || 'general',
    currency: doc.data().currency || 'USDC',
    icon: doc.data().icon || 'people',
    color: doc.data().color || '#A5EA15',
    created_by: doc.data().created_by || '',
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    updated_at: firebaseDataTransformers.timestampToISO(doc.data().updated_at),
    member_count: doc.data().member_count || 0,
    expense_count: doc.data().expense_count || 0,
    expenses_by_currency: doc.data().expenses_by_currency || []
  }),

  // Transform Group to Firestore data
  groupToFirestore: (group: Omit<Group, 'id' | 'created_at' | 'updated_at'>): any => ({
    name: group.name,
    description: group.description,
    category: group.category,
    currency: group.currency,
    icon: group.icon,
    color: group.color,
    created_by: group.created_by,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    member_count: 0,
    expense_count: 0,
    expenses_by_currency: []
  }),

  // Transform Firestore document to GroupMember
  firestoreToGroupMember: (doc: any): GroupMember => ({
    id: doc.id, // Keep as string for Firebase compatibility
    name: doc.data().name || '',
    email: doc.data().email || '',
    wallet_address: doc.data().wallet_address || '',
    wallet_public_key: doc.data().wallet_public_key || '',
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    joined_at: firebaseDataTransformers.timestampToISO(doc.data().joined_at),
    avatar: doc.data().avatar || ''
  }),

  // Transform GroupMember to Firestore data
  groupMemberToFirestore: (member: Omit<GroupMember, 'id'>): any => ({
    name: member.name,
    email: member.email,
    wallet_address: member.wallet_address,
    wallet_public_key: member.wallet_public_key,
    joined_at: serverTimestamp(),
    avatar: member.avatar
  }),

  // Transform Firestore document to Expense
  firestoreToExpense: (doc: any): Expense => ({
    id: doc.id, // Keep as string for Firebase compatibility
    description: doc.data().description || '',
    amount: doc.data().amount || 0,
    currency: doc.data().currency || 'USDC',
    paid_by: doc.data().paid_by || '',
    group_id: doc.data().group_id, // Keep as string for Firebase compatibility
    category: doc.data().category || 'general',
    splitType: doc.data().split_type || 'equal',
    splitData: doc.data().split_data || { memberIds: [] },
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    updated_at: firebaseDataTransformers.timestampToISO(doc.data().updated_at)
  }),

  // Transform Expense to Firestore data
  expenseToFirestore: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): any => ({
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    paid_by: expense.paid_by,
    group_id: expense.group_id.toString(),
    category: expense.category,
    split_type: expense.splitType,
    split_data: expense.splitData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  })
};

// User services
export const firebaseUserService = {
  getCurrentUser: async (userId: string): Promise<User> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return firebaseDataTransformers.firestoreToUser(userDoc);
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
    const userRef = await addDoc(collection(db, 'users'), firebaseDataTransformers.userToFirestore(userData));
    return {
      ...userData,
      id: userRef.id, // Keep as string for Firebase compatibility
      created_at: new Date().toISOString()
    };
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.wallet_address !== undefined) updateData.wallet_address = updates.wallet_address;
    if (updates.wallet_public_key !== undefined) updateData.wallet_public_key = updates.wallet_public_key;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(userRef, updateData);
    return firebaseUserService.getCurrentUser(userId);
  }
};

// Group services
export const firebaseGroupService = {
  getUserGroups: async (userId: string, forceRefresh: boolean = false): Promise<GroupWithDetails[]> => {
    if (__DEV__) { console.log('🔥 Firebase getUserGroups called for user:', userId); }
    
    // Get groups where user is a member
    const groupMembersRef = collection(db, 'groupMembers');
    const memberQuery = query(
      groupMembersRef,
      where('user_id', '==', userId)
    );
    const memberDocs = await getDocs(memberQuery);
    
    if (__DEV__) { console.log('🔥 Found', memberDocs.docs.length, 'group memberships for user:', userId); }
    
    const groupIds = memberDocs.docs.map(doc => doc.data().group_id);
    
    if (__DEV__) { console.log('🔥 Group IDs found:', groupIds); }
    
    if (groupIds.length === 0) {
      if (__DEV__) { console.log('🔥 No groups found for user:', userId); }
      return [];
    }
    
    // Get group details
    const groups: GroupWithDetails[] = [];
    for (const groupId of groupIds) {
      try {
        if (__DEV__) { console.log('🔥 Fetching group details for group:', groupId); }
        
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          if (__DEV__) { console.log('🔥 Group document exists, transforming...'); }
          
          const group = firebaseDataTransformers.firestoreToGroup(groupDoc);
          
          if (__DEV__) { console.log('🔥 Getting members and expenses for group:', groupId); }
          
          // Get members and expenses for this group
          const [members, expenses] = await Promise.all([
            firebaseGroupService.getGroupMembers(groupId),
            firebaseExpenseService.getGroupExpenses(groupId)
          ]);
          
          if (__DEV__) { console.log('🔥 Got members:', members.length, 'expenses:', expenses.length); }
          
                  // Calculate totals
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const userBalance = calculateUserBalance(expenses, members, userId); // Keep as string for Firebase compatibility
        
        // Calculate expenses by currency
        const expensesByCurrency: any[] = [];
        const currencyMap = new Map<string, number>();
        
        expenses.forEach(expense => {
          const currency = expense.currency || 'USDC';
          const currentTotal = currencyMap.get(currency) || 0;
          currencyMap.set(currency, currentTotal + expense.amount);
        });
        
        currencyMap.forEach((total, currency) => {
          expensesByCurrency.push({
            currency,
            total_amount: total
          });
        });
        
        groups.push({
          ...group,
          members,
          expenses,
          totalAmount,
          userBalance,
          member_count: members.length,
          expense_count: expenses.length,
          expenses_by_currency: expensesByCurrency
        });
          
          if (__DEV__) { console.log('🔥 Successfully added group to results:', group.name); }
        } else {
          if (__DEV__) { console.log('🔥 Group document does not exist for ID:', groupId); }
        }
      } catch (error) {
        if (__DEV__) { console.error('🔥 Error processing group', groupId, ':', error); }
        // Continue with other groups instead of failing completely
      }
    }
    
    return groups;
  },

  getGroupDetails: async (groupId: string, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    
    const group = firebaseDataTransformers.firestoreToGroup(groupDoc);
    
    // Get members and expenses
    const [members, expenses] = await Promise.all([
      firebaseGroupService.getGroupMembers(groupId),
      firebaseExpenseService.getGroupExpenses(groupId)
    ]);
    
    // Calculate totals
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const userBalance = 0; // Will be calculated when user context is available
    
    return {
      ...group,
      members,
      expenses,
      totalAmount,
      userBalance
    };
  },

  getGroupMembers: async (groupId: string, forceRefresh: boolean = false): Promise<GroupMember[]> => {
    try {
      if (__DEV__) { console.log('🔥 Getting members for group:', groupId); }
      
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId)
      );
      const memberDocs = await getDocs(memberQuery);
      
      if (__DEV__) { console.log('🔥 Found', memberDocs.docs.length, 'member documents for group:', groupId); }
      
      const members: GroupMember[] = [];
      for (const memberDoc of memberDocs.docs) {
        try {
          const memberData = memberDoc.data();
          if (__DEV__) { console.log('🔥 Processing member with user_id:', memberData.user_id); }
          
          const userDoc = await getDoc(doc(db, 'users', memberData.user_id));
          if (userDoc.exists()) {
            const user = firebaseDataTransformers.firestoreToUser(userDoc);
            // Handle different timestamp formats
            let joinedAt: string;
            if (memberData.joined_at) {
              if (typeof memberData.joined_at === 'string') {
                joinedAt = memberData.joined_at;
              } else if (memberData.joined_at.toDate) {
                joinedAt = firebaseDataTransformers.timestampToISO(memberData.joined_at);
              } else {
                joinedAt = new Date().toISOString();
              }
            } else {
              joinedAt = new Date().toISOString();
            }
            
            members.push({
              ...user,
              id: user.id, // Keep as string for Firebase compatibility
              joined_at: joinedAt
            });
            if (__DEV__) { console.log('🔥 Added member:', user.name || user.email); }
          } else {
            if (__DEV__) { console.log('🔥 User document not found for ID:', memberData.user_id); }
          }
        } catch (error) {
          if (__DEV__) { console.error('🔥 Error processing member document:', error); }
        }
      }
      
      if (__DEV__) { console.log('🔥 Returning', members.length, 'members for group:', groupId); }
      return members;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in getGroupMembers for group', groupId, ':', error); }
      throw error;
    }
  },

  createGroup: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'expense_count' | 'expenses_by_currency'>): Promise<Group> => {
    const groupRef = await addDoc(collection(db, 'groups'), firebaseDataTransformers.groupToFirestore(groupData));
    
    // Add creator as first member
    const groupMemberRef = await addDoc(collection(db, 'groupMembers'), {
      group_id: groupRef.id,
      user_id: groupData.created_by,
      joined_at: serverTimestamp()
    });
    
    return {
      ...groupData,
      id: parseInt(groupRef.id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 1,
      expense_count: 0,
      expenses_by_currency: []
    };
  },

  updateGroup: async (groupId: string, userId: string, updates: Partial<Group>): Promise<{ message: string; group: Group }> => {
    const groupRef = doc(db, 'groups', groupId);
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(groupRef, updateData);
    
    const updatedGroup = await firebaseGroupService.getGroupDetails(groupId);
    return {
      message: 'Group updated successfully',
      group: updatedGroup
    };
  },

  deleteGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const batch = writeBatch(db);
    
    // Delete group
    batch.delete(doc(db, 'groups', groupId));
    
    // Delete group members
    const groupMembersRef = collection(db, 'groupMembers');
    const memberQuery = query(where('group_id', '==', groupId));
    const memberDocs = await getDocs(memberQuery);
    memberDocs.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete group expenses
    const expensesRef = collection(db, 'expenses');
    const expenseQuery = query(where('group_id', '==', groupId));
    const expenseDocs = await getDocs(expenseQuery);
    expenseDocs.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    
    return { message: 'Group deleted successfully' };
  },

  getUserContacts: async (userId: string, forceRefresh: boolean = false): Promise<UserContact[]> => {
    // For now, return empty array - contacts can be implemented later
    return [];
  },

  generateInviteLink: async (groupId: string, userId: string): Promise<InviteLinkData> => {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const inviteRef = await addDoc(collection(db, 'invites'), {
      group_id: groupId,
      created_by: userId,
      code: inviteCode,
      created_at: serverTimestamp(),
      expires_at: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
    });
    
    return {
      inviteCode,
      groupId: parseInt(groupId),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  },

  joinGroupViaInvite: async (inviteCode: string, userId: string): Promise<{ message: string; groupId: number; groupName: string }> => {
    // Find invite
    const invitesRef = collection(db, 'invites');
    const inviteQuery = query(
      invitesRef,
      where('code', '==', inviteCode),
      where('expires_at', '>', Timestamp.now())
    );
    const inviteDocs = await getDocs(inviteQuery);
    
    if (inviteDocs.empty) {
      throw new Error('Invalid or expired invite code');
    }
    
    const invite = inviteDocs.docs[0];
    const groupId = invite.data().group_id;
    
    // Check if user is already a member
    const groupMembersRef = collection(db, 'groupMembers');
    const memberQuery = query(
      groupMembersRef,
      where('group_id', '==', groupId),
      where('user_id', '==', userId)
    );
    const memberDocs = await getDocs(memberQuery);
    
    if (!memberDocs.empty) {
      throw new Error('You are already a member of this group');
    }
    
    // Add user to group
    await addDoc(collection(db, 'groupMembers'), {
      group_id: groupId,
      user_id: userId,
      joined_at: serverTimestamp()
    });
    
    // Get group name
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    const groupName = groupDoc.exists() ? groupDoc.data().name : 'Unknown Group';
    
    return {
      message: 'Successfully joined group',
      groupId: parseInt(groupId),
      groupName
    };
  }
};

// Expense services
export const firebaseExpenseService = {
  getGroupExpenses: async (groupId: string, forceRefresh: boolean = false): Promise<Expense[]> => {
    try {
      if (__DEV__) { console.log('🔥 Getting expenses for group:', groupId); }
      
      const expensesRef = collection(db, 'expenses');
      const expenseQuery = query(
        expensesRef,
        where('group_id', '==', groupId)
        // Removed orderBy to avoid index requirement
      );
      
      if (__DEV__) { console.log('🔥 Querying expenses for group_id:', groupId); }
      const expenseDocs = await getDocs(expenseQuery);
      
      if (__DEV__) { console.log('🔥 Found', expenseDocs.docs.length, 'expense documents for group:', groupId); }
      
      const expenses = expenseDocs.docs.map(doc => {
        try {
          return firebaseDataTransformers.firestoreToExpense(doc);
        } catch (error) {
          if (__DEV__) { console.error('🔥 Error transforming expense document:', error); }
          return null;
        }
      }).filter(expense => expense !== null);
      
      if (__DEV__) { console.log('🔥 Returning', expenses.length, 'expenses for group:', groupId); }
      return expenses;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in getGroupExpenses for group', groupId, ':', error); }
      throw error;
    }
  },

  createExpense: async (expenseData: any): Promise<Expense> => {
    const expenseRef = await addDoc(collection(db, 'expenses'), firebaseDataTransformers.expenseToFirestore(expenseData));
    
    // Update group expense count
    const groupRef = doc(db, 'groups', expenseData.groupId.toString());
    await updateDoc(groupRef, {
      expense_count: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    return {
      ...expenseData,
      id: parseInt(expenseRef.id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  updateExpense: async (expenseId: number, updates: Partial<Expense>): Promise<Expense> => {
    const expenseRef = doc(db, 'expenses', expenseId.toString());
    const updateData: any = {};
    
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.paid_by !== undefined) updateData.paid_by = updates.paid_by;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.split_type !== undefined) updateData.split_type = updates.split_type;
    if (updates.split_data !== undefined) updateData.split_data = updates.split_data;
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(expenseRef, updateData);
    
    const expenseDoc = await getDoc(expenseRef);
    return firebaseDataTransformers.firestoreToExpense(expenseDoc);
  },

  deleteExpense: async (expenseId: number): Promise<{ message: string }> => {
    const expenseRef = doc(db, 'expenses', expenseId.toString());
    const expenseDoc = await getDoc(expenseRef);
    
    if (!expenseDoc.exists()) {
      throw new Error('Expense not found');
    }
    
    const groupId = expenseDoc.data().group_id;
    
    // Delete expense
    await deleteDoc(expenseRef);
    
    // Update group expense count
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      expense_count: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    return { message: 'Expense deleted successfully' };
  }
};

// Balance calculation
const calculateUserBalance = (expenses: Expense[], members: GroupMember[], userId: string | number): number => {
  let balance = 0;
  
  expenses.forEach(expense => {
    const sharePerPerson = expense.amount / members.length; // Simplified equal split
    
    if (expense.paid_by === userId.toString()) {
      // User paid, so they should receive money back
      balance += expense.amount - sharePerPerson;
    } else {
      // Someone else paid, user owes their share
      balance -= sharePerPerson;
    }
  });
  
  return balance;
};

// Settlement services (placeholder implementations)
export const firebaseSettlementService = {
  getSettlementCalculation: async (groupId: string): Promise<SettlementCalculation[]> => {
    // TODO: Implement settlement calculation logic
    return [];
  },

  settleGroupExpenses: async (groupId: string, userId: string, settlementType: 'individual' | 'full' = 'individual'): Promise<SettlementResult> => {
    // TODO: Implement settlement logic
    return {
      success: true,
      message: 'Settlement completed',
      settlements: []
    };
  },

  recordPersonalSettlement: async (
    groupId: string,
    userId: string,
    recipientId: string,
    amount: number,
    currency: string = 'USDC'
  ): Promise<{ success: boolean; message: string }> => {
    // TODO: Implement personal settlement recording
    return {
      success: true,
      message: 'Settlement recorded successfully'
    };
  },

  getReminderStatus: async (groupId: string, userId: string): Promise<ReminderStatus> => {
    // TODO: Implement reminder status logic
    return {
      hasOutstandingBalance: false,
      outstandingAmount: 0,
      lastReminderSent: null
    };
  },

  sendPaymentReminder: async (
    groupId: string,
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<{ success: boolean; message: string; recipientName: string; amount: number }> => {
    // TODO: Implement payment reminder logic
    return {
      success: true,
      message: 'Payment reminder sent successfully',
      recipientName: 'Unknown',
      amount
    };
  }
};

// Export the main data service object
export const firebaseDataService = {
  user: firebaseUserService,
  group: firebaseGroupService,
  expense: firebaseExpenseService,
  settlement: firebaseSettlementService,
  transformers: firebaseDataTransformers
}; 