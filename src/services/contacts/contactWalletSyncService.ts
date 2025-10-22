import { firebaseDataService } from '../data/firebaseDataService';
import { logger } from '../core/loggingService';
import { UserContact } from '../../types';

/**
 * Service to handle synchronization between user wallet information
 * and contact lists to ensure accurate wallet addresses are displayed
 */
export class ContactWalletSyncService {
  /**
   * Sync wallet information for a specific user across all their group memberships
   */
  static async syncUserWalletInfo(userId: string, walletUpdates: {
    wallet_address?: string;
    wallet_public_key?: string;
    name?: string;
    avatar?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Syncing user wallet info across group memberships', { userId, walletUpdates }, 'ContactWalletSyncService');

      // Use the existing sync method in firebaseDataService
      await firebaseDataService.user.syncUserInfoToGroupMembers(userId, walletUpdates);

      logger.info('Successfully synced user wallet info', { userId }, 'ContactWalletSyncService');
      return { success: true };
    } catch (error) {
      logger.error('Failed to sync user wallet info', error, 'ContactWalletSyncService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Refresh contact information from the users collection to get latest wallet data
   */
  static async refreshContactWalletInfo(contactIds: string[]): Promise<UserContact[]> {
    try {
      if (contactIds.length === 0) {return [];}

      logger.info('Refreshing contact wallet info', { contactCount: contactIds.length }, 'ContactWalletSyncService');

      // Get latest user information from users collection
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('__name__', 'in', contactIds));
      const usersDocs = await getDocs(usersQuery);

      const updatedContacts: UserContact[] = usersDocs.docs.map(doc => {
        const userData = doc.data();
        return {
          id: doc.id,
          name: userData.name || '',
          email: userData.email || '',
          wallet_address: userData.wallet_address || '',
          wallet_public_key: userData.wallet_public_key || '',
          created_at: userData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          joined_at: userData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          first_met_at: userData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          avatar: userData.avatar || '',
          mutual_groups_count: 0,
          isFavorite: false
        } as UserContact;
      });

      logger.info('Successfully refreshed contact wallet info', { 
        requestedCount: contactIds.length,
        updatedCount: updatedContacts.length 
      }, 'ContactWalletSyncService');

      return updatedContacts;
    } catch (error) {
      logger.error('Failed to refresh contact wallet info', error, 'ContactWalletSyncService');
      return [];
    }
  }

  /**
   * Validate that a contact has proper wallet information
   */
  static validateContactWalletInfo(contact: UserContact): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!contact.wallet_address) {
      issues.push('No wallet address');
      recommendations.push('Contact needs to link a wallet to receive payments');
    }

    if (!contact.name || contact.name.trim() === '') {
      issues.push('No display name');
      recommendations.push('Contact should set a display name for better identification');
    }

    if (!contact.email) {
      issues.push('No email address');
      recommendations.push('Email helps with contact identification and notifications');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get contacts with wallet issues that need attention
   */
  static async getContactsWithWalletIssues(userId: string): Promise<{
    contactsWithoutWallets: UserContact[];
    contactsWithOutdatedInfo: UserContact[];
  }> {
    try {
      // Get all user contacts
      const allContacts = await firebaseDataService.contact.getContacts(userId);
      const groupContacts = await firebaseDataService.group.getUserContacts(userId);
      
      // Combine and deduplicate
      const contactsMap = new Map<string, UserContact>();
      [...allContacts, ...groupContacts].forEach(contact => {
        const contactId = String(contact.id);
        if (!contactsMap.has(contactId)) {
          contactsMap.set(contactId, contact);
        }
      });

      const allContactsList = Array.from(contactsMap.values());

      // Categorize contacts
      const contactsWithoutWallets = allContactsList.filter(contact => !contact.wallet_address);
      const contactsWithOutdatedInfo = allContactsList.filter(contact => {
        const validation = this.validateContactWalletInfo(contact);
        return !validation.isValid && contact.wallet_address; // Has wallet but other issues
      });

      logger.info('Analyzed contacts for wallet issues', {
        totalContacts: allContactsList.length,
        withoutWallets: contactsWithoutWallets.length,
        withOutdatedInfo: contactsWithOutdatedInfo.length
      }, 'ContactWalletSyncService');

      return {
        contactsWithoutWallets,
        contactsWithOutdatedInfo
      };
    } catch (error) {
      logger.error('Failed to get contacts with wallet issues', error, 'ContactWalletSyncService');
      return {
        contactsWithoutWallets: [],
        contactsWithOutdatedInfo: []
      };
    }
  }

  /**
   * Batch sync wallet information for multiple users
   * Useful when updating wallet information for multiple contacts at once
   */
  static async batchSyncWalletInfo(updates: {
    userId: string;
    walletUpdates: {
      wallet_address?: string;
      wallet_public_key?: string;
      name?: string;
      avatar?: string;
    };
  }[]): Promise<{ success: boolean; results: { userId: string; success: boolean; error?: string }[] }> {
    try {
      logger.info('Starting batch wallet sync', { updateCount: updates.length }, 'ContactWalletSyncService');

      const results = await Promise.allSettled(
        updates.map(async ({ userId, walletUpdates }) => {
          const result = await this.syncUserWalletInfo(userId, walletUpdates);
          return { userId, ...result };
        })
      );

      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            userId: updates[index].userId,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
          };
        }
      });

      const successCount = processedResults.filter(r => r.success).length;
      
      logger.info('Completed batch wallet sync', { 
        total: updates.length,
        successful: successCount,
        failed: updates.length - successCount
      }, 'ContactWalletSyncService');

      return {
        success: successCount > 0,
        results: processedResults
      };
    } catch (error) {
      logger.error('Failed to batch sync wallet info', error, 'ContactWalletSyncService');
      return {
        success: false,
        results: updates.map(({ userId }) => ({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      };
    }
  }
}
