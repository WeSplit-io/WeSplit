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
  ApiResponse,
  Notification,
  Transaction
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
  writeBatch,
  onSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendNotification } from './firebaseNotificationService';

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
    avatar: doc.data().avatar || '',
    invitation_status: doc.data().invitation_status,
    invited_at: firebaseDataTransformers.timestampToISO(doc.data().invited_at),
    invited_by: doc.data().invited_by
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
  }),

  // Transform Firestore document to Transaction
  firestoreToTransaction: (doc: any): Transaction => ({
    id: doc.id,
    type: doc.data().type || 'send',
    amount: doc.data().amount || 0,
    currency: doc.data().currency || 'USDC',
    from_user: doc.data().from_user || '',
    to_user: doc.data().to_user || '',
    from_wallet: doc.data().from_wallet || '',
    to_wallet: doc.data().to_wallet || '',
    tx_hash: doc.data().tx_hash || '',
    note: doc.data().note || '',
    status: doc.data().status || 'pending',
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    updated_at: firebaseDataTransformers.timestampToISO(doc.data().updated_at)
  }),

  // Transform Transaction to Firestore data
  transactionToFirestore: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): any => ({
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    from_user: transaction.from_user,
    to_user: transaction.to_user,
    from_wallet: transaction.from_wallet,
    to_wallet: transaction.to_wallet,
    tx_hash: transaction.tx_hash,
    note: transaction.note,
    status: transaction.status,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  }),

  // Transform Firestore document to Notification
  firestoreToNotification: (doc: any): Notification => ({
    id: doc.id,
    userId: doc.data().userId || doc.data().user_id || '',
    type: doc.data().type || 'general',
    title: doc.data().title || '',
    message: doc.data().message || '',
    data: doc.data().data || {},
    is_read: doc.data().is_read || false,
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at)
  }),

  // Transform Notification to Firestore data
  notificationToFirestore: (notification: Omit<Notification, 'id' | 'created_at'>): any => ({
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    is_read: notification.is_read,
    created_at: serverTimestamp()
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

// Helper function to update group expense count
const updateGroupExpenseCount = async (groupId: string) => {
  try {
    const expensesRef = collection(db, 'expenses');
    const expenseQuery = query(expensesRef, where('group_id', '==', groupId));
    const expenseDocs = await getDocs(expenseQuery);
    
    const expenseCount = expenseDocs.docs.length;
    
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      expense_count: expenseCount,
      updated_at: serverTimestamp()
    });
    
    if (__DEV__) { console.log('🔥 Updated group expense count to:', expenseCount); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error updating group expense count:', error); }
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
    const userRef = await addDoc(collection(db, 'users'), firebaseDataTransformers.userToFirestore(userData as User));
    return {
      ...userData,
      id: userRef.id, // Keep as string for Firebase compatibility
      created_at: new Date().toISOString()
    } as User;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {};
    
    // Only update fields that are provided
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.wallet_address !== undefined) updateData.wallet_address = updates.wallet_address;
    if (updates.wallet_public_key !== undefined) updateData.wallet_public_key = updates.wallet_public_key;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(userRef, updateData);
    
    // Return updated user
    const updatedDoc = await getDoc(userRef);
    return firebaseDataTransformers.firestoreToUser(updatedDoc);
  },

  getUserContacts: async (userId: string): Promise<UserContact[]> => {
    try {
      // Get user's contacts from contacts collection
      const contactsRef = collection(db, 'contacts');
      const contactsQuery = query(
        contactsRef, 
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );
      const contactsDocs = await getDocs(contactsQuery);
      
      return contactsDocs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          wallet_address: data.wallet_address || '',
          wallet_public_key: data.wallet_public_key || '',
          created_at: firebaseDataTransformers.timestampToISO(data.created_at),
          joined_at: firebaseDataTransformers.timestampToISO(data.joined_at),
          avatar: data.avatar || '',
          first_met_at: firebaseDataTransformers.timestampToISO(data.first_met_at),
          mutual_groups_count: data.mutual_groups_count || 0,
          isFavorite: data.isFavorite || false
        } as UserContact;
      });
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user contacts:', error); }
      return [];
    }
  },

  addContact: async (userId: string, contactData: Omit<UserContact, 'id' | 'created_at' | 'joined_at' | 'first_met_at'>): Promise<UserContact> => {
    const contactRef = await addDoc(collection(db, 'contacts'), {
      user_id: userId,
      name: contactData.name,
      email: contactData.email,
      wallet_address: contactData.wallet_address,
      wallet_public_key: contactData.wallet_public_key,
      avatar: contactData.avatar,
      mutual_groups_count: contactData.mutual_groups_count || 0,
      isFavorite: contactData.isFavorite || false,
      first_met_at: serverTimestamp(),
      created_at: serverTimestamp()
    });
    
    return {
      ...contactData,
      id: contactRef.id,
      created_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      first_met_at: new Date().toISOString()
    } as UserContact;
  },

  removeContact: async (userId: string, contactId: string): Promise<void> => {
    const contactsRef = collection(db, 'contacts');
    const contactQuery = query(
      contactsRef,
      where('user_id', '==', userId),
      where('contact_id', '==', contactId)
    );
    const contactDocs = await getDocs(contactQuery);
    
    if (!contactDocs.empty) {
      await deleteDoc(doc(db, 'contacts', contactDocs.docs[0].id));
    }
  },

  toggleFavorite: async (userId: string, contactId: string, isFavorite: boolean): Promise<void> => {
    const contactsRef = collection(db, 'contacts');
    const contactQuery = query(
      contactsRef,
      where('user_id', '==', userId),
      where('contact_id', '==', contactId)
    );
    const contactDocs = await getDocs(contactQuery);
    
    if (!contactDocs.empty) {
      await updateDoc(doc(db, 'contacts', contactDocs.docs[0].id), {
        isFavorite,
        updated_at: serverTimestamp()
      });
    }
  },

  // Seed phrase management
  saveUserSeedPhrase: async (userId: string, seedPhrase: string[]): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        seed_phrase: seedPhrase,
        seed_phrase_verified: false,
        updated_at: serverTimestamp()
      });
      
      if (__DEV__) { console.log('🔥 Seed phrase saved for user:', userId); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error saving seed phrase:', error); }
      throw error;
    }
  },

  getUserSeedPhrase: async (userId: string): Promise<string[] | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return null;
      }
      
      const data = userDoc.data();
      return data.seed_phrase || null;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user seed phrase:', error); }
      throw new Error('No seed phrase found for this user');
    }
  },

  markSeedPhraseVerified: async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        seed_phrase_verified: true,
        updated_at: serverTimestamp()
      });
      
      if (__DEV__) { console.log('🔥 Seed phrase marked as verified for user:', userId); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error marking seed phrase as verified:', error); }
      throw error;
    }
  }
};

// Group services
export const firebaseGroupService = {
  getUserGroups: async (userId: string, forceRefresh: boolean = false): Promise<GroupWithDetails[]> => {
    try {
    // Get groups where user is a member
    const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(groupMembersRef, where('user_id', '==', userId));
    const memberDocs = await getDocs(memberQuery);
    
    const groupIds = memberDocs.docs.map(doc => doc.data().group_id);
    
    if (groupIds.length === 0) {
      return [];
    }
    
    // Get group details
      const groupsRef = collection(db, 'groups');
      const groupsQuery = query(groupsRef, where('__name__', 'in', groupIds));
      const groupsDocs = await getDocs(groupsQuery);
      
      // Transform to GroupWithDetails
      const groupsWithDetails: GroupWithDetails[] = [];
      
      for (const groupDoc of groupsDocs.docs) {
          const group = firebaseDataTransformers.firestoreToGroup(groupDoc);
          
        // Get group members
        const groupMembersQuery = query(groupMembersRef, where('group_id', '==', group.id));
        const groupMemberDocs = await getDocs(groupMembersQuery);
        const members = groupMemberDocs.docs.map(doc => firebaseDataTransformers.firestoreToGroupMember(doc));
        
        // Get group expenses
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(expensesRef, where('group_id', '==', group.id));
        const expensesDocs = await getDocs(expensesQuery);
        const expenses = expensesDocs.docs.map(doc => firebaseDataTransformers.firestoreToExpense(doc));
          
                  // Calculate totals
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const userBalance = calculateUserBalance(expenses, members, userId);
        
        groupsWithDetails.push({
          ...group,
          members,
          expenses,
          totalAmount,
          userBalance
        });
        }
      
      return groupsWithDetails;
      } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user groups:', error); }
      return [];
      }
  },

  getGroupDetails: async (groupId: string, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    
    const group = firebaseDataTransformers.firestoreToGroup(groupDoc);
    
    // Get group members
    const groupMembersRef = collection(db, 'groupMembers');
    const memberQuery = query(groupMembersRef, where('group_id', '==', groupId));
    const memberDocs = await getDocs(memberQuery);
    const members = memberDocs.docs.map(doc => firebaseDataTransformers.firestoreToGroupMember(doc));
    
    // Get group expenses
    const expensesRef = collection(db, 'expenses');
    const expensesQuery = query(expensesRef, where('group_id', '==', groupId));
    const expensesDocs = await getDocs(expensesQuery);
    const expenses = expensesDocs.docs.map(doc => firebaseDataTransformers.firestoreToExpense(doc));
    
    // Calculate totals
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const userBalance = calculateUserBalance(expenses, members, group.created_by);
    
    return {
      ...group,
      members,
      expenses,
      totalAmount,
      userBalance
    };
  },

  // Helper function to clean up phantom members
  cleanupPhantomMembers: async (groupId: string): Promise<void> => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) return;
      
      const groupName = groupDoc.data()?.name;
      
      const groupMembersRef = collection(db, 'groupMembers');
      
      // Get all members for this group
      const allMembersQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId)
      );
      const allMembersDocs = await getDocs(allMembersQuery);
      
      const membersToDelete: any[] = [];
      
      // Clean up members with the same name as the group
      if (groupName) {
        allMembersDocs.docs.forEach(doc => {
          const memberData = doc.data();
          if (memberData.name === groupName) {
            membersToDelete.push(doc.ref);
            if (__DEV__) {
              console.log('🔥 Marking for deletion - member with group name:', memberData.name);
            }
          }
        });
      }
      
      // Clean up members with "Unknown User" name
      allMembersDocs.docs.forEach(doc => {
        const memberData = doc.data();
        if (memberData.name === 'Unknown User') {
          membersToDelete.push(doc.ref);
          if (__DEV__) {
            console.log('🔥 Marking for deletion - member with "Unknown User" name');
          }
        }
      });
      
      // Clean up duplicate members with the same email but different IDs
      const emailGroups: Record<string, any[]> = {};
      allMembersDocs.docs.forEach(doc => {
        const memberData = doc.data();
        const email = memberData.email || '';
        if (email) {
          if (!emailGroups[email]) {
            emailGroups[email] = [];
          }
          emailGroups[email].push({ doc, data: memberData });
        }
      });
      
      // If there are multiple members with the same email, keep only the one with the most recent joined_at
      Object.entries(emailGroups).forEach(([email, members]) => {
        if (members.length > 1) {
          // Sort by joined_at timestamp (most recent first)
          members.sort((a, b) => {
            const aTime = a.data.joined_at?.toDate?.() || new Date(0);
            const bTime = b.data.joined_at?.toDate?.() || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });
          
          // Keep the most recent one, delete the rest
          for (let i = 1; i < members.length; i++) {
            membersToDelete.push(members[i].doc.ref);
            if (__DEV__) {
              console.log('🔥 Marking for deletion - duplicate member with email:', email, 'ID:', members[i].data.user_id);
            }
          }
        }
      });
      
      // Delete all marked members
      if (membersToDelete.length > 0) {
        const batch = writeBatch(db);
        membersToDelete.forEach(ref => {
          batch.delete(ref);
        });
        await batch.commit();
        
        if (__DEV__) {
          console.log('🔥 Cleaned up phantom members:', membersToDelete.length);
        }
      }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error cleaning up phantom members:', error); }
    }
  },

  getGroupMembers: async (groupId: string, forceRefresh: boolean = false, currentUserId?: string): Promise<GroupMember[]> => {
    try {
      // First, clean up any phantom members
      await firebaseDataService.group.cleanupPhantomMembers(groupId);
      
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId),
        orderBy('joined_at', 'asc')
      );
      const memberDocs = await getDocs(memberQuery);
      let members = memberDocs.docs.map(doc => firebaseDataTransformers.firestoreToGroupMember(doc));

      // Get group info to filter out phantom members
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      const groupName = groupDoc.exists() ? groupDoc.data()?.name : '';

      // Filter out phantom members (members with the same name as the group or "Unknown User")
      members = members.filter(member => {
        if (groupName && member.name === groupName) {
          if (__DEV__) {
            console.log('🔥 Filtering out phantom member with group name:', member.name);
          }
          return false;
        }
        if (member.name === 'Unknown User') {
          if (__DEV__) {
            console.log('🔥 Filtering out phantom member with "Unknown User" name');
          }
          return false;
        }
        return true;
      });

      // If currentUserId is provided and not in members, add them
      if (currentUserId && !members.some(m => String(m.id) === String(currentUserId))) {
        const currentUser = await firebaseDataService.user.getCurrentUser(String(currentUserId));
        if (currentUser) {
          // Check if there's already a member with the same email (duplicate)
          const existingMemberWithEmail = members.find(m => m.email === currentUser.email);
          if (existingMemberWithEmail) {
            if (__DEV__) {
              console.log('🔥 Found existing member with same email, updating ID:', {
                existingId: existingMemberWithEmail.id,
                newId: currentUser.id,
                email: currentUser.email
              });
            }
            // Update the existing member's ID to match the current user
            existingMemberWithEmail.id = currentUser.id;
            } else {
            // Add the current user to the database if they're not already there
            const existingMemberQuery = query(
              groupMembersRef,
              where('group_id', '==', groupId),
              where('user_id', '==', currentUserId)
            );
            const existingMemberDocs = await getDocs(existingMemberQuery);
            
            if (existingMemberDocs.empty) {
              // Add current user to the database
              await addDoc(groupMembersRef, {
                group_id: groupId,
                user_id: currentUserId,
                name: currentUser.name || 'You',
                email: currentUser.email || '',
                wallet_address: currentUser.wallet_address || '',
                wallet_public_key: currentUser.wallet_public_key || '',
                avatar: currentUser.avatar || '',
                joined_at: serverTimestamp(),
                created_at: serverTimestamp()
              });
              
              if (__DEV__) {
                console.log('🔥 Added current user to group members in database');
            }
            }
            
            // Add to the returned members array
            members.push({
              id: currentUser.id,
              name: currentUser.name || 'You',
              email: currentUser.email || '',
              wallet_address: currentUser.wallet_address || '',
              wallet_public_key: currentUser.wallet_public_key || '',
              avatar: currentUser.avatar || '',
              joined_at: new Date().toISOString(),
              created_at: currentUser.created_at || new Date().toISOString()
            });
            
            if (__DEV__) {
              console.log('🔥 Added current user to members array:', {
                id: currentUser.id,
                name: currentUser.name || 'You'
              });
            }
          }
        }
      }
      
      if (__DEV__) {
        console.log('🔥 getGroupMembers returning members:', members.map(m => ({ id: m.id, name: m.name, email: m.email })));
      }
      
      return members;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting group members:', error); }
      return [];
    }
  },

  createGroup: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'expense_count' | 'expenses_by_currency'>): Promise<Group> => {
    const groupRef = await addDoc(collection(db, 'groups'), firebaseDataTransformers.groupToFirestore(groupData as Omit<Group, 'id' | 'created_at' | 'updated_at'>));
      
    // Get current user data to add as member
    const currentUser = await firebaseDataService.user.getCurrentUser(String(groupData.created_by));
      
    // Add creator as first member with correct user data
    const groupMembersRef = collection(db, 'groupMembers');
    await addDoc(groupMembersRef, {
        group_id: groupRef.id,
        user_id: groupData.created_by,
        name: currentUser?.name || 'Unknown User',
        email: currentUser?.email || '',
        wallet_address: currentUser?.wallet_address || '',
        wallet_public_key: currentUser?.wallet_public_key || '',
        avatar: currentUser?.avatar || '',
        joined_at: serverTimestamp(),
        created_at: serverTimestamp()
    });
    
    // Update member count
    await updateGroupMemberCount(groupRef.id);
    
    return {
        ...groupData,
      id: groupRef.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member_count: 1,
        expense_count: 0,
        expenses_by_currency: []
    } as Group;
  },

  updateGroup: async (groupId: string, userId: string, updates: Partial<Group>): Promise<{ message: string; group: Group }> => {
    const groupRef = doc(db, 'groups', groupId);
    
    // Check if user is group creator or member
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
    
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(groupRef, updateData);
    
    const updatedDoc = await getDoc(groupRef);
    const updatedGroup = firebaseDataTransformers.firestoreToGroup(updatedDoc);
    
    return {
      message: 'Group updated successfully',
      group: updatedGroup
    };
  },

  deleteGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    console.log('🔍 FirebaseDataService: Starting deleteGroup...');
    console.log('🔍 FirebaseDataService: Group ID:', groupId);
    console.log('🔍 FirebaseDataService: User ID:', userId);
    
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      console.error('❌ FirebaseDataService: Group not found');
      throw new Error('Group not found');
    }
    
    const groupData = groupDoc.data();
    console.log('🔍 FirebaseDataService: Group data:', groupData);
    console.log('🔍 FirebaseDataService: Group creator:', groupData.created_by);
    console.log('🔍 FirebaseDataService: Current user:', userId);
    
    if (groupData.created_by !== userId) {
      console.error('❌ FirebaseDataService: User is not the group creator');
      throw new Error('Only group creator can delete the group');
    }
    
    console.log('🔍 FirebaseDataService: User is group creator, proceeding with deletion...');
    
    // Delete group members
    const groupMembersRef = collection(db, 'groupMembers');
    const memberQuery = query(groupMembersRef, where('group_id', '==', groupId));
    const memberDocs = await getDocs(memberQuery);
    
    console.log('🔍 FirebaseDataService: Found', memberDocs.docs.length, 'members to delete');
    
    const batch = writeBatch(db);
    memberDocs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete group expenses
    const expensesRef = collection(db, 'expenses');
    const expenseQuery = query(expensesRef, where('group_id', '==', groupId));
    const expenseDocs = await getDocs(expenseQuery);
    
    console.log('🔍 FirebaseDataService: Found', expenseDocs.docs.length, 'expenses to delete');
    
    expenseDocs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the group
    batch.delete(groupRef);
    
    console.log('🔍 FirebaseDataService: Committing batch deletion...');
    await batch.commit();
    
    console.log('🔍 FirebaseDataService: Group deleted successfully');
    return { message: 'Group deleted successfully' };
  },

  addMemberToGroup: async (groupId: string, memberData: Omit<GroupMember, 'id' | 'joined_at'>): Promise<GroupMember> => {
      const groupMembersRef = collection(db, 'groupMembers');
    const memberRef = await addDoc(groupMembersRef, {
      group_id: groupId,
      user_id: (memberData as any).id || memberData.name, // Use name as fallback for user_id
            name: memberData.name,
            email: memberData.email,
            wallet_address: memberData.wallet_address,
            wallet_public_key: memberData.wallet_public_key,
      avatar: memberData.avatar,
      joined_at: serverTimestamp(),
      created_at: serverTimestamp()
    });
    
    // Update group member count
    await updateGroupMemberCount(groupId);
    
    return {
      ...memberData,
      id: memberRef.id,
      joined_at: new Date().toISOString()
    } as GroupMember;
  },

  removeMemberFromGroup: async (groupId: string, memberId: string): Promise<{ message: string }> => {
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId),
      where('user_id', '==', memberId)
      );
      const memberDocs = await getDocs(memberQuery);
      
    if (!memberDocs.empty) {
      await deleteDoc(doc(db, 'groupMembers', memberDocs.docs[0].id));
      await updateGroupMemberCount(groupId);
    }
    
    return { message: 'Member removed successfully' };
  },

  leaveGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    return await firebaseGroupService.removeMemberFromGroup(groupId, userId);
  },

  getUserContacts: async (userId: string, forceRefresh: boolean = false): Promise<UserContact[]> => {
    try {
      // Get all groups where the user is a member
      const groupMembersRef = collection(db, 'groupMembers');
      const userGroupsQuery = query(groupMembersRef, where('user_id', '==', userId));
      const userGroupsDocs = await getDocs(userGroupsQuery);
      
      const groupIds = userGroupsDocs.docs.map(doc => doc.data().group_id);
      
      if (groupIds.length === 0) {
        return [];
      }
      
      // Get all members from these groups (excluding the current user)
      const allMembersQuery = query(
        groupMembersRef,
        where('group_id', 'in', groupIds),
        where('user_id', '!=', userId)
      );
      const allMembersDocs = await getDocs(allMembersQuery);
      
      // Create a map to deduplicate contacts
      const contactsMap = new Map<string, UserContact>();
      
      allMembersDocs.docs.forEach(doc => {
        const memberData = doc.data();
        const contactId = memberData.user_id;
        
                 if (!contactsMap.has(contactId)) {
           contactsMap.set(contactId, {
             id: contactId,
             name: memberData.name || '',
              email: memberData.email || '',
              wallet_address: memberData.wallet_address || '',
              wallet_public_key: memberData.wallet_public_key || '',
             created_at: memberData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
             joined_at: memberData.joined_at?.toDate?.()?.toISOString() || new Date().toISOString(),
             first_met_at: memberData.joined_at?.toDate?.()?.toISOString() || new Date().toISOString(),
             mutual_groups_count: 1
           });
         } else {
           // Increment mutual groups count
           const existing = contactsMap.get(contactId)!;
           existing.mutual_groups_count = (existing.mutual_groups_count || 0) + 1;
         }
      });
      
      return Array.from(contactsMap.values());
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user contacts:', error); }
      return [];
    }
  },

  // Search users by username/name
  searchUsersByUsername: async (searchTerm: string, excludeUserId?: string): Promise<User[]> => {
    try {
      if (__DEV__) { console.log('🔥 Searching users by username:', searchTerm); }
      
      const usersRef = collection(db, 'users');
      
      // Search by name (case-insensitive)
      const nameQuery = query(
        usersRef,
        where('name', '>=', searchTerm.toLowerCase()),
        where('name', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      
      const nameDocs = await getDocs(nameQuery);
      
      // Also search by email for partial matches
      const emailQuery = query(
        usersRef,
        where('email', '>=', searchTerm.toLowerCase()),
        where('email', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      
      const emailDocs = await getDocs(emailQuery);
      
      // Combine and deduplicate results
      const allDocs = [...nameDocs.docs, ...emailDocs.docs];
      const uniqueUsers = new Map<string, any>();
      
      allDocs.forEach(doc => {
        const userData = doc.data();
        if (!excludeUserId || doc.id !== excludeUserId) {
          uniqueUsers.set(doc.id, {
            id: doc.id,
            name: userData.name || '',
            email: userData.email || '',
            wallet_address: userData.wallet_address || '',
            wallet_public_key: userData.wallet_public_key || '',
            created_at: userData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            avatar: userData.avatar || ''
          });
        }
      });
      
      const results = Array.from(uniqueUsers.values());
      
      if (__DEV__) { console.log('🔥 Found users:', results.length); }
      
      return results;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error searching users:', error); }
      return [];
    }
  },

  generateInviteLink: async (groupId: string, userId: string): Promise<InviteLinkData> => {
    try {
      // Generate a simple invite code
      const inviteCode = `invite_${groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store invite in Firestore
      const inviteRef = collection(db, 'invites');
      await addDoc(inviteRef, {
        inviteCode,
        groupId,
        createdBy: userId,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        used: false
    });
    
    return {
      inviteCode,
        inviteLink: `wesplit://join/${inviteCode}`,
        groupName: 'Group', // This should be passed as parameter or fetched
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error generating invite link:', error); }
      throw new Error('Failed to generate invite link');
    }
  },

  joinGroupViaInvite: async (inviteCode: string, userId: string): Promise<{ message: string; groupId: string; groupName: string }> => {
    try {
      if (__DEV__) { console.log('🔥 Joining group via invite:', { inviteCode, userId }); }
      
      // Find the invite in Firestore
      const invitesRef = collection(db, 'invites');
      const inviteQuery = query(
        invitesRef,
        where('inviteCode', '==', inviteCode),
        where('used', '==', false)
      );
      const inviteDocs = await getDocs(inviteQuery);
      
      if (inviteDocs.empty) {
        throw new Error('Invalid or expired invite code');
      }
      
      const inviteDoc = inviteDocs.docs[0];
      const inviteData = inviteDoc.data();
      const groupId = inviteData.groupId;
      
      // Check if user is already a member
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId),
        where('user_id', '==', userId)
      );
      const memberDocs = await getDocs(memberQuery);
      
      if (!memberDocs.empty) {
        // User is already a member, check if they have pending invitation
        const memberDoc = memberDocs.docs[0];
        const memberData = memberDoc.data();
        
        if (memberData.invitation_status === 'pending') {
          // Get user data
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (!userDoc.exists()) {
            throw new Error('User not found');
          }
          const userData = userDoc.data();
          
          // Update the existing member record with user data and accepted status
          await updateDoc(doc(db, 'groupMembers', memberDoc.id), {
            name: userData.name,
            email: userData.email,
            wallet_address: userData.wallet_address,
            wallet_public_key: userData.wallet_public_key,
            invitation_status: 'accepted',
            avatar: userData.avatar
          });
        } else {
          throw new Error('You are already a member of this group');
        }
      } else {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        const userData = userDoc.data();
        
        // Add user to group
        await addDoc(groupMembersRef, {
          group_id: groupId,
          user_id: userId,
          name: userData.name,
          email: userData.email,
          wallet_address: userData.wallet_address,
          wallet_public_key: userData.wallet_public_key,
          joined_at: serverTimestamp(),
          avatar: userData.avatar
        });
      }
      
      // Mark invite as used
      await updateDoc(doc(db, 'invites', inviteDoc.id), {
        used: true,
        used_at: serverTimestamp(),
        used_by: userId
      });
      
      // Update group member count
      await updateGroupMemberCount(groupId);
      
      // Get group name
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      const groupName = groupDoc.exists() ? groupDoc.data()?.name : 'Group';
      
      if (__DEV__) { console.log('🔥 Successfully joined group:', { groupId, groupName }); }
      
      return {
        message: 'Successfully joined group',
        groupId,
        groupName
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error joining group via invite:', error); }
      throw error;
    }
  },

  // Send group invitation to a user via notification
  sendGroupInvitation: async (
    groupId: string,
    groupName: string,
    invitedByUserId: string,
    invitedByUserName: string,
    invitedUserId: string
  ): Promise<void> => {
    try {
      if (__DEV__) { console.log('🔥 Sending group invitation:', { groupId, groupName, invitedByUserId, invitedUserId }); }
      
      // Generate invite link
      const inviteData = await firebaseGroupService.generateInviteLink(groupId, invitedByUserId);
      
      // Add user to group with pending invitation status
      const groupMembersRef = collection(db, 'groupMembers');
      await addDoc(groupMembersRef, {
        group_id: groupId,
        user_id: invitedUserId,
        name: 'Invited User', // Will be updated when they accept
        email: '', // Will be updated when they accept
        wallet_address: '', // Will be updated when they accept
        joined_at: serverTimestamp(),
        invitation_status: 'pending',
        invited_at: serverTimestamp(),
        invited_by: invitedByUserId
      });
      
      // Send notification to invited user
      await sendNotification(
        invitedUserId,
        'Group Invitation',
        `${invitedByUserName} has invited you to join the group "${groupName}"`,
        'group_invite',
        {
          groupId,
          groupName,
          invitedBy: invitedByUserId,
          invitedByName: invitedByUserName,
          inviteCode: inviteData.inviteCode,
          inviteLink: inviteData.inviteLink,
          expiresAt: inviteData.expiresAt
        }
      );
      
      if (__DEV__) { console.log('🔥 Group invitation sent successfully'); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending group invitation:', error); }
      throw error;
    }
  }
};

// Expense services
export const firebaseExpenseService = {
  getGroupExpenses: async (groupId: string, forceRefresh: boolean = false): Promise<Expense[]> => {
    try {
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('group_id', '==', groupId),
        orderBy('created_at', 'desc')
      );
      const expensesDocs = await getDocs(expensesQuery);
      
      return expensesDocs.docs.map(doc => firebaseDataTransformers.firestoreToExpense(doc));
        } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting group expenses:', error); }
      return [];
    }
  },

  createExpense: async (expenseData: any): Promise<Expense> => {
    const expenseRef = await addDoc(collection(db, 'expenses'), firebaseDataTransformers.expenseToFirestore(expenseData));
      
    // Update group expense count
    await updateGroupExpenseCount(expenseData.group_id || expenseData.groupId);
    
    return {
        ...expenseData,
      id: expenseRef.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    } as Expense;
  },

  getExpense: async (expenseId: string): Promise<Expense | null> => {
    try {
      const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
      
      if (expenseDoc.exists()) {
        return firebaseDataTransformers.firestoreToExpense(expenseDoc);
      }
      
      return null;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting expense:', error); }
      return null;
    }
  },

  updateExpense: async (expenseId: string, updates: Partial<Expense>): Promise<Expense> => {
    const expenseRef = doc(db, 'expenses', expenseId);
    
    const updateData: any = {};
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.splitType !== undefined) updateData.split_type = updates.splitType;
    if (updates.splitData !== undefined) updateData.split_data = updates.splitData;
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(expenseRef, updateData);
    
    const updatedDoc = await getDoc(expenseRef);
    return firebaseDataTransformers.firestoreToExpense(updatedDoc);
  },

  deleteExpense: async (expenseId: string, groupId: string): Promise<{ message: string }> => {
    await deleteDoc(doc(db, 'expenses', expenseId));
    
    // Update group expense count
    await updateGroupExpenseCount(groupId);
    
    return { message: 'Expense deleted successfully' };
  }
};

// Transaction services
export const firebaseTransactionService = {
  getUserTransactions: async (userId: string): Promise<Transaction[]> => {
    try {
      console.log('🔥 firebaseTransactionService.getUserTransactions called with userId:', userId);
      
      const transactionsRef = collection(db, 'transactions');
      
      // Query for transactions where user is the sender
      const fromQuery = query(
        transactionsRef,
        where('from_user', '==', userId),
        orderBy('created_at', 'desc')
      );
      console.log('🔥 Querying transactions where from_user ==', userId);
      const fromDocs = await getDocs(fromQuery);
      console.log('🔥 Found', fromDocs.docs.length, 'transactions where user is sender');
      
      // Query for transactions where user is the receiver
      const toQuery = query(
        transactionsRef,
        where('to_user', '==', userId),
        orderBy('created_at', 'desc')
      );
      console.log('🔥 Querying transactions where to_user ==', userId);
      const toDocs = await getDocs(toQuery);
      console.log('🔥 Found', toDocs.docs.length, 'transactions where user is receiver');
      
      const allTransactions = [
        ...fromDocs.docs.map(doc => {
          const transaction = firebaseDataTransformers.firestoreToTransaction(doc);
          console.log('🔥 Sender transaction:', transaction);
          return transaction;
        }),
        ...toDocs.docs.map(doc => {
          const transaction = firebaseDataTransformers.firestoreToTransaction(doc);
          console.log('🔥 Receiver transaction:', transaction);
          return transaction;
        })
      ];
      
      // Sort by created_at descending
      const sortedTransactions = allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('🔥 Total transactions found:', sortedTransactions.length);
      console.log('🔥 All transactions:', sortedTransactions);
      
      return sortedTransactions;
    } catch (error) {
      console.error('🔥 Error getting user transactions:', error);
      return [];
    }
  },

  createTransaction: async (transactionData: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> => {
    const transactionRef = await addDoc(collection(db, 'transactions'), firebaseDataTransformers.transactionToFirestore(transactionData));
    
    return {
      ...transactionData,
      id: transactionRef.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Transaction;
  },

  updateTransactionStatus: async (transactionId: string, status: string, txHash?: string): Promise<void> => {
    const transactionRef = doc(db, 'transactions', transactionId);
    const updateData: any = {
      status,
      updated_at: serverTimestamp()
    };
    
    if (txHash) {
      updateData.tx_hash = txHash;
    }
    
    await updateDoc(transactionRef, updateData);
  }
};

// Notification services
export const firebaseNotificationService = {
  getUserNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
      );
      const notificationsDocs = await getDocs(notificationsQuery);
      
      return notificationsDocs.docs.map(doc => firebaseDataTransformers.firestoreToNotification(doc));
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user notifications:', error); }
      return [];
    }
  },

  createNotification: async (notificationData: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> => {
    const notificationRef = await addDoc(collection(db, 'notifications'), firebaseDataTransformers.notificationToFirestore(notificationData));
    
    return {
      ...notificationData,
      id: notificationRef.id,
      created_at: new Date().toISOString()
    } as Notification;
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      is_read: true,
      updated_at: serverTimestamp()
    });
  },
    
  deleteNotification: async (notificationId: string): Promise<void> => {
    await deleteDoc(doc(db, 'notifications', notificationId));
  }
};

// Balance calculation
const calculateUserBalance = (expenses: Expense[], members: GroupMember[], userId: string | number): number => {
  let balance = 0;
  
  expenses.forEach(expense => {
    const sharePerPerson = expense.amount / members.length; // Simplified equal split
    
    if (expense.paid_by === userId) {
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
      
      // Get group members directly from groupMembers collection
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(groupMembersRef, where('group_id', '==', groupId));
      const memberDocs = await getDocs(memberQuery);
      const members = memberDocs.docs.map(doc => firebaseDataTransformers.firestoreToGroupMember(doc));
      
      if (expenses.length === 0 || members.length === 0) {
        return [];
      }
      
      // Calculate balances for each member
      const balances: { [memberId: string]: number } = {};
      members.forEach((member: GroupMember) => {
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
        members.forEach((member: GroupMember) => {
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
          
          const member1 = members.find((m: GroupMember) => m.id === member1Id);
          const member2 = members.find((m: GroupMember) => m.id === member2Id);
          
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
        const data = doc.data() as any;
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

// Multi-signature services
export const firebaseMultiSigService = {
  createMultiSigWallet: async (walletData: any) => {
    try {
      const walletRef = await addDoc(collection(db, 'multiSigWallets'), {
        ...walletData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      if (__DEV__) { console.log('🔥 Multi-signature wallet created:', walletRef.id); }
      return walletRef;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error creating multi-signature wallet:', error); }
      throw error;
    }
  },

  getMultiSigWallet: async (walletId: string) => {
    try {
      const walletDoc = await getDoc(doc(db, 'multiSigWallets', walletId));
      if (!walletDoc.exists()) {
        return null;
      }
      
      const data = walletDoc.data();
      return {
        id: walletDoc.id,
        address: data.address,
        owners: data.owners || [],
        threshold: data.threshold || 1,
        pendingTransactions: data.pendingTransactions || [],
        description: data.description,
        createdBy: data.createdBy,
        createdAt: firebaseDataTransformers.timestampToISO(data.created_at),
        updatedAt: firebaseDataTransformers.timestampToISO(data.updated_at)
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting multi-signature wallet:', error); }
      return null;
    }
  },

  getUserMultiSigWallets: async (userId: string) => {
    try {
      const walletsRef = collection(db, 'multiSigWallets');
      const walletsQuery = query(walletsRef, where('owners', 'array-contains', userId));
      const walletsDocs = await getDocs(walletsQuery);
      
      return walletsDocs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: data.address,
          owners: data.owners || [],
          threshold: data.threshold || 1,
          pendingTransactions: data.pendingTransactions || [],
          description: data.description,
          createdBy: data.createdBy,
          createdAt: firebaseDataTransformers.timestampToISO(data.created_at),
          updatedAt: firebaseDataTransformers.timestampToISO(data.updated_at)
        };
      });
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user multi-signature wallets:', error); }
      return [];
    }
  },

  createMultiSigTransaction: async (transactionData: any) => {
    try {
      const transactionRef = await addDoc(collection(db, 'multiSigTransactions'), {
        ...transactionData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      if (__DEV__) { console.log('🔥 Multi-signature transaction created:', transactionRef.id); }
      return transactionRef;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error creating multi-signature transaction:', error); }
      throw error;
    }
  },

  getMultiSigTransaction: async (transactionId: string) => {
    try {
      const transactionDoc = await getDoc(doc(db, 'multiSigTransactions', transactionId));
      if (!transactionDoc.exists()) {
        return null;
      }
      
      const data = transactionDoc.data();
      return {
        id: transactionDoc.id,
        multiSigWalletId: data.multiSigWalletId,
        instructions: data.instructions || [],
        signers: data.signers || [],
        approvals: data.approvals || [],
        rejections: data.rejections || [],
        executed: data.executed || false,
        executedAt: data.executedAt ? firebaseDataTransformers.timestampToISO(data.executedAt) : undefined,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        recipient: data.recipient,
        createdAt: firebaseDataTransformers.timestampToISO(data.created_at),
        updatedAt: firebaseDataTransformers.timestampToISO(data.updated_at)
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting multi-signature transaction:', error); }
      return null;
    }
  },

  updateMultiSigTransaction: async (transactionId: string, updates: any) => {
    try {
      const transactionRef = doc(db, 'multiSigTransactions', transactionId);
      await updateDoc(transactionRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
      
      if (__DEV__) { console.log('🔥 Multi-signature transaction updated:', transactionId); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error updating multi-signature transaction:', error); }
      throw error;
    }
  },

  getPendingTransactions: async (walletId: string) => {
    try {
      const transactionsRef = collection(db, 'multiSigTransactions');
      const transactionsQuery = query(
        transactionsRef, 
        where('multiSigWalletId', '==', walletId),
        where('executed', '==', false)
      );
      const transactionsDocs = await getDocs(transactionsQuery);
      
      return transactionsDocs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          multiSigWalletId: data.multiSigWalletId,
          instructions: data.instructions || [],
          signers: data.signers || [],
          approvals: data.approvals || [],
          rejections: data.rejections || [],
          executed: data.executed || false,
          executedAt: data.executedAt ? firebaseDataTransformers.timestampToISO(data.executedAt) : undefined,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          recipient: data.recipient,
          createdAt: firebaseDataTransformers.timestampToISO(data.created_at),
          updatedAt: firebaseDataTransformers.timestampToISO(data.updated_at)
        };
      });
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting pending transactions:', error); }
      return [];
    }
  },

  getUserTransactions: async (userId: string) => {
    try {
      // Get all multi-sig wallets where user is an owner
      const walletsRef = collection(db, 'multiSigWallets');
      const walletsQuery = query(walletsRef, where('owners', 'array-contains', userId));
      const walletsDocs = await getDocs(walletsQuery);
      const walletIds = walletsDocs.docs.map(doc => doc.id);
      
      if (walletIds.length === 0) {
        return [];
      }
      
      // Get all transactions for these wallets
      const transactionsRef = collection(db, 'multiSigTransactions');
      const transactionsQuery = query(
        transactionsRef, 
        where('multiSigWalletId', 'in', walletIds)
      );
      const transactionsDocs = await getDocs(transactionsQuery);
      
      return transactionsDocs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          multiSigWalletId: data.multiSigWalletId,
          instructions: data.instructions || [],
          signers: data.signers || [],
          approvals: data.approvals || [],
          rejections: data.rejections || [],
          executed: data.executed || false,
          executedAt: data.executedAt ? firebaseDataTransformers.timestampToISO(data.executedAt) : undefined,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          recipient: data.recipient,
          createdAt: firebaseDataTransformers.timestampToISO(data.created_at),
          updatedAt: firebaseDataTransformers.timestampToISO(data.updated_at)
        };
      });
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user transactions:', error); }
      return [];
    }
  }
};

// Main Firebase data service export
export const firebaseDataService = {
  user: firebaseUserService,
  group: firebaseGroupService,
  expense: firebaseExpenseService,
  transaction: firebaseTransactionService,
  notification: firebaseNotificationService,
  settlement: firebaseSettlementService,
  multiSig: firebaseMultiSigService,
  transformers: firebaseDataTransformers
}; 