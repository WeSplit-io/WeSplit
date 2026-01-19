/**
 * Essential React Native Polyfills
 * Only includes polyfills that are absolutely necessary and won't interfere with Metro aliases
 */

// Import minimal error handler first
import './minimalErrorHandler';

// Import runtime error handler early to intercept console.error and suppress WebSocket errors
import './runtimeErrorHandler';

// Import safe polyfill initialization
import './safePolyfills';

// Note: All polyfills are now handled by the safe polyfill system
// This prevents conflicts between global polyfills and Metro module aliases