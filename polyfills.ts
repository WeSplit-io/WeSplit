/**
 * Essential React Native Polyfills
 * Only includes polyfills that are absolutely necessary and won't interfere with Metro aliases
 */

// Import minimal error handler first
import './src/config/minimalErrorHandler';

// Import safe polyfill initialization
import './src/config/safePolyfills';

// Note: All polyfills are now handled by the safe polyfill system
// This prevents conflicts between global polyfills and Metro module aliases