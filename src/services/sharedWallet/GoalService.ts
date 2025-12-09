/**
 * Goal Service
 * Handles goal tracking and progress for shared wallets
 */

import { logger } from '../core';
import type { SharedWallet } from './types';

export class GoalService {
  /**
   * Calculate goal progress percentage
   */
  static calculateGoalProgress(wallet: SharedWallet): {
    progress: number;
    remaining: number;
    isReached: boolean;
    percentage: number;
  } {
    const goalAmount = wallet.settings?.goalAmount;
    
    if (!goalAmount || goalAmount <= 0) {
      return {
        progress: wallet.totalBalance,
        remaining: 0,
        isReached: false,
        percentage: 0,
      };
    }

    const progress = wallet.totalBalance;
    const remaining = Math.max(0, goalAmount - progress);
    const isReached = progress >= goalAmount;
    const percentage = Math.min(100, (progress / goalAmount) * 100);

    return {
      progress,
      remaining,
      isReached,
      percentage,
    };
  }

  /**
   * Check if goal was just reached and needs notification
   */
  static async checkAndMarkGoalReached(
    walletId: string,
    newBalance: number
  ): Promise<{ goalReached: boolean; shouldNotify: boolean }> {
    try {
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');

      const result = await getSharedWalletDocById(walletId);
      if (!result || !result.wallet) {
        return { goalReached: false, shouldNotify: false };
      }

      const { wallet, walletDocId } = result;
      const goalAmount = wallet.settings?.goalAmount;

      if (!goalAmount || goalAmount <= 0) {
        return { goalReached: false, shouldNotify: false };
      }

      const wasReached = wallet.settings?.goalReachedAt !== undefined;
      const isNowReached = newBalance >= goalAmount;
      const notificationSent = wallet.settings?.goalNotificationSent === true;

      // Goal was just reached
      if (isNowReached && !wasReached) {
        await updateDoc(doc(db, 'sharedWallets', walletDocId), {
          'settings.goalReachedAt': new Date().toISOString(),
          'settings.goalNotificationSent': false,
          updatedAt: serverTimestamp(),
        });

        logger.info('Goal reached', {
          walletId,
          goalAmount,
          currentBalance: newBalance,
        }, 'GoalService');

        return { goalReached: true, shouldNotify: true };
      }

      // Goal was already reached but notification not sent
      if (isNowReached && wasReached && !notificationSent) {
        return { goalReached: true, shouldNotify: true };
      }

      return { goalReached: isNowReached, shouldNotify: false };
    } catch (error) {
      logger.error('Error checking goal status', {
        walletId,
        error: error instanceof Error ? error.message : String(error),
      }, 'GoalService');

      return { goalReached: false, shouldNotify: false };
    }
  }

  /**
   * Mark goal notification as sent
   */
  static async markGoalNotificationSent(walletId: string): Promise<void> {
    try {
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');

      const result = await getSharedWalletDocById(walletId);
      if (!result) {
        return;
      }

      const { walletDocId } = result;

      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        'settings.goalNotificationSent': true,
        updatedAt: serverTimestamp(),
      });

      logger.info('Goal notification marked as sent', { walletId }, 'GoalService');
    } catch (error) {
      logger.error('Error marking goal notification as sent', {
        walletId,
        error: error instanceof Error ? error.message : String(error),
      }, 'GoalService');
    }
  }

  /**
   * Get goal status text
   */
  static getGoalStatusText(wallet: SharedWallet): string {
    const goalAmount = wallet.settings?.goalAmount;
    
    if (!goalAmount || goalAmount <= 0) {
      return 'No goal set';
    }

    const { progress, remaining, isReached, percentage } = this.calculateGoalProgress(wallet);

    if (isReached) {
      return `Goal reached! 🎉`;
    }

    return `${percentage.toFixed(1)}% complete (${remaining.toFixed(2)} remaining)`;
  }
}
