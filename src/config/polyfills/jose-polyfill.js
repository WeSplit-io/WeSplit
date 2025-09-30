/**
 * Jose library polyfill for React Native
 * This provides a comprehensive polyfill for the jose library to work in React Native
 */

// Import our other polyfills
const zlibPolyfill = require('./zlib-stub.js');
const utilPolyfill = require('./util-stub.js');
const streamPolyfill = require('./stream-stub.js');
const bufferPolyfill = require('./buffer-stub.js');

// Create a comprehensive polyfill object
const josePolyfill = {
  // Zlib functions
  inflateRaw: zlibPolyfill.inflateRaw,
  deflateRaw: zlibPolyfill.deflateRaw,
  
  // Util functions
  promisify: utilPolyfill.promisify,
  
  // Stream functions
  Readable: streamPolyfill.Readable,
  Writable: streamPolyfill.Writable,
  Transform: streamPolyfill.Transform,
  
  // Buffer functions
  Buffer: bufferPolyfill,
  
  // Additional Node.js modules that jose might need
  crypto: require('../crypto-stub.js'),
};

// Export as CommonJS
module.exports = josePolyfill;

// Also export individual functions for direct access
module.exports.inflateRaw = zlibPolyfill.inflateRaw;
module.exports.deflateRaw = zlibPolyfill.deflateRaw;
module.exports.promisify = utilPolyfill.promisify;
module.exports.Readable = streamPolyfill.Readable;
module.exports.Writable = streamPolyfill.Writable;
module.exports.Transform = streamPolyfill.Transform;
module.exports.Buffer = bufferPolyfill;
module.exports.crypto = require('../crypto-stub.js');