/**
 * Util polyfill stub for React Native
 * Provides minimal implementations of util functions used by jose library
 */

// Simple promisify implementation
const promisify = (fn) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
};

// CommonJS exports for jose library compatibility
module.exports = {
  promisify,
};

// Also export individual functions for direct access
module.exports.promisify = promisify;
