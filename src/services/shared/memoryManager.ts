/**
 * Memory Manager Service
 * Handles memory optimization and cleanup to prevent heap overflow
 */

import { logger } from '../core';

interface ModuleCache {
  [key: string]: {
    module: any;
    lastAccessed: number;
    accessCount: number;
  };
}

class MemoryManager {
  private static instance: MemoryManager;
  private moduleCache: ModuleCache = {};
  private readonly MAX_CACHE_SIZE = 10;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.startPeriodicCleanup();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Load module with caching and memory management
   */
  public async loadModule<T = any>(moduleName: string): Promise<T> {
    const now = Date.now();
    
    // Check if module is already cached and not expired
    if (this.moduleCache[moduleName]) {
      const cached = this.moduleCache[moduleName];
      if (now - cached.lastAccessed < this.CACHE_TTL) {
        cached.lastAccessed = now;
        cached.accessCount++;
        logger.debug('Module loaded from cache', { moduleName, accessCount: cached.accessCount }, 'MemoryManager');
        return cached.module;
      } else {
        // Remove expired module
        delete this.moduleCache[moduleName];
      }
    }

    // Load module dynamically
    let module: any;
    try {
      switch (moduleName) {
        case 'solana-web3':
          module = await import('@solana/web3.js');
          break;
        case 'solana-spl-token':
          module = await import('@solana/spl-token');
          break;
        case 'firebase-firestore':
          module = await import('firebase/firestore');
          break;
        case 'firebase-config':
          module = await import('../../config/firebase/firebase');
          break;
        case 'unified-config':
          module = await import('../../config/unified');
          break;
        case 'transaction-config':
          module = await import('../../config/transactionConfig');
          break;
        case 'logger':
          module = await import('../core');
          break;
        case 'keypair-utils':
          module = await import('./keypairUtils');
          break;
        case 'balance-utils':
          module = await import('./balanceUtils');
          break;
        default:
          throw new Error(`Unknown module: ${moduleName}`);
      }

      // Cache the module
      this.cacheModule(moduleName, module);
      
      logger.debug('Module loaded and cached', { moduleName }, 'MemoryManager');
      return module;
    } catch (error) {
      logger.error('Failed to load module', { moduleName, error }, 'MemoryManager');
      throw error;
    }
  }

  /**
   * Cache module with memory management
   */
  private cacheModule(moduleName: string, module: any): void {
    // If cache is full, remove least recently used module
    if (Object.keys(this.moduleCache).length >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.moduleCache[moduleName] = {
      module,
      lastAccessed: Date.now(),
      accessCount: 1
    };
  }

  /**
   * Remove least recently used module from cache
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, value] of Object.entries(this.moduleCache)) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      delete this.moduleCache[oldestKey];
      logger.debug('Evicted module from cache', { moduleName: oldestKey }, 'MemoryManager');
    }
  }

  /**
   * Start periodic cleanup of expired modules
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredModules();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired modules from cache
   */
  private cleanupExpiredModules(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of Object.entries(this.moduleCache)) {
      if (now - value.lastAccessed > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      delete this.moduleCache[key];
    });

    if (expiredKeys.length > 0) {
      logger.debug('Cleaned up expired modules', { 
        expiredCount: expiredKeys.length, 
        remainingCount: Object.keys(this.moduleCache).length 
      }, 'MemoryManager');
    }
  }

  /**
   * Force garbage collection if available
   */
  public forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection', {}, 'MemoryManager');
    }
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    cacheSize: number;
    maxCacheSize: number;
    modules: string[];
  } {
    return {
      cacheSize: Object.keys(this.moduleCache).length,
      maxCacheSize: this.MAX_CACHE_SIZE,
      modules: Object.keys(this.moduleCache)
    };
  }

  /**
   * Clear all cached modules
   */
  public clearCache(): void {
    const clearedCount = Object.keys(this.moduleCache).length;
    this.moduleCache = {};
    logger.info('Cleared module cache', { clearedCount }, 'MemoryManager');
  }

  /**
   * Cleanup on app shutdown
   */
  public cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearCache();
  }
}

export const memoryManager = MemoryManager.getInstance();
