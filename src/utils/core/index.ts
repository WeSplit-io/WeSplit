/**
 * Core Utilities
 * Centralized exports for all core utility functions
 */

export { ErrorHandler as errorHandler } from './errorHandler';
export { ServiceErrorHandler as serviceErrorHandler } from './serviceErrorHandler';
export { getEnvVar } from './environmentUtils';
export { platformUtils } from './platformUtils';
export { createSplitNavigationUtils, createSplitBackHandler, NAVIGATION_ROUTES, SplitNavigationHelper } from './navigationUtils';
export { PriceUtils } from './priceUtils';
