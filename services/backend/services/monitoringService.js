const Sentry = require('@sentry/node');

// Initialize Sentry for error monitoring
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || 'your-sentry-dsn-here',
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: require('express')() }),
    ],
  });
}

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      slowQueries: 0,
      avgResponseTime: 0,
      startTime: Date.now()
    };
    this.requestTimes = [];
  }

  // Log application errors
  logError(error, context = {}) {
    console.error('Application Error:', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        contexts: {
          custom: context
        }
      });
    }
  }

  // Log API request
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: responseTime,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Update metrics
    this.metrics.requests++;
    this.requestTimes.push(responseTime);
    
    // Keep only last 100 request times for average calculation
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift();
    }
    
    this.metrics.avgResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;

    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      this.metrics.slowQueries++;
      console.warn('Slow Request:', logData);
    }

    // Log errors
    if (res.statusCode >= 400) {
      this.metrics.errors++;
      console.error('Error Response:', logData);
    }

    // Regular request logging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Request:', logData);
    }
  }

  // Log database operations
  logDatabaseOperation(operation, query, params, executionTime) {
    const logData = {
      operation,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params ? JSON.stringify(params).substring(0, 100) : null,
      executionTime,
      timestamp: new Date().toISOString()
    };

    // Log slow queries
    if (executionTime > 1000) { // 1 second
      console.warn('Slow Database Query:', logData);
      
      // Alert in production
      if (process.env.NODE_ENV === 'production') {
        this.logError(new Error('Slow database query'), logData);
      }
    }

    // Log failed queries
    if (logData.error) {
      console.error('Database Error:', logData);
    }
  }

  // Log business events
  logBusinessEvent(eventType, userId, data) {
    const logData = {
      eventType,
      userId,
      data,
      timestamp: new Date().toISOString()
    };

    console.log('Business Event:', logData);

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      // Note: Analytics integration planned for future release
      this.sendToAnalytics(logData);
    }
  }

  // Send to analytics service
  sendToAnalytics(data) {
    // Note: Analytics integration will be implemented in future release
    // Example: Google Analytics, Mixpanel, Amplitude
    console.log('Analytics Event:', data);
  }

  // Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      errorRate: this.metrics.errors / this.metrics.requests,
      requestsPerSecond: this.metrics.requests / (uptime / 1000)
    };
  }

  // Format uptime for display
  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Health check
  async healthCheck() {
    try {
      // Note: Database check removed - app now uses Firebase-only architecture
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      };

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: this.formatUptime(Date.now() - this.metrics.startTime),
        memory: memoryUsageMB,
        metrics: this.getMetrics()
      };
    } catch (error) {
      this.logError(error, { context: 'health-check' });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Request tracking middleware
  requestTracker() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        monitoringService.logRequest(req, res, responseTime);
        originalEnd.apply(this, args);
      };
      
      next();
    };
  }

  // Error handler middleware
  errorHandler() {
    return (err, req, res, next) => {
      this.logError(err, {
        url: req.originalUrl,
        method: req.method,
        params: req.params,
        body: req.body,
        user: req.user
      });

      // Send error response
      res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        timestamp: new Date().toISOString()
      });
    };
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Export the service
module.exports = monitoringService; 