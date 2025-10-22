// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      canOpenURL: jest.fn(),
      openURL: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock Expo modules
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

// Mock Solana modules
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn().mockResolvedValue(1000000000),
    getAccount: jest.fn().mockResolvedValue({}),
    requestAirdrop: jest.fn().mockResolvedValue('signature'),
    simulateTransaction: jest.fn().mockResolvedValue({}),
    getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: 'test-blockhash' }),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    sendTransaction: jest.fn().mockResolvedValue('signature'),
    sendRawTransaction: jest.fn().mockResolvedValue('signature'),
    getSignatureStatus: jest.fn().mockResolvedValue({ value: { err: null, confirmations: 32 } }),
  })),
  PublicKey: jest.fn().mockImplementation((address) => ({ 
    toString: () => address,
    toBase58: () => address,
    equals: jest.fn().mockReturnValue(true)
  })),
  Transaction: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    sign: jest.fn(),
    serialize: jest.fn().mockReturnValue(Buffer.from('test')),
    recentBlockhash: 'test-blockhash',
    signatures: [],
  })),
  Keypair: {
    generate: jest.fn().mockReturnValue({
      publicKey: { 
        toString: () => 'test-public-key',
        toBase58: () => 'test-public-key'
      },
      secretKey: Buffer.from('test-secret-key'),
    }),
    fromSeed: jest.fn().mockReturnValue({
      publicKey: { 
        toString: () => 'test-public-key',
        toBase58: () => 'test-public-key'
      },
      secretKey: Buffer.from('test-secret-key'),
    }),
  },
  LAMPORTS_PER_SOL: 1000000000,
}));

// Mock BIP39 modules
jest.mock('@scure/bip39', () => ({
  generateMnemonic: jest.fn().mockReturnValue('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'),
  validateMnemonic: jest.fn().mockReturnValue(true),
  mnemonicToSeedSync: jest.fn().mockReturnValue(Buffer.from('test-seed')),
}));

jest.mock('@scure/bip39/wordlists/english', () => ({
  english: ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz']
}));

jest.mock('ed25519-hd-key', () => ({
  derivePath: jest.fn().mockReturnValue({
    key: Buffer.from('test-derived-key'),
  }),
}));

// Mock global variables
global.CURRENT_NETWORK = {
  usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  wsUrl: 'wss://api.mainnet-beta.solana.com',
};

global.transactionUtils = {
  sendTransaction: jest.fn().mockResolvedValue({ signature: 'test-signature', success: true }),
  getConnection: jest.fn().mockResolvedValue({}),
};

global.billData = {};
global.processedBillData = {};
global.companyPublicKey = { toString: () => 'test-company-key' };
global.usdcTokenAccount = { toString: () => 'test-usdc-account' };

// Global test setup
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};