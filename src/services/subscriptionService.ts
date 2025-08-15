import { apiRequest } from '../config/api';

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  description: string;
  isPopular?: boolean;
  isRecommended?: boolean;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_method: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface CryptoPaymentData {
  userId: number;
  planId: number;
  paymentMethod: string;
  amount: number;
  currency: string;
  transactionSignature: string;
}

// Get all available subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    return await apiRequest<SubscriptionPlan[]>('/api/subscription/plans');
  } catch (e) {
    console.error('Error fetching subscription plans:', e);
    throw e;
  }
  }

  // Get user's current subscription
export async function getUserSubscription(userId: number): Promise<UserSubscription | null> {
    try {
    return await apiRequest<UserSubscription>(`/api/subscription/${userId}`);
  } catch (e: any) {
    if (e.message && e.message.includes('404')) {
        return null; // No subscription found
      }
      console.error('Error fetching user subscription:', e);
      throw e;
    }
  }

  // Create a new subscription
export async function createSubscription(userId: number, planId: number, paymentMethod: string): Promise<UserSubscription> {
    try {
    return await apiRequest<UserSubscription>('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      body: JSON.stringify({
        userId,
        planId,
        paymentMethod
      }),
      });
    } catch (e) {
      console.error('Error creating subscription:', e);
      throw e;
    }
  }

// Cancel a subscription
export async function cancelSubscription(userId: number): Promise<{ message: string }> {
    try {
    return await apiRequest<{ message: string }>(`/api/subscription/${userId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (e) {
      console.error('Error cancelling subscription:', e);
      throw e;
    }
  }

// Reactivate a cancelled subscription
export async function reactivateSubscription(userId: number): Promise<{ message: string }> {
    try {
    return await apiRequest<{ message: string }>(`/api/subscription/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
    });
    } catch (e) {
      console.error('Error reactivating subscription:', e);
      throw e;
    }
  }

// Process crypto payment for subscription
export async function processCryptoPayment(data: CryptoPaymentData): Promise<{ success: boolean; subscriptionId: number; message: string }> {
  try {
    return await apiRequest<{ success: boolean; subscriptionId: number; message: string }>('/api/subscription/crypto-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      body: JSON.stringify(data),
      });
    } catch (e) {
      console.error('Error processing crypto payment:', e);
      throw e;
    }
  }

// Validate subscription status
export async function validateSubscription(userId: number): Promise<UserSubscription> {
    try {
    return await apiRequest<UserSubscription>(`/api/subscription/${userId}/validate`);
    } catch (e) {
      console.error('Error validating subscription:', e);
      throw e;
    }
  }

  // Get subscription history
export async function getSubscriptionHistory(userId: number): Promise<UserSubscription[]> {
    try {
    return await apiRequest<UserSubscription[]>(`/api/subscription/${userId}/history`);
    } catch (e) {
      console.error('Error fetching subscription history:', e);
      throw e;
    }
  }