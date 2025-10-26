/**
 * Real-Time User Search Hook
 * React hook for subscribing to real-time user search updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  realtimeUserSearchService, 
  UserSearchUpdate, 
  RealtimeUserSearchOptions 
} from '../services/search/RealtimeUserSearchService';   
import { User } from '../types';
import { logger } from '../services/analytics/loggingService';

export interface UseRealtimeUserSearchOptions extends RealtimeUserSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  onUserAdded?: (user: User) => void;
  onUserModified?: (user: User) => void;
  onUserRemoved?: (user: User) => void;
}

export interface UseRealtimeUserSearchResult {
  users: User[];
  isLoading: boolean;
  error: string | null;
  subscribe: (searchTerm: string) => void;
  unsubscribe: () => void;
  clearResults: () => void;
}

/**
 * Hook for real-time user search updates
 */
export const useRealtimeUserSearch = (
  options: UseRealtimeUserSearchOptions = {}
): UseRealtimeUserSearchResult => {
  const { 
    enabled = true, 
    debounceMs = 300,
    onUserAdded,
    onUserModified,
    onUserRemoved,
    ...searchOptions 
  } = options;
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const subscriptionIdRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const usersMapRef = useRef<Map<string, User>>(new Map());
  
  // Subscribe to real-time user search updates
  const subscribe = useCallback((searchTerm: string) => {
    if (!enabled || !searchTerm.trim() || searchTerm.length < 2) {
      return;
    }
    
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the search
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        logger.info('Subscribing to real-time user search', { 
          searchTerm: searchTerm.substring(0, 10) + '...',
          enabled 
        }, 'useRealtimeUserSearch');
        
        // Unsubscribe from previous search if exists
        if (subscriptionIdRef.current) {
          realtimeUserSearchService.unsubscribe(subscriptionIdRef.current);
        }
        
        setIsLoading(true);
        setError(null);
        
        const subscriptionId = realtimeUserSearchService.subscribe(
          searchTerm.trim(),
          (updates: UserSearchUpdate[]) => {
            logger.debug('Real-time user search updates received', {
              updateCount: updates.length,
              searchTerm: searchTerm.substring(0, 10) + '...'
            }, 'useRealtimeUserSearch');
            
            // Process updates
            const usersMap = usersMapRef.current;
            
            updates.forEach(update => {
              switch (update.type) {
                case 'added':
                  usersMap.set(update.user.id, update.user);
                  if (onUserAdded) {
                    onUserAdded(update.user);
                  }
                  break;
                  
                case 'modified':
                  usersMap.set(update.user.id, update.user);
                  if (onUserModified) {
                    onUserModified(update.user);
                  }
                  break;
                  
                case 'removed':
                  usersMap.delete(update.user.id);
                  if (onUserRemoved) {
                    onUserRemoved(update.user);
                  }
                  break;
              }
            });
            
            // Update users array
            setUsers(Array.from(usersMap.values()));
            setIsLoading(false);
          },
          searchOptions
        );
        
        subscriptionIdRef.current = subscriptionId;
        isSubscribedRef.current = true;
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to user search';
        logger.error('Failed to subscribe to real-time user search', { 
          searchTerm: searchTerm.substring(0, 10) + '...',
          error: errorMessage 
        }, 'useRealtimeUserSearch');
        
        setError(errorMessage);
        setIsLoading(false);
      }
    }, debounceMs);
    
  }, [enabled, debounceMs, onUserAdded, onUserModified, onUserRemoved, searchOptions]);
  
  // Unsubscribe from real-time user search updates
  const unsubscribe = useCallback(() => {
    if (subscriptionIdRef.current) {
      logger.info('Unsubscribing from real-time user search', { 
        subscriptionId: subscriptionIdRef.current 
      }, 'useRealtimeUserSearch');
      
      realtimeUserSearchService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      isSubscribedRef.current = false;
    }
    
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);
  
  // Clear search results
  const clearResults = useCallback(() => {
    setUsers([]);
    usersMapRef.current.clear();
    setError(null);
  }, []);
  
  // Effect to handle enabled state changes
  useEffect(() => {
    if (!enabled && isSubscribedRef.current) {
      unsubscribe();
    }
  }, [enabled, unsubscribe]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [unsubscribe]);
  
  return {
    users,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    clearResults
  };
};

/**
 * Hook for multiple real-time user search subscriptions
 */
export const useMultipleRealtimeUserSearches = (
  searchTerms: string[],
  options: UseRealtimeUserSearchOptions = {}
): {
  searchResults: Map<string, User[]>;
  isLoading: boolean;
  errors: Map<string, string>;
  subscribeAll: () => void;
  unsubscribeAll: () => void;
  clearAllResults: () => void;
} => {
  const { 
    enabled = true, 
    debounceMs = 300,
    onUserAdded,
    onUserModified,
    onUserRemoved,
    ...searchOptions 
  } = options;
  
  const [searchResults, setSearchResults] = useState<Map<string, User[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  
  const subscriptionIdsRef = useRef<Map<string, string>>(new Map());
  const usersMapsRef = useRef<Map<string, Map<string, User>>>(new Map());
  const debounceTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Subscribe to all search terms
  const subscribeAll = useCallback(() => {
    if (!enabled) {
      return;
    }
    
    searchTerms.forEach(searchTerm => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        return;
      }
      
      // Clear existing debounce timeout
      const existingTimeout = debounceTimeoutsRef.current.get(searchTerm);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Debounce the search
      const timeout = setTimeout(() => {
        try {
          const subscriptionId = realtimeUserSearchService.subscribe(
            searchTerm.trim(),
            (updates: UserSearchUpdate[]) => {
              const usersMap = usersMapsRef.current.get(searchTerm) || new Map<string, User>();
              
              // Process updates
              updates.forEach(update => {
                switch (update.type) {
                  case 'added':
                    usersMap.set(update.user.id, update.user);
                    if (onUserAdded) {
                      onUserAdded(update.user);
                    }
                    break;
                    
                  case 'modified':
                    usersMap.set(update.user.id, update.user);
                    if (onUserModified) {
                      onUserModified(update.user);
                    }
                    break;
                    
                  case 'removed':
                    usersMap.delete(update.user.id);
                    if (onUserRemoved) {
                      onUserRemoved(update.user);
                    }
                    break;
                }
              });
              
              usersMapsRef.current.set(searchTerm, usersMap);
              
              // Update search results
              setSearchResults(prev => {
                const newResults = new Map(prev);
                newResults.set(searchTerm, Array.from(usersMap.values()));
                return newResults;
              });
              
              setErrors(prev => {
                const newErrors = new Map(prev);
                newErrors.delete(searchTerm);
                return newErrors;
              });
              
            },
            searchOptions
          );
          
          subscriptionIdsRef.current.set(searchTerm, subscriptionId);
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
          setErrors(prev => {
            const newErrors = new Map(prev);
            newErrors.set(searchTerm, errorMessage);
            return newErrors;
          });
        }
      }, debounceMs);
      
      debounceTimeoutsRef.current.set(searchTerm, timeout);
    });
  }, [enabled, debounceMs, onUserAdded, onUserModified, onUserRemoved, searchOptions, searchTerms]);
  
  // Unsubscribe from all search terms
  const unsubscribeAll = useCallback(() => {
    subscriptionIdsRef.current.forEach((subscriptionId, searchTerm) => {
      realtimeUserSearchService.unsubscribe(subscriptionId);
    });
    subscriptionIdsRef.current.clear();
    
    // Clear all debounce timeouts
    debounceTimeoutsRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    debounceTimeoutsRef.current.clear();
  }, []);
  
  // Clear all search results
  const clearAllResults = useCallback(() => {
    setSearchResults(new Map());
    usersMapsRef.current.clear();
    setErrors(new Map());
  }, []);
  
  // Effect to handle subscription when search terms change
  useEffect(() => {
    if (enabled && searchTerms.length > 0) {
      subscribeAll();
    } else {
      unsubscribeAll();
    }
    
    // Cleanup on unmount
    return () => {
      unsubscribeAll();
    };
  }, [searchTerms.join(','), enabled, subscribeAll, unsubscribeAll]);
  
  return {
    searchResults,
    isLoading,
    errors,
    subscribeAll,
    unsubscribeAll,
    clearAllResults
  };
};
