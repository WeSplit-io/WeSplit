/**
 * Centralized Balance Management Service
 * Prevents excessive balance refresh calls and manages balance state efficiently
 */

import { logger } from '../../analytics/loggingService';
import { walletService, UserWalletBalance } from './simplifiedWalletService';

export interface BalanceState {
  balance: UserWalletBalance | null;
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
}

class BalanceManagementService {
  private static instance: BalanceManagementService;
  private balanceCache = new Map<string, BalanceState>();
  private refreshInProgress = new Set<string>();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly MAX_REFRESH_INTERVAL = 120000; // 2 minutes minimum between refreshes

  static getInstance(): BalanceManagementService {
    if (!BalanceManagementService.instance) {
      BalanceManagementService.instance = new BalanceManagementService();
    }
    return BalanceManagementService.instance;
  }

  /**
   * Get balance for a user with intelligent caching
   */
  async getBalance(userId: string, forceRefresh = false): Promise<BalanceState> {
    try {
      const now = Date.now();
      const cached = this.balanceCache.get(userId);

      // Check if we have a valid cached balance
      if (!forceRefresh && cached && (now - cached.lastUpdated) < this.CACHE_DURATION) {
        logger.debug('Using cached balance', { userId }, 'BalanceManagementService');
        return cached;
      }

      // Check if refresh is already in progress
      if (this.refreshInProgress.has(userId)) {
        logger.debug('Balance refresh already in progress', { userId }, 'BalanceManagementService');
        return cached || { balance: null, lastUpdated: 0, isLoading: true, error: null };
      }

      // Check if we're refreshing too frequently
      if (cached && (now - cached.lastUpdated) < this.MAX_REFRESH_INTERVAL && !forceRefresh) {
        logger.debug('Refresh too frequent, using cached balance', { userId }, 'BalanceManagementService');
        return cached;
      }

      // Start refresh
      this.refreshInProgress.add(userId);
      const balanceState: BalanceState = {
        balance: null,
        lastUpdated: now,
        isLoading: true,
        error: null
      };

      this.balanceCache.set(userId, balanceState);

      try {
        const balance = await walletService.getUserWalletBalance(userId);
        
        const finalState: BalanceState = {
          balance,
          lastUpdated: now,
          isLoading: false,
          error: null
        };

        this.balanceCache.set(userId, finalState);
        logger.info('Balance refreshed successfully', { 
          userId, 
          totalUSD: balance?.totalUSD || 0 
        }, 'BalanceManagementService');

        return finalState;
      } catch (error) {
        const errorState: BalanceState = {
          balance: cached?.balance || null,
          lastUpdated: now,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        this.balanceCache.set(userId, errorState);
        logger.error('Failed to refresh balance', { userId, error }, 'BalanceManagementService');
        return errorState;
      } finally {
        this.refreshInProgress.delete(userId);
      }
    } catch (error) {
      logger.error('Error in getBalance', { userId, error }, 'BalanceManagementService');
      return {
        balance: null,
        lastUpdated: now,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear cache for a user (useful after transactions)
   */
  clearUserCache(userId: string): void {
    this.balanceCache.delete(userId);
    this.refreshInProgress.delete(userId);
    logger.info('Balance cache cleared for user', { userId }, 'BalanceManagementService');
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.balanceCache.clear();
    this.refreshInProgress.clear();
    logger.info('All balance caches cleared', null, 'BalanceManagementService');
  }

  /**
   * Get cached balance without triggering refresh
   */
  getCachedBalance(userId: string): BalanceState | null {
    return this.balanceCache.get(userId) || null;
  }

  /**
   * Check if balance is stale and needs refresh
   */
  isBalanceStale(userId: string): boolean {
    const cached = this.balanceCache.get(userId);
    if (!cached) return true;
    
    const now = Date.now();
    return (now - cached.lastUpdated) > this.CACHE_DURATION;
  }
}

export const balanceManagementService = BalanceManagementService.getInstance();
