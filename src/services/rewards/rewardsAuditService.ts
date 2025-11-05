/**
 * Rewards Audit Service
 * Audits the rewards system and point distribution by checking database status
 * Ensures points are correctly awarded based on user actions
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit as queryLimit } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { questService } from './questService';
import { pointsService } from './pointsService';

interface UserStatusCheck {
  userId: string;
  userName: string;
  email: string;
  
  // User document fields
  hasCompletedOnboarding: boolean;
  hasWalletAddress: boolean;
  hasName: boolean;
  hasAvatar: boolean;
  hasLastVerifiedAt: boolean;
  
  // Quest status (from database)
  quests: {
    [questType: string]: {
      existsInDb: boolean;
      completedInDb: boolean;
      shouldBeCompleted: boolean;
      pointsAwarded: number;
    };
  };
  
  // Transaction status
  transactions: {
    total: number;
    completed: number;
    hasFirstTransaction: boolean;
    internalTransfers: number;
    externalTransfers: number;
    pointsAwardedForTransactions: number;
    transactionsWithPoints: number;
  };
  
  // Contacts status
  contacts: {
    total: number;
    hasFirstContact: boolean;
  };
  
  // Splits status
  splits: {
    total: number;
    createdByUser: number;
    hasFirstSplit: boolean;
  };
  
  // Points status
  points: {
    currentPoints: number;
    totalPointsEarned: number;
    pointsTransactions: number;
    pointsFromQuests: number;
    pointsFromTransactions: number;
  };
  
  // Issues found
  issues: string[];
}

interface AuditResult {
  userId: string;
  userName: string;
  status: UserStatusCheck;
  discrepancies: string[];
  recommendations: string[];
}

class RewardsAuditService {
  /**
   * Audit a single user's rewards status
   * Checks database to verify what has been done and what points should be awarded
   */
  async auditUser(userId: string): Promise<AuditResult> {
    const status: UserStatusCheck = {
      userId,
      userName: '',
      email: '',
      hasCompletedOnboarding: false,
      hasWalletAddress: false,
      hasName: false,
      hasAvatar: false,
      hasLastVerifiedAt: false,
      quests: {},
      transactions: {
        total: 0,
        completed: 0,
        hasFirstTransaction: false,
        internalTransfers: 0,
        externalTransfers: 0,
        pointsAwardedForTransactions: 0,
        transactionsWithPoints: 0
      },
      contacts: {
        total: 0,
        hasFirstContact: false
      },
      splits: {
        total: 0,
        createdByUser: 0,
        hasFirstSplit: false
      },
      points: {
        currentPoints: 0,
        totalPointsEarned: 0,
        pointsTransactions: 0,
        pointsFromQuests: 0,
        pointsFromTransactions: 0
      },
      issues: []
    };

    const discrepancies: string[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Get user document from database
      logger.info('Auditing user rewards', { userId }, 'RewardsAuditService');
      
      const user = await firebaseDataService.user.getCurrentUser(userId);
      status.userName = user.name || 'Unknown';
      status.email = user.email || '';
      
      // Check user document fields
      status.hasCompletedOnboarding = user.hasCompletedOnboarding === true;
      status.hasWalletAddress = !!(user.wallet_address && user.wallet_address.trim() !== '');
      status.hasName = !!(user.name && user.name.trim() !== '');
      status.hasAvatar = !!(user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '');
      
      // Check points from user document
      status.points.currentPoints = user.points || 0;
      status.points.totalPointsEarned = user.total_points_earned || 0;
      
      logger.info('User document status', {
        userId,
        hasCompletedOnboarding: status.hasCompletedOnboarding,
        hasWalletAddress: status.hasWalletAddress,
        hasName: status.hasName,
        hasAvatar: status.hasAvatar,
        currentPoints: status.points.currentPoints,
        totalPointsEarned: status.points.totalPointsEarned
      }, 'RewardsAuditService');

      // 2. Check quest completion status in database
      await this.auditQuests(userId, status, discrepancies);
      
      // 3. Check transactions
      await this.auditTransactions(userId, status, discrepancies);
      
      // 4. Check contacts
      await this.auditContacts(userId, status, discrepancies);
      
      // 5. Check splits
      await this.auditSplits(userId, status, discrepancies);
      
      // 6. Check points transactions
      await this.auditPointsTransactions(userId, status, discrepancies);
      
      // 7. Generate recommendations
      this.generateRecommendations(status, recommendations);
      
      logger.info('User audit completed', {
        userId,
        issues: status.issues.length,
        discrepancies: discrepancies.length,
        recommendations: recommendations.length
      }, 'RewardsAuditService');

    } catch (error) {
      const errorMsg = `Failed to audit user: ${error instanceof Error ? error.message : String(error)}`;
      status.issues.push(errorMsg);
      discrepancies.push(errorMsg);
      logger.error('Failed to audit user', { userId, error }, 'RewardsAuditService');
    }

    return {
      userId,
      userName: status.userName,
      status,
      discrepancies,
      recommendations
    };
  }

  /**
   * Audit quest completion status
   */
  private async auditQuests(
    userId: string,
    status: UserStatusCheck,
    discrepancies: string[]
  ): Promise<void> {
    const questTypes = [
      'complete_onboarding',
      'profile_image',
      'first_transaction',
      'add_first_contact',
      'create_first_split'
    ];

    for (const questType of questTypes) {
      try {
        // Check if quest exists in database
        const questDoc = await getDoc(doc(db, 'users', userId, 'quests', questType));
        const existsInDb = questDoc.exists();
        const completedInDb = existsInDb && questDoc.data()?.completed === true;

        // Determine if quest should be completed based on user actions
        let shouldBeCompleted = false;
        let pointsAwarded = 0;

        switch (questType) {
          case 'complete_onboarding':
            shouldBeCompleted = status.hasCompletedOnboarding || status.hasWalletAddress || status.hasName;
            pointsAwarded = 25;
            break;
          case 'profile_image':
            shouldBeCompleted = status.hasAvatar;
            pointsAwarded = 50;
            break;
          case 'first_transaction':
            shouldBeCompleted = status.transactions.hasFirstTransaction;
            pointsAwarded = 100;
            break;
          case 'add_first_contact':
            shouldBeCompleted = status.contacts.hasFirstContact;
            pointsAwarded = 30;
            break;
          case 'create_first_split':
            shouldBeCompleted = status.splits.hasFirstSplit;
            pointsAwarded = 75;
            break;
        }

        status.quests[questType] = {
          existsInDb,
          completedInDb,
          shouldBeCompleted,
          pointsAwarded
        };

        // Check for discrepancies
        if (shouldBeCompleted && !completedInDb) {
          discrepancies.push(`Quest ${questType} should be completed but is not marked as completed in database`);
        } else if (completedInDb && !shouldBeCompleted) {
          discrepancies.push(`Quest ${questType} is marked as completed but user hasn't completed the action`);
        }

      } catch (error) {
        logger.error('Failed to audit quest', { userId, questType, error }, 'RewardsAuditService');
        status.issues.push(`Failed to check quest ${questType}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Audit transactions
   */
  private async auditTransactions(
    userId: string,
    status: UserStatusCheck,
    discrepancies: string[]
  ): Promise<void> {
    try {
      const transactions = await firebaseDataService.transaction.getTransactions(userId, 1000);
      status.transactions.total = transactions.length;
      
      const completedTransactions = transactions.filter(tx => tx.status === 'completed');
      status.transactions.completed = completedTransactions.length;
      
      const sendTransactions = completedTransactions.filter(tx => 
        tx.type === 'send' && tx.currency === 'USDC'
      );
      
      status.transactions.hasFirstTransaction = sendTransactions.length > 0;
      
      // Check for internal vs external transfers
      for (const tx of sendTransactions) {
        const recipientId = tx.to_user;
        if (!recipientId || recipientId.trim() === '') {
          status.transactions.externalTransfers++;
          continue;
        }
        
        // Check if recipient is a registered user
        const isLikelyWalletAddress = recipientId.length >= 43 && recipientId.length <= 44;
        if (isLikelyWalletAddress) {
          status.transactions.externalTransfers++;
          continue;
        }
        
        try {
          const recipientUser = await firebaseDataService.user.getCurrentUser(recipientId);
          if (recipientUser && recipientUser.id) {
            status.transactions.internalTransfers++;
          } else {
            status.transactions.externalTransfers++;
          }
        } catch (error) {
          status.transactions.externalTransfers++;
        }
      }
      
      // Check points awarded for transactions
      const pointsTransactionsQuery = query(
        collection(db, 'points_transactions'),
        where('user_id', '==', userId),
        where('source', '==', 'transaction_reward')
      );
      const pointsTransactionsSnapshot = await getDocs(pointsTransactionsQuery);
      
      let totalTransactionPoints = 0;
      const transactionIdsWithPoints = new Set<string>();
      
      pointsTransactionsSnapshot.forEach(doc => {
        const data = doc.data();
        totalTransactionPoints += data.amount || 0;
        if (data.source_id) {
          const txId = data.source_id.replace('_sender', '').replace('_recipient', '');
          transactionIdsWithPoints.add(txId);
        }
      });
      
      status.transactions.pointsAwardedForTransactions = totalTransactionPoints;
      status.transactions.transactionsWithPoints = transactionIdsWithPoints.size;
      
      // Check for discrepancies
      const expectedInternalTransfers = status.transactions.internalTransfers;
      const transactionsWithPoints = status.transactions.transactionsWithPoints;
      
      if (expectedInternalTransfers > transactionsWithPoints) {
        discrepancies.push(`Expected points for ${expectedInternalTransfers} internal transfers but only ${transactionsWithPoints} have points awarded`);
      }
      
    } catch (error) {
      logger.error('Failed to audit transactions', { userId, error }, 'RewardsAuditService');
      status.issues.push(`Failed to check transactions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Audit contacts
   */
  private async auditContacts(
    userId: string,
    status: UserStatusCheck,
    discrepancies: string[]
  ): Promise<void> {
    try {
      // Check contacts collection
      const contactsQuery = query(
        collection(db, 'contacts'),
        where('user_id', '==', userId)
      );
      const contactsSnapshot = await getDocs(contactsQuery);
      status.contacts.total = contactsSnapshot.size;
      status.contacts.hasFirstContact = contactsSnapshot.size > 0;
      
      // Also check transaction-based contacts
      if (!status.contacts.hasFirstContact) {
        try {
          const { TransactionBasedContactService } = await import('../contacts/transactionBasedContactService');
          const transactionContacts = await TransactionBasedContactService.getTransactionBasedContacts(userId);
          if (transactionContacts.length > 0) {
            status.contacts.hasFirstContact = true;
            status.contacts.total += transactionContacts.length;
          }
        } catch (error) {
          logger.debug('Could not check transaction-based contacts', { userId, error }, 'RewardsAuditService');
        }
      }
      
    } catch (error) {
      logger.error('Failed to audit contacts', { userId, error }, 'RewardsAuditService');
      status.issues.push(`Failed to check contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Audit splits
   */
  private async auditSplits(
    userId: string,
    status: UserStatusCheck,
    discrepancies: string[]
  ): Promise<void> {
    try {
      const { SplitStorageService } = await import('../splits/splitStorageService');
      const result = await SplitStorageService.getUserSplits(userId);
      
      if (result.success && result.splits) {
        status.splits.total = result.splits.length;
        const createdSplits = result.splits.filter(split => split.creatorId === userId);
        status.splits.createdByUser = createdSplits.length;
        status.splits.hasFirstSplit = createdSplits.length > 0;
      }
      
    } catch (error) {
      logger.error('Failed to audit splits', { userId, error }, 'RewardsAuditService');
      status.issues.push(`Failed to check splits: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Audit points transactions
   */
  private async auditPointsTransactions(
    userId: string,
    status: UserStatusCheck,
    discrepancies: string[]
  ): Promise<void> {
    try {
      const pointsHistory = await pointsService.getPointsHistory(userId, 1000);
      status.points.pointsTransactions = pointsHistory.length;
      
      let pointsFromQuests = 0;
      let pointsFromTransactions = 0;
      
      pointsHistory.forEach(pt => {
        if (pt.source === 'quest_completion') {
          pointsFromQuests += pt.amount;
        } else if (pt.source === 'transaction_reward') {
          pointsFromTransactions += pt.amount;
        }
      });
      
      status.points.pointsFromQuests = pointsFromQuests;
      status.points.pointsFromTransactions = pointsFromTransactions;
      
      // Verify points match
      const expectedTotalFromTransactions = pointsFromTransactions;
      const actualTransactionPoints = status.transactions.pointsAwardedForTransactions;
      
      if (Math.abs(expectedTotalFromTransactions - actualTransactionPoints) > 0.01) {
        discrepancies.push(`Points from transactions mismatch: expected ${expectedTotalFromTransactions} but found ${actualTransactionPoints}`);
      }
      
    } catch (error) {
      logger.error('Failed to audit points transactions', { userId, error }, 'RewardsAuditService');
      status.issues.push(`Failed to check points transactions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate recommendations based on audit findings
   */
  private generateRecommendations(
    status: UserStatusCheck,
    recommendations: string[]
  ): void {
    // Check for missing quest completions
    Object.entries(status.quests).forEach(([questType, questStatus]) => {
      if (questStatus.shouldBeCompleted && !questStatus.completedInDb) {
        recommendations.push(`Award quest ${questType} completion (${questStatus.pointsAwarded} points)`);
      }
    });
    
    // Check for missing transaction points
    const missingTransactionPoints = status.transactions.internalTransfers - status.transactions.transactionsWithPoints;
    if (missingTransactionPoints > 0) {
      recommendations.push(`Award points for ${missingTransactionPoints} missing internal transactions`);
    }
    
    // Check for onboarding completion
    if ((status.hasWalletAddress || status.hasName) && !status.hasCompletedOnboarding) {
      recommendations.push('Update hasCompletedOnboarding field to true');
    }
  }
}

// Export singleton instance
export const rewardsAuditService = new RewardsAuditService();

