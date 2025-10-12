/**
 * FS Stub for React Native
 */
module.exports = {
  readFile: () => { throw new Error('File system not available in React Native'); },
  writeFile: () => { throw new Error('File system not available in React Native'); },
  exists: () => false,
  mkdir: () => { throw new Error('File system not available in React Native'); },
  readdir: () => { throw new Error('File system not available in React Native'); },
  stat: () => { throw new Error('File system not available in React Native'); },
  unlink: () => { throw new Error('File system not available in React Native'); },
  rmdir: () => { throw new Error('File system not available in React Native'); },
  createReadStream: () => { throw new Error('File system not available in React Native'); },
  createWriteStream: () => { throw new Error('File system not available in React Native'); },
};
