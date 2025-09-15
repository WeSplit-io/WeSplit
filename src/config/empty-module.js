// Comprehensive empty module for Node.js modules that are not available in React Native
// This single file handles all Node.js standard library modules and crypto packages

const Buffer = require('buffer').Buffer;

// Simple stub functions
const stubFunction = () => {};
const stubBuffer = () => Buffer.alloc(32);
const stubObject = () => ({});

module.exports = {
  // Node.js standard library modules - empty stubs
  // (These modules don't exist in React Native)
  
  // Crypto functions - use our crypto stub
  ...require('./crypto-stub.js'),
  
  // Other Node.js modules - empty stubs
  readFile: stubFunction,
  writeFile: stubFunction,
  readFileSync: stubFunction,
  writeFileSync: stubFunction,
  exists: stubFunction,
  existsSync: stubFunction,
  mkdir: stubFunction,
  mkdirSync: stubFunction,
  rmdir: stubFunction,
  rmdirSync: stubFunction,
  unlink: stubFunction,
  unlinkSync: stubFunction,
  stat: stubFunction,
  statSync: stubFunction,
  readdir: stubFunction,
  readdirSync: stubFunction,
  
  // Network modules - empty stubs
  createServer: stubFunction,
  createConnection: stubFunction,
  connect: stubFunction,
  listen: stubFunction,
  
  // Process modules - empty stubs
  spawn: stubFunction,
  exec: stubFunction,
  execFile: stubFunction,
  fork: stubFunction,
  
  // Other utilities - empty stubs
  createReadStream: stubFunction,
  createWriteStream: stubFunction,
  createInterface: stubFunction,
  createContext: stubFunction,
  runInContext: stubFunction,
  runInNewContext: stubFunction,
  runInThisContext: stubFunction,
  createGzip: stubFunction,
  createGunzip: stubFunction,
  createDeflate: stubFunction,
  createInflate: stubFunction,
  createDeflateRaw: stubFunction,
  createInflateRaw: stubFunction,
  createUnzip: stubFunction,
  
  // Crypto package stubs
  pbkdf2: stubBuffer,
  pbkdf2Sync: stubBuffer,
  createHash: () => ({ update: () => this, digest: () => Buffer.alloc(32) }),
  createHmac: () => ({ update: () => this, digest: () => Buffer.alloc(32) }),
  createSign: () => ({ update: () => this, sign: () => Buffer.alloc(64) }),
  createVerify: () => ({ update: () => this, verify: () => true }),
  createCipher: () => ({ update: () => this, final: () => Buffer.alloc(16) }),
  createCipheriv: () => ({ update: () => this, final: () => Buffer.alloc(16) }),
  createDecipher: () => ({ update: () => this, final: () => Buffer.alloc(16) }),
  createDecipheriv: () => ({ update: () => this, final: () => Buffer.alloc(16) }),
  createDiffieHellman: stubObject,
  createECDH: stubObject,
  publicEncrypt: () => Buffer.alloc(128),
  privateEncrypt: () => Buffer.alloc(128),
  publicDecrypt: () => Buffer.alloc(128),
  privateDecrypt: () => Buffer.alloc(128),
  randomFill: stubBuffer,
  randomFillSync: stubBuffer,
  getHashes: () => ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160'],
  getCiphers: () => [],
  listCiphers: () => []
};