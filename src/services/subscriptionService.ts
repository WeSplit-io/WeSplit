// Removed apiRequest import - using stub functions instead

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
  // Stub function - subscription plans not implemented yet
  if (__DEV__) { console.log('💰 Subscription: Plans not implemented yet'); }
  
  return [
    {
      id: 1,
      name: 'Basic Plan',
      price: 9.99,
      currency: 'USD',
      interval: 'monthly',
      features: ['Basic features'],
      description: 'Basic subscription plan'
    }
  ];
}

  // Get user's current subscription
export async function getUserSubscription(userId: number): Promise<UserSubscription | null> {
    // Stub function - subscription not implemented yet
    if (__DEV__) { console.log('💰 Subscription: User subscription not implemented yet'); }
    return null; // No subscription found
  }

  // Create a new subscription
export async function createSubscription(userId: number, planId: number, paymentMethod: string): Promise<UserSubscription> {
    // Stub function - subscription creation not implemented yet
    if (__DEV__) { console.log('💰 Subscription: Creation not implemented yet'); }
    throw new Error('Subscription creation not implemented yet');
  }

// Cancel a subscription
export async function cancelSubscription(userId: number): Promise<{ message: string }> {
    // Stub function - subscription cancellation not implemented yet
    if (__DEV__) { console.log('💰 Subscription: Cancellation not implemented yet'); }
    return { message: 'Subscription cancellation not implemented yet' };
  }

// Reactivate a cancelled subscription
export async function reactivateSubscription(userId: number): Promise<{ message: string }> {
    // Stub function - subscription reactivation not implemented yet
    if (__DEV__) { console.log('💰 Subscription: Reactivation not implemented yet'); }
    return { message: 'Subscription reactivation not implemented yet' };
  }

// Process crypto payment for subscription
export async function processCryptoPayment(data: CryptoPaymentData): Promise<{ success: boolean; subscriptionId: number; message: string }> {
    // Stub function - crypto payment not implemented yet
    if (__DEV__) { console.log('💰 Subscription: Crypto payment not implemented yet'); }
    throw new Error('Crypto payment not implemented yet');
  }

// Validate subscription status
export async function validateSubscription(userId: number): Promise<UserSubscription> {
    // Stub function - subscription validation not implemented yet
    if (__DEV__) { console.log('💰 Subscription: Validation not implemented yet'); }
    throw new Error('Subscription validation not implemented yet');
  }

  // Get subscription history
export async function getSubscriptionHistory(userId: number): Promise<UserSubscription[]> {
    // Stub function - subscription history not implemented yet
    if (__DEV__) { console.log('💰 Subscription: History not implemented yet'); }
    return [];
  }