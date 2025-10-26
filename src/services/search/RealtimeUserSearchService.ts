/**
 * Real-Time User Search Service
 * Provides live user search updates using Firebase real-time listeners
 */

import { 
  collection, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  Unsubscribe,
  orderBy,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { logger } from '../analytics/loggingService';
import { firebaseDataTransformers } from '../data/firebaseDataService';
import { User } from '../../types';

export interface UserSearchUpdate {
  type: 'added' | 'modified' | 'removed';
  user: User;
  timestamp: number;
}

export interface UserSearchSubscription {
  id: string;
  searchTerm: string;
  callback: (updates: UserSearchUpdate[]) => void;
  unsubscribe: Unsubscribe;
  isActive: boolean;
  lastSnapshot?: DocumentSnapshot;
}

export interface RealtimeUserSearchOptions {
  limit?: number;
  includeDeleted?: boolean;
  includeSuspended?: boolean;
  sortBy?: 'name' | 'email' | 'created_at';
  order?: 'asc' | 'desc';
}

class RealtimeUserSearchService {
  private subscriptions = new Map<string, UserSearchSubscription>();
  private readonly MAX_SUBSCRIPTIONS = 10; // Prevent memory leaks

  /**
   * Subscribe to real-time user search updates
   */
  subscribe(
    searchTerm: string,
    callback: (updates: UserSearchUpdate[]) => void,
    options: RealtimeUserSearchOptions = {}
  ): string {
    const subscriptionId = `search_${searchTerm}_${Date.now()}`;
    
    logger.info('Subscribing to real-time user search', { 
      searchTerm, 
      subscriptionId,
      options 
    }, 'RealtimeUserSearchService');
    
    // Prevent too many subscriptions
    if (this.subscriptions.size >= this.MAX_SUBSCRIPTIONS) {
      logger.warn('Maximum subscriptions reached, removing oldest', {
        currentCount: this.subscriptions.size,
        maxSubscriptions: this.MAX_SUBSCRIPTIONS
      }, 'RealtimeUserSearchService');
      
      // Remove oldest subscription
      const oldestId = this.subscriptions.keys().next().value;
      if (oldestId) {
        this.unsubscribe(oldestId);
      }
    }
    
    const {
      limit: limitCount = 20,
      includeDeleted = false,
      includeSuspended = false,
      sortBy = 'name',
      order = 'asc'
    } = options;
    
    // Create Firestore queries for name and email search
    const nameQuery = query(
      collection(db, 'users'),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff'),
      orderBy('name', order),
      limit(limitCount)
    );
    
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '>=', searchTerm),
      where('email', '<=', searchTerm + '\uf8ff'),
      orderBy('email', order),
      limit(limitCount)
    );
    
    // Track previous results for change detection
    let previousResults = new Map<string, User>();
    
    // Set up real-time listener for name search
    const unsubscribeName = onSnapshot(
      nameQuery,
      (snapshot) => {
        this.handleSearchSnapshot(
          snapshot,
          previousResults,
          callback,
          'name',
          includeDeleted,
          includeSuspended
        );
      },
      (error) => {
        logger.error('Error in name search subscription', {
          subscriptionId,
          searchTerm,
          error: error.message
        }, 'RealtimeUserSearchService');
      }
    );
    
    // Set up real-time listener for email search
    const unsubscribeEmail = onSnapshot(
      emailQuery,
      (snapshot) => {
        this.handleSearchSnapshot(
          snapshot,
          previousResults,
          callback,
          'email',
          includeDeleted,
          includeSuspended
        );
      },
      (error) => {
        logger.error('Error in email search subscription', {
          subscriptionId,
          searchTerm,
          error: error.message
        }, 'RealtimeUserSearchService');
      }
    );
    
    // Create combined unsubscribe function
    const unsubscribe = () => {
      unsubscribeName();
      unsubscribeEmail();
    };
    
    const subscription: UserSearchSubscription = {
      id: subscriptionId,
      searchTerm,
      callback,
      unsubscribe,
      isActive: true
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from real-time user search updates
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (subscription) {
      logger.info('Unsubscribing from real-time user search', { 
        subscriptionId,
        searchTerm: subscription.searchTerm 
      }, 'RealtimeUserSearchService');
      
      subscription.unsubscribe();
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
    } else {
      logger.warn('Attempted to unsubscribe from non-existent subscription', { 
        subscriptionId 
      }, 'RealtimeUserSearchService');
    }
  }
  
  /**
   * Unsubscribe all subscriptions for a specific search term
   */
  unsubscribeAllForSearchTerm(searchTerm: string): void {
    logger.info('Unsubscribing all subscriptions for search term', { searchTerm }, 'RealtimeUserSearchService');
    
    const subscriptionsToRemove: string[] = [];
    
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.searchTerm === searchTerm) {
        subscriptionsToRemove.push(id);
      }
    }
    
    subscriptionsToRemove.forEach(id => this.unsubscribe(id));
  }
  
  /**
   * Handle search snapshot changes
   */
  private handleSearchSnapshot(
    snapshot: any,
    previousResults: Map<string, User>,
    callback: (updates: UserSearchUpdate[]) => void,
    searchType: 'name' | 'email',
    includeDeleted: boolean,
    includeSuspended: boolean
  ): void {
    const updates: UserSearchUpdate[] = [];
    const currentResults = new Map<string, User>();
    
    // Process current results
    snapshot.docs.forEach((doc: any) => {
      try {
        const user = firebaseDataTransformers.firestoreToUser(doc);
        
        // Apply filters
        if (!includeDeleted && user.status === 'deleted') return;
        if (!includeSuspended && user.status === 'suspended') return;
        
        currentResults.set(user.id, user);
        
        // Check if this is a new or modified user
        const previousUser = previousResults.get(user.id);
        if (!previousUser) {
          // New user
          updates.push({
            type: 'added',
            user,
            timestamp: Date.now()
          });
        } else if (this.hasUserChanged(previousUser, user)) {
          // Modified user
          updates.push({
            type: 'modified',
            user,
            timestamp: Date.now()
          });
        }
        
      } catch (error) {
        logger.error('Error processing user document', {
          docId: doc.id,
          searchType,
          error: error instanceof Error ? error.message : String(error)
        }, 'RealtimeUserSearchService');
      }
    });
    
    // Check for removed users
    for (const [userId, previousUser] of previousResults) {
      if (!currentResults.has(userId)) {
        updates.push({
          type: 'removed',
          user: previousUser,
          timestamp: Date.now()
        });
      }
    }
    
    // Update previous results
    previousResults.clear();
    currentResults.forEach((user, id) => {
      previousResults.set(id, user);
    });
    
    // Call callback if there are updates
    if (updates.length > 0) {
      logger.debug('User search updates detected', {
        searchType,
        updateCount: updates.length,
        updates: updates.map(u => ({ type: u.type, userId: u.user.id, userName: u.user.name }))
      }, 'RealtimeUserSearchService');
      
      callback(updates);
    }
  }
  
  /**
   * Check if a user has changed
   */
  private hasUserChanged(previousUser: User, currentUser: User): boolean {
    return (
      previousUser.name !== currentUser.name ||
      previousUser.email !== currentUser.email ||
      previousUser.avatar !== currentUser.avatar ||
      previousUser.status !== currentUser.status ||
      previousUser.wallet_address !== currentUser.wallet_address
    );
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
  getActiveSubscriptions(): UserSearchSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }
  
  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    logger.info('Cleaning up real-time user search service', {}, 'RealtimeUserSearchService');
    
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const realtimeUserSearchService = new RealtimeUserSearchService();
