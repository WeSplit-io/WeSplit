/**
 * Wallet Management Service
 * Comprehensive Firebase tracking for wallet management across all users
 */

import { firebaseDataService } from './firebaseDataService';
import { secureStorageService } from './secureStorageService';
import { userWalletService } from './userWalletService';
import { logger } from './loggingService';
import { User } from '../types';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface WalletManagementEvent {
  id?: string;
  userId: string;
  eventType: 'wallet_created' | 'wallet_fixed' | 'wallet_migration' | 'private_key_stored' | 'seed_phrase_stored' | 'wallet_error' | 'status_update';
  eventData: {
    walletAddress?: string;
    previousStatus?: string;
    newStatus?: string;
    errorMessage?: string;
    fixAttempts?: number;
    walletType?: string;
    migrationFrom?: string;
    migrationTo?: string;
  };
  timestamp: string;
  success: boolean;
}

export interface WalletStatusReport {
  userId: string;
  walletAddress: string;
  status: 'healthy' | 'needs_fix' | 'no_wallet' | 'fixing' | 'error';
  hasPrivateKey: boolean;
  hasSeedPhrase: boolean;
  walletType: 'app-generated' | 'external' | 'migrated';
  lastChecked: string;
  issues: string[];
  recommendations: string[];
}

export class WalletManagementService {
  
  /**
   * Update user wallet status in Firebase
   */
  async updateUserWalletStatus(
    userId: string, 
    status: User['wallet_status'],
    additionalData?: Partial<User>
  ): Promise<void> {
    try {
      const updateData: Partial<User> = {
        wallet_status: status,
        ...additionalData
      };

      // Add timestamp based on status
      if (status === 'healthy' && !updateData.wallet_last_fixed_at) {
        updateData.wallet_last_fixed_at = new Date().toISOString();
      }

      await firebaseDataService.user.updateUser(userId, updateData);
      
      // Log the status update event
      await this.logWalletEvent(userId, 'status_update', {
        newStatus: status,
        ...additionalData
      }, true);

      logger.info('Updated user wallet status in Firebase', { 
        userId, 
        status,
        additionalData 
      }, 'WalletManagementService');

    } catch (error) {
      logger.error('Failed to update user wallet status in Firebase', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Track wallet creation for new users
   */
  async trackWalletCreation(
    userId: string,
    walletAddress: string,
    walletType: 'app-generated' | 'external' = 'app-generated'
  ): Promise<void> {
    try {
      const updateData: Partial<User> = {
        wallet_address: walletAddress,
        wallet_public_key: walletAddress,
        wallet_status: 'healthy',
        wallet_created_at: new Date().toISOString(),
        wallet_type: walletType,
        wallet_has_private_key: true, // New wallets should have private keys
        wallet_has_seed_phrase: true, // New wallets should have seed phrases
        wallet_fix_attempts: 0,
        wallet_migration_status: 'none'
      };

      await firebaseDataService.user.updateUser(userId, updateData);
      
      // Log the wallet creation event
      await this.logWalletEvent(userId, 'wallet_created', {
        walletAddress,
        walletType
      }, true);

      logger.info('Tracked wallet creation in Firebase', { 
        userId, 
        walletAddress,
        walletType 
      }, 'WalletManagementService');

    } catch (error) {
      logger.error('Failed to track wallet creation in Firebase', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Track wallet fix attempts and results
   */
  async trackWalletFix(
    userId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Get current user data
      const currentUser = await firebaseDataService.user.getCurrentUser(userId);
      const currentAttempts = currentUser.wallet_fix_attempts || 0;
      
      const updateData: Partial<User> = {
        wallet_fix_attempts: currentAttempts + 1,
        wallet_last_fixed_at: new Date().toISOString()
      };

      if (success) {
        updateData.wallet_status = 'healthy';
        updateData.wallet_has_private_key = true;
      } else {
        updateData.wallet_status = 'error';
      }

      await firebaseDataService.user.updateUser(userId, updateData);
      
      // Log the wallet fix event
      await this.logWalletEvent(userId, 'wallet_fixed', {
        fixAttempts: currentAttempts + 1,
        errorMessage: success ? undefined : errorMessage
      }, success);

      logger.info('Tracked wallet fix in Firebase', { 
        userId, 
        success,
        attempts: currentAttempts + 1,
        errorMessage 
      }, 'WalletManagementService');

    } catch (error) {
      logger.error('Failed to track wallet fix in Firebase', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Track private key storage
   */
  async trackPrivateKeyStorage(userId: string, success: boolean): Promise<void> {
    try {
      const updateData: Partial<User> = {
        wallet_has_private_key: success
      };

      if (success) {
        updateData.wallet_status = 'healthy';
      }

      await firebaseDataService.user.updateUser(userId, updateData);
      
      // Log the private key storage event
      await this.logWalletEvent(userId, 'private_key_stored', {}, success);

      logger.info('Tracked private key storage in Firebase', { 
        userId, 
        success 
      }, 'WalletManagementService');

    } catch (error) {
      logger.error('Failed to track private key storage in Firebase', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Track seed phrase storage
   */
  async trackSeedPhraseStorage(userId: string, success: boolean): Promise<void> {
    try {
      const updateData: Partial<User> = {
        wallet_has_seed_phrase: success
      };

      await firebaseDataService.user.updateUser(userId, updateData);
      
      // Log the seed phrase storage event
      await this.logWalletEvent(userId, 'seed_phrase_stored', {}, success);

      logger.info('Tracked seed phrase storage in Firebase', { 
        userId, 
        success 
      }, 'WalletManagementService');

    } catch (error) {
      logger.error('Failed to track seed phrase storage in Firebase', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Track wallet errors
   */
  async trackWalletError(userId: string, errorMessage: string): Promise<void> {
    try {
      const updateData: Partial<User> = {
        wallet_status: 'error'
      };

      await firebaseDataService.user.updateUser(userId, updateData);
      
      // Log the wallet error event
      await this.logWalletEvent(userId, 'wallet_error', {
        errorMessage
      }, false);

      logger.info('Tracked wallet error in Firebase', { 
        userId, 
        errorMessage 
      }, 'WalletManagementService');

    } catch (error) {
      logger.error('Failed to track wallet error in Firebase', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Get comprehensive wallet status for a user
   */
  async getUserWalletStatus(userId: string): Promise<WalletStatusReport> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      // Check secure storage
      const hasPrivateKey = !!(await secureStorageService.getPrivateKey(userId));
      const hasSeedPhrase = !!(await secureStorageService.getSeedPhrase(userId));
      
      // Determine status
      let status: WalletStatusReport['status'] = 'no_wallet';
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (!user.wallet_address) {
        status = 'no_wallet';
        issues.push('No wallet address found');
        recommendations.push('Create a new wallet for the user');
      } else if (hasPrivateKey) {
        status = 'healthy';
      } else if (hasSeedPhrase) {
        status = 'needs_fix';
        issues.push('Has seed phrase but no private key stored');
        recommendations.push('Run wallet fix to derive and store private key');
      } else {
        status = 'error';
        issues.push('No private key or seed phrase found');
        recommendations.push('User needs to recreate wallet or restore from backup');
      }

      return {
        userId,
        walletAddress: user.wallet_address || '',
        status,
        hasPrivateKey,
        hasSeedPhrase,
        walletType: user.wallet_type || 'app-generated',
        lastChecked: new Date().toISOString(),
        issues,
        recommendations
      };

    } catch (error) {
      logger.error('Failed to get user wallet status', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Get all users with wallet issues
   */
  async getUsersWithWalletIssues(): Promise<WalletStatusReport[]> {
    try {
      // Get all users with wallet issues
      const usersRef = collection(db, 'users');
      const issueQuery = query(
        usersRef,
        where('wallet_status', 'in', ['needs_fix', 'error', 'no_wallet'])
      );
      const userDocs = await getDocs(issueQuery);

      const reports: WalletStatusReport[] = [];

      for (const doc of userDocs.docs) {
        const userId = doc.id;
        try {
          const report = await this.getUserWalletStatus(userId);
          reports.push(report);
        } catch (error) {
          logger.warn('Failed to get wallet status for user', { userId, error }, 'WalletManagementService');
        }
      }

      return reports;

    } catch (error) {
      logger.error('Failed to get users with wallet issues', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Get wallet management statistics
   */
  async getWalletManagementStats(): Promise<{
    totalUsers: number;
    healthyWallets: number;
    needsFix: number;
    errors: number;
    noWallet: number;
    averageFixAttempts: number;
  }> {
    try {
      const usersRef = collection(db, 'users');
      const allUsersQuery = query(usersRef);
      const userDocs = await getDocs(allUsersQuery);

      let totalUsers = 0;
      let healthyWallets = 0;
      let needsFix = 0;
      let errors = 0;
      let noWallet = 0;
      let totalFixAttempts = 0;

      userDocs.docs.forEach(doc => {
        const userData = doc.data();
        totalUsers++;
        
        const status = userData.wallet_status || 'no_wallet';
        switch (status) {
          case 'healthy':
            healthyWallets++;
            break;
          case 'needs_fix':
            needsFix++;
            break;
          case 'error':
            errors++;
            break;
          case 'no_wallet':
            noWallet++;
            break;
        }
        
        totalFixAttempts += userData.wallet_fix_attempts || 0;
      });

      return {
        totalUsers,
        healthyWallets,
        needsFix,
        errors,
        noWallet,
        averageFixAttempts: totalUsers > 0 ? totalFixAttempts / totalUsers : 0
      };

    } catch (error) {
      logger.error('Failed to get wallet management stats', error, 'WalletManagementService');
      throw error;
    }
  }

  /**
   * Log wallet management events
   */
  private async logWalletEvent(
    userId: string,
    eventType: WalletManagementEvent['eventType'],
    eventData: WalletManagementEvent['eventData'],
    success: boolean
  ): Promise<void> {
    try {
      const event: Omit<WalletManagementEvent, 'id'> = {
        userId,
        eventType,
        eventData,
        timestamp: new Date().toISOString(),
        success
      };

      await addDoc(collection(db, 'walletManagementEvents'), {
        ...event,
        created_at: serverTimestamp()
      });

    } catch (error) {
      logger.error('Failed to log wallet event', error, 'WalletManagementService');
      // Don't throw here as this is just logging
    }
  }

  /**
   * Get wallet management events for a user
   */
  async getUserWalletEvents(userId: string, limitCount: number = 50): Promise<WalletManagementEvent[]> {
    try {
      const eventsRef = collection(db, 'walletManagementEvents');
      const eventsQuery = query(
        eventsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const eventDocs = await getDocs(eventsQuery);

      return eventDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WalletManagementEvent));

    } catch (error) {
      logger.error('Failed to get user wallet events', error, 'WalletManagementService');
      throw error;
    }
  }
}

// Export singleton instance
export const walletManagementService = new WalletManagementService();
