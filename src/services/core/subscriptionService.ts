/**
 * Subscription Service
 * Handles premium subscription functionality
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number; // in days
  features: string[];
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  autoRenew: boolean;
}

class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  public async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    // Mock implementation
    return [
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        price: 9.99,
        currency: 'USD',
        duration: 30,
        features: ['Unlimited transactions', 'Priority support', 'Advanced analytics']
      },
      {
        id: 'premium_yearly',
        name: 'Premium Yearly',
        price: 99.99,
        currency: 'USD',
        duration: 365,
        features: ['Unlimited transactions', 'Priority support', 'Advanced analytics', '2 months free']
      }
    ];
  }

  public async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    // Mock implementation
    return null;
  }

  public async createSubscription(userId: string, planId: string): Promise<UserSubscription> {
    // Mock implementation
    throw new Error('Subscription creation not implemented');
  }

  public async cancelSubscription(subscriptionId: string): Promise<boolean> {
    // Mock implementation
    return false;
  }

  public async isUserPremium(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return subscription?.isActive || false;
  }
}

export const subscriptionService = SubscriptionService.getInstance();
export default subscriptionService;