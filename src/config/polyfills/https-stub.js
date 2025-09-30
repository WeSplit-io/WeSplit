// HTTPS module stub for React Native
// This provides a minimal implementation to prevent import errors

const https = {
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
};

module.exports = https;
