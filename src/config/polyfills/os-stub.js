/**
 * OS Stub for React Native
 */
module.exports = {
  platform: 'react-native',
  arch: 'unknown',
  release: 'unknown',
  type: 'unknown',
  homedir: () => '/tmp',
  tmpdir: () => '/tmp',
  cpus: () => [],
  networkInterfaces: () => ({}),
  userInfo: () => ({ username: 'user', uid: 0, gid: 0, shell: '/bin/sh', homedir: '/tmp' }),
  uptime: () => 0,
  totalmem: () => 0,
  freemem: () => 0,
  loadavg: () => [0, 0, 0],
  hostname: () => 'localhost',
  endianness: () => 'LE',
  EOL: '\n',
};
