/**
 * Live Balance Service
 * Provides real-time balance updates for wallets using polling mechanism
 */

import { logger } from '../../analytics/loggingService';
import { consolidatedTransactionService } from '../transaction/ConsolidatedTransactionService';

export interface BalanceUpdate {
  address: string;
  solBalance: number;
  usdcBalance: number;
  timestamp: number;
}

export interface BalanceUpdateCallback {
  (update: BalanceUpdate): void;
}

export interface BalanceSubscription {
  id: string;
  address: string;
  callback: BalanceUpdateCallback;
  lastBalance?: BalanceUpdate;
  isActive: boolean;
}

class LiveBalanceService {
  private subscriptions = new Map<string, BalanceSubscription>();
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 10000; // 10 seconds (reduced frequency)
  private readonly BALANCE_TOLERANCE = 0.000001; // Minimum change to trigger update
  private lastPollTime = 0;
  private readonly MIN_POLL_INTERVAL = 5000; // Minimum 5 seconds between polls

  /**
   * Subscribe to balance updates for a specific address
   */
  subscribe(address: string, callback: BalanceUpdateCallback): string {
    const subscriptionId = `balance_${address}_${Date.now()}`;
    
    logger.info('Subscribing to balance updates', { address, subscriptionId }, 'LiveBalanceService');
    
    const subscription: BalanceSubscription = {
      id: subscriptionId,
      address,
      callback,
      isActive: true
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Start polling if this is the first subscription
    if (this.subscriptions.size === 1) {
      this.startPolling();
    }
    
    // Get initial balance
    this.updateBalanceForSubscription(subscription);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from balance updates
   */
  unsubscribe(subscriptionId: string): void {
    logger.info('Unsubscribing from balance updates', { subscriptionId }, 'LiveBalanceService');
    
    this.subscriptions.delete(subscriptionId);
    
    // Stop polling if no more subscriptions
    if (this.subscriptions.size === 0) {
      this.stopPolling();
    }
  }
  
  /**
   * Unsubscribe all subscriptions for a specific address
   */
  unsubscribeAllForAddress(address: string): void {
    logger.info('Unsubscribing all subscriptions for address', { address }, 'LiveBalanceService');
    
    const subscriptionsToRemove: string[] = [];
    
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.address === address) {
        subscriptionsToRemove.push(id);
      }
    }
    
    subscriptionsToRemove.forEach(id => this.subscriptions.delete(id));
    
    // Stop polling if no more subscriptions
    if (this.subscriptions.size === 0) {
      this.stopPolling();
    }
  }
  
  /**
   * Start polling for balance updates
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }
    
    logger.info('Starting balance polling', { interval: this.POLLING_INTERVAL }, 'LiveBalanceService');
    
    this.pollingInterval = setInterval(() => {
      this.pollBalances();
    }, this.POLLING_INTERVAL);
  }
  
  /**
   * Stop polling for balance updates
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      logger.info('Stopping balance polling', {}, 'LiveBalanceService');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Poll all subscribed addresses for balance updates
   */
  private async pollBalances(): Promise<void> {
    const now = Date.now();
    
    // Debounce polling to prevent excessive calls
    if (now - this.lastPollTime < this.MIN_POLL_INTERVAL) {
      return;
    }
    
    this.lastPollTime = now;
    
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
    
    if (activeSubscriptions.length === 0) {
      return;
    }
    
    logger.debug('Polling balances for subscriptions', { 
      count: activeSubscriptions.length 
    }, 'LiveBalanceService');
    
    // Process subscriptions in batches to avoid overwhelming the RPC
    const batchSize = 5;
    for (let i = 0; i < activeSubscriptions.length; i += batchSize) {
      const batch = activeSubscriptions.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(subscription => this.updateBalanceForSubscription(subscription))
      );
      
      // Small delay between batches to be respectful to RPC
      if (i + batchSize < activeSubscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  /**
   * Update balance for a specific subscription
   */
  private async updateBalanceForSubscription(subscription: BalanceSubscription): Promise<void> {
    try {
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(subscription.address);
      
      if (!balanceResult.success) {
        logger.warn('Failed to get balance for subscription', {
          subscriptionId: subscription.id,
          address: subscription.address,
          error: balanceResult.error
        }, 'LiveBalanceService');
        return;
      }
      
      const currentBalance: BalanceUpdate = {
        address: subscription.address,
        solBalance: 0, // TODO: Add SOL balance fetching
        usdcBalance: balanceResult.balance,
        timestamp: Date.now()
      };
      
      // Check if balance has changed significantly
      const hasChanged = !subscription.lastBalance || 
        Math.abs(currentBalance.usdcBalance - subscription.lastBalance.usdcBalance) > this.BALANCE_TOLERANCE ||
        Math.abs(currentBalance.solBalance - subscription.lastBalance.solBalance) > this.BALANCE_TOLERANCE;
      
      if (hasChanged) {
        logger.info('Balance update detected', {
          subscriptionId: subscription.id,
          address: subscription.address,
          previousUsdcBalance: subscription.lastBalance?.usdcBalance || 0,
          currentUsdcBalance: currentBalance.usdcBalance,
          previousSolBalance: subscription.lastBalance?.solBalance || 0,
          currentSolBalance: currentBalance.solBalance
        }, 'LiveBalanceService');
        
        subscription.lastBalance = currentBalance;
        subscription.callback(currentBalance);
      }
      
    } catch (error) {
      logger.error('Error updating balance for subscription', {
        subscriptionId: subscription.id,
        address: subscription.address,
        error: error instanceof Error ? error.message : String(error)
      }, 'LiveBalanceService');
    }
  }
  
  /**
   * Get current subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
  
  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): BalanceSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }
  
  /**
   * Force update for a specific address
   */
  async forceUpdate(address: string): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.address === address && sub.isActive);
    
    if (subscriptions.length === 0) {
      logger.warn('No active subscriptions found for address', { address }, 'LiveBalanceService');
      return;
    }
    
    logger.info('Forcing balance update for address', { address }, 'LiveBalanceService');
    
    await Promise.allSettled(
      subscriptions.map(subscription => this.updateBalanceForSubscription(subscription))
    );
  }
  
  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    logger.info('Cleaning up live balance service', {}, 'LiveBalanceService');
    
    this.stopPolling();
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const liveBalanceService = new LiveBalanceService();
