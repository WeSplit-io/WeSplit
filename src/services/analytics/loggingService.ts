/**
 * Logging Service
 * Centralized logging functionality
 */

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

// Log data can be any serializable object
export type LogData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

export interface LogEntry {
  level: string;
  message: string;
  data?: LogData;
  timestamp: string;
  source?: string;
}

class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {}

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private log(level: string, message: string, data?: LogData, source?: string): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source
    };

    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (__DEV__) {
      console.log(`[${level.toUpperCase()}] ${source ? `[${source}] ` : ''}${message}`, data || '');
    }
  }

  public debug(message: string, data?: LogData, source?: string): void {
    this.log('debug', message, data, source);
  }

  public info(message: string, data?: LogData, source?: string): void {
    this.log('info', message, data, source);
  }

  public warn(message: string, data?: LogData, source?: string): void {
    this.log('warn', message, data, source);
  }

  public error(message: string, data?: LogData, source?: string): void {
    this.log('error', message, data, source);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const loggingService = LoggingService.getInstance();
export const logger = loggingService;

/**
 * Utility functions for safe data logging
 * These functions help prevent sensitive data leakage in logs
 */
export const safeLogging = {
  /**
   * Safely truncate wallet addresses for logging
   * @param address - The wallet address to truncate
   * @param visibleChars - Number of characters to show at start and end (default: 4)
   * @returns Truncated address or placeholder if invalid
   */
  truncateWalletAddress: (address: string | null | undefined, visibleChars = 4): string => {
    if (!address || typeof address !== 'string') {
      return 'invalid_address';
    }
    if (address.length <= visibleChars * 2) {
      return `${address.substring(0, visibleChars)}...`;
    }
    return `${address.substring(0, visibleChars)}...${address.substring(address.length - visibleChars)}`;
  },

  /**
   * Safely log balance information
   * @param balance - The balance value
   * @param currency - The currency (optional)
   * @returns Safe balance representation
   */
  safeBalance: (balance: number | string | null | undefined, currency?: string): string => {
    if (balance === null || balance === undefined) {
      return 'null_balance';
    }
    const balanceStr = typeof balance === 'string' ? balance : balance.toString();
    const balanceNum = parseFloat(balanceStr);

    if (isNaN(balanceNum)) {
      return 'invalid_balance';
    }

    // For very large balances, show approximate value
    if (balanceNum > 10000) {
      return `~${Math.round(balanceNum)} ${currency || 'tokens'}`;
    }

    // For normal balances, show exact value
    return `${balanceNum} ${currency || 'tokens'}`;
  },

  /**
   * Create a safe log object that redacts sensitive data
   * @param data - The data object to sanitize
   * @param sensitiveKeys - Array of keys that contain sensitive data
   * @returns Sanitized data object
   */
  sanitizeLogData: <T extends Record<string, unknown>>(
    data: T,
    sensitiveKeys: (keyof T)[] = ['address', 'walletAddress', 'privateKey', 'secret', 'password', 'token']
  ): Partial<T> => {
    const sanitized = { ...data };

    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        const value = sanitized[key];
        if (typeof value === 'string') {
          if (key === 'address' || key === 'walletAddress') {
            sanitized[key] = safeLogging.truncateWalletAddress(value) as T[keyof T];
          } else {
            sanitized[key] = '[REDACTED]' as T[keyof T];
          }
        }
      }
    });

    return sanitized;
  }
};

/**
 * URL validation and sanitization utilities
 */
export const urlUtils = {
  /**
   * Validate if a URL is safe to use
   * @param url - The URL to validate
   * @returns True if URL is safe, false otherwise
   */
  isValidUrl: (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const parsedUrl = new URL(url);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }

      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        /\.\./,  // Directory traversal
        /[<>'"]/  // Potential XSS characters
      ];

      return !dangerousPatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  },

  /**
   * Sanitize and validate an asset URL
   * @param url - The URL to sanitize
   * @param allowedDomains - Array of allowed domains (optional)
   * @returns Sanitized URL or null if invalid
   */
  sanitizeAssetUrl: (
    url: string | null | undefined,
    allowedDomains: string[] = ['firebasestorage.googleapis.com', 'storage.googleapis.com']
  ): string | null => {
    if (!url || typeof url !== 'string') {
      return null;
    }

    if (!urlUtils.isValidUrl(url)) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);

      // Check if domain is allowed
      const isDomainAllowed = allowedDomains.some(domain =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      );

      if (!isDomainAllowed) {
        return null;
      }

      // Return the URL as-is if it passes validation
      return url;
    } catch {
      return null;
    }
  },

  /**
   * Check if URL is an SVG
   * @param url - The URL to check
   * @returns True if URL appears to be an SVG
   */
  isSvgUrl: (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') {
      return false;
    }
    return url.toLowerCase().includes('.svg');
  }
};

export default loggingService;