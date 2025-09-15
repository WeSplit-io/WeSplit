// Comprehensive crypto stub for React Native
// This single file handles all crypto-related functions

const Buffer = require('buffer').Buffer;

// Create a simple hash object
function createHashObject() {
  return {
    update: function() { return this; },
    digest: function() { return Buffer.alloc(32); }
  };
}

// Create a simple hmac object
function createHmacObject() {
  return {
    update: function() { return this; },
    digest: function() { return Buffer.alloc(32); }
  };
}

// Create a simple sign object
function createSignObject() {
  return {
    update: function() { return this; },
    sign: function() { return Buffer.alloc(64); }
  };
}

// Create a simple verify object
function createVerifyObject() {
  return {
    update: function() { return this; },
    verify: function() { return true; }
  };
}

// Main crypto stub
const cryptoStub = {
  // Hash functions
  createHash: createHashObject,
  Hash: createHashObject,
  
  // HMAC functions
  createHmac: createHmacObject,
  Hmac: createHmacObject,
  
  // Sign/Verify functions
  createSign: createSignObject,
  Sign: createSignObject,
  createVerify: createVerifyObject,
  Verify: createVerifyObject,
  
  // PBKDF2 functions
  pbkdf2: function() { return Buffer.alloc(32); },
  pbkdf2Sync: function() { return Buffer.alloc(32); },
  
  // Random functions
  randomBytes: function() { return Buffer.alloc(32); },
  randomFill: function() { return Buffer.alloc(32); },
  randomFillSync: function() { return Buffer.alloc(32); },
  
  // Cipher functions (empty stubs)
  createCipher: function() { return { update: () => this, final: () => Buffer.alloc(16) }; },
  createCipheriv: function() { return { update: () => this, final: () => Buffer.alloc(16) }; },
  createDecipher: function() { return { update: () => this, final: () => Buffer.alloc(16) }; },
  createDecipheriv: function() { return { update: () => this, final: () => Buffer.alloc(16) }; },
  
  // Diffie-Hellman functions (empty stubs)
  createDiffieHellman: function() { return {}; },
  createDiffieHellmanGroup: function() { return {}; },
  
  // ECDH functions (empty stubs)
  createECDH: function() { return {}; },
  
  // Public key functions (empty stubs)
  publicEncrypt: function() { return Buffer.alloc(128); },
  privateEncrypt: function() { return Buffer.alloc(128); },
  publicDecrypt: function() { return Buffer.alloc(128); },
  privateDecrypt: function() { return Buffer.alloc(128); },
  
  // Get available algorithms
  getHashes: function() { 
    return ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160']; 
  },
  getCiphers: function() { return []; },
  listCiphers: function() { return []; }
};

module.exports = cryptoStub;
