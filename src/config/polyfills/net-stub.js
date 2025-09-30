// Net module stub for React Native
// This provides a minimal implementation to prevent import errors

const net = {
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
  isIP: () => 0,
  isIPv4: () => false,
  isIPv6: () => false,
  Server: class Server {
    constructor() {}
    listen() {}
    close() {}
    on() {}
  },
  Socket: class Socket {
    constructor() {}
    write() {}
    end() {}
    on() {}
  },
};

module.exports = net;
