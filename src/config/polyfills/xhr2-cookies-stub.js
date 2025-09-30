// xhr2-cookies stub for React Native
// This provides a minimal implementation to prevent import errors

const XMLHttpRequest = global.XMLHttpRequest || require('react-native').XMLHttpRequest;

// Create a minimal xhr2-cookies implementation
const xhr2Cookies = {
  XMLHttpRequest: XMLHttpRequest,
  // Add any other exports that might be needed
};

module.exports = xhr2Cookies;
