/**
 * Buffer polyfill stub for React Native
 * Provides minimal implementations of Buffer functions
 */

// React Native has Buffer available globally, but we provide a stub for compatibility
// In most cases, the global Buffer will be used

const Buffer = global.Buffer || {
  from: (data, encoding) => {
    if (typeof data === 'string') {
      return new Uint8Array(Buffer.from(data, encoding));
    }
    return new Uint8Array(data);
  },
  alloc: (size) => {
    return new Uint8Array(size);
  },
  isBuffer: (obj) => {
    return obj instanceof Uint8Array;
  },
};

// CommonJS exports for jose library compatibility
module.exports = Buffer;
module.exports.Buffer = Buffer;
