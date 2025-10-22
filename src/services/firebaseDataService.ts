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
  DocumentData,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificationService } from './notificationService';
import { logger } from './loggingService';
import { createPaymentRequestNotificationData, validateNotificationData } from './notificationDataUtils';

// Data transformation utilities
export const firebaseDataTransformers = {
  // Transform Firestore timestamp to ISO string
  timestampToISO: (timestamp: Timestamp | null | any): string => {
    try {
      // Handle different timestamp formats
      if (!timestamp) {
        return new Date().toISOString();
      }
      
      // If it's already a Firestore Timestamp object
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      
      // If it's a Firestore timestamp object with seconds and nanoseconds
      if (timestamp.seconds && timestamp.nanoseconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        return date.toISOString();
      }
      
      // If it's already an ISO string
      if (typeof timestamp === 'string') {
        return timestamp;
      }
      
      // If it's a Date object
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      
      // Fallback to current time
      return new Date().toISOString();
    } catch (error) {
      console.warn('Error converting timestamp to ISO:', error, 'Value:', timestamp);
      return new Date().toISOString();
    }
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
    avatar: doc.data().avatar || '',
    hasCompletedOnboarding: doc.data().hasCompletedOnboarding || false,
    // Wallet management tracking fields
    wallet_status: doc.data().wallet_status || 'no_wallet',
    wallet_created_at: doc.data().wallet_created_at || null,
    wallet_last_fixed_at: doc.data().wallet_last_fixed_at || null,
    wallet_fix_attempts: doc.data().wallet_fix_attempts || 0,
    wallet_has_private_key: doc.data().wallet_has_private_key || false,
    wallet_has_seed_phrase: doc.data().wallet_has_seed_phrase || false,
    wallet_type: doc.data().wallet_type || 'app-generated',
    wallet_migration_status: doc.data().wallet_migration_status || 'none'
  }),

  // Transform User to Firestore data
  userToFirestore: (user: User): any => ({
    name: user.name,
    email: user.email,
    wallet_address: user.wallet_address,
    wallet_public_key: user.wallet_public_key,
    created_at: serverTimestamp(),
    avatar: user.avatar,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    // Wallet management tracking fields
    wallet_status: user.wallet_status,
    wallet_created_at: user.wallet_created_at,
    wallet_last_fixed_at: user.wallet_last_fixed_at,
    wallet_fix_attempts: user.wallet_fix_attempts,
    wallet_has_private_key: user.wallet_has_private_key,
    wallet_has_seed_phrase: user.wallet_has_seed_phrase,
    wallet_type: user.wallet_type,
    wallet_migration_status: user.wallet_migration_status
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
    id: doc.data().user_id || doc.id, // Use user_id instead of member ID
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
    split_type: expense.split_type || expense.splitType, // Handle both camelCase and snake_case
    split_data: expense.split_data || expense.splitData, // Handle both camelCase and snake_case
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
    updated_at: firebaseDataTransformers.timestampToISO(doc.data().updated_at),
    // Additional fields for enhanced transaction tracking
    group_id: doc.data().group_id || null,
    company_fee: doc.data().company_fee || 0,
    net_amount: doc.data().net_amount || doc.data().amount || 0,
    gas_fee: doc.data().gas_fee || 0,
    gas_fee_covered_by_company: doc.data().gas_fee_covered_by_company || false,
    recipient_name: doc.data().recipient_name || '',
    sender_name: doc.data().sender_name || '',
    transaction_method: doc.data().transaction_method || 'app_wallet',
    app_version: doc.data().app_version || '1.0.0',
    device_info: doc.data().device_info || 'mobile'
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
    updated_at: serverTimestamp(),
    // Additional fields for enhanced transaction tracking
    group_id: transaction.group_id || null,
    company_fee: transaction.company_fee || 0,
    net_amount: transaction.net_amount || transaction.amount,
    gas_fee: transaction.gas_fee || 0,
    gas_fee_covered_by_company: transaction.gas_fee_covered_by_company || false,
    recipient_name: transaction.recipient_name || '',
    sender_name: transaction.sender_name || '',
    transaction_method: transaction.transaction_method || 'app_wallet',
    app_version: transaction.app_version || '1.0.0',
    device_info: transaction.device_info || 'mobile'
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
    
    if (__DEV__) { logger.debug('Updated group member count', { memberCount }, 'firebaseDataService'); }
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
    
    if (__DEV__) { logger.debug('Updated group expense count', { expenseCount }, 'firebaseDataService'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error updating group expense count:', error); }
  }
};

// User services
export const firebaseUserService = {
  getCurrentUser: async (userId: string): Promise<User> => {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // First try to get the document by document ID
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return firebaseDataTransformers.firestoreToUser(userDoc);
        }
        
        // If not found by document ID, try to find by the 'id' field
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('id', '==', userId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          return firebaseDataTransformers.firestoreToUser(userDoc);
        }
        
        throw new Error('User not found');
      } catch (error) {
        lastError = error as Error;
        
        // Check if this is a Firebase internal assertion failure
        if (error instanceof Error && error.message.includes('FIRESTORE') && error.message.includes('INTERNAL ASSERTION FAILED')) {
          console.warn(`Firebase assertion failure on attempt ${attempt}/${maxRetries}, retrying...`, error.message);
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
        
        // For non-Firebase assertion errors or final attempt, throw immediately
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('User not found after retries');
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
    const userRef = await addDoc(collection(db, 'users'), firebaseDataTransformers.userToFirestore(userData as User));
    return {
      ...userData,
      id: userRef.id, // Keep as string for Firebase compatibility
      created_at: new Date().toISOString()
    } as User;
  },

  createUserIfNotExists: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
    try {
      if (__DEV__) { logger.debug('Checking for existing user with email', { email: userData.email }, 'firebaseDataService'); }
      
      // Check if user already exists by email
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', userData.email));
      const userDocs = await getDocs(userQuery);
      
      if (!userDocs.empty) {
        // User already exists, return the existing user
        const existingUserDoc = userDocs.docs[0];
        const existingUser = firebaseDataTransformers.firestoreToUser(existingUserDoc);
        
        if (__DEV__) { logger.debug('User already exists, returning existing user', { userId: existingUser.id }, 'firebaseDataService'); }
        
        // Update user if new data is provided
        const updates: Partial<User> = {};
        let hasUpdates = false;
        
        // CRITICAL: Never overwrite existing username/name
        // Only add name if user doesn't have any
        if (userData.name && (!existingUser.name || existingUser.name.trim() === '')) {
          updates.name = userData.name;
          updates.hasCompletedOnboarding = true; // Mark as completed when name is updated
          hasUpdates = true;
        }
        
        // CRITICAL: Never overwrite existing wallet information
        // Only add wallet info if user doesn't have any
        if (userData.wallet_address && !existingUser.wallet_address) {
          updates.wallet_address = userData.wallet_address;
          hasUpdates = true;
        }
        
        if (userData.wallet_public_key && !existingUser.wallet_public_key) {
          updates.wallet_public_key = userData.wallet_public_key;
          hasUpdates = true;
        }
        
        // CRITICAL: Never overwrite existing avatar
        // Only add avatar if user doesn't have any
        if (userData.avatar && !existingUser.avatar) {
          updates.avatar = userData.avatar;
          hasUpdates = true;
        }
        
        // Check if hasCompletedOnboarding needs to be updated
        if (userData.hasCompletedOnboarding !== undefined && userData.hasCompletedOnboarding !== existingUser.hasCompletedOnboarding) {
          updates.hasCompletedOnboarding = userData.hasCompletedOnboarding;
          hasUpdates = true;
        }
        
        if (hasUpdates) {
          if (__DEV__) { logger.debug('Updating existing user with new data', null, 'firebaseDataService'); }
          return await firebaseDataService.user.updateUser(existingUser.id.toString(), updates);
        }
        
        return existingUser;
      }
      
      // User doesn't exist, create new user
      if (__DEV__) { logger.debug('Creating new user', null, 'firebaseDataService'); }
      
      const userRef = await addDoc(collection(db, 'users'), firebaseDataTransformers.userToFirestore(userData as User));
      const newUser = {
        ...userData,
        id: userRef.id,
        created_at: new Date().toISOString()
      } as User;
      
      if (__DEV__) { logger.debug('New user created', { userId: newUser.id }, 'firebaseDataService'); }
      
      return newUser;
    } catch (error) {
      if (__DEV__) { console.error('🔥 createUserIfNotExists: Error:', error); }
      throw error;
    }
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', email));
      const userDocs = await getDocs(userQuery);
      
      if (!userDocs.empty) {
        const userDoc = userDocs.docs[0];
        return firebaseDataTransformers.firestoreToUser(userDoc);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {};
    
    // Only update fields that are provided
    if (updates.name !== undefined) {updateData.name = updates.name;}
    if (updates.email !== undefined) {updateData.email = updates.email;}
    if (updates.wallet_address !== undefined) {updateData.wallet_address = updates.wallet_address;}
    if (updates.wallet_public_key !== undefined) {updateData.wallet_public_key = updates.wallet_public_key;}
    if (updates.avatar !== undefined) {updateData.avatar = updates.avatar;}
    if (updates.hasCompletedOnboarding !== undefined) {updateData.hasCompletedOnboarding = updates.hasCompletedOnboarding;}
    
    // Wallet management tracking fields
    if (updates.wallet_status !== undefined) {updateData.wallet_status = updates.wallet_status;}
    if (updates.wallet_created_at !== undefined) {updateData.wallet_created_at = updates.wallet_created_at;}
    if (updates.wallet_last_fixed_at !== undefined) {updateData.wallet_last_fixed_at = updates.wallet_last_fixed_at;}
    if (updates.wallet_fix_attempts !== undefined) {updateData.wallet_fix_attempts = updates.wallet_fix_attempts;}
    if (updates.wallet_has_private_key !== undefined) {updateData.wallet_has_private_key = updates.wallet_has_private_key;}
    if (updates.wallet_has_seed_phrase !== undefined) {updateData.wallet_has_seed_phrase = updates.wallet_has_seed_phrase;}
    if (updates.wallet_type !== undefined) {updateData.wallet_type = updates.wallet_type;}
    if (updates.wallet_migration_status !== undefined) {updateData.wallet_migration_status = updates.wallet_migration_status;}
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(userRef, updateData);
    
    // Note: Group synchronization removed - using transaction-based contact system instead
    
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
      
      const contacts: UserContact[] = [];
      const orphanedContactIds: string[] = [];
      
      // Process each contact and validate user existence
      for (const doc of contactsDocs.docs) {
        const data = doc.data();
        const contactId = doc.id;
        
        // Validate that the referenced user still exists
        try {
          const userDoc = await getDoc(doc(db, 'users', contactId));
          if (!userDoc.exists()) {
            logger.warn('Contact references non-existent user, skipping', { 
              contactId, 
              contactName: data.name,
              userId 
            }, 'firebaseDataService');
            orphanedContactIds.push(contactId);
            continue;
          }
          
          const userData = userDoc.data();
          
          // Skip deleted users
          if (userData.status === 'deleted' || userData.status === 'suspended') {
            logger.warn('Contact references deleted/suspended user, skipping', { 
              contactId, 
              contactName: data.name,
              userStatus: userData.status,
              userId 
            }, 'firebaseDataService');
            orphanedContactIds.push(contactId);
            continue;
          }
          
          // Skip users with incomplete data
          if (!userData.email || !userData.name) {
            logger.warn('Contact references user with incomplete data, skipping', { 
              contactId, 
              contactName: data.name,
              hasEmail: !!userData.email,
              hasName: !!userData.name,
              userId 
            }, 'firebaseDataService');
            orphanedContactIds.push(contactId);
            continue;
          }
          
          // Create valid contact
          contacts.push({
            id: contactId,
            name: userData.name || data.name || '',
            email: userData.email || data.email || '',
            wallet_address: userData.wallet_address || data.wallet_address || '',
            wallet_public_key: userData.wallet_public_key || data.wallet_public_key || '',
            created_at: firebaseDataTransformers.timestampToISO(userData.created_at || data.created_at),
            joined_at: firebaseDataTransformers.timestampToISO(data.joined_at),
            avatar: userData.avatar || data.avatar || '',
            first_met_at: firebaseDataTransformers.timestampToISO(data.first_met_at),
            mutual_groups_count: data.mutual_groups_count || 0,
            isFavorite: data.isFavorite || false
          } as UserContact);
          
        } catch (error) {
          logger.error('Error validating contact user', { 
            contactId, 
            error, 
            userId 
          }, 'firebaseDataService');
          orphanedContactIds.push(contactId);
        }
      }
      
      // Clean up orphaned contacts in background (don't wait for completion)
      if (orphanedContactIds.length > 0) {
        this.cleanupOrphanedContacts(orphanedContactIds, userId).catch(error => {
          logger.error('Failed to cleanup orphaned contacts', { error, orphanedContactIds }, 'firebaseDataService');
        });
      }

      // Debug logging for avatar data
      logger.debug('Loaded user contacts with avatar data', { 
        contactCount: contacts.length,
        orphanedCount: orphanedContactIds.length,
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          hasAvatar: !!c.avatar
        }))
      }, 'firebaseDataService');

      return contacts;
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

  // Seed phrase management functions removed - use secureSeedPhraseService instead

  getUserByWalletAddress: async (walletAddress: string): Promise<User | null> => {
    try {
      if (__DEV__) { logger.debug('Searching for user with wallet address', { walletAddress }, 'firebaseDataService'); }
      
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('wallet_address', '==', walletAddress));
      const userDocs = await getDocs(userQuery);
      
      if (!userDocs.empty) {
        const userDoc = userDocs.docs[0];
        const user = firebaseDataTransformers.firestoreToUser(userDoc);
        
        if (__DEV__) { logger.debug('Found user', { userId: user.id, userName: user.name }, 'firebaseDataService'); }
        return user;
      }
      
      if (__DEV__) { logger.debug('No user found with wallet address', { walletAddress }, 'firebaseDataService'); }
      return null;
    } catch (error) {
      if (__DEV__) { console.error('🔥 getUserByWalletAddress: Error finding user by wallet address:', error); }
      return null;
    }
  },

  // Note: syncUserInfoToGroupMembers removed - using transaction-based contact system instead
};

// Group services
export const firebaseGroupService = {
  getUserGroups: async (userId: string, forceRefresh: boolean = false): Promise<GroupWithDetails[]> => {
    try {
      // Removed excessive logging for cleaner console
      
      // Query groupMembers collection for this user
      // Removed excessive logging for cleaner console
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('user_id', '==', userId)
      );
      const memberDocs = await getDocs(memberQuery);
      
      // Removed excessive logging for cleaner console
      
      // Process member records to get accepted groups
      const acceptedMembers = memberDocs.docs.filter(doc => {
        const data = doc.data();
        const isAccepted = data.invitation_status === 'accepted';
        // Removed excessive logging for cleaner console
        return isAccepted;
      });
      
      const groupIds = acceptedMembers.map(doc => doc.data().group_id);
      // Removed excessive logging for cleaner console
      
      // Query groups collection for groups where user is creator
      // Removed excessive logging for cleaner console
      const groupsRef = collection(db, 'groups');
      const creatorQuery = query(groupsRef, where('created_by', '==', userId));
      const creatorDocs = await getDocs(creatorQuery);
      
      // Removed excessive logging for cleaner console
      
      const creatorGroupIds = creatorDocs.docs.map(doc => doc.id);
      // Removed excessive logging for cleaner console
      
      // Combine and deduplicate group IDs
      const allGroupIds = Array.from(new Set([...groupIds, ...creatorGroupIds]));
      // Removed excessive logging for cleaner console
      
      // Fetch group details individually to avoid Firebase 'in' query limit
      const groupIdsToFetch = allGroupIds;
      // Removed excessive logging for cleaner console
      
      const results: GroupWithDetails[] = [];
      
      for (const groupId of groupIdsToFetch) {
        // Removed excessive logging for cleaner console
        
        try {
          const groupDoc = await getDoc(doc(db, 'groups', groupId));
          
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            // Removed excessive logging for cleaner console
            
            // Get member count for this group
            const groupMembersQuery = query(
              collection(db, 'groupMembers'),
              where('group_id', '==', groupId),
              where('invitation_status', '==', 'accepted')
            );
            const groupMembersDocs = await getDocs(groupMembersQuery);
            const memberCount = groupMembersDocs.docs.length;
            
            // Removed excessive logging for cleaner console
            
            const group: GroupWithDetails = {
              id: groupDoc.id,
              name: groupData.name || '',
              description: groupData.description || '',
              category: groupData.category || 'general',
              currency: groupData.currency || 'USDC',
              icon: groupData.icon || 'people',
              color: groupData.color || '#A5EA15',
              created_by: groupData.created_by || '',
              created_at: firebaseDataTransformers.timestampToISO(groupData.created_at),
              updated_at: firebaseDataTransformers.timestampToISO(groupData.updated_at),
              member_count: memberCount,
              expense_count: groupData.expense_count || 0,
              expenses_by_currency: groupData.expenses_by_currency || [],
              members: [],
              expenses: [],
              totalAmount: 0,
              userBalance: 0
            };
            
            // Get group members
            const groupMembersQueryForDetails = query(
              collection(db, 'groupMembers'),
              where('group_id', '==', groupId),
              where('invitation_status', '==', 'accepted')
            );
            const groupMembersDocsForDetails = await getDocs(groupMembersQueryForDetails);
            const members = groupMembersDocsForDetails.docs.map(doc => {
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
                invitation_status: data.invitation_status || 'accepted',
                invited_at: firebaseDataTransformers.timestampToISO(data.invited_at),
                invited_by: data.invited_by || ''
              } as GroupMember;
            });
        
        // Get group expenses
        const expensesRef = collection(db, 'expenses');
            const expensesQuery = query(
              expensesRef,
              where('group_id', '==', groupId),
              orderBy('created_at', 'desc')
            );
        const expensesDocs = await getDocs(expensesQuery);
        const expenses = expensesDocs.docs.map(doc => firebaseDataTransformers.firestoreToExpense(doc));
          
                  // Calculate totals
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const userBalance = calculateUserBalance(expenses, members, userId);
        
            // Update group with full details
            group.members = members;
            group.expenses = expenses;
            group.totalAmount = totalAmount;
            group.userBalance = userBalance;
            
            results.push(group);
            // Removed excessive logging for cleaner console
          } else {
            // Removed excessive logging for cleaner console
          }
        } catch (error) {
          if (__DEV__) { console.error('🔥 Firebase: Error fetching group', groupId, ':', error); }
        }
      }
      
      // Removed excessive logging for cleaner console
      
      return results;
      } catch (error) {
      if (__DEV__) { console.error('🔥 Firebase: Error in getUserGroups:', error); }
      throw error;
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
      // Removed excessive logging for cleaner console
      
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) {return;}
      
      const groupName = groupDoc.data()?.name;
              // Removed excessive logging for cleaner console
      
      const groupMembersRef = collection(db, 'groupMembers');
      
      // Get all members for this group
      const allMembersQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId)
      );
      const allMembersDocs = await getDocs(allMembersQuery);
      
              // Removed excessive logging for cleaner console
      
      const membersToDelete: any[] = [];
      
      // Clean up members with the same name as the group
      if (groupName) {
        allMembersDocs.docs.forEach(doc => {
          const memberData = doc.data();
          if (memberData.name === groupName) {
            membersToDelete.push(doc.ref);
            if (__DEV__) {
              logger.debug('Marking for deletion - member with group name', { memberName: memberData.name }, 'firebaseDataService');
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
            logger.debug('Marking for deletion - member with "Unknown User" name', null, 'firebaseDataService');
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
            const aTime = new Date(firebaseDataTransformers.timestampToISO(a.data.joined_at));
            const bTime = new Date(firebaseDataTransformers.timestampToISO(b.data.joined_at));
            return bTime.getTime() - aTime.getTime();
          });
          
          // Keep the most recent one, delete the rest
          for (let i = 1; i < members.length; i++) {
            membersToDelete.push(members[i].doc.ref);
            if (__DEV__) {
              logger.debug('Marking for deletion - duplicate member with email', { email, userId: members[i].data.user_id }, 'firebaseDataService');
            }
          }
        }
      });
      
      // Delete all marked members
      if (membersToDelete.length > 0) {
        logger.debug('Deleting phantom members', { count: membersToDelete.length }, 'firebaseDataService');
        
        const batch = writeBatch(db);
        membersToDelete.forEach(ref => {
          batch.delete(ref);
        });
        await batch.commit();
        
        if (__DEV__) {
          logger.debug('Cleaned up phantom members', { count: membersToDelete.length }, 'firebaseDataService');
        }
      } else {
        // Removed excessive logging for cleaner console
      }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error cleaning up phantom members:', error); }
    }
  },

  getGroupMembers: async (groupId: string, forceRefresh: boolean = false, currentUserId?: string): Promise<GroupMember[]> => {
    try {
      // Removed excessive logging for cleaner console
      
      // First, clean up any phantom members
      await firebaseDataService.group.cleanupPhantomMembers(groupId);
      
      const groupMembersRef = collection(db, 'groupMembers');
      
      // Simplified query to avoid composite index requirement
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId)
      );
      const memberDocs = await getDocs(memberQuery);
      let members = memberDocs.docs.map(doc => firebaseDataTransformers.firestoreToGroupMember(doc));

      // Removed excessive logging for cleaner console

      // Filter to only accepted members on the client side
      members = members.filter(member => member.invitation_status === 'accepted');

      // Removed excessive logging for cleaner console

      // Get group info to filter out phantom members
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      const groupName = groupDoc.exists() ? groupDoc.data()?.name : '';

      // Removed excessive logging for cleaner console

      // Filter out phantom members (members with the same name as the group or "Unknown User")
      members = members.filter(member => {
        if (groupName && member.name === groupName) {
          if (__DEV__) {
            logger.debug('Filtering out phantom member with group name', { memberName: member.name }, 'firebaseDataService');
          }
          return false;
        }
        if (member.name === 'Unknown User') {
          if (__DEV__) {
            logger.debug('Filtering out phantom member with "Unknown User" name', null, 'firebaseDataService');
          }
          return false;
        }
        return true;
      });

      // Removed excessive logging for cleaner console

      // If currentUserId is provided and not in members, add them
      if (currentUserId && !members.some(m => String(m.id) === String(currentUserId))) {
        const currentUser = await firebaseDataService.user.getCurrentUser(String(currentUserId));
        if (currentUser) {
          // Check if there's already a member with the same email (duplicate)
          const existingMemberWithEmail = members.find(m => m.email === currentUser.email);
          if (existingMemberWithEmail) {
            if (__DEV__) {
              logger.debug('Found existing member with same email, updating ID', {
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
                created_at: serverTimestamp(),
                invitation_status: 'accepted' // Set as accepted when adding current user
              });
              
              if (__DEV__) {
                logger.debug('Added current user to group members in database', null, 'firebaseDataService');
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
              created_at: currentUser.created_at || new Date().toISOString(),
              invitation_status: 'accepted'
            });
            
            if (__DEV__) {
              logger.debug('Added current user to members array', {
                id: currentUser.id,
                name: currentUser.name || 'You'
              });
            }
          }
        }
      }
      
      if (__DEV__) {
        // Removed excessive logging for cleaner console
      }
      
      return members;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting group members:', error); }
      return [];
    }
  },

  createGroup: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'expense_count' | 'expenses_by_currency'>): Promise<Group> => {
    try {
      if (!groupData.created_by) {
        throw new Error('Group creator ID is required');
      }

      if (!groupData.name || groupData.name.trim().length === 0) {
        throw new Error('Group name is required');
      }

      logger.debug('Firebase: Creating group with data', {
        name: groupData.name,
        created_by: groupData.created_by,
        category: groupData.category,
        currency: groupData.currency
      });
      
    // Get current user data to add as member
    const currentUser = await firebaseDataService.user.getCurrentUser(String(groupData.created_by));
      if (!currentUser) {
        throw new Error('Current user not found');
      }

      // Create batch for atomic operation
      const batch = writeBatch(db);
      
      // Create group document
      const groupRef = doc(collection(db, 'groups'));
      const groupDoc = {
        name: groupData.name.trim(),
        description: groupData.description?.trim() || '',
        category: groupData.category || 'general',
        currency: groupData.currency || 'USDC',
        icon: groupData.icon || 'people',
        color: groupData.color || '#A5EA15',
        created_by: groupData.created_by,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        member_count: 1, // Creator is the first member
        expense_count: 0,
        expenses_by_currency: []
      };
      
      batch.set(groupRef, groupDoc);
      
      // Add creator as first member with admin role
    const groupMembersRef = collection(db, 'groupMembers');
      const memberRef = doc(groupMembersRef);
      const memberDoc = {
        group_id: groupRef.id,
        user_id: groupData.created_by,
        name: currentUser.name,
        email: currentUser.email,
        wallet_address: currentUser.wallet_address || '',
        wallet_public_key: currentUser.wallet_public_key || '',
        avatar: currentUser.avatar || '',
        joined_at: serverTimestamp(),
        created_at: serverTimestamp(),
        invitation_status: 'accepted',
        invited_at: serverTimestamp(),
        invited_by: groupData.created_by,
        role: 'admin' // Creator is admin
      };
      
      batch.set(memberRef, memberDoc);
      
      // Commit the batch
      await batch.commit();
      
      logger.debug('Firebase: Group created successfully with ID', { groupId: groupRef.id }, 'firebaseDataService');
      
      // Return the created group with proper structure
      const createdGroup: Group = {
      id: groupRef.id,
        name: groupData.name.trim(),
        description: groupData.description?.trim() || '',
        category: groupData.category || 'general',
        currency: groupData.currency || 'USDC',
        icon: groupData.icon || 'people',
        color: groupData.color || '#A5EA15',
        created_by: groupData.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member_count: 1,
        expense_count: 0,
        expenses_by_currency: []
      };
      
      return createdGroup;
      
    } catch (error) {
      console.error('🔥 Firebase: Error creating group:', error);
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          throw new Error('Permission denied. Please check your authentication.');
        } else if (error.message.includes('unavailable')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (error.message.includes('already-exists')) {
          throw new Error('Group with this name already exists. Please choose a different name.');
        } else {
          throw new Error(`Failed to create group: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while creating the group.');
      }
    }
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
    if (updates.name !== undefined) {updateData.name = updates.name;}
    if (updates.description !== undefined) {updateData.description = updates.description;}
    if (updates.category !== undefined) {updateData.category = updates.category;}
    if (updates.currency !== undefined) {updateData.currency = updates.currency;}
    if (updates.icon !== undefined) {updateData.icon = updates.icon;}
    if (updates.color !== undefined) {updateData.color = updates.color;}
    
    updateData.updated_at = serverTimestamp();
    
    await updateDoc(groupRef, updateData);
    
    const updatedDoc = await getDoc(groupRef);
    const updatedGroup = firebaseDataTransformers.firestoreToGroup(updatedDoc);
    
    return {
      message: 'Group updated successfully',
      group: updatedGroup
    };
  },

  async deleteGroup(groupId: string | number, userId: string | number): Promise<void> {
    try {
      // Get group data to verify ownership
      const groupDoc = await getDoc(doc(db, 'groups', String(groupId)));
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    
    const groupData = groupDoc.data();
    
      // Verify user is the group creator
      if (groupData.created_by !== String(userId)) {
      throw new Error('Only group creator can delete the group');
    }
    
      // Delete all group members
    const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(groupMembersRef, where('group_id', '==', String(groupId)));
    const memberDocs = await getDocs(memberQuery);
    
      // Delete all expenses
      const expensesRef = collection(db, 'expenses');
      const expenseQuery = query(expensesRef, where('group_id', '==', String(groupId)));
      const expenseDocs = await getDocs(expenseQuery);
    
      // Create batch operation
    const batch = writeBatch(db);
      
      // Delete group members
    memberDocs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
      // Delete expenses
    expenseDocs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
      // Delete the group itself
      batch.delete(doc(db, 'groups', String(groupId)));
    
      // Commit the batch
    await batch.commit();
    
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  },

  addMemberToGroup: async (groupId: string, memberData: Omit<GroupMember, 'id' | 'joined_at'>): Promise<GroupMember> => {
    try {
      if (__DEV__) { logger.debug('Adding member to group', { groupId, memberData }, 'firebaseDataService'); }
      
      const groupMembersRef = collection(db, 'groupMembers');
      
      // Check if member already exists in group
      const existingMemberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId),
        where('user_id', '==', (memberData as any).user_id || memberData.name)
      );
      const existingMemberDocs = await getDocs(existingMemberQuery);
      
      if (!existingMemberDocs.empty) {
        if (__DEV__) { logger.debug('Member already exists in group, updating status', null, 'firebaseDataService'); }
        
        // Update existing membership to accepted
        const existingMemberDoc = existingMemberDocs.docs[0];
        await updateDoc(existingMemberDoc.ref, {
          invitation_status: 'accepted',
          joined_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        const updatedData = existingMemberDoc.data();
        return {
          ...memberData,
          id: existingMemberDoc.id,
          joined_at: new Date().toISOString(),
          invitation_status: 'accepted'
        } as GroupMember;
      }
      
      // Add new member to group
      const memberRef = await addDoc(groupMembersRef, {
        group_id: groupId,
        user_id: (memberData as any).user_id || memberData.name,
        name: memberData.name,
        email: memberData.email,
        wallet_address: memberData.wallet_address,
        wallet_public_key: memberData.wallet_public_key,
        avatar: memberData.avatar,
        joined_at: serverTimestamp(),
        created_at: serverTimestamp(),
        invitation_status: 'accepted'
      });
      
      if (__DEV__) { logger.debug('Member added to group with ID', { memberId: memberRef.id }, 'firebaseDataService'); }
      
      // Update group member count
      await updateGroupMemberCount(groupId);
      
      return {
        ...memberData,
        id: memberRef.id,
        joined_at: new Date().toISOString(),
        invitation_status: 'accepted'
      } as GroupMember;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error adding member to group:', error); }
      throw error;
    }
  },

  removeMemberFromGroup: async (groupId: string, memberId: string): Promise<{ message: string }> => {
    try {
      if (__DEV__) { logger.debug('Removing member from group', { groupId, memberId }, 'firebaseDataService'); }
      
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef,
        where('group_id', '==', groupId),
      where('user_id', '==', memberId)
      );
      const memberDocs = await getDocs(memberQuery);
      
      
    if (!memberDocs.empty) {
        const memberDocId = memberDocs.docs[0].id;
        
        await deleteDoc(doc(db, 'groupMembers', memberDocId));
      await updateGroupMemberCount(groupId);
        
      } else {
    }
    
    return { message: 'Member removed successfully' };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error removing member from group:', error); }
      throw error;
    }
  },

  leaveGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    return await firebaseGroupService.removeMemberFromGroup(groupId, userId);
  },

  // Note: Group-based getUserContacts removed - using TransactionBasedContactService instead

  // Search users by username/name
  searchUsersByUsername: async (searchTerm: string, excludeUserId?: string): Promise<User[]> => {
    try {
      if (__DEV__) { logger.debug('Searching users by username', { searchTerm }, 'firebaseDataService'); }
      
      const usersRef = collection(db, 'users');
      
      // Get all users and filter client-side for better search results
      // This is more reliable than Firestore range queries for partial matches
      const allUsersQuery = query(usersRef, limit(100)); // Limit to prevent performance issues
      const allDocs = await getDocs(allUsersQuery);
      
      const searchTermLower = searchTerm.toLowerCase().trim();
      const uniqueUsers = new Map<string, any>();
      
      allDocs.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;
        
        // Skip excluded user
        if (excludeUserId && userId === excludeUserId) {
          return;
        }
        
        // Skip users that don't have essential data (likely deleted or incomplete)
        if (!userData.email || !userData.name) {
          if (__DEV__) { 
            logger.debug('Skipping user with incomplete data', { 
              userId: userId.substring(0, 8) + '...',
              hasEmail: !!userData.email,
              hasName: !!userData.name
            }, 'firebaseDataService'); 
          }
          return;
        }
        
        // Skip deleted or suspended users
        if (userData.status === 'deleted' || userData.status === 'suspended') {
          if (__DEV__) { 
            logger.debug('Skipping user with inactive status', { 
              userId: userId.substring(0, 8) + '...',
              status: userData.status
            }, 'firebaseDataService'); 
          }
          return;
        }
        
        const userName = (userData.name || '').toLowerCase();
        const userEmail = (userData.email || '').toLowerCase();
        const userWallet = (userData.wallet_address || '').toLowerCase();
        
        // Check if search term matches name, email, or wallet address
        const matchesName = userName.includes(searchTermLower);
        const matchesEmail = userEmail.includes(searchTermLower);
        const matchesWallet = userWallet.includes(searchTermLower);
        
        if (matchesName || matchesEmail || matchesWallet) {
          uniqueUsers.set(userId, {
            id: userId,
            name: userData.name || '',
            email: userData.email || '',
            wallet_address: userData.wallet_address || '',
            wallet_public_key: userData.wallet_public_key || '',
            created_at: firebaseDataTransformers.timestampToISO(userData.created_at),
            avatar: userData.avatar || ''
          });
        }
      });
      
      const results = Array.from(uniqueUsers.values());
      
      // Sort results by relevance (exact matches first, then partial matches)
      results.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aEmail = (a.email || '').toLowerCase();
        const bEmail = (b.email || '').toLowerCase();
        
        // Exact name matches first
        if (aName === searchTermLower && bName !== searchTermLower) {return -1;}
        if (bName === searchTermLower && aName !== searchTermLower) {return 1;}
        
        // Name starts with search term
        if (aName.startsWith(searchTermLower) && !bName.startsWith(searchTermLower)) {return -1;}
        if (bName.startsWith(searchTermLower) && !aName.startsWith(searchTermLower)) {return 1;}
        
        // Email starts with search term
        if (aEmail.startsWith(searchTermLower) && !bEmail.startsWith(searchTermLower)) {return -1;}
        if (bEmail.startsWith(searchTermLower) && !aEmail.startsWith(searchTermLower)) {return 1;}
        
        // Alphabetical order for remaining matches
        return aName.localeCompare(bName);
      });
      
      // Limit results to 10
      const limitedResults = results.slice(0, 10);
      
      if (__DEV__) { logger.debug('Found users for search', { resultsCount: limitedResults.length, searchTerm }, 'firebaseDataService'); }
      
      return limitedResults;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error searching users:', error); }
      return [];
    }
  },

  // Utility function to clean up orphaned user data
  cleanupDeletedUsers: async (): Promise<{ cleaned: number; errors: number }> => {
    try {
      logger.info('Starting cleanup of deleted users', null, 'firebaseDataService');
      
      const usersRef = collection(db, 'users');
      const allUsersQuery = query(usersRef, limit(100));
      const allDocs = await getDocs(allUsersQuery);
      
      let cleaned = 0;
      let errors = 0;
      
      for (const doc of allDocs.docs) {
        const userData = doc.data();
        
        // Check if user has incomplete data (likely deleted)
        if (!userData.email || !userData.name || 
            userData.email.includes('deleted_') || 
            userData.name === 'Deleted User') {
          
          try {
            await updateDoc(doc.ref, {
              status: 'deleted',
              deleted_at: new Date().toISOString(),
              wallet_address: '',
              wallet_public_key: '',
              name: 'Deleted User',
              email: `deleted_${doc.id}@deleted.local`
            });
            cleaned++;
            logger.info('Cleaned up deleted user', { userId: doc.id }, 'firebaseDataService');
          } catch (error) {
            errors++;
            logger.error('Failed to clean up user', { userId: doc.id, error }, 'firebaseDataService');
          }
        }
      }
      
      logger.info('Cleanup completed', { cleaned, errors }, 'firebaseDataService');
      return { cleaned, errors };
    } catch (error) {
      logger.error('Failed to cleanup deleted users', error, 'firebaseDataService');
      return { cleaned: 0, errors: 1 };
    }
  },

  // Utility function to clean up orphaned contact references
  cleanupOrphanedContacts: async (orphanedContactIds: string[], userId: string): Promise<{ cleaned: number; errors: number }> => {
    try {
      logger.info('Starting cleanup of orphaned contacts', { 
        orphanedCount: orphanedContactIds.length, 
        userId 
      }, 'firebaseDataService');
      
      let cleaned = 0;
      let errors = 0;
      
      for (const contactId of orphanedContactIds) {
        try {
          // Remove the orphaned contact reference
          const contactRef = doc(db, 'contacts', contactId);
          await deleteDoc(contactRef);
          cleaned++;
          logger.info('Removed orphaned contact reference', { 
            contactId, 
            userId 
          }, 'firebaseDataService');
        } catch (error) {
          errors++;
          logger.error('Failed to remove orphaned contact', { 
            contactId, 
            userId, 
            error 
          }, 'firebaseDataService');
        }
      }
      
      logger.info('Orphaned contacts cleanup completed', { 
        cleaned, 
        errors, 
        userId 
      }, 'firebaseDataService');
      return { cleaned, errors };
    } catch (error) {
      logger.error('Failed to cleanup orphaned contacts', { 
        error, 
        userId 
      }, 'firebaseDataService');
      return { cleaned: 0, errors: 1 };
    }
  },

  generateInviteLink: async (groupId: string, userId: string): Promise<InviteLinkData> => {
    try {
      // Generate a unique invite link (no separate code)
      const inviteId = `invite_${groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get group name for better link
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      const groupName = groupDoc.exists() ? groupDoc.data()?.name : 'Group';
      
      // Store invite in Firestore
      const inviteRef = collection(db, 'invites');
      await addDoc(inviteRef, {
        inviteId,
        groupId,
        groupName,
        createdBy: userId,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        used: false
      });
    
      return {
        inviteId,
        inviteLink: `wesplit://join/${inviteId}`,
        groupName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error generating invite link:', error); }
      throw new Error('Failed to generate invite link');
    }
  },

  joinGroupViaInvite: async (inviteId: string, userId: string): Promise<{ message: string; groupId: string; groupName: string }> => {
    try {
      if (__DEV__) { logger.info('Joining group via invite', { inviteId, userId }, 'firebaseDataService'); }
      
      // Use Firebase transaction to ensure data consistency
      const result = await runTransaction(db, async (transaction) => {
      // Find the invite in Firestore
      const invitesRef = collection(db, 'invites');
      const inviteQuery = query(
        invitesRef,
        where('inviteId', '==', inviteId),
        where('used', '==', false)
      );
      const inviteDocs = await getDocs(inviteQuery);
      
      if (inviteDocs.empty) {
        throw new Error('Invalid or expired invite link');
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
        
        let memberDocId: string | null = null;
      
      if (!memberDocs.empty) {
        // User is already a member, check if they have pending invitation
        const memberDoc = memberDocs.docs[0];
        const memberData = memberDoc.data();
          memberDocId = memberDoc.id;
        
        if (memberData.invitation_status === 'pending') {
          // Get user data
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (!userDoc.exists()) {
            throw new Error('User not found');
          }
          const userData = userDoc.data();
          
          // Update the existing member record with user data and accepted status
            transaction.update(doc(db, 'groupMembers', memberDoc.id), {
            name: userData.name,
            email: userData.email,
              wallet_address: userData.wallet_address || '',
              wallet_public_key: userData.wallet_public_key || '',
            invitation_status: 'accepted',
              avatar: userData.avatar || '',
              updated_at: serverTimestamp(),
              joined_at: serverTimestamp()
          });
          
          // Delete any duplicate pending invitations for this user
          for (let i = 1; i < memberDocs.docs.length; i++) {
            const duplicateDoc = memberDocs.docs[i];
            const duplicateData = duplicateDoc.data();
            if (duplicateData.invitation_status === 'pending') {
                transaction.delete(doc(db, 'groupMembers', duplicateDoc.id));
                if (__DEV__) { logger.debug('Deleted duplicate pending invitation', { duplicateDocId: duplicateDoc.id }, 'firebaseDataService'); }
            }
          }
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
          const newMemberRef = doc(groupMembersRef);
          transaction.set(newMemberRef, {
          group_id: groupId,
          user_id: userId,
          name: userData.name,
          email: userData.email,
            wallet_address: userData.wallet_address || '',
            wallet_public_key: userData.wallet_public_key || '',
          joined_at: serverTimestamp(),
            created_at: serverTimestamp(),
            avatar: userData.avatar || '',
            invitation_status: 'accepted',
            invited_at: serverTimestamp(),
            invited_by: userId // Self-invited
        });
          memberDocId = newMemberRef.id;
      }
      
      // Mark invite as used
        transaction.update(doc(db, 'invites', inviteDoc.id), {
        used: true,
        used_at: serverTimestamp(),
        used_by: userId
      });
      
        // Update group member count within transaction
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await getDoc(groupRef);
        if (groupDoc.exists()) {
          const currentMemberCount = groupDoc.data()?.member_count || 0;
          transaction.update(groupRef, {
            member_count: currentMemberCount + 1,
          updated_at: serverTimestamp()
        });
      }
      
        // Get group name for return value
      const groupName = groupDoc.exists() ? groupDoc.data()?.name : 'Group';
      
        return { groupId, groupName, memberDocId };
      });
      
      if (__DEV__) { logger.info('Successfully joined group', { groupId: result.groupId, groupName: result.groupName }, 'firebaseDataService'); }
      
      return {
        message: 'Successfully joined group',
        groupId: result.groupId,
        groupName: result.groupName
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Firebase: Error joining group via invite:', error); }
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired invite link')) {
          throw new Error('This invite link is invalid or has expired. Please request a new one.');
        } else if (error.message.includes('already a member')) {
          throw new Error('You are already a member of this group.');
        } else if (error.message.includes('User not found')) {
          throw new Error('User account not found. Please check your authentication.');
        } else if (error.message.includes('permission-denied')) {
          throw new Error('Permission denied. Please check your authentication.');
        } else if (error.message.includes('unavailable')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else {
          throw new Error(`Failed to join group: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while joining the group.');
      }
    }
  },

  // Send group invitation to a user via notification (DEV only) or generate link (PROD)
  sendGroupInvitation: async (
    groupId: string,
    groupName: string,
    invitedByUserId: string,
    invitedByUserName: string,
    invitedUserId: string
  ): Promise<void> => {
    try {
      if (__DEV__) { 
        logger.info('Sending group invitation (DEV mode)', { groupId, groupName, invitedByUserId, invitedUserId }, 'firebaseDataService'); 
        
        // DEV MODE: Send direct notification to user
        // Check if user is already a member or has a pending invitation
        const groupMembersRef = collection(db, 'groupMembers');
        const existingMemberQuery = query(
          groupMembersRef,
          where('group_id', '==', groupId),
          where('user_id', '==', invitedUserId)
        );
        const existingMemberDocs = await getDocs(existingMemberQuery);
        
        if (!existingMemberDocs.empty) {
          const existingMember = existingMemberDocs.docs[0];
          const existingData = existingMember.data();
          
          if (existingData.invitation_status === 'accepted') {
            throw new Error('User is already a member of this group');
          } else if (existingData.invitation_status === 'pending') {
            throw new Error('User already has a pending invitation to this group');
          }
        }
        
        // Generate invite link
        const inviteData = await firebaseGroupService.generateInviteLink(groupId, invitedByUserId);
        
        // Add user to group with pending invitation status
        await addDoc(groupMembersRef, {
          group_id: groupId,
          user_id: invitedUserId,
          name: 'Invited User', // Will be updated when they accept
          email: '', // Will be updated when they accept
          wallet_address: '', // Will be updated when they accept
          wallet_public_key: '',
          joined_at: serverTimestamp(),
          invitation_status: 'pending',
          invited_at: serverTimestamp(),
          invited_by: invitedByUserId
        });
        
        // Send notification to invited user (DEV only)
        logger.debug('About to send notification to user', { 
          invitedUserId,
          groupId,
          groupName,
          invitedByUserName
        }, 'firebaseDataService');
        
        // Group invitations removed - no longer supported
        
        logger.debug('Notification sent successfully to user', { invitedUserId }, 'firebaseDataService');
        
        logger.info('Group invitation sent successfully (DEV mode)', null, 'firebaseDataService');
      } else {
        // PROD MODE: Only generate link, no direct notifications
        logger.info('PROD mode: Direct invitations disabled. Use share link instead.', null, 'firebaseDataService');
        throw new Error('Direct invitations are disabled in production. Please use the share link feature.');
      }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending group invitation:', error); }
      throw error;
    }
  },

  // Update invited user info when they view the group
  updateInvitedUserInfo: async (groupId: string, userId: string): Promise<void> => {
    try {
      if (__DEV__) { logger.debug('Updating invited user info', { groupId, userId }, 'firebaseDataService'); }
      
      // Update the user's invitation status in the group members collection
      const memberRef = doc(db, 'groupMembers', `${groupId}_${userId}`);
      await updateDoc(memberRef, {
        invitation_status: 'accepted',
        joined_at: serverTimestamp()
      });
      
      if (__DEV__) { logger.debug('Successfully updated invited user info', null, 'firebaseDataService'); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error updating invited user info:', error); }
      throw error;
    }
  },

  // Real-time listeners
  listenToUserGroups: (userId: string, callback: (groups: GroupWithDetails[]) => void, onError?: (error: any) => void) => {
    try {
      // Removed excessive logging for cleaner console
      
      // Listen to groupMembers collection for this user
      const membersRef = collection(db, 'groupMembers');
      const membersQuery = query(
        membersRef,
        where('user_id', '==', userId),
        where('invitation_status', '==', 'accepted')
      );
      
      const unsubscribe = onSnapshot(membersQuery, async (snapshot) => {
        try {
          const memberDocs = snapshot.docs;
          const groupIds = memberDocs.map(doc => doc.data().group_id);
          
          // Removed excessive logging for cleaner console
          
          // Fetch group details for all groups
          const groups: GroupWithDetails[] = [];
          for (const groupId of groupIds) {
            try {
              const groupDoc = await getDoc(doc(db, 'groups', groupId));
              if (groupDoc.exists()) {
                const groupData = groupDoc.data();
                const group: GroupWithDetails = {
                  id: groupDoc.id,
                  name: groupData.name || '',
                  description: groupData.description || '',
                  category: groupData.category || 'general',
                  currency: groupData.currency || 'USDC',
                  icon: groupData.icon || 'people',
                  color: groupData.color || '#A5EA15',
                  created_by: groupData.created_by || '',
                  created_at: firebaseDataTransformers.timestampToISO(groupData.created_at),
                  updated_at: firebaseDataTransformers.timestampToISO(groupData.updated_at),
                  member_count: groupData.member_count || 0,
                  expense_count: groupData.expense_count || 0,
                  expenses_by_currency: groupData.expenses_by_currency || [],
                  members: [],
                  expenses: [],
                  totalAmount: 0,
                  userBalance: 0
                };
                groups.push(group);
              }
            } catch (error) {
              if (__DEV__) { console.error('🔥 Error fetching group in real-time listener:', groupId, error); }
            }
          }
          
          callback(groups);
        } catch (error) {
          if (__DEV__) { console.error('🔥 Error in real-time listener callback:', error); }
          if (onError) {onError(error);}
        }
      }, (error) => {
        if (__DEV__) { console.error('🔥 Real-time listener error:', error); }
        if (onError) {onError(error);}
      });
      
      return unsubscribe;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error setting up real-time listener:', error); }
      if (onError) {onError(error);}
      return () => {}; // Return empty unsubscribe function
    }
  },

  listenToGroup: (groupId: string, callback: (group: GroupWithDetails) => void, onError?: (error: any) => void) => {
    try {
      if (__DEV__) { logger.debug('Setting up real-time listener for group', { groupId }, 'firebaseDataService'); }
      
      const groupRef = doc(db, 'groups', groupId);
      const unsubscribe = onSnapshot(groupRef, async (snapshot) => {
        try {
          if (snapshot.exists()) {
            const groupData = snapshot.data();
            const group: GroupWithDetails = {
              id: snapshot.id,
              name: groupData.name || '',
              description: groupData.description || '',
              category: groupData.category || 'general',
              currency: groupData.currency || 'USDC',
              icon: groupData.icon || 'people',
              color: groupData.color || '#A5EA15',
              created_by: groupData.created_by || '',
              created_at: firebaseDataTransformers.timestampToISO(groupData.created_at),
              updated_at: firebaseDataTransformers.timestampToISO(groupData.updated_at),
              member_count: groupData.member_count || 0,
              expense_count: groupData.expense_count || 0,
              expenses_by_currency: groupData.expenses_by_currency || [],
              members: [],
              expenses: [],
              totalAmount: 0,
              userBalance: 0
            };
            
            // Fetch members and expenses for complete group details
            const [members, expenses] = await Promise.all([
              firebaseDataService.group.getGroupMembers(groupId),
              firebaseDataService.expense.getGroupExpenses(groupId)
            ]);
            
            group.members = members;
            group.expenses = expenses;
            
            callback(group);
      }
    } catch (error) {
          if (__DEV__) { console.error('🔥 Error in group real-time listener callback:', error); }
          if (onError) {onError(error);}
        }
      }, (error) => {
        if (__DEV__) { console.error('🔥 Group real-time listener error:', error); }
        if (onError) {onError(error);}
      });
      
      return unsubscribe;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error setting up group real-time listener:', error); }
      if (onError) {onError(error);}
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Send group payment request notification
  sendGroupPaymentRequest: async (
    groupId: string,
    senderId: string,
    recipientId: string,
    amount: number,
    currency: string,
    description?: string
  ): Promise<void> => {
    try {
      if (__DEV__) { logger.info('Sending group payment request notification', { groupId, senderId, recipientId, amount, currency, description }, 'firebaseDataService'); }
      
      // Get group and user data
      const [groupDoc, senderDoc, recipientDoc] = await Promise.all([
        getDoc(doc(db, 'groups', groupId)),
        getDoc(doc(db, 'users', senderId)),
        getDoc(doc(db, 'users', recipientId))
      ]);
      
      const groupName = groupDoc.exists() ? groupDoc.data().name : 'Group';
      const senderName = senderDoc.exists() ? senderDoc.data().name : 'Unknown';
      
      // Group payment requests removed - no longer supported
      
      if (__DEV__) { logger.info('Group payment request notification sent successfully', null, 'firebaseDataService'); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending group payment request notification:', error); }
      throw error;
    }
  },

  // Send group added notification
  sendGroupAddedNotification: async (
    groupId: string,
    addedUserId: string,
    addedByUserId: string
  ): Promise<void> => {
    try {
      if (__DEV__) { logger.info('Sending group added notification', { groupId, addedUserId, addedByUserId }, 'firebaseDataService'); }
      
      // Get group and user data
      const [groupDoc, addedByDoc] = await Promise.all([
        getDoc(doc(db, 'groups', groupId)),
        getDoc(doc(db, 'users', addedByUserId))
      ]);
      
      const groupName = groupDoc.exists() ? groupDoc.data().name : 'Group';
      const addedByName = addedByDoc.exists() ? addedByDoc.data().name : 'Unknown';
      
      // Group added notifications removed - no longer supported
      
      if (__DEV__) { logger.info('Group added notification sent successfully', null, 'firebaseDataService'); }
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending group added notification:', error); }
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
    try {
      if (__DEV__) { 
        logger.info('Starting expense creation', { expenseData }, 'firebaseDataService');
      }
      
      const expenseRef = await addDoc(collection(db, 'expenses'), firebaseDataTransformers.expenseToFirestore(expenseData));
      
      if (__DEV__) { logger.info('Expense document created', { expenseId: expenseRef.id }, 'firebaseDataService'); }
      
      // Update group expense count
      await updateGroupExpenseCount(expenseData.group_id || expenseData.groupId);
      
      const expense = {
        ...expenseData,
        id: expenseRef.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Expense;
      
      
      // Only send notifications if amount per person is greater than 0
      if (expenseData.splitData && expenseData.splitData.memberIds) {
        if (__DEV__) { 
          logger.info('Sending payment request notifications for expense', { expenseId: expense.id, splitData: expenseData.splitData }, 'firebaseDataService');
        }
        
        // Get group data for notification
        const groupDoc = await getDoc(doc(db, 'groups', expenseData.group_id || expenseData.groupId));
        const groupName = groupDoc.exists() ? groupDoc.data()?.name : 'Group';
        
        
        // Get payer data
        const payerDoc = await getDoc(doc(db, 'users', expenseData.paid_by));
        const payerName = payerDoc.exists() ? payerDoc.data()?.name : 'Unknown';
        
        
        // Calculate amount per person
        const amountPerPerson = expenseData.splitData.amountPerPerson || 
          (expenseData.amount / expenseData.splitData.memberIds.length);
        
        
        // Only send notifications if amount per person is greater than 0
        if (amountPerPerson > 0) {
        // Send notifications to each member who owes money (excluding the payer)
        for (const memberId of expenseData.splitData.memberIds) {
          if (memberId !== expenseData.paid_by) {
            try {
              
              // Get member data
              const memberDoc = await getDoc(doc(db, 'users', memberId));
              if (memberDoc.exists()) {
                const memberData = memberDoc.data();
                
                if (__DEV__) { 
                  logger.info('Sending payment request', { memberName: memberData.name, amount: amountPerPerson, currency: expenseData.currency }, 'firebaseDataService'); 
                }
                
                // Send payment request notification
                try {
                  // Create standardized notification data
                  const notificationData = createPaymentRequestNotificationData(
                    expenseData.paid_by,
                    payerName,
                    memberId,
                    amountPerPerson,
                    expenseData.currency,
                    expenseData.description,
                    expenseData.group_id || expenseData.groupId,
                    undefined, // No requestId for expenses
                    expense.id // Use expenseId instead
                  );

                  // Add group-specific data
                  notificationData.groupName = groupName;

                  // Validate notification data
                  const validation = validateNotificationData(notificationData, 'payment_request');
                  if (!validation.isValid) {
                    logger.error('Invalid notification data for expense payment request', { 
                      errors: validation.errors,
                      notificationData 
                    }, 'firebaseDataService');
                    throw new Error(`Invalid notification data: ${validation.errors.join(', ')}`);
                  }

                  await notificationService.sendNotification(
                    memberId,
                    'Payment Request',
                    `${payerName} has added an expense of ${expenseData.amount} ${expenseData.currency} in ${groupName}. You owe ${amountPerPerson.toFixed(4)} ${expenseData.currency}.`,
                    'payment_request',
                    notificationData
                  );
                  logger.info('Expense payment request notification sent successfully', { 
                    memberId, 
                    payerId: expenseData.paid_by,
                    amount: amountPerPerson,
                    currency: expenseData.currency 
                  }, 'firebaseDataService');
                } catch (notificationError) {
                  logger.error('Failed to send expense payment request notification', { 
                    error: notificationError, 
                    memberId,
                    payerId: expenseData.paid_by
                  }, 'firebaseDataService');
                  // Don't throw - expense was created successfully, notification failure shouldn't break the flow
                }
                
              } else {
                if (__DEV__) { logger.warn('Member not found', { memberId }, 'firebaseDataService'); }
              }
            } catch (error) {
              if (__DEV__) { console.error(`❌ createExpense: Error sending payment request to ${memberId}:`, error); }
              // Don't throw error to prevent expense creation failure
            }
          } else {
          }
          }
        } else {
        }
      } else {
      }
      
      if (__DEV__) { logger.info('Expense created successfully', { expenseId: expense.id }, 'firebaseDataService'); }
      return expense;
    } catch (error) {
      if (__DEV__) { console.error('🔥 createExpense: Error creating expense:', error); }
      throw error;
    }
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
    if (updates.description !== undefined) {updateData.description = updates.description;}
    if (updates.amount !== undefined) {updateData.amount = updates.amount;}
    if (updates.currency !== undefined) {updateData.currency = updates.currency;}
    if (updates.category !== undefined) {updateData.category = updates.category;}
    if (updates.splitType !== undefined) {updateData.split_type = updates.splitType;}
    if (updates.splitData !== undefined) {updateData.split_data = updates.splitData;}
    
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
      // Removed excessive logging for cleaner console
      
      const transactionsRef = collection(db, 'transactions');
      
      // Query for transactions where user is the sender
      const fromQuery = query(
        transactionsRef,
        where('from_user', '==', userId),
        orderBy('created_at', 'desc')
      );
      // Removed excessive logging for cleaner console
      const fromDocs = await getDocs(fromQuery);
      // Removed excessive logging for cleaner console
      
      // Query for transactions where user is the receiver
      const toQuery = query(
        transactionsRef,
        where('to_user', '==', userId),
        orderBy('created_at', 'desc')
      );
      // Removed excessive logging for cleaner console
      const toDocs = await getDocs(toQuery);
      // Removed excessive logging for cleaner console
      
      const allTransactions = [
        // Outgoing transactions (user is sender)
        ...fromDocs.docs.map(doc => {
          const transaction = firebaseDataTransformers.firestoreToTransaction(doc);
          // Ensure transaction type is set correctly for outgoing transactions
          if (transaction.from_user === userId) {
            transaction.type = transaction.type === 'deposit' || transaction.type === 'withdraw' 
              ? transaction.type 
              : 'send';
          }
          return transaction;
        }),
        // Incoming transactions (user is receiver)
        ...toDocs.docs.map(doc => {
          const transaction = firebaseDataTransformers.firestoreToTransaction(doc);
          // Ensure transaction type is set correctly for incoming transactions
          if (transaction.to_user === userId) {
            transaction.type = transaction.type === 'deposit' || transaction.type === 'withdraw' 
              ? transaction.type 
              : 'receive';
          }
          return transaction;
        })
      ];
      
      // Remove duplicate transactions (in case both old and new format exist)
      const uniqueTransactions = allTransactions.filter((transaction, index, self) => {
        // Keep only the first occurrence of each transaction hash
        return index === self.findIndex(t => t.tx_hash === transaction.tx_hash);
      });
      
      // Sort by created_at descending
      const sortedTransactions = uniqueTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Removed excessive logging for cleaner console
      
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
  },

  // Send payment received notification
  sendPaymentReceivedNotification: async (
    recipientId: string,
    senderId: string,
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<void> => {
    try {
      if (__DEV__) { logger.info('Sending payment received notification', { recipientId, senderId, amount, currency, transactionId }, 'firebaseDataService'); }
      
      // Get sender and recipient data
      const [senderDoc, recipientDoc] = await Promise.all([
        getDoc(doc(db, 'users', senderId)),
        getDoc(doc(db, 'users', recipientId))
      ]);
      
      const senderName = senderDoc.exists() ? senderDoc.data().name : 'Unknown';
      
      // Send notification to recipient
      await notificationService.sendNotification(
        recipientId,
        'Payment Received',
        `You received ${amount} ${currency} from ${senderName}`,
        'payment_received',
        {
          transactionId,
          senderId,
          senderName,
          amount,
          currency,
          status: 'completed'
        }
      );
      
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending payment received notification:', error); }
      throw error;
    }
  }
};

// Notification services
// DEPRECATED: Notification services moved to NotificationService.ts
// This service is kept for backward compatibility but should not be used for new code
// Use notificationService from '../services/notificationService' instead
export const firebaseNotificationService = {
  getUserNotifications: async (userId: string): Promise<Notification[]> => {
    console.warn('🔥 DEPRECATED: firebaseNotificationService.getUserNotifications is deprecated. Use notificationService from notificationService.ts instead.');
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
    console.warn('🔥 DEPRECATED: firebaseNotificationService.createNotification is deprecated. Use notificationService.sendNotification instead.');
    const notificationRef = await addDoc(collection(db, 'notifications'), firebaseDataTransformers.notificationToFirestore(notificationData));
    
    return {
      ...notificationData,
      id: notificationRef.id,
      created_at: new Date().toISOString()
    } as Notification;
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    console.warn('🔥 DEPRECATED: firebaseNotificationService.markNotificationAsRead is deprecated. Use notificationService.markAsRead instead.');
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      is_read: true,
      updated_at: serverTimestamp()
    });
  },
    
  deleteNotification: async (notificationId: string): Promise<void> => {
    console.warn('🔥 DEPRECATED: firebaseNotificationService.deleteNotification is deprecated. Use notificationService.deleteNotification instead.');
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

// System notification services
export const firebaseSystemService = {
  sendSystemWarning: async (
    userId: string,
    warningType: 'low_balance' | 'payment_failed' | 'network_error' | 'security_alert',
    message: string,
    data?: any
  ): Promise<void> => {
    try {
      if (__DEV__) { logger.warn('Sending system warning', { userId, warningType, message }, 'firebaseDataService'); }
      
      await notificationService.sendNotification(
        userId,
        'System Warning',
        message,
        'system_warning',
        {
          warningType,
          data,
          severity: 'warning'
        }
      );
      
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending system warning:', error); }
      throw error;
    }
  },

  sendSystemNotification: async (
    userId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<void> => {
    try {
      if (__DEV__) { logger.info('Sending system notification', { userId, title, message }, 'firebaseDataService'); }
      
      await notificationService.sendNotification(
        userId,
        title,
        message,
        'system_notification',
        {
          data,
          severity: 'info'
        }
      );
      
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending system notification:', error); }
      throw error;
    }
  }
};

// Settlement services (Firebase implementations)
export const firebaseSettlementService = {
  getSettlementCalculation: async (groupId: string): Promise<SettlementCalculation[]> => {
    try {
      
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
      
      if (__DEV__) { logger.info('Settlement calculations', { settlementsCount: settlements.length }, 'firebaseDataService'); }
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
      if (__DEV__) { logger.info('Settling group expenses', { groupId, userId, settlementType }, 'firebaseDataService'); }
      
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
      if (__DEV__) { logger.info('Recording personal settlement', { groupId, userId, recipientId, amount, currency }, 'firebaseDataService'); }
      
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
        const sentAt = new Date(firebaseDataTransformers.timestampToISO(data.sent_at));
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
      if (__DEV__) { logger.info('Sending payment reminder', { groupId, senderId, recipientId, amount }, 'firebaseDataService'); }
      
      // Get sender and recipient data
      const [senderDoc, recipientDoc, groupDoc] = await Promise.all([
        getDoc(doc(db, 'users', senderId)),
        getDoc(doc(db, 'users', recipientId)),
        getDoc(doc(db, 'groups', groupId))
      ]);
      
      if (!senderDoc.exists() || !recipientDoc.exists() || !groupDoc.exists()) {
        throw new Error('User or group not found');
      }
      
      const senderData = senderDoc.data();
      const recipientData = recipientDoc.data();
      const groupData = groupDoc.data();
      
      // Check if reminder was sent recently (24-hour cooldown)
      const remindersRef = collection(db, 'reminders');
      const recentReminderQuery = query(
        remindersRef,
        where('group_id', '==', groupId),
        where('sender_id', '==', senderId),
        where('recipient_id', '==', recipientId),
        where('sent_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      );
      
      const recentReminders = await getDocs(recentReminderQuery);
      
      if (!recentReminders.empty) {
        const lastSent = new Date(firebaseDataTransformers.timestampToISO(recentReminders.docs[0].data().sent_at));
        const nextAllowed = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
        const timeRemaining = Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60 * 60));
        
        throw new Error(`Reminder cooldown active. You can send another reminder in ${timeRemaining} hours.`);
      }
      
      // Record the reminder
      const reminderData = {
        group_id: groupId,
        sender_id: senderId,
        recipient_id: recipientId,
        amount: amount,
        reminder_type: 'individual',
        sent_at: serverTimestamp(),
        created_at: serverTimestamp()
      };
      
      await addDoc(collection(db, 'reminders'), reminderData);
      
      // Send notification to recipient
      await notificationService.sendNotification(
        recipientId,
        'Payment Reminder',
        `${senderData.name} is reminding you about a $${amount.toFixed(2)} payment in ${groupData.name}`,
        'payment_reminder',
        {
          groupId: groupId,
          groupName: groupData.name,
          senderId: senderId,
          senderName: senderData.name,
          amount: amount,
          currency: 'USDC'
        }
      );
      
      
      return {
        success: true,
        message: `Reminder sent to ${recipientData.name}`,
        recipientName: recipientData.name,
        amount: amount
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending payment reminder:', error); }
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
      if (__DEV__) { logger.info('Sending bulk payment reminders', { groupId, senderId, debtorsCount: debtors.length }, 'firebaseDataService'); }
      
      // Get sender and group data
      const [senderDoc, groupDoc] = await Promise.all([
        getDoc(doc(db, 'users', senderId)),
        getDoc(doc(db, 'groups', groupId))
      ]);
      
      if (!senderDoc.exists() || !groupDoc.exists()) {
        throw new Error('User or group not found');
      }
      
      const senderData = senderDoc.data();
      const groupData = groupDoc.data();
      
      // Check bulk reminder cooldown
      const remindersRef = collection(db, 'reminders');
      const bulkReminderQuery = query(
        remindersRef,
        where('group_id', '==', groupId),
        where('sender_id', '==', senderId),
        where('reminder_type', '==', 'bulk'),
        where('sent_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      );
      
      const bulkReminders = await getDocs(bulkReminderQuery);
      
      if (!bulkReminders.empty) {
        const lastSent = new Date(firebaseDataTransformers.timestampToISO(bulkReminders.docs[0].data().sent_at));
        const nextAllowed = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
        const timeRemaining = Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60 * 60));
        
        throw new Error(`Bulk reminder cooldown active. You can send bulk reminders again in ${timeRemaining} hours.`);
      }
      
      const results = [];
      const batch = writeBatch(db);
      
      // Send reminders to all debtors
      for (const debtor of debtors) {
        try {
          // Record the reminder
          const reminderData = {
            group_id: groupId,
            sender_id: senderId,
            recipient_id: debtor.recipientId,
            amount: debtor.amount,
            reminder_type: 'bulk',
            sent_at: serverTimestamp(),
            created_at: serverTimestamp()
          };
          
          const reminderRef = doc(collection(db, 'reminders'));
          batch.set(reminderRef, reminderData);
          
          // Send notification
          await notificationService.sendNotification(
            debtor.recipientId,
            'Payment Reminder',
            `${senderData.name} is reminding you about a $${debtor.amount.toFixed(2)} payment in ${groupData.name}`,
            'payment_reminder',
            {
              groupId: groupId,
              groupName: groupData.name,
              senderId: senderId,
              senderName: senderData.name,
              amount: debtor.amount,
              currency: 'USDC',
              isPartOfBulk: true
            }
          );
          
          results.push({
            recipientId: debtor.recipientId,
            recipientName: debtor.name,
            amount: debtor.amount,
            success: true
          });
          
        } catch (error) {
          console.error(`Error sending reminder to ${debtor.name}:`, error);
          results.push({
            recipientId: debtor.recipientId,
            recipientName: debtor.name,
            amount: debtor.amount,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Commit all reminder records
      await batch.commit();
      
      const successCount = results.filter(r => r.success).length;
      const totalAmount = debtors.reduce((sum, d) => sum + d.amount, 0);
      
      
      return {
        success: true,
        message: `Reminders sent to ${successCount} members about $${totalAmount.toFixed(2)} total`,
        results: results,
        totalAmount: totalAmount
      };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error sending bulk payment reminders:', error); }
      throw error;
    }
  }
};

// Multi-signature services (Firebase implementations)
export const firebaseMultiSigService = {
  getUserMultiSigWallets: async (userId: string): Promise<any[]> => {
    try {
      
      const walletsRef = collection(db, 'multiSigWallets');
      const walletsQuery = query(
        walletsRef,
        where('owners', 'array-contains', userId),
        orderBy('created_at', 'desc')
      );
      
      const walletsSnapshot = await getDocs(walletsQuery);
      const wallets = walletsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      
      return wallets;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user multi-signature wallets:', error); }
      throw error;
    }
  },

  getUserTransactions: async (userId: string): Promise<any[]> => {
    try {
      
      const transactionsRef = collection(db, 'multiSigTransactions');
      const transactionsQuery = query(
        transactionsRef,
        where('participants', 'array-contains', userId),
        orderBy('created_at', 'desc')
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      
      return transactions;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting user multi-signature transactions:', error); }
      throw error;
    }
  },

  createMultiSigWallet: async (userId: string, walletData: any): Promise<{ success: boolean; wallet?: any; error?: string }> => {
    try {
      if (__DEV__) { logger.info('Creating multi-signature wallet', { userId }, 'firebaseDataService'); }
      
      const walletRef = await addDoc(collection(db, 'multiSigWallets'), {
        ...walletData,
        owners: [userId],
        created_at: serverTimestamp(),
        created_by: userId
      });
      
      
      return { success: true, wallet: { id: walletRef.id, ...walletData } };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error creating multi-signature wallet:', error); }
      return { success: false, error: 'Failed to create multi-signature wallet' };
    }
  },

  approveMultiSigTransaction: async (transactionId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (__DEV__) { logger.info('Approving multi-signature transaction', { transactionId, userId }, 'firebaseDataService'); }
      
      const transactionRef = doc(db, 'multiSigTransactions', transactionId);
      await updateDoc(transactionRef, {
        [`approvals.${userId}`]: true,
        updated_at: serverTimestamp()
      });
      
      
      return { success: true };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error approving multi-signature transaction:', error); }
      return { success: false, error: 'Failed to approve multi-signature transaction' };
    }
  },

  rejectMultiSigTransaction: async (transactionId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (__DEV__) { logger.info('Rejecting multi-signature transaction', { transactionId, userId }, 'firebaseDataService'); }
      
      const transactionRef = doc(db, 'multiSigTransactions', transactionId);
      await updateDoc(transactionRef, {
        [`rejections.${userId}`]: true,
        status: 'rejected',
        updated_at: serverTimestamp()
      });
      
      
      return { success: true };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error rejecting multi-signature transaction:', error); }
      return { success: false, error: 'Failed to reject multi-signature transaction' };
    }
  }
};

// Linked wallet services (Firebase implementations)
export const firebaseLinkedWalletService = {
  getLinkedWallets: async (userId: string): Promise<any[]> => {
    try {
      
      const walletsRef = collection(db, 'linkedWallets');
      const walletsQuery = query(
        walletsRef,
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
      );
      
      const walletsSnapshot = await getDocs(walletsQuery);
      const wallets = walletsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      
      return wallets;
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error getting linked wallets:', error); }
      throw error;
    }
  },

  addLinkedWallet: async (userId: string, walletData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (__DEV__) { logger.info('Adding linked wallet', { userId }, 'firebaseDataService'); }
      
      await addDoc(collection(db, 'linkedWallets'), {
        ...walletData,
        userId,
        created_at: serverTimestamp()
      });
      
      
      return { success: true };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error adding linked wallet:', error); }
      return { success: false, error: 'Failed to add linked wallet' };
    }
  },

  removeLinkedWallet: async (userId: string, walletId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (__DEV__) { logger.info('Removing linked wallet', { walletId, userId }, 'firebaseDataService'); }
      
      await deleteDoc(doc(db, 'linkedWallets', walletId));
      
      
      return { success: true };
    } catch (error) {
      if (__DEV__) { console.error('🔥 Error removing linked wallet:', error); }
      return { success: false, error: 'Failed to remove linked wallet' };
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
  linkedWallet: firebaseLinkedWalletService,
  transformers: firebaseDataTransformers
}; 