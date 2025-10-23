/**
 * Firebase-based payment request service for WeSplit
 * Handles payment requests between users
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { notificationService } from '../notifications/notificationService';
import { logger } from '../analytics/loggingService';
import { createPaymentRequestNotificationData } from '../notifications/notificationDataUtils';
// import { validateNotificationData } from '../notifications/notificationValidation';

export interface PaymentRequest { 
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  description?: string;
  groupId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  senderName?: string;
  recipientName?: string;
}

// Data transformation utilities
const paymentRequestTransformers = {
  // Transform Firestore document to PaymentRequest
  firestoreToPaymentRequest: (doc: any): PaymentRequest => ({
    id: doc.id,
    senderId: doc.data().senderId || '',
    recipientId: doc.data().recipientId || '',
    amount: doc.data().amount || 0,
    currency: doc.data().currency || 'USDC',
    description: doc.data().description || '',
    groupId: doc.data().groupId || '',
    status: doc.data().status || 'pending',
    created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    senderName: doc.data().senderName || '',
    recipientName: doc.data().recipientName || ''
  }),

  // Transform PaymentRequest to Firestore data
  paymentRequestToFirestore: (request: Omit<PaymentRequest, 'id' | 'created_at' | 'updated_at'>): any => ({
    senderId: request.senderId,
    recipientId: request.recipientId,
    amount: request.amount,
    currency: request.currency,
    description: request.description || '',
    groupId: request.groupId || '',
    status: request.status,
    senderName: request.senderName || '',
    recipientName: request.recipientName || '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  })
};

// Create a new payment request
export async function createPaymentRequest(
  senderId: string | number,
  recipientId: string | number,
  amount: number,
  currency: string = 'USDC',
  description?: string,
  groupId?: string | number
): Promise<PaymentRequest> {
  try {
    if (__DEV__) { logger.info('Creating payment request', { senderId, recipientId, amount, currency, description, groupId }, 'firebasePaymentRequestService'); }
    
    // Get sender and recipient names
    const [senderDoc, recipientDoc] = await Promise.all([
      getDoc(doc(db, 'users', String(senderId))),
      getDoc(doc(db, 'users', String(recipientId)))
    ]);
    
    const senderName = senderDoc.exists() ? (senderDoc.data().name || senderDoc.data().email || 'Unknown') : 'Unknown';
    const recipientName = recipientDoc.exists() ? (recipientDoc.data().name || recipientDoc.data().email || 'Unknown') : 'Unknown';
    
    const requestData = paymentRequestTransformers.paymentRequestToFirestore({
      senderId: String(senderId),
      recipientId: String(recipientId),
      amount,
      currency,
      description: description || '',
      groupId: groupId ? String(groupId) : '',
      status: 'pending',
      senderName,
      recipientName
    });

    const requestRef = await addDoc(collection(db, 'paymentRequests'), requestData);
    
    // Get the created document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to recipient
    try {
      // Validate recipient exists before sending notification
      const recipientDoc = await getDoc(doc(db, 'users', String(recipientId)));
      if (!recipientDoc.exists()) {
        logger.warn('Recipient user not found, skipping notification', { recipientId }, 'firebasePaymentRequestService');
      } else {
        // Create standardized notification data
        const notificationData = createPaymentRequestNotificationData(
          String(senderId),
          senderName,
          String(recipientId),
          amount,
          currency,
          description,
          groupId ? String(groupId) : undefined,
          paymentRequest.id
        );

        // Validate notification data
        // const validation = validateNotificationData(notificationData, 'payment_request');
        // if (!validation.isValid) {
        //   logger.error('Invalid notification data for payment request', { 
        //     errors: validation.errors,
        //     notificationData 
        //   }, 'firebasePaymentRequestService');
        //   throw new Error(`Invalid notification data: ${validation.errors.join(', ')}`);
        // }

        await notificationService.sendNotification(
          String(recipientId),
          'Payment Request',
          `${senderName} has requested ${amount} ${currency}${description ? ` for ${description}` : ''}`,
          'payment_request',
          notificationData
        );
        logger.info('Payment request notification sent successfully', { 
          recipientId: String(recipientId), 
          senderId: String(senderId),
          amount,
          currency 
        }, 'firebasePaymentRequestService');
      }
    } catch (notificationError) {
      logger.error('Failed to send payment request notification', { 
        error: notificationError, 
        recipientId: String(recipientId),
        senderId: String(senderId)
      }, 'firebasePaymentRequestService');
      // Don't throw - payment request was created successfully, notification failure shouldn't break the flow
    }
    
    if (__DEV__) { logger.info('Payment request created successfully', { paymentRequest }, 'firebasePaymentRequestService'); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error creating payment request:', error); }
    throw error;
  }
}

// Get payment requests for a user (received)
export async function getReceivedPaymentRequests(userId: string | number, limitCount: number = 50): Promise<PaymentRequest[]> {
  try {
    // Removed excessive logging for cleaner console
    
    const requestsRef = collection(db, 'paymentRequests');
    const requestsQuery = query(
      requestsRef,
      where('recipientId', '==', String(userId)),
      where('status', '==', 'pending'),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(requestsQuery);
    const requests = querySnapshot.docs.map(doc => 
      paymentRequestTransformers.firestoreToPaymentRequest(doc)
    );
    
    // Removed excessive logging for cleaner console
    
    return requests;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error fetching received payment requests:', error); }
    throw error;
  }
}

// Get payment requests sent by a user
export async function getSentPaymentRequests(userId: string | number, limitCount: number = 50): Promise<PaymentRequest[]> {
  try {
    // Removed excessive logging for cleaner console
    
    const requestsRef = collection(db, 'paymentRequests');
    const requestsQuery = query(
      requestsRef,
      where('senderId', '==', String(userId)),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(requestsQuery);
    const requests = querySnapshot.docs.map(doc => 
      paymentRequestTransformers.firestoreToPaymentRequest(doc)
    );
    
    // Removed excessive logging for cleaner console
    
    return requests;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error fetching sent payment requests:', error); }
    throw error;
  }
}

// Accept a payment request
export async function acceptPaymentRequest(requestId: string): Promise<PaymentRequest> {
  try {
    if (__DEV__) { logger.info('Accepting payment request', { requestId }, 'firebasePaymentRequestService'); }
    
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'accepted',
      updated_at: serverTimestamp()
    });
    
    // Get the updated document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to sender
    await notificationService.sendNotification(
      paymentRequest.senderId,
      'Payment Request Accepted',
      `${paymentRequest.recipientName} has accepted your payment request for ${paymentRequest.amount} ${paymentRequest.currency}`,
      'payment_request',
      {
        requestId: paymentRequest.id,
        recipientId: paymentRequest.recipientId,
        recipientName: paymentRequest.recipientName,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'accepted'
      }
    );
    
    if (__DEV__) { logger.info('Payment request accepted successfully', { paymentRequest }, 'firebasePaymentRequestService'); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error accepting payment request:', error); }
    throw error;
  }
}

// Reject a payment request
export async function rejectPaymentRequest(requestId: string, reason?: string): Promise<PaymentRequest> {
  try {
    if (__DEV__) { logger.info('Rejecting payment request', { requestId }, 'firebasePaymentRequestService'); }
    
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      updated_at: serverTimestamp()
    });
    
    // Get the updated document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to sender
    await notificationService.sendNotification(
      paymentRequest.senderId,
      'Payment Request Rejected',
      `${paymentRequest.recipientName} has rejected your payment request for ${paymentRequest.amount} ${paymentRequest.currency}${reason ? `: ${reason}` : ''}`,
      'payment_request',
      {
        requestId: paymentRequest.id,
        recipientId: paymentRequest.recipientId,
        recipientName: paymentRequest.recipientName,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'rejected',
        reason
      }
    );
    
    if (__DEV__) { logger.info('Payment request rejected successfully', { paymentRequest }, 'firebasePaymentRequestService'); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error rejecting payment request:', error); }
    throw error;
  }
}

// Cancel a payment request (by sender)
export async function cancelPaymentRequest(requestId: string): Promise<PaymentRequest> {
  try {
    if (__DEV__) { logger.info('Cancelling payment request', { requestId }, 'firebasePaymentRequestService'); }
    
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'cancelled',
      updated_at: serverTimestamp()
    });
    
    // Get the updated document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to recipient
    await notificationService.sendNotification(
      paymentRequest.recipientId,
      'Payment Request Cancelled',
      `${paymentRequest.senderName} has cancelled their payment request for ${paymentRequest.amount} ${paymentRequest.currency}`,
      'payment_request',
      {
        requestId: paymentRequest.id,
        senderId: paymentRequest.senderId,
        senderName: paymentRequest.senderName,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'cancelled'
      }
    );
    
    if (__DEV__) { logger.info('Payment request cancelled successfully', { paymentRequest }, 'firebasePaymentRequestService'); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error cancelling payment request:', error); }
    throw error;
  }
}

// Get a specific payment request by ID
export async function getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
  try {
    
    const requestDoc = await getDoc(doc(db, 'paymentRequests', requestId));
    
    if (!requestDoc.exists()) {
      if (__DEV__) { logger.warn('Payment request not found', { requestId }, 'firebasePaymentRequestService'); }
      return null;
    }
    
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error getting payment request:', error); }
    throw error;
  }
}

// Get pending payment requests count for a user
export async function getPendingPaymentRequestsCount(userId: string | number): Promise<number> {
  try {
    
    const requestsRef = collection(db, 'paymentRequests');
    const pendingQuery = query(
      requestsRef,
      where('recipientId', '==', String(userId)),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(pendingQuery);
    const count = querySnapshot.docs.length;
    
    
    return count;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error getting pending payment requests count:', error); }
    throw error;
  }
}

// Export the service object for consistency with other services
export const firebasePaymentRequestService = {
  createPaymentRequest,
  getReceivedPaymentRequests,
  getSentPaymentRequests,
  acceptPaymentRequest,
  rejectPaymentRequest,
  cancelPaymentRequest,
  getPaymentRequest,
  getPendingPaymentRequestsCount
}; 