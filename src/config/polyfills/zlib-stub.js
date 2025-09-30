/**
 * Zlib polyfill stub for React Native
 * Provides minimal implementations of zlib functions used by jose library
 */

// Simple inflate/deflate implementations using React Native's built-in compression
// For now, we'll provide no-op implementations since jose library's compression
// features aren't critical for basic JWT operations

const inflateRaw = async (data) => {
  // No-op implementation - return data as-is
  // In a real implementation, you might use a React Native compression library
  console.warn('zlib.inflateRaw called - using no-op implementation');
  return data;
};

const deflateRaw = async (data) => {
  // No-op implementation - return data as-is
  // In a real implementation, you might use a React Native compression library
  console.warn('zlib.deflateRaw called - using no-op implementation');
  return data;
};

// CommonJS exports for jose library compatibility
module.exports = {
  inflateRaw,
  deflateRaw,
};

// Also export individual functions for direct access
module.exports.inflateRaw = inflateRaw;
module.exports.deflateRaw = deflateRaw;
