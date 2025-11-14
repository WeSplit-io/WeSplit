/**
 * Performance Monitoring Utility
 * Best Practice: Track performance metrics for optimization
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      operations: {},
      errors: {},
      timings: {}
    };
  }
  
  /**
   * Start timing an operation
   */
  startOperation(operationName) {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.recordTiming(operationName, duration);
        return duration;
      }
    };
  }
  
  /**
   * Record timing for an operation
   */
  recordTiming(operationName, duration) {
    if (!this.metrics.timings[operationName]) {
      this.metrics.timings[operationName] = {
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
        avg: 0
      };
    }
    
    const metric = this.metrics.timings[operationName];
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
    metric.avg = metric.total / metric.count;
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operationName}`, {
        duration,
        avg: metric.avg,
        count: metric.count
      });
    }
  }
  
  /**
   * Record operation count
   */
  recordOperation(operationName, success = true) {
    if (!this.metrics.operations[operationName]) {
      this.metrics.operations[operationName] = {
        total: 0,
        success: 0,
        failure: 0
      };
    }
    
    const metric = this.metrics.operations[operationName];
    metric.total++;
    if (success) {
      metric.success++;
    } else {
      metric.failure++;
    }
  }
  
  /**
   * Record error
   */
  recordError(operationName, error) {
    if (!this.metrics.errors[operationName]) {
      this.metrics.errors[operationName] = {};
    }
    
    const errorType = error?.constructor?.name || 'Unknown';
    if (!this.metrics.errors[operationName][errorType]) {
      this.metrics.errors[operationName][errorType] = 0;
    }
    
    this.metrics.errors[operationName][errorType]++;
  }
  
  /**
   * Get metrics summary
   */
  getMetrics() {
    return {
      timings: this.metrics.timings,
      operations: this.metrics.operations,
      errors: this.metrics.errors,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Log metrics summary
   */
  logMetrics() {
    const metrics = this.getMetrics();
    console.log('Performance Metrics Summary', metrics);
  }
  
  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      operations: {},
      errors: {},
      timings: {}
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator to monitor async function performance
 * Best Practice: Automatic performance tracking
 */
function monitorPerformance(operationName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const timer = performanceMonitor.startOperation(operationName);
      try {
        const result = await originalMethod.apply(this, args);
        timer.end();
        performanceMonitor.recordOperation(operationName, true);
        return result;
      } catch (error) {
        timer.end();
        performanceMonitor.recordOperation(operationName, false);
        performanceMonitor.recordError(operationName, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Wrap async function with performance monitoring
 * Best Practice: Functional approach for performance tracking
 */
function withPerformanceMonitoring(operationName, operation) {
  return async function(...args) {
    const timer = performanceMonitor.startOperation(operationName);
    try {
      const result = await operation.apply(this, args);
      timer.end();
      performanceMonitor.recordOperation(operationName, true);
      return result;
    } catch (error) {
      timer.end();
      performanceMonitor.recordOperation(operationName, false);
      performanceMonitor.recordError(operationName, error);
      throw error;
    }
  };
}

module.exports = {
  performanceMonitor,
  monitorPerformance,
  withPerformanceMonitoring
};

