/**
 * Payment Request Manager
 * Handles payment request creation and processing
 */

import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { logger } from '../core';
import { PaymentRequest, PaymentRequestResult } from './types';

export class PaymentRequestManager {
  /**
   * Create a new payment request
   */
  async createPaymentRequest(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: string,
    description?: string,
    groupId?: string
  ): Promise<PaymentRequestResult> {
    try {
      logger.info('Creating payment request', {
        senderId,
        recipientId,
        amount,
        currency,
        description,
        groupId
      });

      const paymentRequestData = {
        senderId,
        recipientId,
        amount,
        currency,
        description: description || '',
        groupId: groupId || null,
        status: 'pending' as const,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'paymentRequests'), paymentRequestData);

      logger.info('Payment request created successfully', {
        requestId: docRef.id,
        senderId,
        recipientId,
        amount
      });

      return {
        success: true,
        requestId: docRef.id
      };

    } catch (error) {
      logger.error('Failed to create payment request', error, 'PaymentRequestManager');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process a payment request (mark as completed)
   */
  async processPaymentRequest(
    requestId: string,
    transactionId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed'
  ): Promise<PaymentRequestResult> {
    try {
      logger.info('Processing payment request', {
        requestId,
        transactionId,
        status
      });

      const requestRef = doc(db, 'paymentRequests', requestId);
      await updateDoc(requestRef, {
        status,
        transactionId,
        updated_at: serverTimestamp(),
      });

      logger.info('Payment request processed successfully', {
        requestId,
        transactionId,
        status
      });

      return {
        success: true,
        requestId,
        transactionId
      };

    } catch (error) {
      logger.error('Failed to process payment request', error, 'PaymentRequestManager');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get payment requests for a user
   */
  async getPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    try {
      logger.info('Fetching payment requests', { userId });

      // Get requests sent by user
      const sentQuery = query(
        collection(db, 'paymentRequests'),
        where('senderId', '==', userId)
      );

      // Get requests received by user
      const receivedQuery = query(
        collection(db, 'paymentRequests'),
        where('recipientId', '==', userId)
      );

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      const requests: PaymentRequest[] = [];

      // Process sent requests
      sentSnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          senderId: data.senderId,
          recipientId: data.recipientId,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          groupId: data.groupId,
          status: data.status,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });

      // Process received requests
      receivedSnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          senderId: data.senderId,
          recipientId: data.recipientId,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          groupId: data.groupId,
          status: data.status,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });

      // Sort by creation date (newest first)
      requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      logger.info('Payment requests fetched successfully', {
        userId,
        count: requests.length
      });

      return requests;

    } catch (error) {
      logger.error('Failed to fetch payment requests', error, 'PaymentRequestManager');
      return [];
    }
  }
}
