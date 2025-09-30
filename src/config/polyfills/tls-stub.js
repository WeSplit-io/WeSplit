// TLS module stub for React Native
// This provides a minimal implementation to prevent import errors

const tls = {
  createServer: () => ({
    listen: () => {},
    close: () => {},
    on: () => {},
  }),
  createConnection: () => ({
    write: () => {},
    end: () => {},
    on: () => {},
  }),
  connect: () => ({
    write: () => {},
    end: () => {},
    on: () => {},
  }),
  Server: class Server {
    constructor() {}
    listen() {}
    close() {}
    on() {}
  },
  TLSSocket: class TLSSocket {
    constructor() {}
    write() {}
    end() {}
    on() {}
  },
  DEFAULT_ECDH_CURVE: 'prime256v1',
  DEFAULT_MAX_VERSION: 'TLSv1.3',
  DEFAULT_MIN_VERSION: 'TLSv1.2',
};

module.exports = tls;
