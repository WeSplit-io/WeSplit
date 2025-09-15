// React Native compatible crypto stub
// This replaces Node.js crypto functions with React Native compatible alternatives

const crypto = require('react-native-crypto');

// Export all the functions that might be needed
module.exports = {
  ...crypto,
  
  // Additional stubs for functions that might not exist
  createHash: crypto.createHash || function() {
    return {
      update: function() { return this; },
      digest: function() { return Buffer.alloc(32); }
    };
  },
  
  createHmac: crypto.createHmac || function() {
    return {
      update: function() { return this; },
      digest: function() { return Buffer.alloc(32); }
    };
  },
  
  pbkdf2: crypto.pbkdf2 || function(password, salt, iterations, keylen, callback) {
    if (callback) {
      callback(null, Buffer.alloc(keylen));
    }
    return Buffer.alloc(keylen);
  },
  
  pbkdf2Sync: crypto.pbkdf2Sync || function(password, salt, iterations, keylen) {
    return Buffer.alloc(keylen);
  },
  
  randomBytes: crypto.randomBytes || function(size) {
    return Buffer.alloc(size);
  },
  
  getRandomValues: crypto.getRandomValues || function(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
};

