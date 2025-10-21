/**
 * User Search Service
 * Provides comprehensive user search and discovery functionality
 */

import { firebaseDataService } from './firebaseDataService';
import { logger } from './loggingService';
import { User, UserContact, Transaction } from '../types';

export interface UserSearchResult extends User {
  isAlreadyContact: boolean;
  relationshipType?: 'contact' | 'transaction_partner' | 'split_participant' | 'none';
  lastInteraction?: string;
  mutualConnections?: number;
}

export interface UserSearchOptions {
  limit?: number;
  includeDeleted?: boolean;
  includeSuspended?: boolean;
  sortBy?: 'relevance' | 'name' | 'recent_activity';
  relationshipFilter?: 'all' | 'contacts' | 'non_contacts' | 'transaction_partners';
}

export class UserSearchService {
  /**
   * Test Firebase connectivity
   */
  static async testFirebaseConnection(): Promise<boolean> {
    try {
      logger.debug('Testing Firebase connection', null, 'UserSearchService');
      // Try to access the firebaseDataService
      if (!firebaseDataService) {
        logger.error('firebaseDataService is not available', null, 'UserSearchService');
        return false;
      }
      
      // Try to access the searchUsersByUsername method
      if (typeof firebaseDataService.searchUsersByUsername !== 'function') {
        logger.error('searchUsersByUsername method is not available', null, 'UserSearchService');
        return false;
      }
      
      logger.debug('Firebase connection test passed', null, 'UserSearchService');
      return true;
    } catch (error) {
      logger.error('Firebase connection test failed', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      }, 'UserSearchService');
      return false;
    }
  }

  /**
   * Search users with advanced filtering and relationship context
   */
  static async searchUsers(
    searchTerm: string,
    currentUserId: string,
    options: UserSearchOptions = {}
  ): Promise<UserSearchResult[]> {
    try {
      logger.info('Starting advanced user search', { 
        searchTerm, 
        currentUserId, 
        options 
      }, 'UserSearchService');

      // Test Firebase connectivity first
      const isFirebaseConnected = await this.testFirebaseConnection();
      if (!isFirebaseConnected) {
        throw new Error('Firebase connection test failed');
      }

      const {
        limit = 20,
        includeDeleted = false,
        includeSuspended = false,
        sortBy = 'relevance',
        relationshipFilter = 'all'
      } = options;

      // Get basic search results
      logger.debug('About to call searchUsersByUsername', { searchTerm, currentUserId }, 'UserSearchService');
      let searchResults: User[] = [];
      try {
        searchResults = await firebaseDataService.searchUsersByUsername(
          searchTerm,
          currentUserId
        );
        logger.debug('searchUsersByUsername completed', { resultCount: searchResults.length }, 'UserSearchService');
      } catch (searchError) {
        logger.error('searchUsersByUsername failed', {
          error: searchError instanceof Error ? {
            message: searchError.message,
            stack: searchError.stack,
            name: searchError.name
          } : searchError,
          searchTerm,
          currentUserId
        }, 'UserSearchService');
        throw searchError;
      }

      // Get current user's contacts for relationship context
      logger.debug('About to get user contacts', { currentUserId }, 'UserSearchService');
      let userContacts: UserContact[] = [];
      try {
        userContacts = await firebaseDataService.user.getUserContacts(currentUserId);
        logger.debug('User contacts retrieved', { contactCount: userContacts.length }, 'UserSearchService');
      } catch (contactsError) {
        logger.error('getUserContacts failed', {
          error: contactsError instanceof Error ? {
            message: contactsError.message,
            stack: contactsError.stack,
            name: contactsError.name
          } : contactsError,
          currentUserId
        }, 'UserSearchService');
        // Continue with empty contacts rather than failing the entire search
      }
      const contactIds = new Set(userContacts.map(contact => contact.id));

      // Get transaction history for relationship context
      logger.debug('About to get user transactions', { currentUserId }, 'UserSearchService');
      let transactions: Transaction[] = [];
      try {
        transactions = await firebaseDataService.transaction.getUserTransactions(currentUserId);
        logger.debug('User transactions retrieved', { transactionCount: transactions.length }, 'UserSearchService');
      } catch (transactionsError) {
        logger.error('getUserTransactions failed', {
          error: transactionsError instanceof Error ? {
            message: transactionsError.message,
            stack: transactionsError.stack,
            name: transactionsError.name
          } : transactionsError,
          currentUserId
        }, 'UserSearchService');
        // Continue with empty transactions rather than failing the entire search
      }
      const transactionPartnerIds = new Set<string>();
      
      transactions.forEach(transaction => {
        if (transaction.from_user === currentUserId) {
          transactionPartnerIds.add(transaction.to_user);
        } else if (transaction.to_user === currentUserId) {
          transactionPartnerIds.add(transaction.from_user);
        }
      });

      // Enrich search results with relationship context
      const enrichedResults: UserSearchResult[] = searchResults
        .filter(user => {
          // Apply filters
          if (!includeDeleted && user.status === 'deleted') return false;
          if (!includeSuspended && user.status === 'suspended') return false;
          
          // Apply relationship filter
          switch (relationshipFilter) {
            case 'contacts':
              return contactIds.has(user.id);
            case 'non_contacts':
              return !contactIds.has(user.id);
            case 'transaction_partners':
              return transactionPartnerIds.has(user.id);
            case 'all':
            default:
              return true;
          }
        })
        .map(user => {
          const isAlreadyContact = contactIds.has(user.id);
          const isTransactionPartner = transactionPartnerIds.has(user.id);
          
          let relationshipType: UserSearchResult['relationshipType'] = 'none';
          if (isAlreadyContact) {
            relationshipType = 'contact';
          } else if (isTransactionPartner) {
            relationshipType = 'transaction_partner';
          }

          return {
            ...user,
            isAlreadyContact,
            relationshipType,
            mutualConnections: 0 // Could be calculated from shared contacts
          } as UserSearchResult;
        });

      // Sort results
      enrichedResults.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'recent_activity':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'relevance':
          default:
            // Prioritize contacts, then transaction partners, then others
            if (a.relationshipType === 'contact' && b.relationshipType !== 'contact') return -1;
            if (b.relationshipType === 'contact' && a.relationshipType !== 'contact') return 1;
            if (a.relationshipType === 'transaction_partner' && b.relationshipType === 'none') return -1;
            if (b.relationshipType === 'transaction_partner' && a.relationshipType === 'none') return 1;
            
            // Then by name
            return a.name.localeCompare(b.name);
        }
      });

      // Apply limit
      const limitedResults = enrichedResults.slice(0, limit);

      logger.info('User search completed', { 
        searchTerm, 
        totalResults: searchResults.length,
        filteredResults: enrichedResults.length,
        returnedResults: limitedResults.length
      }, 'UserSearchService');

      return limitedResults;
    } catch (error) {
      logger.error('Failed to search users', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        searchTerm,
        currentUserId,
        options
      }, 'UserSearchService');
      return [];
    }
  }

  /**
   * Get user suggestions based on various criteria
   */
  static async getUserSuggestions(
    currentUserId: string,
    options: {
      limit?: number;
      includeContacts?: boolean;
      includeTransactionPartners?: boolean;
      includeRecentUsers?: boolean;
    } = {}
  ): Promise<UserSearchResult[]> {
    try {
      const {
        limit = 10,
        includeContacts = false,
        includeTransactionPartners = true,
        includeRecentUsers = true
      } = options;

      logger.info('Getting user suggestions', { 
        currentUserId, 
        options 
      }, 'UserSearchService');

      const suggestions: UserSearchResult[] = [];

      // Get transaction partners
      if (includeTransactionPartners) {
        const transactions = await firebaseDataService.transaction.getUserTransactions(currentUserId);
        const partnerIds = new Set<string>();
        transactions.forEach(transaction => {
          if (transaction.from_user === currentUserId) {
            partnerIds.add(transaction.to_user);
          } else if (transaction.to_user === currentUserId) {
            partnerIds.add(transaction.from_user);
          }
        });

        // Get user details for transaction partners
        for (const partnerId of Array.from(partnerIds).slice(0, 5)) {
          try {
            const user = await firebaseDataService.user.getCurrentUser(partnerId);
            if (user && user.status !== 'deleted' && user.status !== 'suspended') {
              suggestions.push({
                ...user,
                isAlreadyContact: false,
                relationshipType: 'transaction_partner'
              });
            }
          } catch (error) {
            logger.warn('Failed to get user details for suggestion', { partnerId, error }, 'UserSearchService');
          }
        }
      }

      // Get recent users (users who joined recently)
      if (includeRecentUsers) {
        const recentUsers = await this.getRecentUsers(5);
        suggestions.push(...recentUsers.map(user => ({
          ...user,
          isAlreadyContact: false,
          relationshipType: 'none' as const
        })));
      }

      // Remove duplicates and apply limit
      const uniqueSuggestions = suggestions
        .filter((user, index, self) => 
          index === self.findIndex(u => u.id === user.id)
        )
        .slice(0, limit);

      logger.info('User suggestions generated', { 
        currentUserId, 
        suggestionCount: uniqueSuggestions.length 
      }, 'UserSearchService');

      return uniqueSuggestions;
    } catch (error) {
      logger.error('Failed to get user suggestions', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        currentUserId,
        options
      }, 'UserSearchService');
      return [];
    }
  }

  /**
   * Get recent users (for discovery)
   */
  private static async getRecentUsers(limit: number = 10): Promise<User[]> {
    try {
      // This would need to be implemented in firebaseDataService
      // For now, return empty array
      logger.warn('getRecentUsers not implemented yet', null, 'UserSearchService');
      return [];
    } catch (error) {
      logger.error('Failed to get recent users', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        limit
      }, 'UserSearchService');
      return [];
    }
  }

  /**
   * Search users by wallet address
   */
  static async searchUsersByWalletAddress(
    walletAddress: string,
    currentUserId: string
  ): Promise<UserSearchResult[]> {
    try {
      logger.info('Searching users by wallet address', { 
        walletAddress: walletAddress.substring(0, 8) + '...',
        currentUserId 
      }, 'UserSearchService');

      // Use the existing search function with wallet address as search term
      const searchResults = await firebaseDataService.searchUsersByUsername(
        walletAddress,
        currentUserId
      );

      // Filter results to only include exact wallet address matches
      const walletMatches = searchResults.filter(user => 
        user.wallet_address?.toLowerCase() === walletAddress.toLowerCase()
      );

      // Enrich with relationship context
      const userContacts = await firebaseDataService.user.getUserContacts(currentUserId);
      const contactIds = new Set(userContacts.map(contact => contact.id));

      const enrichedResults: UserSearchResult[] = walletMatches.map(user => ({
        ...user,
        isAlreadyContact: contactIds.has(user.id),
        relationshipType: contactIds.has(user.id) ? 'contact' : 'none'
      }));

      logger.info('Wallet address search completed', { 
        walletAddress: walletAddress.substring(0, 8) + '...',
        matches: enrichedResults.length 
      }, 'UserSearchService');

      return enrichedResults;
    } catch (error) {
      logger.error('Failed to search users by wallet address', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        walletAddress: walletAddress.substring(0, 8) + '...',
        currentUserId
      }, 'UserSearchService');
      return [];
    }
  }

  /**
   * Get user profile for display
   */
  static async getUserProfile(
    userId: string,
    currentUserId: string
  ): Promise<UserSearchResult | null> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      if (!user) return null;

      // Get relationship context
      const userContacts = await firebaseDataService.user.getUserContacts(currentUserId);
      const isAlreadyContact = userContacts.some(contact => contact.id === userId);

      return {
        ...user,
        isAlreadyContact,
        relationshipType: isAlreadyContact ? 'contact' : 'none'
      };
    } catch (error) {
      logger.error('Failed to get user profile', { 
        userId, 
        currentUserId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      }, 'UserSearchService');
      return null;
    }
  }
}
