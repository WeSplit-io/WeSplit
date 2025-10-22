/**
 * Monitoring service for detecting and handling rate limiting issues
 */

import { logger } from './loggingService';

interface RequestMetrics {
  endpoint: string;
  timestamp: number;
  status: number;
  responseTime: number;
  error?: string;
}

interface RateLimitInfo {
  endpoint: string;
  last429Time: number;
  consecutive429s: number;
  totalRequests: number;
}

class MonitoringService {
  private requestHistory: RequestMetrics[] = [];
  private rateLimitMap = new Map<string, RateLimitInfo>();
  private readonly MAX_HISTORY = 1000;
  private readonly RATE_LIMIT_THRESHOLD = 3; // Number of 429s before considering it a problem

  logRequest(endpoint: string, status: number, responseTime: number, error?: string) {
    const metric: RequestMetrics = {
      endpoint,
      timestamp: Date.now(),
      status,
      responseTime,
      error
    };

    this.requestHistory.push(metric);

    // Keep only the last MAX_HISTORY requests
    if (this.requestHistory.length > this.MAX_HISTORY) {
      this.requestHistory.shift();
    }

    // Track rate limiting for this endpoint
    if (status === 429) {
      this.updateRateLimitInfo(endpoint);
    }

    // Log problematic patterns
    this.detectRateLimitPatterns(endpoint);
  }

  private updateRateLimitInfo(endpoint: string) {
    const now = Date.now();
    const existing = this.rateLimitMap.get(endpoint) || {
      endpoint,
      last429Time: 0,
      consecutive429s: 0,
      totalRequests: 0
    };

    existing.last429Time = now;
    existing.consecutive429s++;
    existing.totalRequests++;

    this.rateLimitMap.set(endpoint, existing);
  }

  private detectRateLimitPatterns(endpoint: string) {
    const info = this.rateLimitMap.get(endpoint);
    if (!info) {return;}

    // If we're getting too many 429s, suggest increasing cache duration
    if (info.consecutive429s >= this.RATE_LIMIT_THRESHOLD) {
      console.warn(`🚨 Rate limit pattern detected for ${endpoint}: ${info.consecutive429s} consecutive 429s`);
      this.suggestOptimizations(endpoint);
    }
  }

  private suggestOptimizations(endpoint: string) {
    logger.info('Performance suggestions for endpoint', { endpoint, suggestions: ['Increase cache duration', 'Implement request batching', 'Add exponential backoff', 'Consider using WebSocket for real-time data'] }, 'monitoringService');
  }

  getRateLimitStats(): RateLimitInfo[] {
    return Array.from(this.rateLimitMap.values());
  }

  getEndpointStats(endpoint: string) {
    const endpointRequests = this.requestHistory.filter(r => r.endpoint === endpoint);
    const totalRequests = endpointRequests.length;
    const errorRequests = endpointRequests.filter(r => r.status >= 400).length;
    const avgResponseTime = endpointRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;

    return {
      endpoint,
      totalRequests,
      errorRequests,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      avgResponseTime,
      lastRequest: endpointRequests[endpointRequests.length - 1]?.timestamp
    };
  }

  shouldThrottle(endpoint: string): boolean {
    const info = this.rateLimitMap.get(endpoint);
    if (!info) {return false;}

    const timeSinceLast429 = Date.now() - info.last429Time;
    const isRecent = timeSinceLast429 < 5 * 60 * 1000; // 5 minutes
    const hasMany429s = info.consecutive429s >= this.RATE_LIMIT_THRESHOLD;

    return isRecent && hasMany429s;
  }

  resetRateLimitInfo(endpoint: string) {
    this.rateLimitMap.delete(endpoint);
  }
}

export const monitoringService = new MonitoringService(); 