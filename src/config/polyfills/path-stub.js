// Path module stub for React Native
// This provides a minimal implementation to prevent import errors

const path = {
  sep: '/',
  delimiter: ':',
  posix: {
    sep: '/',
    delimiter: ':',
  },
  win32: {
    sep: '\\',
    delimiter: ';',
  },
  resolve: (...args) => {
    return args.filter(Boolean).join('/');
  },
  normalize: (p) => p,
  isAbsolute: (p) => p.startsWith('/'),
  join: (...args) => {
    return args.filter(Boolean).join('/');
  },
  relative: (from, to) => {
    return to.replace(from, '');
  },
  dirname: (p) => {
    const parts = p.split('/');
    parts.pop();
    return parts.join('/') || '/';
  },
  basename: (p, ext) => {
    const parts = p.split('/');
    const basename = parts[parts.length - 1];
    if (ext && basename.endsWith(ext)) {
      return basename.slice(0, -ext.length);
    }
    return basename;
  },
  extname: (p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  },
  format: (pathObject) => {
    const { root, dir, base, name, ext } = pathObject;
    if (dir) return dir + '/' + base;
    if (root) return root + base;
    return base || '';
  },
  parse: (pathString) => {
    const parts = pathString.split('/');
    const base = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join('/');
    const ext = path.extname(base);
    const name = ext ? base.slice(0, -ext.length) : base;
    return {
      root: pathString.startsWith('/') ? '/' : '',
      dir,
      base,
      name,
      ext,
    };
  },
};

module.exports = path;
