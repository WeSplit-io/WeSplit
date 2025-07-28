/**
 * Service for handling notification status updates
 * Particularly for payment request status changes
 */

import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface NotificationStatusUpdate {
  notificationId: string;
  status: 'pending' | 'paid' | 'cancelled';
  updatedAt: string;
  updatedBy: string;
}

/**
 * Update notification status in Firestore
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: 'pending' | 'paid' | 'cancelled',
  userId: string
): Promise<void> {
  try {
    if (__DEV__) { 
      console.log('🔥 Updating notification status:', { notificationId, status, userId }); 
    }

    const notificationRef = doc(db, 'notifications', notificationId);
    
    await updateDoc(notificationRef, {
      'data.status': status,
      'data.updatedAt': new Date().toISOString(),
      'data.updatedBy': userId,
    });

    if (__DEV__) { 
      console.log('🔥 Notification status updated successfully'); 
    }
  } catch (error) {
    if (__DEV__) { 
      console.error('🔥 Error updating notification status:', error); 
    }
    throw error;
  }
}

/**
 * Update payment request status
 */
export async function updatePaymentRequestStatus(
  notificationId: string,
  status: 'paid' | 'cancelled',
  userId: string
): Promise<void> {
  return updateNotificationStatus(notificationId, status, userId);
}

/**
 * Update settlement request status
 */
export async function updateSettlementRequestStatus(
  notificationId: string,
  status: 'paid' | 'cancelled',
  userId: string
): Promise<void> {
  return updateNotificationStatus(notificationId, status, userId);
}

/**
 * Mark notification as processed
 */
export async function markNotificationAsProcessed(
  notificationId: string,
  userId: string
): Promise<void> {
  return updateNotificationStatus(notificationId, 'paid', userId);
} 