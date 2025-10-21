/**
 * Transaction-Based Contact Service
 * Replaces group-based contact system with split and transaction-based contact discovery
 */

import { firebaseDataService } from './firebaseDataService';
import { SplitStorageService } from './splitStorageService';
import { TransactionHistoryService } from './transactionHistoryService';
import { logger } from './loggingService';
import { UserContact } from '../types';

export interface TransactionContact {
  userId: string;
  name: string;
  email?: string;
  walletAddress: string;
  walletPublicKey?: string;
  avatar?: string;
  // Contact metadata
  firstTransactionAt: string;
  lastTransactionAt: string;
  totalTransactions: number;
  totalAmountSent: number;
  totalAmountReceived: number;
  // Split metadata
  totalSplits: number;
  lastSplitAt?: string;
  // Relationship type
  relationshipType: 'sent_to' | 'received_from' | 'split_participant' | 'both';
}

export class TransactionBasedContactService {
  private static transactionHistoryService = new TransactionHistoryService();

  /**
   * Get all contacts based on transaction and split history
   */
  static async getTransactionBasedContacts(userId: string): Promise<UserContact[]> {
    try {
      logger.info('Loading transaction-based contacts', { userId }, 'TransactionBasedContactService');

      // Get contacts from multiple sources
      const [transactionContacts, splitContacts, manualContacts] = await Promise.all([
        this.getContactsFromTransactions(userId),
        this.getContactsFromSplits(userId),
        this.getManualContacts(userId)
      ]);

      // Merge and deduplicate contacts
      const contactsMap = new Map<string, UserContact>();

      // Add transaction contacts
      transactionContacts.forEach(contact => {
        const contactId = String(contact.id);
        if (!contactsMap.has(contactId)) {
          contactsMap.set(contactId, contact);
        }
      });

      // Add split contacts (merge with existing)
      splitContacts.forEach(contact => {
        const contactId = String(contact.id);
        const existing = contactsMap.get(contactId);
        if (existing) {
          // Merge split information
          contactsMap.set(contactId, {
            ...existing,
            mutual_groups_count: (existing.mutual_groups_count || 0) + 1
          });
        } else {
          contactsMap.set(contactId, contact);
        }
      });

      // Add manual contacts (highest priority)
      manualContacts.forEach(contact => {
        const contactId = String(contact.id);
        const existing = contactsMap.get(contactId);
        if (existing) {
          // Preserve manual contact preferences
          contactsMap.set(contactId, {
            ...existing,
            isFavorite: contact.isFavorite || existing.isFavorite,
            name: contact.name || existing.name,
            email: contact.email || existing.email
          });
        } else {
          contactsMap.set(contactId, contact);
        }
      });

      const allContacts = Array.from(contactsMap.values());

      // Sort by last interaction (most recent first)
      allContacts.sort((a, b) => {
        const aLastInteraction = a.first_met_at || a.created_at;
        const bLastInteraction = b.first_met_at || b.created_at;
        return new Date(bLastInteraction).getTime() - new Date(aLastInteraction).getTime();
      });

      logger.info('Loaded transaction-based contacts', { 
        totalContacts: allContacts.length,
        fromTransactions: transactionContacts.length,
        fromSplits: splitContacts.length,
        manual: manualContacts.length
      }, 'TransactionBasedContactService');

      return allContacts;
    } catch (error) {
      logger.error('Failed to load transaction-based contacts', error, 'TransactionBasedContactService');
      return [];
    }
  }

  /**
   * Get contacts from transaction history
   */
  private static async getContactsFromTransactions(userId: string): Promise<UserContact[]> {
    try {
      const transactionHistory = await this.transactionHistoryService.getUserTransactionHistory(userId, {
        limit: 100 // Get recent transactions
      });

      if (!transactionHistory.success) {
        return [];
      }

      const contactsMap = new Map<string, UserContact>();

      // Process transactions and validate user existence
      for (const transaction of transactionHistory.transactions) {
        let contactUserId: string;
        let contactWalletAddress: string;
        let contactName: string;

        if (transaction.from_user === userId) {
          // User sent money to this contact
          contactUserId = transaction.to_user;
          contactWalletAddress = transaction.to_wallet;
          contactName = transaction.recipient_name;
        } else {
          // User received money from this contact
          contactUserId = transaction.from_user;
          contactWalletAddress = transaction.from_wallet;
          contactName = transaction.sender_name;
        }

        if (!contactUserId || !contactWalletAddress) continue;

        const contactId = String(contactUserId);
        
        // Validate that the contact user still exists
        try {
          const userDoc = await firebaseDataService.user.getCurrentUser(contactId);
          if (!userDoc) {
            logger.warn('Transaction contact references non-existent user, skipping', { 
              contactId, 
              contactName,
              userId 
            }, 'TransactionBasedContactService');
            continue;
          }
          
          // Skip deleted users
          if (userDoc.status === 'deleted' || userDoc.status === 'suspended') {
            logger.warn('Transaction contact references deleted/suspended user, skipping', { 
              contactId, 
              contactName,
              userStatus: userDoc.status,
              userId 
            }, 'TransactionBasedContactService');
            continue;
          }
          
          // Skip users with incomplete data
          if (!userDoc.email || !userDoc.name) {
            logger.warn('Transaction contact references user with incomplete data, skipping', { 
              contactId, 
              contactName,
              hasEmail: !!userDoc.email,
              hasName: !!userDoc.name,
              userId 
            }, 'TransactionBasedContactService');
            continue;
          }
          
        } catch (error) {
          logger.error('Error validating transaction contact user', { 
            contactId, 
            error, 
            userId 
          }, 'TransactionBasedContactService');
          continue;
        }

        const existing = contactsMap.get(contactId);

        if (existing) {
          // Update existing contact
          contactsMap.set(contactId, {
            ...existing,
            first_met_at: existing.first_met_at || transaction.created_at,
            // Keep the most recent transaction date
            created_at: transaction.created_at > existing.created_at ? transaction.created_at : existing.created_at
          });
        } else {
          // Create new contact
          contactsMap.set(contactId, {
            id: contactId,
            name: contactName || this.formatWalletAddress(contactWalletAddress),
            email: '', // Will be filled from user lookup if available
            wallet_address: contactWalletAddress,
            wallet_public_key: '',
            created_at: transaction.created_at,
            joined_at: transaction.created_at,
            first_met_at: transaction.created_at,
            avatar: '',
            mutual_groups_count: 0,
            isFavorite: false
          });
        }
      }

      return Array.from(contactsMap.values());
    } catch (error) {
      logger.error('Failed to get contacts from transactions', error, 'TransactionBasedContactService');
      return [];
    }
  }

  /**
   * Get contacts from split participation
   */
  private static async getContactsFromSplits(userId: string): Promise<UserContact[]> {
    try {
      const userSplits = await SplitStorageService.getUserSplits(userId);

      if (!userSplits.success) {
        return [];
      }

      const contactsMap = new Map<string, UserContact>();

      // Process splits and validate user existence
      for (const split of userSplits.splits) {
        for (const participant of split.participants) {
          if (participant.userId === userId) continue; // Skip self

          const contactId = String(participant.userId);
          
          // Validate that the contact user still exists
          try {
            const userDoc = await firebaseDataService.user.getCurrentUser(contactId);
            if (!userDoc) {
              logger.warn('Split contact references non-existent user, skipping', { 
                contactId, 
                participantName: participant.name,
                splitId: split.id,
                userId 
              }, 'TransactionBasedContactService');
              continue;
            }
            
            // Skip deleted users
            if (userDoc.status === 'deleted' || userDoc.status === 'suspended') {
              logger.warn('Split contact references deleted/suspended user, skipping', { 
                contactId, 
                participantName: participant.name,
                userStatus: userDoc.status,
                splitId: split.id,
                userId 
              }, 'TransactionBasedContactService');
              continue;
            }
            
            // Skip users with incomplete data
            if (!userDoc.email || !userDoc.name) {
              logger.warn('Split contact references user with incomplete data, skipping', { 
                contactId, 
                participantName: participant.name,
                hasEmail: !!userDoc.email,
                hasName: !!userDoc.name,
                splitId: split.id,
                userId 
              }, 'TransactionBasedContactService');
              continue;
            }
            
          } catch (error) {
            logger.error('Error validating split contact user', { 
              contactId, 
              error, 
              splitId: split.id,
              userId 
            }, 'TransactionBasedContactService');
            continue;
          }

          const existing = contactsMap.get(contactId);

          if (existing) {
            // Update existing contact
            contactsMap.set(contactId, {
              ...existing,
              first_met_at: existing.first_met_at || split.createdAt,
              mutual_groups_count: (existing.mutual_groups_count || 0) + 1
            });
          } else {
            // Create new contact
            contactsMap.set(contactId, {
              id: contactId,
              name: participant.name || this.formatWalletAddress(participant.walletAddress),
              email: participant.email || '',
              wallet_address: participant.walletAddress,
              wallet_public_key: '',
              created_at: split.createdAt,
              joined_at: participant.joinedAt || split.createdAt,
              first_met_at: split.createdAt,
              avatar: '',
              mutual_groups_count: 1,
              isFavorite: false
            });
          }
        }
      }

      return Array.from(contactsMap.values());
    } catch (error) {
      logger.error('Failed to get contacts from splits', error, 'TransactionBasedContactService');
      return [];
    }
  }

  /**
   * Get manually added contacts (from the contacts collection)
   */
  private static async getManualContacts(userId: string): Promise<UserContact[]> {
    try {
      return await firebaseDataService.user.getUserContacts(userId);
    } catch (error) {
      logger.error('Failed to get manual contacts', error, 'TransactionBasedContactService');
      return [];
    }
  }

  /**
   * Get contact interaction summary
   */
  static async getContactInteractionSummary(userId: string, contactId: string): Promise<{
    totalTransactions: number;
    totalAmountSent: number;
    totalAmountReceived: number;
    totalSplits: number;
    lastInteraction: string;
    relationshipType: 'sent_to' | 'received_from' | 'split_participant' | 'both';
  }> {
    try {
      const [transactionHistory, userSplits] = await Promise.all([
        this.transactionHistoryService.getUserTransactionHistory(userId, { limit: 1000 }),
        SplitStorageService.getUserSplits(userId)
      ]);

      let totalTransactions = 0;
      let totalAmountSent = 0;
      let totalAmountReceived = 0;
      let totalSplits = 0;
      let lastInteraction = '';
      let hasSent = false;
      let hasReceived = false;
      let hasSplit = false;

      // Analyze transactions
      if (transactionHistory.success) {
        transactionHistory.transactions.forEach(transaction => {
          if (transaction.from_user === userId && transaction.to_user === contactId) {
            totalTransactions++;
            totalAmountSent += transaction.amount;
            hasSent = true;
            if (transaction.created_at > lastInteraction) {
              lastInteraction = transaction.created_at;
            }
          } else if (transaction.from_user === contactId && transaction.to_user === userId) {
            totalTransactions++;
            totalAmountReceived += transaction.amount;
            hasReceived = true;
            if (transaction.created_at > lastInteraction) {
              lastInteraction = transaction.created_at;
            }
          }
        });
      }

      // Analyze splits
      if (userSplits.success) {
        userSplits.splits.forEach(split => {
          const hasParticipant = split.participants.some(p => p.userId === contactId);
          if (hasParticipant) {
            totalSplits++;
            hasSplit = true;
            if (split.createdAt > lastInteraction) {
              lastInteraction = split.createdAt;
            }
          }
        });
      }

      // Determine relationship type
      let relationshipType: 'sent_to' | 'received_from' | 'split_participant' | 'both' = 'split_participant';
      if (hasSent && hasReceived) {
        relationshipType = 'both';
      } else if (hasSent) {
        relationshipType = 'sent_to';
      } else if (hasReceived) {
        relationshipType = 'received_from';
      }

      return {
        totalTransactions,
        totalAmountSent,
        totalAmountReceived,
        totalSplits,
        lastInteraction,
        relationshipType
      };
    } catch (error) {
      logger.error('Failed to get contact interaction summary', error, 'TransactionBasedContactService');
      return {
        totalTransactions: 0,
        totalAmountSent: 0,
        totalAmountReceived: 0,
        totalSplits: 0,
        lastInteraction: '',
        relationshipType: 'split_participant'
      };
    }
  }

  /**
   * Add a contact manually (for future transactions)
   */
  static async addManualContact(userId: string, contactData: {
    name: string;
    email?: string;
    walletAddress: string;
    walletPublicKey?: string;
  }): Promise<{ success: boolean; contact?: UserContact; error?: string }> {
    try {
      const contact = await firebaseDataService.user.addContact(userId, {
        name: contactData.name,
        email: contactData.email || '',
        wallet_address: contactData.walletAddress,
        wallet_public_key: contactData.walletPublicKey || '',
        avatar: '',
        mutual_groups_count: 0,
        isFavorite: false
      });

      logger.info('Added manual contact', { userId, contactId: contact.id }, 'TransactionBasedContactService');
      return { success: true, contact };
    } catch (error) {
      logger.error('Failed to add manual contact', error, 'TransactionBasedContactService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Utility function to format wallet addresses
   */
  private static formatWalletAddress(address: string): string {
    if (!address) return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }
}
