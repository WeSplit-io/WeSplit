// React Native Polyfills
import 'react-native-get-random-values';

// Node.js polyfills for React Native
import { Buffer } from 'buffer';

// Global polyfills
global.Buffer = Buffer;

// Stream polyfill for crypto libraries
(global as any).process = require('process');
(global as any).stream = require('readable-stream'); 