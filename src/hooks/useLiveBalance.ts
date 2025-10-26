/**
 * Live Balance Hook
 * React hook for subscribing to real-time balance updates
 */

import { useEffect, useRef, useState } from 'react';
import { liveBalanceService, BalanceUpdate } from '../services/blockchain/balance/LiveBalanceService';  
import { logger } from '../services/analytics/loggingService';

export interface UseLiveBalanceOptions {
  enabled?: boolean;
  onBalanceChange?: (update: BalanceUpdate) => void;
}

export interface UseLiveBalanceResult {
  balance: BalanceUpdate | null;
  isLoading: boolean;
  error: string | null;
  subscribe: (address: string) => void;
  unsubscribe: () => void;
  forceUpdate: () => Promise<void>;
}

/**
 * Hook for live balance updates
 */
export const useLiveBalance = (
  address: string | null,
  options: UseLiveBalanceOptions = {}
): UseLiveBalanceResult => {
  const { enabled = true, onBalanceChange } = options;
  
  const [balance, setBalance] = useState<BalanceUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const subscriptionIdRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);
  
  // Subscribe to balance updates
  const subscribe = (targetAddress: string) => {
    if (!enabled || isSubscribedRef.current) {
      return;
    }
    
    try {
      logger.info('Subscribing to live balance updates', { address: targetAddress }, 'useLiveBalance');
      
      const subscriptionId = liveBalanceService.subscribe(targetAddress, (update) => {
        logger.debug('Live balance update received', { 
          address: update.address,
          usdcBalance: update.usdcBalance,
          solBalance: update.solBalance
        }, 'useLiveBalance');
        
        setBalance(update);
        setError(null);
        
        // Call custom callback if provided
        if (onBalanceChange) {
          onBalanceChange(update);
        }
      });
      
      subscriptionIdRef.current = subscriptionId;
      isSubscribedRef.current = true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to balance updates';
      logger.error('Failed to subscribe to live balance', { 
        address: targetAddress, 
        error: errorMessage 
      }, 'useLiveBalance');
      
      setError(errorMessage);
    }
  };
  
  // Unsubscribe from balance updates
  const unsubscribe = () => {
    if (subscriptionIdRef.current) {
      logger.info('Unsubscribing from live balance updates', { 
        subscriptionId: subscriptionIdRef.current 
      }, 'useLiveBalance');
      
      liveBalanceService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      isSubscribedRef.current = false;
    }
  };
  
  // Force update balance
  const forceUpdate = async () => {
    if (!address) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await liveBalanceService.forceUpdate(address);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to force update balance';
      logger.error('Failed to force update balance', { 
        address, 
        error: errorMessage 
      }, 'useLiveBalance');
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to handle subscription when address changes
  useEffect(() => {
    if (address && enabled) {
      subscribe(address);
    } else {
      unsubscribe();
    }
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [address, enabled]);
  
  // Effect to handle enabled state changes
  useEffect(() => {
    if (!enabled && isSubscribedRef.current) {
      unsubscribe();
    } else if (enabled && address && !isSubscribedRef.current) {
      subscribe(address);
    }
  }, [enabled]);
  
  return {
    balance,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    forceUpdate
  };
};

/**
 * Hook for multiple live balance subscriptions
 */
export const useMultipleLiveBalances = (
  addresses: string[],
  options: UseLiveBalanceOptions = {}
): {
  balances: Map<string, BalanceUpdate>;
  isLoading: boolean;
  errors: Map<string, string>;
  subscribeAll: () => void;
  unsubscribeAll: () => void;
  forceUpdateAll: () => Promise<void>;
} => {
  const { enabled = true, onBalanceChange } = options;
  
  const [balances, setBalances] = useState<Map<string, BalanceUpdate>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  
  const subscriptionIdsRef = useRef<Map<string, string>>(new Map());
  
  // Subscribe to all addresses
  const subscribeAll = () => {
    if (!enabled) {
      return;
    }
    
    addresses.forEach(address => {
      if (!subscriptionIdsRef.current.has(address)) {
        try {
          const subscriptionId = liveBalanceService.subscribe(address, (update) => {
            setBalances(prev => {
              const newBalances = new Map(prev);
              newBalances.set(update.address, update);
              return newBalances;
            });
            
            setErrors(prev => {
              const newErrors = new Map(prev);
              newErrors.delete(address);
              return newErrors;
            });
            
            if (onBalanceChange) {
              onBalanceChange(update);
            }
          });
          
          subscriptionIdsRef.current.set(address, subscriptionId);
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
          setErrors(prev => {
            const newErrors = new Map(prev);
            newErrors.set(address, errorMessage);
            return newErrors;
          });
        }
      }
    });
  };
  
  // Unsubscribe from all addresses
  const unsubscribeAll = () => {
    subscriptionIdsRef.current.forEach((subscriptionId, address) => {
      liveBalanceService.unsubscribe(subscriptionId);
    });
    subscriptionIdsRef.current.clear();
  };
  
  // Force update all addresses
  const forceUpdateAll = async () => {
    setIsLoading(true);
    
    try {
      await Promise.allSettled(
        addresses.map(address => liveBalanceService.forceUpdate(address))
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to handle subscription when addresses change
  useEffect(() => {
    if (enabled && addresses.length > 0) {
      subscribeAll();
    } else {
      unsubscribeAll();
    }
    
    // Cleanup on unmount
    return () => {
      unsubscribeAll();
    };
  }, [addresses.join(','), enabled]);
  
  return {
    balances,
    isLoading,
    errors,
    subscribeAll,
    unsubscribeAll,
    forceUpdateAll
  };
};
