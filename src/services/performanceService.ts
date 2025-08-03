/**
 * Performance optimization service
 * Provides utilities for memoization and performance optimization
 */

import { useMemo, useCallback, useRef } from 'react';
import { logger } from './loggingService';

export interface MemoizationOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

class PerformanceService {
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();

  /**
   * Memoize expensive calculations with cache invalidation
   */
  memoize<T>(
    key: string, 
    fn: () => T, 
    dependencies: any[], 
    options: MemoizationOptions = {}
  ): T {
    const { maxSize = 100, ttl = 5 * 60 * 1000 } = options; // 5 minutes default TTL

    // Clean up expired cache entries
    this.cleanupCache(ttl);

    // Check if we have a cached value
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value;
    }

    // Calculate new value
    const value = fn();
    
    // Cache the result
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Enforce max cache size
    if (this.cache.size > maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    return value;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(ttl: number): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Performance cache cleared', null, 'PerformanceService');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const performanceService = new PerformanceService();

/**
 * React hook for optimized memoization
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  dependencies: any[],
  options: MemoizationOptions = {}
): T {
  const cacheKey = useRef<string>('');
  
  // Generate cache key from dependencies
  const newCacheKey = JSON.stringify(dependencies);
  cacheKey.current = newCacheKey;

  return useMemo(() => {
    return performanceService.memoize(
      cacheKey.current,
      factory,
      dependencies,
      options
    );
  }, dependencies);
}

/**
 * React hook for optimized callbacks
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  return useCallback(callback, dependencies);
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
} 