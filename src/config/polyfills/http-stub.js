// HTTP module stub for React Native
// This provides a minimal implementation to prevent import errors

const http = {
  createServer: () => ({
    listen: () => {},
    close: () => {},
  }),
  request: () => ({
    write: () => {},
    end: () => {},
    on: () => {},
  }),
  get: () => ({
    on: () => {},
  }),
  Agent: class Agent {
    constructor() {}
  },
  globalAgent: new (class Agent {})(),
  STATUS_CODES: {},
  METHODS: [],
  Server: class Server {
    constructor() {}
    listen() {}
    close() {}
  },
  IncomingMessage: class IncomingMessage {
    constructor() {}
  },
  ServerResponse: class ServerResponse {
    constructor() {}
  },
  OutgoingMessage: class OutgoingMessage {
    constructor() {}
  },
  ClientRequest: class ClientRequest {
    constructor() {}
  },
};

module.exports = http;
