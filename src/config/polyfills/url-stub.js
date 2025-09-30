// URL module stub for React Native
// This provides a minimal implementation to prevent import errors

const url = {
  parse: (urlString) => {
    try {
      const url = new URL(urlString);
      return {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        href: url.href,
        origin: url.origin,
      };
    } catch (e) {
      return {
        protocol: null,
        hostname: null,
        port: null,
        pathname: null,
        search: null,
        hash: null,
        href: urlString,
        origin: null,
      };
    }
  },
  format: (urlObject) => {
    if (typeof urlObject === 'string') return urlObject;
    return urlObject.href || '';
  },
  resolve: (from, to) => {
    try {
      return new URL(to, from).href;
    } catch (e) {
      return to;
    }
  },
  URL: URL,
  URLSearchParams: URLSearchParams,
};

module.exports = url;
