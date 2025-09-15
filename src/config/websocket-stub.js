// WebSocket stub for React Native
// This provides a compatibility layer for the Node.js 'ws' module

const WebSocket = global.WebSocket || class WebSocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url, options = {}) {
    this.url = url;
    this.readyState = WebSocketStub.CONNECTING;
    this.protocol = options.protocol || '';
    this.extensions = '';
    this.bufferedAmount = 0;
    this.binaryType = 'blob';
    
    this._onopen = null;
    this._onclose = null;
    this._onmessage = null;
    this._onerror = null;
    this._onping = null;
    this._onpong = null;

    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocketStub.OPEN;
      if (this._onopen) {
        this._onopen();
      }
    }, 100);
  }

  get onopen() { return this._onopen; }
  set onopen(handler) { this._onopen = handler; }

  get onclose() { return this._onclose; }
  set onclose(handler) { this._onclose = handler; }

  get onmessage() { return this._onmessage; }
  set onmessage(handler) { this._onmessage = handler; }

  get onerror() { return this._onerror; }
  set onerror(handler) { this._onerror = handler; }

  get onping() { return this._onping; }
  set onping(handler) { this._onping = handler; }

  get onpong() { return this._onpong; }
  set onpong(handler) { this._onpong = handler; }

  send(data) {
    if (this.readyState !== WebSocketStub.OPEN) {
      throw new Error('WebSocket is not open');
    }
    console.log('WebSocket send (stub):', data);
  }

  close(code, reason) {
    if (this.readyState === WebSocketStub.CLOSED || this.readyState === WebSocketStub.CLOSING) {
      return;
    }
    
    this.readyState = WebSocketStub.CLOSING;
    
    setTimeout(() => {
      this.readyState = WebSocketStub.CLOSED;
      if (this._onclose) {
        this._onclose({ code: code || 1000, reason: reason || '', wasClean: true });
      }
    }, 100);
  }

  ping(data) {
    if (this.readyState === WebSocketStub.OPEN) {
      console.log('WebSocket ping (stub):', data);
      if (this._onping) {
        this._onping(data);
      }
    }
  }

  pong(data) {
    if (this.readyState === WebSocketStub.OPEN) {
      console.log('WebSocket pong (stub):', data);
      if (this._onpong) {
        this._onpong(data);
      }
    }
  }

  addEventListener(type, listener) {
    switch (type) {
      case 'open': this._onopen = listener; break;
      case 'close': this._onclose = listener; break;
      case 'message': this._onmessage = listener; break;
      case 'error': this._onerror = listener; break;
      case 'ping': this._onping = listener; break;
      case 'pong': this._onpong = listener; break;
    }
  }

  removeEventListener(type, listener) {
    switch (type) {
      case 'open': if (this._onopen === listener) this._onopen = null; break;
      case 'close': if (this._onclose === listener) this._onclose = null; break;
      case 'message': if (this._onmessage === listener) this._onmessage = null; break;
      case 'error': if (this._onerror === listener) this._onerror = null; break;
      case 'ping': if (this._onping === listener) this._onping = null; break;
      case 'pong': if (this._onpong === listener) this._onpong = null; break;
    }
  }

  dispatchEvent(event) {
    switch (event.type) {
      case 'open': if (this._onopen) this._onopen(event); break;
      case 'close': if (this._onclose) this._onclose(event); break;
      case 'message': if (this._onmessage) this._onmessage(event); break;
      case 'error': if (this._onerror) this._onerror(event); break;
      case 'ping': if (this._onping) this._onping(event); break;
      case 'pong': if (this._onpong) this._onpong(event); break;
    }
    return true;
  }
};

// Export both default and named exports for compatibility
module.exports = WebSocket;
module.exports.default = WebSocket;
module.exports.WebSocket = WebSocket;

// Also provide WebSocketServer stub for server-side usage
class WebSocketServer {
  constructor(options = {}) {
    this.options = options;
    this.clients = new Set();
    this.readyState = 1; // OPEN
  }

  on(event, handler) {
    // Basic event handling
    console.log(`WebSocketServer event: ${event}`);
  }

  close() {
    this.readyState = 3; // CLOSED
    console.log('WebSocketServer closed');
  }
}

module.exports.WebSocketServer = WebSocketServer;
