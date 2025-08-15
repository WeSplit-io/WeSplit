// React Native Polyfills
import 'react-native-get-random-values';

// Node.js polyfills for React Native
import { Buffer } from 'buffer';

// Global polyfills
global.Buffer = Buffer;

// Stream polyfill for crypto libraries
(global as any).process = require('process');
(global as any).stream = require('readable-stream');

// Fix for @noble/hashes crypto.js issue
if (typeof global !== 'undefined') {
  // Ensure crypto is available globally
  if (!global.crypto) {
    (global as any).crypto = require('react-native-crypto');
  }
  
  // Fix for rpc-websockets on iOS
  if (typeof global.WebSocket === 'undefined') {
    (global as any).WebSocket = require('ws');
  }
  
  // Additional polyfills for problematic modules
  (global as any).util = require('util');
  (global as any).events = require('events');
  
  // Fix for Buffer global
  if (!global.Buffer) {
    global.Buffer = Buffer;
  }
  
  // Fix for process global
  if (!global.process) {
    (global as any).process = require('process');
  }
  
  // Fix for stream global - important for cipher-base
  if (!(global as any).stream) {
    (global as any).stream = require('readable-stream');
  }
  
  // Ensure stream is available for cipher-base
  (global as any).stream = require('readable-stream');
} 