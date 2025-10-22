/**
 * Performance Monitoring Hook
 * Monitors and logs performance metrics for components
 */

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../services/core';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
}

export const usePerformanceMonitor = (componentName: string, enabled: boolean = __DEV__) => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    totalRenderTime: 0
  });

  const startTimeRef = useRef<number>(0);

  // Start timing
  useEffect(() => {
    if (enabled) {
      startTimeRef.current = performance.now();
    }
  });

  // End timing and update metrics
  useEffect(() => {
    if (enabled && startTimeRef.current > 0) {
      const renderTime = performance.now() - startTimeRef.current;
      const metrics = metricsRef.current;

      metrics.renderCount++;
      metrics.lastRenderTime = renderTime;
      metrics.totalRenderTime += renderTime;
      metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
      metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
      metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime);

      // Log performance warnings
      if (renderTime > 16) { // More than one frame (60fps)
        logger.warn(`Slow render detected in ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: metrics.renderCount,
          averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`
        }, 'PerformanceMonitor');
      }

      // Log performance summary every 10 renders
      if (metrics.renderCount % 10 === 0) {
        logger.info(`Performance summary for ${componentName}`, {
          renderCount: metrics.renderCount,
          averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
          maxRenderTime: `${metrics.maxRenderTime.toFixed(2)}ms`,
          minRenderTime: `${metrics.minRenderTime.toFixed(2)}ms`
        }, 'PerformanceMonitor');
      }
    }
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
      totalRenderTime: 0
    };
  }, []);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  return {
    metrics: metricsRef.current,
    resetMetrics,
    getMetrics
  };
};

// Hook for monitoring expensive operations
export const useOperationTimer = (operationName: string, enabled: boolean = __DEV__) => {
  const startTimer = useCallback(() => {
    if (enabled) {
      return performance.now();
    }
    return 0;
  }, [enabled]);

  const endTimer = useCallback((startTime: number) => {
    if (enabled && startTime > 0) {
      const duration = performance.now() - startTime;
      
      if (duration > 100) { // Log operations taking more than 100ms
        logger.warn(`Slow operation detected: ${operationName}`, {
          duration: `${duration.toFixed(2)}ms`
        }, 'PerformanceMonitor');
      }
      
      return duration;
    }
    return 0;
  }, [enabled, operationName]);

  return { startTimer, endTimer };
};
