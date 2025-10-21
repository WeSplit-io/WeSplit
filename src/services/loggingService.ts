/**
 * Centralized logging service for WeSplit app
 * Prevents sensitive data exposure and provides consistent logging
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogData {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  component?: string;
}

class LoggingService {
  private isDevelopment = __DEV__;
  private sensitiveKeys = ['secretKey', 'privateKey', 'seedPhrase', 'mnemonic', 'password', 'token'];

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    for (const key of this.sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private formatLog(level: LogLevel, message: string, data?: any, component?: string): LogData {
    return {
      level,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      timestamp: new Date().toISOString(),
      component
    };
  }

  debug(message: string, data?: any, component?: string) {
    if (this.isDevelopment) {
      const logData = this.formatLog(LogLevel.DEBUG, message, data, component);
      console.log(`[DEBUG] ${logData.component ? `[${logData.component}] ` : ''}${message}`, logData.data || '');
    }
  }

  info(message: string, data?: any, component?: string) {
    const logData = this.formatLog(LogLevel.INFO, message, data, component);
    console.log(`[INFO] ${logData.component ? `[${logData.component}] ` : ''}${message}`, logData.data || '');
  }

  warn(message: string, data?: any, component?: string) {
    const logData = this.formatLog(LogLevel.WARN, message, data, component);
    console.warn(`[WARN] ${logData.component ? `[${logData.component}] ` : ''}${message}`, logData.data || '');
  }

  error(message: string, error?: any, component?: string) {
    const logData = this.formatLog(LogLevel.ERROR, message, error, component);
    console.error(`[ERROR] ${logData.component ? `[${logData.component}] ` : ''}${message}`, logData.data || '');
  }

  // Special method for wallet operations (never logs sensitive data)
  wallet(message: string, data?: any, component?: string) {
    if (this.isDevelopment) {
      const sanitizedData = data ? this.sanitizeData(data) : undefined;
      console.log(`[WALLET] ${component ? `[${component}] ` : ''}${message}`, sanitizedData || '');
    }
  }

  // Special method for API operations
  api(message: string, data?: any, component?: string) {
    if (this.isDevelopment) {
      const logData = this.formatLog(LogLevel.INFO, message, data, component);
      console.log(`[API] ${logData.component ? `[${logData.component}] ` : ''}${message}`, logData.data || '');
    }
  }
}

export const logger = new LoggingService();
export default logger;