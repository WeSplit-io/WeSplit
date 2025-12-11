/**
 * Debounce and Throttle Utilities
 * Prevent rapid duplicate calls and race conditions
 */

/**
 * Debounce function - delays execution until after wait time has passed
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to at most once per wait time
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T> | undefined;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
    return lastResult;
  };
}

/**
 * Request deduplication - ensures same request only executes once
 */
export class RequestDeduplicator<T extends (...args: any[]) => Promise<any>> {
  private inProgress = new Map<string, Promise<ReturnType<T>>>();

  /**
   * Execute function with deduplication based on key
   */
  async execute(key: string, fn: T, ...args: Parameters<T>): Promise<ReturnType<T>> {
    // If already in progress, return existing promise
    if (this.inProgress.has(key)) {
      return this.inProgress.get(key)!;
    }

    // Create new promise
    const promise = fn(...args).finally(() => {
      // Clean up when done
      this.inProgress.delete(key);
    });

    this.inProgress.set(key, promise);
    return promise;
  }

  /**
   * Check if request is in progress
   */
  isInProgress(key: string): boolean {
    return this.inProgress.has(key);
  }

  /**
   * Clear all in-progress requests
   */
  clear(): void {
    this.inProgress.clear();
  }
}

/**
 * Default debounce times (in milliseconds)
 */
export const DEBOUNCE_TIMES = {
  WALLET_CREATION: 1000, // 1 second
  STATUS_UPDATE: 500, // 500ms
  PARTICIPANT_UPDATE: 500, // 500ms
  SEARCH: 300, // 300ms
} as const;
