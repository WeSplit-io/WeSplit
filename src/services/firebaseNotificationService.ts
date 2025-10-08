/**
 * Firebase-based notification service for WeSplit
 * Replaces API-based notification service with Firestore operations
 */

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

export interface Notification {
  id: string; // Firebase document ID
  userId: string; // User ID (string for Firebase compatibility)
  user_id?: string | number; // Legacy field for compatibility
  title: string;
  message: string;
  type: 'settlement_request' | 'settlement_notification' | 'funding_notification' | 'payment_request' | 'payment_reminder' | 'general' | 'expense_added' | 'group_invite' | 'split_invite' | 'split_confirmed' | 'payment_received' | 'group_payment_request' | 'group_added' | 'system_warning' | 'system_notification' | 'money_sent' | 'money_received' | 'group_payment_sent' | 'group_payment_received' | 'split_completed' | 'degen_all_locked' | 'degen_ready_to_roll' | 'roulette_result' | 'contact_added' | 'split_spin_available' | 'split_winner' | 'split_loser' | 'split_lock_required';
  data?: any; // Additional data for the notification
  is_read: boolean;
  created_at: string;
}

// Data transformation utilities
const notificationTransformers = {
  // Transform Firestore document to Notification
  firestoreToNotification: (doc: any): Notification => ({
    id: doc.id,
    userId: doc.data().userId || doc.data().user_id || '',
    title: doc.data().title || '',
    message: doc.data().message || '',
    type: doc.data().type || 'general',
    data: doc.data().data || {},
    is_read: doc.data().is_read || doc.data().read || false,
    created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
  }),

  // Transform Notification to Firestore data
  notificationToFirestore: (notification: Omit<Notification, 'id' | 'created_at'>): any => ({
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    data: notification.data || {},
    is_read: notification.is_read,
    created_at: serverTimestamp()
  })
};

// Send notification to a specific user
export async function sendNotification(
  userId: string | number,
  title: string,
  message: string,
  type: Notification['type'],
  data?: any
): Promise<Notification> {
  try {
    console.log('🔥 Sending notification:', { userId, title, message, type, data });
    
    const notificationData = notificationTransformers.notificationToFirestore({
      userId: String(userId),
      title,
      message,
      type,
      data,
      is_read: false
    });

    console.log('🔥 Notification data to save:', notificationData);

    const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log('🔥 Notification document created with ID:', notificationRef.id);
    
    // Get the created document
    const notificationDoc = await getDoc(notificationRef);
    const notification = notificationTransformers.firestoreToNotification(notificationDoc);
    
    console.log('🔥 Notification sent successfully:', notification);
    
    return notification;
  } catch (error) {
    console.error('🔥 Error sending notification:', error);
    throw error;
  }
}

// Send notifications to multiple users
export async function sendNotificationsToUsers(
  userIds: (string | number)[],
  title: string,
  message: string,
  type: Notification['type'],
  data?: any
): Promise<Notification[]> {
  try {
    if (__DEV__) { console.log('🔥 Sending bulk notifications:', { userIds, title, message, type, data }); }
    
    const batch = writeBatch(db);
    const notifications: Notification[] = [];
    
    for (const userId of userIds) {
      const notificationData = notificationTransformers.notificationToFirestore({
        userId: String(userId),
        title,
        message,
        type,
        data,
        is_read: false
      });
      
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, notificationData);
      
      // Create a temporary notification object for return
      notifications.push({
        id: notificationRef.id,
        userId: String(userId),
        title,
        message,
        type,
        data: data || {},
        is_read: false,
        created_at: new Date().toISOString()
      });
    }
    
    await batch.commit();
    
    if (__DEV__) { console.log('🔥 Bulk notifications sent successfully:', notifications.length); }
    
    return notifications;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error sending bulk notifications:', error); }
    throw error;
  }
}

// Get notifications for a user
export async function getUserNotifications(userId: string | number, limitCount: number = 50): Promise<Notification[]> {
  try {
    // Removed excessive logging for cleaner console
    
    const notificationsRef = collection(db, 'notifications');
    
    // Try the main query first
    try {
      const notificationsQuery = query(
        notificationsRef,
        where('userId', '==', String(userId)),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      // Removed excessive logging for cleaner console
      const querySnapshot = await getDocs(notificationsQuery);
      // Removed excessive logging for cleaner console
      
      const notifications = querySnapshot.docs.map(doc => 
        notificationTransformers.firestoreToNotification(doc)
      );
      
      // Removed excessive logging for cleaner console
      
      return notifications;
    } catch (queryError) {
      console.log('🔥 Main query failed, trying fallback query:', queryError);
      
      // Fallback: try without orderBy in case there's no index
      const fallbackQuery = query(
        notificationsRef,
        where('userId', '==', String(userId)),
        limit(limitCount)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const fallbackNotifications = fallbackSnapshot.docs.map(doc => 
        notificationTransformers.firestoreToNotification(doc)
      );
      
      // Sort manually if needed
      fallbackNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('🔥 Fallback query successful, retrieved notifications:', fallbackNotifications.length);
      
      return fallbackNotifications;
    }
  } catch (error) {
    console.error('🔥 Error fetching notifications:', error);
    
    // Return empty array instead of throwing to prevent infinite loading
    console.warn('🔥 Returning empty notifications array due to error:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    if (__DEV__) { console.log('🔥 Marking notification as read:', notificationId); }
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      is_read: true,
      updated_at: serverTimestamp()
    });
    
    if (__DEV__) { console.log('🔥 Notification marked as read successfully'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error marking notification as read:', error); }
    throw error;
  }
}

// Mark multiple notifications as read
export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  try {
    if (__DEV__) { console.log('🔥 Marking multiple notifications as read:', notificationIds.length); }
    
    const batch = writeBatch(db);
    
    for (const notificationId of notificationIds) {
      const notificationRef = doc(db, 'notifications', notificationId);
      batch.update(notificationRef, {
        is_read: true,
        updated_at: serverTimestamp()
      });
    }
    
    await batch.commit();
    
    if (__DEV__) { console.log('🔥 Multiple notifications marked as read successfully'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error marking multiple notifications as read:', error); }
    throw error;
  }
}

// Get unread notification count for a user
export async function getUnreadNotificationCount(userId: string | number): Promise<number> {
  try {
    if (__DEV__) { console.log('🔥 Getting unread notification count for user:', userId); }
    
    const notificationsRef = collection(db, 'notifications');
    const unreadQuery = query(
      notificationsRef,
      where('userId', '==', String(userId)),
      where('is_read', '==', false)
    );
    
    const querySnapshot = await getDocs(unreadQuery);
    const count = querySnapshot.docs.length;
    
    if (__DEV__) { console.log('🔥 Unread notification count:', count); }
    
    return count;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error getting unread notification count:', error); }
    throw error;
  }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    if (__DEV__) { console.log('🔥 Deleting notification:', notificationId); }
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    
    if (__DEV__) { console.log('🔥 Notification deleted successfully'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error deleting notification:', error); }
    throw error;
  }
}

// Delete all notifications for a user
export async function deleteAllNotificationsForUser(userId: string | number): Promise<void> {
  try {
    if (__DEV__) { console.log('🔥 Deleting all notifications for user:', userId); }
    
    const notificationsRef = collection(db, 'notifications');
    const userNotificationsQuery = query(
      notificationsRef,
      where('userId', '==', String(userId))
    );
    
    const querySnapshot = await getDocs(userNotificationsQuery);
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    if (__DEV__) { console.log('🔥 All notifications deleted successfully for user'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error deleting all notifications for user:', error); }
    throw error;
  }
}

// Send settlement request notifications
export async function sendSettlementRequestNotifications(
  groupId: string | number,
  groupName: string,
  requestedBy: { id: string | number; name: string },
  membersWhoOwe: Array<{ id: string | number; name: string; amount: number; currency: string }>,
  membersWhoAdvanced: Array<{ id: string | number; name: string; amount: number; currency: string }>
): Promise<void> {
  try {
    if (__DEV__) { console.log('🔥 Sending settlement request notifications:', { groupId, groupName, requestedBy }); }
    
    // Send notifications to members who owe money
    for (const member of membersWhoOwe) {
      await sendNotification(
        member.id,
        'Settlement Request',
        `${requestedBy.name} has requested settlement for ${groupName}. Please send ${member.amount.toFixed(4)} ${member.currency} to the group wallet.`,
        'settlement_request',
        {
          groupId: String(groupId),
          groupName,
          requestedBy: String(requestedBy.id),
          requestedByName: requestedBy.name,
          amountOwed: member.amount,
          currency: member.currency,
          settlementType: 'payment_required'
        }
      );
    }

    // Send notifications to members who advanced funds
    for (const member of membersWhoAdvanced) {
      await sendNotification(
        member.id,
        'Settlement in Progress',
        `${requestedBy.name} has initiated settlement for ${groupName}. You will receive ${member.amount.toFixed(4)} ${member.currency} once all members contribute to the group wallet.`,
        'settlement_notification',
        {
          groupId: String(groupId),
          groupName,
          requestedBy: String(requestedBy.id),
          requestedByName: requestedBy.name,
          amountToReceive: member.amount,
          currency: member.currency,
          settlementType: 'payment_incoming'
        }
      );
    }
    
    if (__DEV__) { console.log('🔥 Settlement request notifications sent successfully'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error sending settlement notifications:', error); }
    throw error;
  }
}

// Send payment reminder notifications
export async function sendPaymentReminderNotifications(
  groupId: string | number,
  groupName: string,
  sender: { id: string | number; name: string },
  debtors: Array<{ id: string | number; name: string; amount: number; currency: string }>
): Promise<void> {
  try {
    if (__DEV__) { console.log('🔥 Sending payment reminder notifications:', { groupId, groupName, sender, debtorsCount: debtors.length }); }
    
    for (const debtor of debtors) {
      await sendNotification(
        debtor.id,
        'Payment Reminder',
        `${sender.name} is reminding you to settle your debt of ${debtor.amount.toFixed(4)} ${debtor.currency} in ${groupName}.`,
        'payment_reminder',
        {
          groupId: String(groupId),
          groupName,
          senderId: String(sender.id),
          senderName: sender.name,
          amountOwed: debtor.amount,
          currency: debtor.currency
        }
      );
    }
    
    if (__DEV__) { console.log('🔥 Payment reminder notifications sent successfully'); }
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error sending payment reminder notifications:', error); }
    throw error;
  }
}

// Export the service object for consistency with other services
export const firebaseNotificationService = {
  sendNotification,
  sendNotificationsToUsers,
  getUserNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
  deleteAllNotificationsForUser,
  sendSettlementRequestNotifications,
  sendPaymentReminderNotifications
}; 