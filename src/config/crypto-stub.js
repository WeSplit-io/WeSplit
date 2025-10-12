/**
 * Crypto Stub for React Native
 * Provides crypto functionality for Node.js modules in React Native environment
 */

// Mock crypto module for React Native
const crypto = {
  randomBytes: (size) => {
    // Use React Native's crypto implementation if available
    if (typeof global !== 'undefined' && global.crypto && global.crypto.getRandomValues) {
      const array = new Uint8Array(size);
      global.crypto.getRandomValues(array);
      return array;
    }
    
    // Fallback to Math.random (not cryptographically secure, but works for development)
    const array = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  
  createHash: () => ({
    update: () => {},
    digest: () => new Uint8Array(32)
  }),
  
  createHmac: () => ({
    update: () => {},
    digest: () => new Uint8Array(32)
  })
};

module.exports = crypto;
