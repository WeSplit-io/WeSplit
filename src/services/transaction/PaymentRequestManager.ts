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
  deleteDoc,
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
   * Process a payment request (mark as completed or delete if completed)
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
      
      // First, verify the request exists
      const requestDoc = await getDoc(requestRef);
      if (!requestDoc.exists()) {
        logger.warn('Payment request not found during processing', {
          requestId,
          transactionId,
          status
        }, 'PaymentRequestManager');
        return {
          success: false,
          error: 'Payment request not found'
        };
      }

      const requestData = requestDoc.data();
      logger.info('Found payment request for processing', {
        requestId,
        currentStatus: requestData.status,
        targetStatus: status,
        senderId: requestData.senderId,
        recipientId: requestData.recipientId,
        amount: requestData.amount
      }, 'PaymentRequestManager');
      
      if (status === 'completed') {
        // For completed requests, delete the request from database
        // since the transaction details are now stored in the transactions collection
        await deleteDoc(requestRef);
        
        // Verify deletion was successful
        const verifyDoc = await getDoc(requestRef);
        if (verifyDoc.exists()) {
          logger.error('Payment request still exists after deletion attempt', {
            requestId,
            transactionId
          }, 'PaymentRequestManager');
          return {
            success: false,
            error: 'Failed to delete payment request'
          };
        }
        
        logger.info('Payment request deleted after successful completion', {
          requestId,
          transactionId,
          status
        }, 'PaymentRequestManager');
      } else {
        // For failed/cancelled requests, just update the status
        await updateDoc(requestRef, {
          status,
          transactionId,
          updated_at: serverTimestamp(),
        });
        
        logger.info('Payment request status updated', {
          requestId,
          transactionId,
          status
        }, 'PaymentRequestManager');
      }

      return {
        success: true,
        requestId,
        transactionId
      };

    } catch (error) {
      logger.error('Failed to process payment request', {
        requestId,
        transactionId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }, 'PaymentRequestManager');
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

  /**
   * Cleanup orphaned payment requests (requests that have completed transactions but weren't deleted)
   */
  async cleanupOrphanedRequests(userId: string): Promise<{ cleaned: number; errors: string[] }> {
    try {
      logger.info('Starting cleanup of orphaned payment requests', { userId }, 'PaymentRequestManager');
      
      const { firebaseDataService } = await import('../firebaseDataService');
      
      // Get all payment requests for the user
      const requests = await this.getPaymentRequests(userId);
      const errors: string[] = [];
      let cleaned = 0;
      
      for (const request of requests) {
        try {
          // Check if there's a completed transaction for this request
          const transactions = await firebaseDataService.transaction.getUserTransactions(userId, 100);
          const completedTransaction = transactions.find(tx => 
            tx.tx_hash && 
            (tx.from_user === request.senderId || tx.to_user === request.recipientId) &&
            tx.amount === request.amount &&
            tx.status === 'completed'
          );
          
          if (completedTransaction) {
            logger.info('Found orphaned payment request with completed transaction', {
              requestId: request.id,
              transactionId: completedTransaction.tx_hash,
              amount: request.amount
            }, 'PaymentRequestManager');
            
            // Delete the orphaned request
            const requestRef = doc(db, 'paymentRequests', request.id);
            await deleteDoc(requestRef);
            cleaned++;
            
            logger.info('Cleaned up orphaned payment request', {
              requestId: request.id,
              transactionId: completedTransaction.tx_hash
            }, 'PaymentRequestManager');
          }
        } catch (error) {
          const errorMsg = `Failed to cleanup request ${request.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error('Error during orphaned request cleanup', {
            requestId: request.id,
            error
          }, 'PaymentRequestManager');
        }
      }
      
      logger.info('Completed orphaned payment request cleanup', {
        userId,
        cleaned,
        errors: errors.length
      }, 'PaymentRequestManager');
      
      return { cleaned, errors };
    } catch (error) {
      logger.error('Failed to cleanup orphaned payment requests', error, 'PaymentRequestManager');
      return { cleaned: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }
}
