/**
 * Firebase-based data service for WeSplit
 * Replaces SQLite backend API calls with Firestore operations
 */

import { 
  User, 
  UserContact, 
  Notification,
  Transaction
} from '../../types';
import { firestoreService } from '../../config/firebase/firebase';
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
import { db } from '../../config/firebase/firebase';
import { notificationService } from '../notifications/notificationService';
import { logger } from '../analytics/loggingService';
// import { createPaymentRequestNotificationData, validateNotificationData } from '../notifications/notificationDataUtils';

// Data transformation utilities
export const firebaseDataTransformers = {
  // Transform Firestore timestamp to ISO string
  timestampToISO: (timestamp: Timestamp | null | any): string => {
    if (!timestamp) {return new Date().toISOString();}
    if (timestamp.toDate) {return timestamp.toDate().toISOString();}
    if (timestamp.seconds) {return new Date(timestamp.seconds * 1000).toISOString();}
    return new Date(timestamp).toISOString();
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
    avatar: doc.data().avatar || '',
    hasCompletedOnboarding: doc.data().hasCompletedOnboarding || false,
    status: doc.data().status || 'active',
    wallet_status: doc.data().wallet_status || 'no_wallet',
    wallet_created_at: doc.data().wallet_created_at ? firebaseDataTransformers.timestampToISO(doc.data().wallet_created_at) : undefined,
    wallet_last_fixed_at: doc.data().wallet_last_fixed_at ? firebaseDataTransformers.timestampToISO(doc.data().wallet_last_fixed_at) : undefined,
    wallet_fix_attempts: doc.data().wallet_fix_attempts || 0,
    wallet_has_private_key: doc.data().wallet_has_private_key || false,
    wallet_has_seed_phrase: doc.data().wallet_has_seed_phrase || false,
    wallet_type: doc.data().wallet_type || 'app-generated',
    wallet_migration_status: doc.data().wallet_migration_status || 'none',
    firebase_uid: doc.data().firebase_uid || '',
    primary_email: doc.data().primary_email || '',
    email_verified: doc.data().email_verified || false,
    migration_completed: doc.data().migration_completed ? firebaseDataTransformers.timestampToISO(doc.data().migration_completed) : undefined,
    migration_version: doc.data().migration_version || '',
    points: doc.data().points || 0,
    total_points_earned: doc.data().total_points_earned || 0,
    points_last_updated: doc.data().points_last_updated ? firebaseDataTransformers.timestampToISO(doc.data().points_last_updated) : undefined
  }),

  // Transform User to Firestore data
  userToFirestore: (user: Omit<User, 'id' | 'created_at'>): any => {
    const data: any = {
      updated_at: serverTimestamp()
    };
    
    // Only include defined fields to avoid Firebase errors
    if (user.name !== undefined) {data.name = user.name;}
    if (user.email !== undefined) {data.email = user.email;}
    if (user.wallet_address !== undefined) {data.wallet_address = user.wallet_address;}
    if (user.wallet_public_key !== undefined) {data.wallet_public_key = user.wallet_public_key;}
    if (user.avatar !== undefined) {data.avatar = user.avatar;}
    if (user.hasCompletedOnboarding !== undefined) {data.hasCompletedOnboarding = user.hasCompletedOnboarding;}
    if (user.status !== undefined) {data.status = user.status;}
    if (user.wallet_status !== undefined) {data.wallet_status = user.wallet_status;}
    if (user.wallet_created_at !== undefined) {data.wallet_created_at = user.wallet_created_at ? firebaseDataTransformers.isoToTimestamp(user.wallet_created_at) : null;}
    if (user.wallet_last_fixed_at !== undefined) {data.wallet_last_fixed_at = user.wallet_last_fixed_at ? firebaseDataTransformers.isoToTimestamp(user.wallet_last_fixed_at) : null;}
    if (user.wallet_fix_attempts !== undefined) {data.wallet_fix_attempts = user.wallet_fix_attempts;}
    if (user.wallet_has_private_key !== undefined) {data.wallet_has_private_key = user.wallet_has_private_key;}
    if (user.wallet_has_seed_phrase !== undefined) {data.wallet_has_seed_phrase = user.wallet_has_seed_phrase;}
    if (user.wallet_type !== undefined) {data.wallet_type = user.wallet_type;}
    if (user.wallet_migration_status !== undefined) {data.wallet_migration_status = user.wallet_migration_status;}
    if (user.firebase_uid !== undefined) {data.firebase_uid = user.firebase_uid;}
    if (user.primary_email !== undefined) {data.primary_email = user.primary_email;}
    if (user.email_verified !== undefined) {data.email_verified = user.email_verified;}
    if (user.migration_completed !== undefined) {data.migration_completed = user.migration_completed ? firebaseDataTransformers.isoToTimestamp(user.migration_completed) : null;}
    if (user.migration_version !== undefined) {data.migration_version = user.migration_version;}
    if (user.points !== undefined) {data.points = user.points;}
    if (user.total_points_earned !== undefined) {data.total_points_earned = user.total_points_earned;}
    if (user.points_last_updated !== undefined) {data.points_last_updated = user.points_last_updated ? firebaseDataTransformers.isoToTimestamp(user.points_last_updated) : null;}
    
    return data;
  },

  // Transform Firestore document to UserContact
  firestoreToUserContact: (doc: any): UserContact => ({
    id: doc.id,
    name: doc.data().name || '',
    email: doc.data().email || '',
    wallet_address: doc.data().wallet_address || '',
    wallet_public_key: doc.data().wallet_public_key || '',
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    avatar: doc.data().avatar || '',
    hasCompletedOnboarding: doc.data().hasCompletedOnboarding || false,
    status: doc.data().status || 'active',
    wallet_status: doc.data().wallet_status || 'no_wallet',
    wallet_created_at: doc.data().wallet_created_at ? firebaseDataTransformers.timestampToISO(doc.data().wallet_created_at) : undefined,
    wallet_last_fixed_at: doc.data().wallet_last_fixed_at ? firebaseDataTransformers.timestampToISO(doc.data().wallet_last_fixed_at) : undefined,
    wallet_fix_attempts: doc.data().wallet_fix_attempts || 0,
    wallet_has_private_key: doc.data().wallet_has_private_key || false,
    wallet_has_seed_phrase: doc.data().wallet_has_seed_phrase || false,
    wallet_type: doc.data().wallet_type || 'app-generated',
    wallet_migration_status: doc.data().wallet_migration_status || 'none',
    firebase_uid: doc.data().firebase_uid || '',
    primary_email: doc.data().primary_email || '',
    email_verified: doc.data().email_verified || false,
    migration_completed: doc.data().migration_completed ? firebaseDataTransformers.timestampToISO(doc.data().migration_completed) : undefined,
    migration_version: doc.data().migration_version || '',
    first_met_at: firebaseDataTransformers.timestampToISO(doc.data().first_met_at),
    isFavorite: doc.data().isFavorite || false
  }),

  // Transform UserContact to Firestore data
  userContactToFirestore: (contact: Omit<UserContact, 'id' | 'created_at'>): any => ({
    name: contact.name,
    email: contact.email,
    wallet_address: contact.wallet_address,
    wallet_public_key: contact.wallet_public_key,
    avatar: contact.avatar,
    hasCompletedOnboarding: contact.hasCompletedOnboarding,
    status: contact.status,
    wallet_status: contact.wallet_status,
    wallet_created_at: contact.wallet_created_at ? firebaseDataTransformers.isoToTimestamp(contact.wallet_created_at) : null,
    wallet_last_fixed_at: contact.wallet_last_fixed_at ? firebaseDataTransformers.isoToTimestamp(contact.wallet_last_fixed_at) : null,
    wallet_fix_attempts: contact.wallet_fix_attempts,
    wallet_has_private_key: contact.wallet_has_private_key,
    wallet_has_seed_phrase: contact.wallet_has_seed_phrase,
    wallet_type: contact.wallet_type,
    wallet_migration_status: contact.wallet_migration_status,
    firebase_uid: contact.firebase_uid,
    primary_email: contact.primary_email,
    email_verified: contact.email_verified,
    migration_completed: contact.migration_completed ? firebaseDataTransformers.isoToTimestamp(contact.migration_completed) : null,
    migration_version: contact.migration_version,
    first_met_at: firebaseDataTransformers.isoToTimestamp(contact.first_met_at),
    isFavorite: contact.isFavorite,
    updated_at: serverTimestamp()
  }),

  // Transform Firestore document to Notification
  firestoreToNotification: (doc: any): Notification => ({
    id: doc.id,
    type: doc.data().type || 'general',
    title: doc.data().title || '',
    message: doc.data().message || '',
    data: doc.data().data || {},
    read: doc.data().read || false,
    created_at: firebaseDataTransformers.timestampToISO(doc.data().created_at),
    user_id: doc.data().user_id || ''
  }),

  // Transform Notification to Firestore data
  notificationToFirestore: (notification: Omit<Notification, 'id' | 'created_at'>): any => ({
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    read: notification.read,
    user_id: notification.user_id,
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
    company_fee: doc.data().company_fee || 0,
    net_amount: doc.data().net_amount || 0,
    gas_fee: doc.data().gas_fee || 0,
    blockchain_network: doc.data().blockchain_network || 'solana',
    confirmation_count: doc.data().confirmation_count || 0,
    block_height: doc.data().block_height || 0
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
    company_fee: transaction.company_fee,
    net_amount: transaction.net_amount,
    gas_fee: transaction.gas_fee,
    blockchain_network: transaction.blockchain_network,
    confirmation_count: transaction.confirmation_count,
    block_height: transaction.block_height,
    updated_at: serverTimestamp()
  })
};

// Main Firebase Data Service
export const firebaseDataService = {
  // User operations
  user: {
  getCurrentUser: async (userId: string): Promise<User> => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
          return firebaseDataTransformers.firestoreToUser(userDoc);
      } catch (error) {
        logger.error('Failed to get current user', { userId, error }, 'FirebaseDataService');
        throw error;
      }
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
      try {
        // Ensure points are initialized to 0 if not provided
        const userDataWithPoints = {
          ...userData,
          points: userData.points ?? 0,
          total_points_earned: userData.total_points_earned ?? 0
        };
        
        const userRef = await addDoc(collection(db, 'users'), {
          ...firebaseDataTransformers.userToFirestore(userDataWithPoints),
          created_at: serverTimestamp()
        });
        
        const createdUser = await firebaseDataService.user.getCurrentUser(userRef.id);
        logger.info('User created successfully', { userId: userRef.id }, 'FirebaseDataService');
        return createdUser;
    } catch (error) {
        logger.error('Failed to create user', { userData, error }, 'FirebaseDataService');
      throw error;
    }
  },

    updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, firebaseDataTransformers.userToFirestore(updates as any));
        
        const updatedUser = await firebaseDataService.user.getCurrentUser(userId);
        logger.info('User updated successfully', { userId }, 'FirebaseDataService');
        return updatedUser;
    } catch (error) {
        logger.error('Failed to update user', { userId, updates, error }, 'FirebaseDataService');
        throw error;
      }
    },

    deleteUser: async (userId: string): Promise<void> => {
      try {
        await deleteDoc(doc(db, 'users', userId));
        logger.info('User deleted successfully', { userId }, 'FirebaseDataService');
        } catch (error) {
        logger.error('Failed to delete user', { userId, error }, 'FirebaseDataService');
        throw error;
      }
    },

    getUserByEmail: async (email: string): Promise<User | null> => {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
      return null;
    }
        
        const userDoc = querySnapshot.docs[0];
        return firebaseDataTransformers.firestoreToUser(userDoc);
        } catch (error) {
        logger.error('Failed to get user by email', { email, error }, 'FirebaseDataService');
      throw error;
      }
  },

    getUserByWalletAddress: async (walletAddress: string): Promise<User | null> => {
      try {
        const q = query(collection(db, 'users'), where('wallet_address', '==', walletAddress), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return null;
        }
        
        const userDoc = querySnapshot.docs[0];
        return firebaseDataTransformers.firestoreToUser(userDoc);
    } catch (error) {
        logger.error('Failed to get user by wallet address', { walletAddress, error }, 'FirebaseDataService');
        throw error;
      }
    },

    createUserIfNotExists: async (userData: Omit<User, "id" | "created_at">): Promise<User> => {
      try {
        // Check if user already exists by email
        const existingUser = await firebaseDataService.user.getUserByEmail(userData.email);
        if (existingUser) {
          return existingUser;
        }
        
        // Create new user if not exists
        return await firebaseDataService.user.createUser(userData);
      } catch (error) {
        // If user not found by email, create new user
        if (error instanceof Error && error.message === 'User not found') {
          return await firebaseDataService.user.createUser(userData);
        }
        logger.error('Failed to create user if not exists', { userData, error }, 'FirebaseDataService');
        throw error;
      }
    },

    searchUsers: async (searchTerm: string, limitCount: number = 10): Promise<User[]> => {
      try {
        logger.info('Searching users in Firebase', { searchTerm, limitCount }, 'FirebaseDataService');
        
        // Get all users and filter in memory since Firestore doesn't support case-insensitive search
        const usersQuery = query(
          collection(db, 'users'),
          limit(1000) // Get more users to filter in memory
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const allUsers = usersSnapshot.docs.map(doc => firebaseDataTransformers.firestoreToUser(doc));
        
        // Filter users by name, email, and wallet address (case-insensitive, partial match)
        const searchTermLower = searchTerm.toLowerCase();
        const filteredUsers = allUsers.filter(user => {
          const nameMatch = user.name?.toLowerCase().includes(searchTermLower);
          const emailMatch = user.email?.toLowerCase().includes(searchTermLower);
          const walletMatch = user.wallet_address?.toLowerCase().includes(searchTermLower);
          return nameMatch || emailMatch || walletMatch;
        });
        
        // Sort by relevance (exact matches first, then partial matches)
        const sortedUsers = filteredUsers.sort((a, b) => {
          const aNameExact = a.name?.toLowerCase().startsWith(searchTermLower) ? 0 : 1;
          const bNameExact = b.name?.toLowerCase().startsWith(searchTermLower) ? 0 : 1;
          const aEmailExact = a.email?.toLowerCase().startsWith(searchTermLower) ? 0 : 1;
          const bEmailExact = b.email?.toLowerCase().startsWith(searchTermLower) ? 0 : 1;
          const aWalletExact = a.wallet_address?.toLowerCase().startsWith(searchTermLower) ? 0 : 1;
          const bWalletExact = b.wallet_address?.toLowerCase().startsWith(searchTermLower) ? 0 : 1;
          
          const aScore = Math.min(aNameExact, aEmailExact, aWalletExact);
          const bScore = Math.min(bNameExact, bEmailExact, bWalletExact);
          
          if (aScore !== bScore) {
            return aScore - bScore; // Exact matches first
          }
          
          // If same score, sort alphabetically by name
          return a.name?.toLowerCase().localeCompare(b.name?.toLowerCase() || '') || 0;
        });
        
        const limitedUsers = sortedUsers.slice(0, limitCount);
        
        logger.info('User search completed', { 
          searchTerm, 
          totalUsers: allUsers.length,
          filteredCount: filteredUsers.length,
          returnedCount: limitedUsers.length 
        }, 'FirebaseDataService');
        
        return limitedUsers;
      } catch (error) {
        logger.error('Failed to search users', { searchTerm, error }, 'FirebaseDataService');
        throw error;
      }
    },

    addContact: async (userId: string, contactData: Omit<UserContact, 'id' | 'created_at'>): Promise<UserContact> => {
      try {
        return await firebaseDataService.contact.addContact(userId, contactData);
      } catch (error) {
        logger.error('Failed to add contact via user service', { userId, contactData, error }, 'FirebaseDataService');
        throw error;
      }
    },

    removeContact: async (userId: string, contactId: string): Promise<void> => {
      try {
        // Find the contact by user_id and contact details
        const q = query(
          collection(db, 'contacts'),
          where('user_id', '==', userId),
          where('id', '==', contactId)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Contact not found');
        }
        
        const contactDoc = querySnapshot.docs[0];
        await deleteDoc(contactDoc.ref);
        
        logger.info('Contact removed successfully', { userId, contactId }, 'FirebaseDataService');
      } catch (error) {
        logger.error('Failed to remove contact', { userId, contactId, error }, 'FirebaseDataService');
        throw error;
      }
    },

    toggleFavorite: async (userId: string, contactId: string, isFavorite: boolean): Promise<void> => {
      try {
        // Find the contact by user_id and contact details
        const q = query(
          collection(db, 'contacts'),
          where('user_id', '==', userId),
          where('id', '==', contactId)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Contact not found');
        }
        
        const contactDoc = querySnapshot.docs[0];
        await updateDoc(contactDoc.ref, { isFavorite });
        
        logger.info('Contact favorite status updated', { userId, contactId, isFavorite }, 'FirebaseDataService');
      } catch (error) {
        logger.error('Failed to toggle contact favorite', { userId, contactId, isFavorite, error }, 'FirebaseDataService');
        throw error;
      }
    }
  },

  // Contact operations
  contact: {
    getContacts: async (userId: string): Promise<UserContact[]> => {
      try {
        const q = query(
          collection(db, 'contacts'),
          where('user_id', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        const contacts = querySnapshot.docs.map(doc => firebaseDataTransformers.firestoreToUserContact(doc));
        
        // Sort by first_met_at in memory instead of using orderBy
        contacts.sort((a, b) => {
          const aDate = new Date(a.first_met_at || a.created_at).getTime();
          const bDate = new Date(b.first_met_at || b.created_at).getTime();
          return bDate - aDate; // desc order
        });
        
        return contacts;
    } catch (error) {
        logger.error('Failed to get contacts', { userId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    addContact: async (userId: string, contactData: Omit<UserContact, 'id' | 'created_at'>): Promise<UserContact> => {
      try {
        const contactRef = await addDoc(collection(db, 'contacts'), {
          ...firebaseDataTransformers.userContactToFirestore(contactData),
          user_id: userId,
          created_at: serverTimestamp()
        });
        
        const createdContact = await firebaseDataService.contact.getContactById(contactRef.id);
        logger.info('Contact added successfully', { userId, contactId: contactRef.id }, 'FirebaseDataService');
        return createdContact;
    } catch (error) {
        logger.error('Failed to add contact', { userId, contactData, error }, 'FirebaseDataService');
      throw error;
    }
  },

    getContactById: async (contactId: string): Promise<UserContact> => {
      try {
        const contactDoc = await getDoc(doc(db, 'contacts', contactId));
        if (!contactDoc.exists()) {
          throw new Error('Contact not found');
        }
        return firebaseDataTransformers.firestoreToUserContact(contactDoc);
    } catch (error) {
        logger.error('Failed to get contact by ID', { contactId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    updateContact: async (contactId: string, updates: Partial<UserContact>): Promise<UserContact> => {
      try {
          const contactRef = doc(db, 'contacts', contactId);
        await updateDoc(contactRef, firebaseDataTransformers.userContactToFirestore(updates as any));
        
        const updatedContact = await firebaseDataService.contact.getContactById(contactId);
        logger.info('Contact updated successfully', { contactId }, 'FirebaseDataService');
        return updatedContact;
    } catch (error) {
        logger.error('Failed to update contact', { contactId, updates, error }, 'FirebaseDataService');
      throw error;
    }
  },

    deleteContact: async (contactId: string): Promise<void> => {
      try {
        await deleteDoc(doc(db, 'contacts', contactId));
        logger.info('Contact deleted successfully', { contactId }, 'FirebaseDataService');
    } catch (error) {
        logger.error('Failed to delete contact', { contactId, error }, 'FirebaseDataService');
      throw error;
      }
    }
  },

  // Notification operations
  notification: {
    getNotifications: async (userId: string, limitCount: number = 50): Promise<Notification[]> => {
      try {
        const q = query(
          collection(db, 'notifications'),
        where('user_id', '==', userId),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => firebaseDataTransformers.firestoreToNotification(doc));
            } catch (error) {
        logger.error('Failed to get notifications', { userId, error }, 'FirebaseDataService');
        throw error;
      }
    },

    createNotification: async (notificationData: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> => {
      try {
        const notificationRef = await addDoc(collection(db, 'notifications'), {
          ...firebaseDataTransformers.notificationToFirestore(notificationData),
          created_at: serverTimestamp()
        });
        
        const createdNotification = await firebaseDataService.notification.getNotificationById(notificationRef.id);
        logger.info('Notification created successfully', { notificationId: notificationRef.id }, 'FirebaseDataService');
        return createdNotification;
    } catch (error) {
        logger.error('Failed to create notification', { notificationData, error }, 'FirebaseDataService');
      throw error;
    }
  },

    getNotificationById: async (notificationId: string): Promise<Notification> => {
      try {
        const notificationDoc = await getDoc(doc(db, 'notifications', notificationId));
        if (!notificationDoc.exists()) {
          throw new Error('Notification not found');
        }
        return firebaseDataTransformers.firestoreToNotification(notificationDoc);
        } catch (error) {
        logger.error('Failed to get notification by ID', { notificationId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    updateNotification: async (notificationId: string, updates: Partial<Notification>): Promise<Notification> => {
      try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, firebaseDataTransformers.notificationToFirestore(updates as any));
        
        const updatedNotification = await firebaseDataService.notification.getNotificationById(notificationId);
        logger.info('Notification updated successfully', { notificationId }, 'FirebaseDataService');
        return updatedNotification;
    } catch (error) {
        logger.error('Failed to update notification', { notificationId, updates, error }, 'FirebaseDataService');
      throw error;
    }
    },

    markAsRead: async (notificationId: string): Promise<void> => {
      try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
          read: true,
          read_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
        logger.info('Notification marked as read', { notificationId }, 'FirebaseDataService');
    } catch (error) {
        logger.error('Failed to mark notification as read', { notificationId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    markAllAsRead: async (userId: string): Promise<void> => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('user_id', '==', userId),
          where('read', '==', false)
        );
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            read: true,
            read_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });
      });
      
        await batch.commit();
        logger.info('All notifications marked as read', { userId }, 'FirebaseDataService');
    } catch (error) {
        logger.error('Failed to mark all notifications as read', { userId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    deleteNotification: async (notificationId: string): Promise<void> => {
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        logger.info('Notification deleted successfully', { notificationId }, 'FirebaseDataService');
    } catch (error) {
        logger.error('Failed to delete notification', { notificationId, error }, 'FirebaseDataService');
      throw error;
      }
    }
  },

  // Transaction operations
  transaction: {
    getTransactions: async (userId: string, limitCount: number = 50): Promise<Transaction[]> => {
      try {
        const q = query(
          collection(db, 'transactions'),
          where('from_user', '==', userId),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => firebaseDataTransformers.firestoreToTransaction(doc));
    } catch (error) {
        logger.error('Failed to get transactions', { userId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    getUserTransactions: async (userId: string, limitCount: number = 50): Promise<Transaction[]> => {
      try {
        // Get transactions where user is the sender
        const sentQuery = query(
          collection(db, 'transactions'),
          where('from_user', '==', userId),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
        
        // Get transactions where user is the recipient
        const receivedQuery = query(
          collection(db, 'transactions'),
          where('to_user', '==', userId),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );

        // Execute both queries in parallel
        const [sentSnapshot, receivedSnapshot] = await Promise.all([
          getDocs(sentQuery),
          getDocs(receivedQuery)
        ]);

        // Combine and transform results
        const sentTransactions = sentSnapshot.docs.map(doc => firebaseDataTransformers.firestoreToTransaction(doc));
        const receivedTransactions = receivedSnapshot.docs.map(doc => firebaseDataTransformers.firestoreToTransaction(doc));

        // Combine all transactions and sort by creation date
        const allTransactions = [...sentTransactions, ...receivedTransactions];
        allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Limit to requested count
        return allTransactions.slice(0, limitCount);
      } catch (error) {
        logger.error('Failed to get user transactions', { userId, error }, 'FirebaseDataService');
        throw error;
      }
    },

    createTransaction: async (transactionData: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> => {
      try {
        const transactionRef = await addDoc(collection(db, 'transactions'), {
          ...firebaseDataTransformers.transactionToFirestore(transactionData),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        const createdTransaction = await firebaseDataService.transaction.getTransactionById(transactionRef.id);
        logger.info('Transaction created successfully', { transactionId: transactionRef.id }, 'FirebaseDataService');
        return createdTransaction;
    } catch (error) {
        logger.error('Failed to create transaction', { transactionData, error }, 'FirebaseDataService');
      throw error;
    }
  },

    getTransactionById: async (transactionId: string): Promise<Transaction> => {
      try {
        const transactionDoc = await getDoc(doc(db, 'transactions', transactionId));
        if (!transactionDoc.exists()) {
          throw new Error('Transaction not found');
        }
        return firebaseDataTransformers.firestoreToTransaction(transactionDoc);
    } catch (error) {
        logger.error('Failed to get transaction by ID', { transactionId, error }, 'FirebaseDataService');
      throw error;
    }
  },

    updateTransaction: async (transactionId: string, updates: Partial<Transaction>): Promise<Transaction> => {
      try {
        const transactionRef = doc(db, 'transactions', transactionId);
        await updateDoc(transactionRef, firebaseDataTransformers.transactionToFirestore(updates as any));
        
        const updatedTransaction = await firebaseDataService.transaction.getTransactionById(transactionId);
        logger.info('Transaction updated successfully', { transactionId }, 'FirebaseDataService');
        return updatedTransaction;
        } catch (error) {
        logger.error('Failed to update transaction', { transactionId, updates, error }, 'FirebaseDataService');
      throw error;
    }
  },

    deleteTransaction: async (transactionId: string): Promise<void> => {
      try {
        await deleteDoc(doc(db, 'transactions', transactionId));
        logger.info('Transaction deleted successfully', { transactionId }, 'FirebaseDataService');
    } catch (error) {
        logger.error('Failed to delete transaction', { transactionId, error }, 'FirebaseDataService');
      throw error;
    }
    }
  },

  // Linked Wallet operations
  linkedWallet: {
    getLinkedWallets: async (userId: string): Promise<any[]> => {
      try {
        logger.info('Getting linked wallets for user', { userId }, 'FirebaseDataService');
        
        // Try both collection structures - first check main collection since that's where data is stored
        let querySnapshot;
        try {
          // First try: main collection with userId filter (where data is actually stored)
          const q = query(
            collection(db, 'linkedWallets'),
            where('userId', '==', userId)
          );
          querySnapshot = await getDocs(q);
          console.log('Tried main collection approach:', {
            size: querySnapshot.size,
            empty: querySnapshot.empty,
            docs: querySnapshot.docs.length
          });
        } catch (mainCollectionError) {
          console.log('Main collection approach failed, trying subcollection:', mainCollectionError);
          // Fallback: subcollection under user document
          const subcollectionRef = collection(db, 'users', userId, 'externalWallets');
          querySnapshot = await getDocs(subcollectionRef);
        }
        
        console.log('Firebase query snapshot:', {
          size: querySnapshot.size,
          empty: querySnapshot.empty,
          docs: querySnapshot.docs.length
        });
        
        const linkedWallets = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Firebase doc data:', doc.id, data);
          return {
            id: doc.id,
            ...data
          };
        });
        
        console.log('Raw linked wallets from Firebase:', linkedWallets);
        
        // Sort in memory instead of in Firestore
        linkedWallets.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt || 0;
          const bTime = b.createdAt?.seconds || b.createdAt || 0;
          return bTime - aTime; // Descending order
        });
        
        console.log('Sorted linked wallets:', linkedWallets);
        
        logger.info('Linked wallets retrieved successfully', { 
          userId, 
          count: linkedWallets.length,
          wallets: linkedWallets.map(w => ({ id: w.id, type: w.type, label: w.label }))
        }, 'FirebaseDataService');
        
        return linkedWallets;
      } catch (error) {
        logger.error('Failed to get linked wallets', { userId, error }, 'FirebaseDataService');
        return [];
      }
    },

    addLinkedWallet: async (userId: string, walletData: any): Promise<{ success: boolean; walletId?: string; error?: string }> => {
      try {
        logger.info('Adding linked wallet', { userId, type: walletData.type }, 'FirebaseDataService');
        
        const docRef = await addDoc(collection(db, 'linkedWallets'), {
          ...walletData,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        logger.info('Linked wallet added successfully', { userId, walletId: docRef.id }, 'FirebaseDataService');
        return {
          success: true,
          walletId: docRef.id
        };
      } catch (error) {
        logger.error('Failed to add linked wallet', { userId, error }, 'FirebaseDataService');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add linked wallet'
        };
      }
    },

    removeLinkedWallet: async (userId: string, walletId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        logger.info('Removing linked wallet', { userId, walletId }, 'FirebaseDataService');
        
        await deleteDoc(doc(db, 'linkedWallets', walletId));
        
        logger.info('Linked wallet removed successfully', { userId, walletId }, 'FirebaseDataService');
        return { success: true };
      } catch (error) {
        logger.error('Failed to remove linked wallet', { userId, walletId, error }, 'FirebaseDataService');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove linked wallet'
        };
      }
    },

    updateLinkedWallet: async (walletId: string, updates: any): Promise<{ success: boolean; error?: string }> => {
      try {
        logger.info('Updating linked wallet', { walletId }, 'FirebaseDataService');
        
        const walletRef = doc(db, 'linkedWallets', walletId);
        await updateDoc(walletRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
        
        logger.info('Linked wallet updated successfully', { walletId }, 'FirebaseDataService');
        return { success: true };
      } catch (error) {
        logger.error('Failed to update linked wallet', { walletId, error }, 'FirebaseDataService');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update linked wallet'
        };
      }
    }
  },

  // Split operations (placeholder for future implementation)
  split: {
    // TODO: Implement split operations when needed
    acceptSplitInvitation: async (splitId: string, userId: string): Promise<any> => {
      logger.info('Split invitation acceptance not yet implemented', { splitId, userId }, 'FirebaseDataService');
      throw new Error('Split operations not yet implemented');
    }
  }
};

export default firebaseDataService;