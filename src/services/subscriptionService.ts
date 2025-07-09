const BACKEND_URL = 'http://192.168.1.75:4000';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  description: string;
  isPopular?: boolean;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  payment_method?: string;
  plan?: SubscriptionPlan;
  plan_name?: string; // Added for backend join queries
  price?: number;
  currency?: string;
  interval?: 'monthly' | 'yearly';
  features?: string[];
  description?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'crypto' | 'card' | 'paypal';
  name: string;
  icon: string;
  enabled: boolean;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  isPremium: boolean;
  isEnabled: boolean;
}

// Available subscription plans
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 4.99,
    currency: 'USD',
    interval: 'monthly',
    description: 'Monthly premium subscription',
    features: [
      'Advanced Analytics',
      'Unlimited Groups',
      'Enhanced Security',
      'Export Reports',
      'Priority Support',
      'Faster Transactions'
    ]
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 49.99,
    currency: 'USD',
    interval: 'yearly',
    description: 'Yearly premium subscription (2 months free)',
    features: [
      'Advanced Analytics',
      'Unlimited Groups',
      'Enhanced Security',
      'Export Reports',
      'Priority Support',
      'Faster Transactions',
      'Early Access to New Features'
    ],
    isPopular: true
  }
];

// Available payment methods
const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'crypto_usdc',
    type: 'crypto',
    name: 'USDC (Solana)',
    icon: 'dollar-sign',
    enabled: true
  },
  {
    id: 'crypto_sol',
    type: 'crypto',
    name: 'SOL',
    icon: 'zap',
    enabled: true
  },
  {
    id: 'card',
    type: 'card',
    name: 'Credit/Debit Card',
    icon: 'credit-card',
    enabled: false // Disabled for now
  },
  {
    id: 'paypal',
    type: 'paypal',
    name: 'PayPal',
    icon: 'dollar-sign',
    enabled: false // Disabled for now
  }
];

// Premium features configuration
const PREMIUM_FEATURES: SubscriptionFeature[] = [
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed spending insights and expense trends',
    icon: 'bar-chart',
    isPremium: true,
    isEnabled: true
  },
  {
    id: 'unlimited_groups',
    name: 'Unlimited Groups',
    description: 'Create and manage unlimited expense groups',
    icon: 'users',
    isPremium: true,
    isEnabled: true
  },
  {
    id: 'enhanced_security',
    name: 'Enhanced Security',
    description: 'Additional security features and encryption',
    icon: 'shield',
    isPremium: true,
    isEnabled: true
  },
  {
    id: 'export_reports',
    name: 'Export Reports',
    description: 'Export detailed expense reports in PDF format',
    icon: 'download',
    isPremium: true,
    isEnabled: true
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: '24/7 priority customer support',
    icon: 'headphones',
    isPremium: true,
    isEnabled: true
  },
  {
    id: 'faster_transactions',
    name: 'Faster Transactions',
    description: 'Priority processing for all transactions',
    icon: 'zap',
    isPremium: true,
    isEnabled: true
  }
];

export class SubscriptionService {
  // Get available subscription plans
  static getAvailablePlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  // Get available payment methods
  static getAvailablePaymentMethods(): PaymentMethod[] {
    return PAYMENT_METHODS.filter(method => method.enabled);
  }

  // Get premium features
  static getPremiumFeatures(): SubscriptionFeature[] {
    return PREMIUM_FEATURES;
  }

  // Get user's current subscription
  static async getUserSubscription(userId: number): Promise<UserSubscription | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription/${userId}`);
      
      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null; // No subscription found
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscription');
      }
    } catch (e) {
      console.error('Error fetching user subscription:', e);
      throw e;
    }
  }

  // Create a new subscription
  static async createSubscription(data: {
    userId: number;
    planId: string;
    paymentMethod: string;
    paymentDetails?: any;
  }): Promise<UserSubscription> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }
    } catch (e) {
      console.error('Error creating subscription:', e);
      throw e;
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: number, cancelAtPeriodEnd: boolean = true): Promise<{ message: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription/${userId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }
    } catch (e) {
      console.error('Error cancelling subscription:', e);
      throw e;
    }
  }

  // Reactivate subscription
  static async reactivateSubscription(userId: number): Promise<{ message: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }
    } catch (e) {
      console.error('Error reactivating subscription:', e);
      throw e;
    }
  }

  // Check if user has access to a specific feature
  static async hasFeatureAccess(userId: number, featureId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || subscription.status !== 'active') {
        return false;
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id);
      if (!plan) {
        return false;
      }

      const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
      if (!feature) {
        return false;
      }

      return plan.features.includes(feature.name);
    } catch (e) {
      console.error('Error checking feature access:', e);
      return false;
    }
  }

  // Get subscription status
  static async getSubscriptionStatus(userId: number): Promise<{
    isActive: boolean;
    planName?: string;
    expiresAt?: string;
    cancelAtPeriodEnd?: boolean;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return { isActive: false };
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id);
      
      return {
        isActive: subscription.status === 'active',
        planName: plan?.name,
        expiresAt: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    } catch (e) {
      console.error('Error getting subscription status:', e);
      return { isActive: false };
    }
  }

  // Process crypto payment
  static async processCryptoPayment(data: {
    userId: number;
    planId: string;
    paymentMethod: string;
    amount: number;
    currency: string;
    transactionSignature: string;
  }): Promise<{ success: boolean; subscriptionId?: number; message: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription/crypto-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process crypto payment');
      }
    } catch (e) {
      console.error('Error processing crypto payment:', e);
      throw e;
    }
  }

  // Validate subscription and renew if needed
  static async validateAndRenewSubscription(userId: number): Promise<UserSubscription | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription/${userId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate subscription');
      }
    } catch (e) {
      console.error('Error validating subscription:', e);
      throw e;
    }
  }

  // Get subscription history
  static async getSubscriptionHistory(userId: number): Promise<UserSubscription[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription/${userId}/history`);

      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscription history');
      }
    } catch (e) {
      console.error('Error fetching subscription history:', e);
      throw e;
    }
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService; 