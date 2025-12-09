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
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLLING_INTERVAL = 10000; // 10 seconds (reduced frequency)
  private readonly BALANCE_TOLERANCE = 0.000001; // Minimum change to trigger update
  private lastPollTime = 0;
  private readonly MIN_POLL_INTERVAL = 5000; // Minimum 5 seconds between polls

  /**
   * Subscribe to balance updates for a specific address
   * Optimized: Groups multiple callbacks for the same address to reduce RPC calls
   */
  subscribe(address: string, callback: BalanceUpdateCallback): string {
    const subscriptionId = `balance_${address}_${Date.now()}`;
    
    // Check if we already have subscriptions for this address
    const existingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.address === address && sub.isActive);
    
    logger.info('Subscribing to balance updates', {
      address: typeof address === 'string' ? address.substring(0, 10) + '...' : typeof address,
      addressType: typeof address,
      subscriptionId,
      existingSubscriptionsForAddress: existingSubscriptions.length,
      note: existingSubscriptions.length > 0 ? 'Address already has active subscriptions - will share balance updates' : 'New subscription for this address'
    }, 'LiveBalanceService');
    
    const subscription: BalanceSubscription = {
      id: subscriptionId,
      address,
      callback,
      isActive: true
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Start polling if this is the first subscription overall
    if (this.subscriptions.size === 1) {
      this.startPolling();
    }
    
    // Only get initial balance if this is the first subscription for this address
    // Other subscriptions will get updates from polling
    if (existingSubscriptions.length === 0) {
      this.updateBalanceForSubscription(subscription);
    } else {
      // Share the last known balance immediately if available
      const lastBalance = existingSubscriptions[0]?.lastBalance;
      if (lastBalance) {
        callback(lastBalance);
      }
    }
    
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
   * Optimized: Groups subscriptions by address to avoid duplicate RPC calls
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
    
    // Group subscriptions by address to avoid duplicate RPC calls
    const addressGroups = new Map<string, BalanceSubscription[]>();
    for (const subscription of activeSubscriptions) {
      if (!addressGroups.has(subscription.address)) {
        addressGroups.set(subscription.address, []);
      }
      addressGroups.get(subscription.address)!.push(subscription);
    }
    
    logger.debug('Polling balances for subscriptions', { 
      totalSubscriptions: activeSubscriptions.length,
      uniqueAddresses: addressGroups.size,
      note: 'Grouped by address to reduce RPC calls'
    }, 'LiveBalanceService');
    
    // Process unique addresses in batches
    const uniqueAddresses = Array.from(addressGroups.keys());
    const batchSize = 5;
    for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
      const addressBatch = uniqueAddresses.slice(i, i + batchSize);
      
      await Promise.allSettled(
        addressBatch.map(address => {
          const subscriptionsForAddress = addressGroups.get(address)!;
          // Update first subscription (will share result with others)
          return this.updateBalanceForAddress(address, subscriptionsForAddress);
        })
      );
      
      // Small delay between batches to be respectful to RPC
      if (i + batchSize < uniqueAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  /**
   * Update balance for an address and notify all subscriptions for that address
   * This reduces RPC calls by fetching balance once per address
   */
  private async updateBalanceForAddress(
    address: string,
    subscriptions: BalanceSubscription[]
  ): Promise<void> {
    if (subscriptions.length === 0) {
      return;
    }
    
    try {
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(address);
      
      if (!balanceResult.success) {
        logger.warn('Failed to get balance for address', {
          address,
          subscriptionCount: subscriptions.length,
          error: balanceResult.error
        }, 'LiveBalanceService');
        return;
      }
      
      const currentBalance: BalanceUpdate = {
        address,
        solBalance: 0, // TODO: Add SOL balance fetching
        usdcBalance: balanceResult.balance,
        timestamp: Date.now()
      };
      
      // Update all subscriptions for this address
      for (const subscription of subscriptions) {
        // Check if balance has changed significantly for this subscription
        const hasChanged = !subscription.lastBalance || 
          Math.abs(currentBalance.usdcBalance - subscription.lastBalance.usdcBalance) > this.BALANCE_TOLERANCE ||
          Math.abs(currentBalance.solBalance - subscription.lastBalance.solBalance) > this.BALANCE_TOLERANCE;
        
        if (hasChanged) {
          subscription.lastBalance = currentBalance;
          subscription.callback(currentBalance);
        }
      }
      
      // Log only once per address update
      if (subscriptions.some(sub => !sub.lastBalance || 
        Math.abs(currentBalance.usdcBalance - (sub.lastBalance?.usdcBalance || 0)) > this.BALANCE_TOLERANCE)) {
        logger.info('Balance update detected for address', {
          address,
          subscriptionCount: subscriptions.length,
          currentUsdcBalance: currentBalance.usdcBalance,
          previousUsdcBalance: subscriptions[0]?.lastBalance?.usdcBalance || 0
        }, 'LiveBalanceService');
      }
      
    } catch (error) {
      logger.error('Error updating balance for address', {
        address,
        subscriptionCount: subscriptions.length,
        error: error instanceof Error ? error.message : String(error)
      }, 'LiveBalanceService');
    }
  }
  
  /**
   * Update balance for a specific subscription (legacy method, kept for forceUpdate)
   * For polling, use updateBalanceForAddress instead
   */
  private async updateBalanceForSubscription(subscription: BalanceSubscription): Promise<void> {
    // Use the optimized address-based update
    const subscriptionsForAddress = Array.from(this.subscriptions.values())
      .filter(sub => sub.address === subscription.address && sub.isActive);
    await this.updateBalanceForAddress(subscription.address, subscriptionsForAddress);
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
   * Optimized: Updates all subscriptions for the address with a single RPC call
   */
  async forceUpdate(address: string): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.address === address && sub.isActive);
    
    if (subscriptions.length === 0) {
      logger.warn('No active subscriptions found for address', { address }, 'LiveBalanceService');
      return;
    }
    
    logger.info('Forcing balance update for address', { 
      address,
      subscriptionCount: subscriptions.length 
    }, 'LiveBalanceService');
    
    // Use optimized address-based update (single RPC call for all subscriptions)
    await this.updateBalanceForAddress(address, subscriptions);
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
