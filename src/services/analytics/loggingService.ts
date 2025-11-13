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
type LogData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

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

export default loggingService;