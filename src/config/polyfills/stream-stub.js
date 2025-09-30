/**
 * Stream polyfill stub for React Native
 * Provides minimal implementations of stream functions
 */

// Simple stream implementation for React Native
const Readable = class Readable {
  constructor(options = {}) {
    this.options = options;
    this.readable = true;
  }
  
  read() {
    return null;
  }
  
  on(event, listener) {
    return this;
  }
  
  once(event, listener) {
    return this;
  }
  
  emit(event, ...args) {
    return this;
  }
};

const Writable = class Writable {
  constructor(options = {}) {
    this.options = options;
    this.writable = true;
  }
  
  write(chunk, encoding, callback) {
    if (callback) callback();
    return true;
  }
  
  end(chunk, encoding, callback) {
    if (callback) callback();
    return this;
  }
  
  on(event, listener) {
    return this;
  }
  
  once(event, listener) {
    return this;
  }
  
  emit(event, ...args) {
    return this;
  }
};

const Transform = class Transform extends Readable {
  constructor(options = {}) {
    super(options);
    this.writable = true;
  }
  
  _transform(chunk, encoding, callback) {
    callback(null, chunk);
  }
};

// CommonJS exports for jose library compatibility
module.exports = {
  Readable,
  Writable,
  Transform,
};

// Also export individual classes for direct access
module.exports.Readable = Readable;
module.exports.Writable = Writable;
module.exports.Transform = Transform;
