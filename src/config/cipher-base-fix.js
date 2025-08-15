// Fix for cipher-base stream dependency
const readableStream = require('readable-stream');

// Export a stream-compatible interface for cipher-base
module.exports = {
  ...readableStream,
  // Ensure the stream is available globally
  stream: readableStream,
};

// Also make it available globally
if (typeof global !== 'undefined') {
  global.stream = readableStream;
} 