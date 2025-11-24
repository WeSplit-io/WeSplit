/**
 * SPEND Webhook Service
 * Handles webhook notifications to SPEND when payments are sent
 */

import { SpendWebhookPayload, SpendWebhookResponse, SPEND_CONFIG } from './SpendTypes';
import { SpendPaymentModeService } from './SpendPaymentModeService';
import { logger } from '../../analytics/loggingService';

export class SpendWebhookService {
  /**
   * Call SPEND webhook endpoint
   * Implements retry logic with exponential backoff
   * Does not fail payment if webhook fails (payment is on-chain)
   * 
   * @param payload - Webhook payload matching SPEND's format
   * @param webhookUrl - SPEND's webhook endpoint URL
   * @param webhookSecret - Authentication token for webhook
   * @returns Webhook response or null if all retries failed
   */
  static async callSpendWebhook(
    payload: SpendWebhookPayload,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<SpendWebhookResponse | null> {
    const maxRetries = SPEND_CONFIG.webhookRetryAttempts;
    const retryDelays = SPEND_CONFIG.webhookRetryDelays;

    logger.info('Calling SPEND webhook', {
      orderId: payload.order_id,
      splitId: payload.split_id,
      amount: payload.amount,
      currency: payload.currency,
      webhookUrl,
    }, 'SpendWebhookService');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create timeout signal for React Native compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhookSecret}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          logger.warn('SPEND webhook returned error status', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            attempt: attempt + 1,
            orderId: payload.order_id,
          }, 'SpendWebhookService');

          // If it's a client error (4xx), don't retry
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Webhook rejected: ${response.status} ${response.statusText}`);
          }

          // For server errors (5xx), retry
          if (attempt < maxRetries - 1) {
            const waitTime = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
            logger.info('Retrying SPEND webhook after delay', {
              waitTime,
              attempt: attempt + 1,
              maxRetries,
              orderId: payload.order_id,
            }, 'SpendWebhookService');
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(`Webhook failed after ${maxRetries} attempts: ${response.status} ${response.statusText}`);
        }

        const data: SpendWebhookResponse = await response.json();

        logger.info('SPEND webhook called successfully', {
          orderId: payload.order_id,
          response: data,
          attempt: attempt + 1,
        }, 'SpendWebhookService');

        return data;

      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('SPEND webhook call failed', {
          error: errorMessage,
          attempt: attempt + 1,
          maxRetries,
          orderId: payload.order_id,
          isLastAttempt,
        }, 'SpendWebhookService');

        if (isLastAttempt) {
          // Don't throw - webhook failure shouldn't fail the payment
          // Payment is already on-chain, webhook is just a notification
          logger.warn('SPEND webhook failed after all retries, but payment was successful', {
            orderId: payload.order_id,
            error: errorMessage,
          }, 'SpendWebhookService');
          return null;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return null;
  }

  /**
   * Build webhook payload from split and transaction data
   * @param split - The split that was paid
   * @param transactionSignature - Transaction signature from payment
   * @param amount - Amount paid
   * @param currency - Currency used
   * @returns Webhook payload matching SPEND's format
   */
  static buildWebhookPayload(
    split: any,
    transactionSignature: string,
    amount: number,
    currency: 'SOL' | 'USDC' | 'BONK'
  ): SpendWebhookPayload {
    // Validate inputs
    if (!split || !split.id) {
      throw new Error('Split is required and must have an id');
    }
    
    if (!transactionSignature || typeof transactionSignature !== 'string') {
      throw new Error('Transaction signature is required and must be a string');
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    
    if (!['SOL', 'USDC', 'BONK'].includes(currency)) {
      throw new Error('Currency must be SOL, USDC, or BONK');
    }

    // Extract participant wallet addresses (sanitized)
    const participants = (split.participants || [])
      .map((p: any) => p.walletAddress || p.wallet_address)
      .filter((addr: string | undefined) => addr && typeof addr === 'string' && addr.trim() !== '')
      .map((addr: string) => addr.trim()) || [];

    // Use centralized utility to extract orderId
    const orderId = SpendPaymentModeService.getOrderId(split) || '';
    
    if (!orderId) {
      logger.warn('No order ID found in split for webhook payload', {
        splitId: split.id,
      }, 'SpendWebhookService');
    }

    const payload: SpendWebhookPayload = {
      order_id: String(orderId),
      split_id: String(split.id),
      transaction_signature: String(transactionSignature),
      amount: Number(amount),
      currency,
      participants,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
    
    // Validate payload matches SP3ND expected format
    if (!payload.order_id || payload.order_id.trim() === '') {
      throw new Error('Order ID is required in webhook payload');
    }
    
    return payload;
  }
}

