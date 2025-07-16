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
    wallet_address: doc.data().wallet_address || doc.data().walletAddress || '',
    wallet_public_key: doc.data().wallet_public_key || doc.data().walletPublicKey || '',
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
    member_count: group.member_count || 0,
    expense_count: group.expense_count || 0,
    expenses_by_currency: group.expenses_by_currency || []
  }),

  // Transform Firestore document to GroupMember
  firestoreToGroupMember: (doc: any): GroupMember => ({
    id: doc.id, // Keep as string for Firebase compatibility
    name: doc.data().name || '',
    email: doc.data().email || '',
    wallet_address: doc.data().wallet_address || doc.data().walletAddress || '',
    wallet_public_key: doc.data().wallet_public_key || doc.data().walletPublicKey || '',
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
  expenseToFirestore: (expense: any): any => ({
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    paid_by: expense.paid_by || expense.paidBy, // Handle both camelCase and snake_case
    group_id: (expense.group_id || expense.groupId).toString(), // Handle both camelCase and snake_case
    category: expense.category,
    split_type: expense.splitType,
    split_data: expense.splitData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  })
};

// Helper function to update group member count
const updateGroupMemberCount = async (groupId: string) => {
  try {
    const groupMembersRef = collection(db, 'groupMembers');
    const memberQuery = query(groupMembersRef, where('group_id', '==', groupId));
    const memberDocs = await getDocs(memberQuery);
    
    const memberCount = memberDocs.docs.length;
    
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      member_count: memberCount,
      updated_at: serverTimestamp()
    });
    
    if (__DEV__) { console.log('🔥 Updated group member count to:', memberCount); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error updating group member count:', error); }
  }
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
    } as User;
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
    if (__DEV__) { console.log('🔥 Creating group with data:', groupData); }
    
    try {
      // Create the group document with proper member data
      const groupDocData = {
        ...firebaseDataTransformers.groupToFirestore(groupData),
        member_count: 1, // Creator is automatically a member
        memberIds: [groupData.created_by], // Add creator to memberIds array
        created_by: groupData.created_by // Ensure created_by is set
      };
      
      if (__DEV__) { console.log('🔥 Group document data:', groupDocData); }
      
      const groupRef = await addDoc(collection(db, 'groups'), groupDocData);
      
      if (__DEV__) { console.log('🔥 Group created with ID:', groupRef.id); }
      
      // Add creator as first member to groupMembers collection
      const groupMemberRef = await addDoc(collection(db, 'groupMembers'), {
        group_id: groupRef.id,
        user_id: groupData.created_by,
        joined_at: serverTimestamp()
      });
      
      if (__DEV__) { console.log('🔥 Creator added as member with ID:', groupMemberRef.id); }
      
      const createdGroup = {
        ...groupData,
        id: groupRef.id, // Keep as string for Firebase compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member_count: 1,
        expense_count: 0,
        expenses_by_currency: []
      };
      
      if (__DEV__) { console.log('🔥 Group creation completed:', createdGroup); }
      
      return createdGroup;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error creating group:', error); }
      throw error;
    }
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
    try {
      if (__DEV__) { console.log('🔥 Getting user contacts for:', userId); }
      
      // Get all groups where the user is a member
      const groupMembersRef = collection(db, 'groupMembers');
      const userGroupsQuery = query(
        groupMembersRef,
        where('user_id', '==', userId)
      );
      
      const userGroupsDocs = await getDocs(userGroupsQuery);
      const userGroupIds = userGroupsDocs.docs.map(doc => doc.data().group_id);
      
      if (__DEV__) { console.log('🔥 User is in groups:', userGroupIds); }
      
      if (userGroupIds.length === 0) {
        if (__DEV__) { console.log('🔥 No groups found for user, returning empty contacts'); }
        return [];
      }
      
      // Get all members from all groups the user is in
      const allMembersQuery = query(
        groupMembersRef,
        where('group_id', 'in', userGroupIds)
      );
      
      const allMembersDocs = await getDocs(allMembersQuery);
      
      // Create a map to track unique users and their group counts
      const userMap = new Map<string, { memberData: any; groupCount: number; earliestJoinedAt: string }>();
      
      allMembersDocs.docs.forEach(doc => {
        const memberData = doc.data();
        const memberId = memberData.user_id;
        
        // Debug: Log group member data
        if (__DEV__) { 
          console.log('🔥 Group member data:', {
            user_id: memberId,
            name: memberData.name,
            email: memberData.email,
            wallet_address: memberData.wallet_address,
            wallet_public_key: memberData.wallet_public_key,
            joined_at: memberData.joined_at
          });
        }
        
        // Skip the current user
        if (memberId === userId) return;
        
        const joinedAt = memberData.joined_at?.toDate?.()?.toISOString() || memberData.joined_at || new Date().toISOString();
        
        if (userMap.has(memberId)) {
          // User already exists, increment group count
          const existing = userMap.get(memberId)!;
          existing.groupCount += 1;
          
          // Update earliest joined date
          const currentEarliest = new Date(existing.earliestJoinedAt);
          const newJoined = new Date(joinedAt);
          if (newJoined < currentEarliest) {
            existing.earliestJoinedAt = joinedAt;
          }
        } else {
          // New user, create entry
          userMap.set(memberId, {
            memberData,
            groupCount: 1,
            earliestJoinedAt: joinedAt
          });
        }
      });
      
      // Now fetch full user data for each unique user
      const contacts: UserContact[] = [];
      for (const [memberId, userInfo] of userMap) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            // Debug: Log the raw Firestore document data
            if (__DEV__) { 
              console.log('🔥 Raw Firestore user document data:', {
                id: userDoc.id,
                data: userDoc.data(),
                wallet_address_field: userDoc.data().wallet_address,
                wallet_public_key_field: userDoc.data().wallet_public_key
              });
            }
            
            const user = firebaseDataTransformers.firestoreToUser(userDoc);
            
            if (__DEV__) { 
              console.log('🔥 User data from users collection:', {
                id: user.id,
                name: user.name,
                email: user.email,
                wallet: user.wallet_address ? `${user.wallet_address.substring(0, 6)}...${user.wallet_address.substring(user.wallet_address.length - 6)}` : 'No wallet',
                fullWallet: user.wallet_address
              });
            }
            
            contacts.push({
              ...user,
              id: user.id, // Keep as string for Firebase compatibility
              joined_at: userInfo.earliestJoinedAt,
              first_met_at: userInfo.earliestJoinedAt,
              mutual_groups_count: userInfo.groupCount,
              isFavorite: false
            });
          } else {
            if (__DEV__) { console.log('🔥 User document not found for ID:', memberId); }
            // Fallback to member data if user document doesn't exist
            const memberData = userInfo.memberData;
            
            if (__DEV__) { 
              console.log('🔥 Fallback to group member data:', {
                id: memberId,
                name: memberData.name,
                email: memberData.email,
                wallet: memberData.wallet_address ? `${memberData.wallet_address.substring(0, 6)}...${memberData.wallet_address.substring(memberData.wallet_address.length - 6)}` : 'No wallet',
                fullWallet: memberData.wallet_address
              });
            }
            
            contacts.push({
              id: memberId,
              name: memberData.name || memberData.email || 'Unknown User',
              email: memberData.email || '',
              wallet_address: memberData.wallet_address || '',
              wallet_public_key: memberData.wallet_public_key || '',
              avatar: memberData.avatar || '',
              created_at: memberData.created_at?.toDate?.()?.toISOString() || memberData.created_at || new Date().toISOString(),
              joined_at: userInfo.earliestJoinedAt,
              first_met_at: userInfo.earliestJoinedAt,
              mutual_groups_count: userInfo.groupCount,
              isFavorite: false
            });
          }
        } catch (error) {
          if (__DEV__) { console.error('🔥 Error fetching user data for ID:', memberId, error); }
          // Continue with other users
        }
      }
      
      if (__DEV__) { console.log('🔥 Found', contacts.length, 'unique contacts from', userGroupIds.length, 'groups'); }
      
      return contacts;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user contacts:', error); }
      throw error;
    }
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
    } as InviteLinkData;
  },

  joinGroupViaInvite: async (inviteCode: string, userId: string): Promise<{ message: string; groupId: number; groupName: string }> => {
    // TODO: Implement Firebase-based invite joining
    return {
      message: 'Successfully joined group',
      groupId: 1,
      groupName: 'Test Group'
    };
  },

  leaveGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    try {
      // Remove user from group members
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId),
        where('user_id', '==', userId)
      );
      
      const memberDocs = await getDocs(memberQuery);
      
      if (memberDocs.empty) {
        throw new Error('User is not a member of this group');
      }
      
      // Delete the member document
      const memberDoc = memberDocs.docs[0];
      await deleteDoc(memberDoc.ref);
      
      // Update group member count using helper function
      await updateGroupMemberCount(groupId);
      
      return { message: 'Successfully left the group' };
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
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
    if (__DEV__) { console.log('🔥 Creating expense with data:', expenseData); }
    
    try {
      // Validate required fields
      if (!expenseData.description) {
        throw new Error('Expense description is required');
      }
      if (!expenseData.amount || expenseData.amount <= 0) {
        throw new Error('Expense amount must be greater than 0');
      }
      if (!expenseData.paid_by && !expenseData.paidBy) {
        throw new Error('Expense paid_by is required');
      }
      if (!expenseData.group_id && !expenseData.groupId) {
        throw new Error('Expense group_id is required');
      }

      if (__DEV__) { console.log('🔥 Validating expense data...'); }
      
      // Transform data for Firestore
      const firestoreData = firebaseDataTransformers.expenseToFirestore(expenseData);
      if (__DEV__) { console.log('🔥 Transformed data for Firestore:', firestoreData); }
      
      // Create expense document
      if (__DEV__) { console.log('🔥 Adding document to expenses collection...'); }
      const expenseRef = await addDoc(collection(db, 'expenses'), firestoreData);
      if (__DEV__) { console.log('🔥 Expense document created with ID:', expenseRef.id); }
      
      // Get the group ID from the expense data (handle both camelCase and snake_case)
      const groupId = expenseData.groupId || expenseData.group_id;
      if (!groupId) {
        throw new Error('Group ID is required for expense creation');
      }
      
      if (__DEV__) { console.log('🔥 Updating group expense count for group:', groupId); }
      
      // Update group expense count - increment instead of setting to timestamp
      const groupRef = doc(db, 'groups', groupId.toString());
      if (__DEV__) { console.log('🔥 Getting group document reference:', groupRef.path); }
      
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const currentExpenseCount = groupDoc.data().expense_count || 0;
        if (__DEV__) { console.log('🔥 Current expense count:', currentExpenseCount); }
        
        await updateDoc(groupRef, {
          expense_count: currentExpenseCount + 1,
          updated_at: serverTimestamp()
        });
        if (__DEV__) { console.log('🔥 Updated group expense count to:', currentExpenseCount + 1); }
      } else {
        if (__DEV__) { console.log('🔥 Warning: Group document not found for ID:', groupId); }
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      const createdExpense = {
        ...expenseData,
        id: expenseRef.id, // Keep as string for Firebase compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (__DEV__) { console.log('🔥 Created expense successfully:', createdExpense); }
      
      return createdExpense;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error creating expense:', error); }
      throw error;
    }
  },

  updateExpense: async (expenseId: number, updates: Partial<Expense>): Promise<Expense> => {
    const expenseRef = doc(db, 'expenses', expenseId.toString());
    const updateData: any = {};
    
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.paid_by !== undefined) updateData.paid_by = updates.paid_by;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.splitType !== undefined) updateData.split_type = updates.splitType;
    if (updates.splitData !== undefined) updateData.split_data = updates.splitData;
    
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

// Settlement services (Firebase implementations)
export const firebaseSettlementService = {
  getSettlementCalculation: async (groupId: string): Promise<SettlementCalculation[]> => {
    try {
      if (__DEV__) { console.log('🔥 Getting settlement calculation for group:', groupId); }
      
      // Get all expenses for the group
      const expenses = await firebaseExpenseService.getGroupExpenses(groupId);
      const members = await firebaseGroupService.getGroupMembers(groupId);
      
      if (expenses.length === 0 || members.length === 0) {
        return [];
      }
      
      // Calculate balances for each member
      const balances: { [memberId: string]: number } = {};
      members.forEach(member => {
        balances[member.id] = 0;
      });
      
      // Process each expense
      expenses.forEach(expense => {
        const paidBy = expense.paid_by;
        const amount = expense.amount;
        const sharePerPerson = amount / members.length;
        
        // Person who paid gets credited the full amount
        if (balances[paidBy] !== undefined) {
          balances[paidBy] += amount;
        }
        
        // Everyone owes their share
        members.forEach(member => {
          if (balances[member.id] !== undefined) {
            balances[member.id] -= sharePerPerson;
          }
        });
      });
      
      // Generate settlement calculations
      const settlements: SettlementCalculation[] = [];
      const memberIds = Object.keys(balances);
      
      for (let i = 0; i < memberIds.length; i++) {
        for (let j = i + 1; j < memberIds.length; j++) {
          const member1Id = memberIds[i];
          const member2Id = memberIds[j];
          const balance1 = balances[member1Id];
          const balance2 = balances[member2Id];
          
          const member1 = members.find(m => m.id === member1Id);
          const member2 = members.find(m => m.id === member2Id);
          
          if (member1 && member2) {
            if (balance1 > 0 && balance2 < 0) {
              // Member 1 is owed money, Member 2 owes money
              const amount = Math.min(balance1, Math.abs(balance2));
              settlements.push({
                from: member2Id,
                to: member1Id,
                amount: amount,
                fromName: member2.name,
                toName: member1.name
              });
            } else if (balance1 < 0 && balance2 > 0) {
              // Member 1 owes money, Member 2 is owed money
              const amount = Math.min(Math.abs(balance1), balance2);
              settlements.push({
                from: member1Id,
                to: member2Id,
                amount: amount,
                fromName: member1.name,
                toName: member2.name
              });
            }
          }
        }
      }
      
      if (__DEV__) { console.log('🔥 Settlement calculations:', settlements); }
      return settlements;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in getSettlementCalculation:', error); }
      throw error;
    }
  },

  settleGroupExpenses: async (
    groupId: string, 
    userId: string, 
    settlementType: 'individual' | 'full' = 'individual'
  ): Promise<SettlementResult> => {
    try {
      if (__DEV__) { console.log('🔥 Settling group expenses:', { groupId, userId, settlementType }); }
      
      // For now, return a success message
      // In a real implementation, this would:
      // 1. Calculate settlements
      // 2. Create settlement records in Firestore
      // 3. Update expense statuses
      // 4. Send notifications using firebaseNotificationService
      
      return {
        message: 'Settlement processed successfully',
        amountSettled: 0,
        settlements: []
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in settleGroupExpenses:', error); }
      throw error;
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
      if (__DEV__) { console.log('🔥 Recording personal settlement:', { groupId, userId, recipientId, amount, currency }); }
      
      // Create settlement record in Firestore
      const settlementRef = await addDoc(collection(db, 'settlements'), {
        group_id: groupId,
        payer_id: userId,
        recipient_id: recipientId,
        amount: amount,
        currency: currency,
        status: 'completed',
        created_at: serverTimestamp(),
        settlement_type: 'personal'
      });
      
      if (__DEV__) { console.log('🔥 Settlement recorded with ID:', settlementRef.id); }
      
      return {
        success: true,
        message: 'Settlement recorded successfully'
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in recordPersonalSettlement:', error); }
      throw error;
    }
  },

  getReminderStatus: async (groupId: string, userId: string): Promise<ReminderStatus> => {
    try {
      if (__DEV__) { console.log('🔥 Getting reminder status for user:', userId, 'in group:', groupId); }
      
      // Get reminder records from Firestore
      const remindersRef = collection(db, 'reminders');
      const reminderQuery = query(
        remindersRef,
        where('group_id', '==', groupId),
        where('sender_id', '==', userId)
      ) as any;
      
      const reminderDocs = await getDocs(reminderQuery);
      
      // Process reminder data to build cooldown status
      const individualCooldowns: { [recipientId: string]: any } = {};
      let bulkCooldown: any = null;
      
      const now = new Date();
      const cooldownDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      reminderDocs.docs.forEach(doc => {
        const data = doc.data();
        const sentAt = data.sent_at?.toDate() || new Date();
        const timeSinceSent = now.getTime() - sentAt.getTime();
        
        if (timeSinceSent < cooldownDuration) {
          const timeRemaining = cooldownDuration - timeSinceSent;
          const timeRemainingMinutes = Math.ceil(timeRemaining / (60 * 1000));
          
          const cooldown = {
            nextAllowedAt: new Date(sentAt.getTime() + cooldownDuration).toISOString(),
            timeRemainingMinutes: timeRemainingMinutes,
            formattedTimeRemaining: `${Math.floor(timeRemainingMinutes / 60)}h ${timeRemainingMinutes % 60}m`
          };
          
          if (data.reminder_type === 'bulk') {
            bulkCooldown = cooldown;
          } else {
            individualCooldowns[data.recipient_id] = cooldown;
          }
        }
      });
      
      const status: ReminderStatus = {
        individualCooldowns,
        bulkCooldown
      };
      
      if (__DEV__) { console.log('🔥 Reminder status:', status); }
      return status;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in getReminderStatus:', error); }
      throw error;
    }
  },

  sendPaymentReminder: async (
    groupId: string,
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<{ success: boolean; message: string; recipientName: string; amount: number }> => {
    try {
      if (__DEV__) { console.log('🔥 Sending payment reminder:', { groupId, senderId, recipientId, amount }); }
      
      // Get recipient user data
      const recipientDoc = await getDoc(doc(db, 'users', recipientId));
      if (!recipientDoc.exists()) {
        throw new Error('Recipient not found');
      }
      
      const recipient = firebaseDataTransformers.firestoreToUser(recipientDoc);
      
      // Create reminder record in Firestore
      const reminderRef = await addDoc(collection(db, 'reminders'), {
        group_id: groupId,
        sender_id: senderId,
        recipient_id: recipientId,
        amount: amount,
        reminder_type: 'individual',
        sent_at: serverTimestamp(),
        status: 'sent'
      });
      
      if (__DEV__) { console.log('🔥 Reminder sent with ID:', reminderRef.id); }
      
      return {
        success: true,
        message: 'Payment reminder sent successfully',
        recipientName: recipient.name,
        amount: amount
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in sendPaymentReminder:', error); }
      throw error;
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
      if (__DEV__) { console.log('🔥 Sending bulk payment reminders:', { groupId, senderId, debtorsCount: debtors.length }); }
      
      const results: { recipientId: string; recipientName: string; amount: number; success: boolean }[] = [];
      const totalAmount = debtors.reduce((sum, debtor) => sum + debtor.amount, 0);
      
      // Create batch write for all reminders
      const batch = writeBatch(db);
      
      for (const debtor of debtors) {
        try {
          // Get recipient user data
          const recipientDoc = await getDoc(doc(db, 'users', debtor.recipientId));
          if (recipientDoc.exists()) {
            const recipient = firebaseDataTransformers.firestoreToUser(recipientDoc);
            
            // Add reminder to batch
            const reminderRef = doc(collection(db, 'reminders'));
            batch.set(reminderRef, {
              group_id: groupId,
              sender_id: senderId,
              recipient_id: debtor.recipientId,
              amount: debtor.amount,
              reminder_type: 'bulk',
              sent_at: serverTimestamp(),
              status: 'sent'
            });
            
            results.push({
      recipientId: debtor.recipientId,
              recipientName: recipient.name,
      amount: debtor.amount,
      success: true
            });
          } else {
            results.push({
              recipientId: debtor.recipientId,
              recipientName: debtor.name,
              amount: debtor.amount,
              success: false
            });
          }
        } catch (error) {
          if (__DEV__) { console.error('🔥 Error processing debtor:', debtor, error); }
          results.push({
            recipientId: debtor.recipientId,
            recipientName: debtor.name,
            amount: debtor.amount,
            success: false
          });
        }
      }
      
      // Commit the batch
      await batch.commit();
      
      if (__DEV__) { console.log('🔥 Bulk reminders sent:', results); }

    return {
      success: true,
      message: 'Bulk payment reminders sent successfully',
      results,
      totalAmount
    };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error in sendBulkPaymentReminders:', error); }
      throw error;
    }
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