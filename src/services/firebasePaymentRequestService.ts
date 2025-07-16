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
import { db } from '../config/firebase';
import { sendNotification } from './firebaseNotificationService';

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
    if (__DEV__) { console.log('🔥 Creating payment request:', { senderId, recipientId, amount, currency, description, groupId }); }
    
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
    await sendNotification(
      recipientId,
      'Payment Request',
      `${senderName} has requested ${amount} ${currency}${description ? ` for ${description}` : ''}`,
      'payment_request',
      {
        requestId: paymentRequest.id,
        senderId: String(senderId),
        senderName,
        amount,
        currency,
        description,
        groupId: groupId ? String(groupId) : '',
        status: 'pending'
      }
    );
    
    if (__DEV__) { console.log('🔥 Payment request created successfully:', paymentRequest); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error creating payment request:', error); }
    throw error;
  }
}

// Get payment requests for a user (received)
export async function getReceivedPaymentRequests(userId: string | number, limitCount: number = 50): Promise<PaymentRequest[]> {
  try {
    if (__DEV__) { console.log('🔥 Getting received payment requests for user:', userId); }
    
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
    
    if (__DEV__) { console.log('🔥 Retrieved received payment requests:', requests.length); }
    
    return requests;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error fetching received payment requests:', error); }
    throw error;
  }
}

// Get payment requests sent by a user
export async function getSentPaymentRequests(userId: string | number, limitCount: number = 50): Promise<PaymentRequest[]> {
  try {
    if (__DEV__) { console.log('🔥 Getting sent payment requests for user:', userId); }
    
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
    
    if (__DEV__) { console.log('🔥 Retrieved sent payment requests:', requests.length); }
    
    return requests;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error fetching sent payment requests:', error); }
    throw error;
  }
}

// Accept a payment request
export async function acceptPaymentRequest(requestId: string): Promise<PaymentRequest> {
  try {
    if (__DEV__) { console.log('🔥 Accepting payment request:', requestId); }
    
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'accepted',
      updated_at: serverTimestamp()
    });
    
    // Get the updated document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to sender
    await sendNotification(
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
    
    if (__DEV__) { console.log('🔥 Payment request accepted successfully:', paymentRequest); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error accepting payment request:', error); }
    throw error;
  }
}

// Reject a payment request
export async function rejectPaymentRequest(requestId: string, reason?: string): Promise<PaymentRequest> {
  try {
    if (__DEV__) { console.log('🔥 Rejecting payment request:', requestId); }
    
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      updated_at: serverTimestamp()
    });
    
    // Get the updated document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to sender
    await sendNotification(
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
    
    if (__DEV__) { console.log('🔥 Payment request rejected successfully:', paymentRequest); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error rejecting payment request:', error); }
    throw error;
  }
}

// Cancel a payment request (by sender)
export async function cancelPaymentRequest(requestId: string): Promise<PaymentRequest> {
  try {
    if (__DEV__) { console.log('🔥 Cancelling payment request:', requestId); }
    
    const requestRef = doc(db, 'paymentRequests', requestId);
    await updateDoc(requestRef, {
      status: 'cancelled',
      updated_at: serverTimestamp()
    });
    
    // Get the updated document
    const requestDoc = await getDoc(requestRef);
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    // Send notification to recipient
    await sendNotification(
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
    
    if (__DEV__) { console.log('🔥 Payment request cancelled successfully:', paymentRequest); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error cancelling payment request:', error); }
    throw error;
  }
}

// Get a specific payment request by ID
export async function getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
  try {
    if (__DEV__) { console.log('🔥 Getting payment request:', requestId); }
    
    const requestDoc = await getDoc(doc(db, 'paymentRequests', requestId));
    
    if (!requestDoc.exists()) {
      if (__DEV__) { console.log('🔥 Payment request not found:', requestId); }
      return null;
    }
    
    const paymentRequest = paymentRequestTransformers.firestoreToPaymentRequest(requestDoc);
    
    if (__DEV__) { console.log('🔥 Retrieved payment request:', paymentRequest); }
    
    return paymentRequest;
  } catch (error) {
    if (__DEV__) { console.error('🔥 Error getting payment request:', error); }
    throw error;
  }
}

// Get pending payment requests count for a user
export async function getPendingPaymentRequestsCount(userId: string | number): Promise<number> {
  try {
    if (__DEV__) { console.log('🔥 Getting pending payment requests count for user:', userId); }
    
    const requestsRef = collection(db, 'paymentRequests');
    const pendingQuery = query(
      requestsRef,
      where('recipientId', '==', String(userId)),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(pendingQuery);
    const count = querySnapshot.docs.length;
    
    if (__DEV__) { console.log('🔥 Pending payment requests count:', count); }
    
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