// OS module stub for React Native
// This provides a minimal implementation to prevent import errors

const os = {
  platform: () => 'react-native',
  arch: () => 'arm64',
  release: () => '1.0.0',
  type: () => 'ReactNative',
  hostname: () => 'react-native-device',
  homedir: () => '/',
  tmpdir: () => '/tmp',
  endianness: () => 'LE',
  cpus: () => [],
  networkInterfaces: () => ({}),
  loadavg: () => [0, 0, 0],
  uptime: () => 0,
  freemem: () => 0,
  totalmem: () => 0,
  userInfo: () => ({
    username: 'react-native-user',
    uid: 0,
    gid: 0,
    shell: '/bin/sh',
    homedir: '/',
  }),
  EOL: '\n',
  constants: {
    signals: {},
    errno: {},
    priority: {},
  },
};

module.exports = os;
