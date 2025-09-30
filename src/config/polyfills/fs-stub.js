// File System module stub for React Native
// This provides a minimal implementation to prevent import errors

const fs = {
  readFile: () => {},
  writeFile: () => {},
  readFileSync: () => '',
  writeFileSync: () => {},
  exists: () => {},
  existsSync: () => false,
  stat: () => {},
  statSync: () => ({}),
  readdir: () => {},
  readdirSync: () => [],
  mkdir: () => {},
  mkdirSync: () => {},
  rmdir: () => {},
  rmdirSync: () => {},
  unlink: () => {},
  unlinkSync: () => {},
  createReadStream: () => ({}),
  createWriteStream: () => ({}),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
  promises: {
    readFile: () => Promise.resolve(''),
    writeFile: () => Promise.resolve(),
    access: () => Promise.resolve(),
    stat: () => Promise.resolve({}),
    readdir: () => Promise.resolve([]),
    mkdir: () => Promise.resolve(),
    rmdir: () => Promise.resolve(),
    unlink: () => Promise.resolve(),
  },
};

module.exports = fs;
