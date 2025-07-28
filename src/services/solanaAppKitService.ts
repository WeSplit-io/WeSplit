import { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';

// Solana RPC endpoints
const SOLANA_RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com'
};

// USDC Token mint addresses
const USDC_MINT_ADDRESSES = {
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
  testnet: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp', // Testnet USDC
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
};

// Current network configuration
const CURRENT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet';
const RPC_ENDPOINT = SOLANA_RPC_ENDPOINTS[CURRENT_NETWORK];
const USDC_MINT_ADDRESS = USDC_MINT_ADDRESSES[CURRENT_NETWORK];

export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance: number;
  usdcBalance: number;
  isConnected: boolean;
  walletName?: string;
  walletType?: 'app-generated' | 'external';
}

export interface CreateWalletResult {
  wallet: WalletInfo;
  mnemonic?: string;
}

export interface MultiSigWallet {
  address: string;
  owners: string[];
  threshold: number;
  pendingTransactions: MultiSigTransaction[];
}

export interface MultiSigTransaction {
  id: string;
  instructions: TransactionInstruction[];
  signers: string[];
  approvals: string[];
  rejections: string[];
  executed: boolean;
  createdAt: Date;
}

export interface WalletProvider {
  name: string;
  icon: string;
  isAvailable: boolean;
  connect(): Promise<WalletInfo>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

// Supported wallet providers
export const SUPPORTED_WALLET_PROVIDERS = {
  PHANTOM: 'phantom',
  SOLFLARE: 'solflare',
  BACKPACK: 'backpack',
  SLOPE: 'slope',
  GLOW: 'glow',
  EXODUS: 'exodus',
  COINBASE: 'coinbase',
  OKX: 'okx',
  BRAVE: 'brave',
  CLUSTER: 'cluster',
  MAGIC_EDEN: 'magic-eden',
  TALISMAN: 'talisman',
  XDEFI: 'xdefi',
  ZERION: 'zerion',
  TRUST: 'trust',
  SAFEPAL: 'safepal',
  BITGET: 'bitget',
  BYBIT: 'bybit',
  GATE: 'gate',
  HUOBI: 'huobi',
  KRAKEN: 'kraken',
  BINANCE: 'binance',
  MATH: 'math',
  TOKENPOCKET: 'tokenpocket',
  ONTO: 'onto',
  IMTOKEN: 'imtoken',
  COIN98: 'coin98',
  BLOCTO: 'blocto',
  PEAK: 'peak',
  NIGHTLY: 'nightly',
  NIGHTLY_CONNECT: 'nightly-connect',
  CLOVER: 'clover',
  CLOVER_CONNECT: 'clover-connect',
  WALLET_CONNECT: 'wallet-connect',
  WALLET_CONNECT_V2: 'wallet-connect-v2',
  METAMASK: 'metamask',
  RAINBOW: 'rainbow',
  ARGENT: 'argent',
  BRAVOS: 'bravos',
  MYRIA: 'myria',
  ZERION_CONNECT: 'zerion-connect',
  OKX_CONNECT: 'okx-connect',
  BYBIT_CONNECT: 'bybit-connect',
  GATE_CONNECT: 'gate-connect',
  HUOBI_CONNECT: 'huobi-connect',
  KRAKEN_CONNECT: 'kraken-connect',
  BINANCE_CONNECT: 'binance-connect',
  MATH_CONNECT: 'math-connect',
  TOKENPOCKET_CONNECT: 'tokenpocket-connect',
  ONTO_CONNECT: 'onto-connect',
  IMTOKEN_CONNECT: 'imtoken-connect',
  COIN98_CONNECT: 'coin98-connect',
  BLOCTO_CONNECT: 'blocto-connect',
  PEAK_CONNECT: 'peak-connect',
  NIGHTLY_CONNECT_V2: 'nightly-connect-v2',
  CLOVER_CONNECT_V2: 'clover-connect-v2',
  WALLET_CONNECT_V3: 'wallet-connect-v3',
  METAMASK_CONNECT: 'metamask-connect',
  RAINBOW_CONNECT: 'rainbow-connect',
  ARGENT_CONNECT: 'argent-connect',
  BRAVOS_CONNECT: 'bravos-connect',
  MYRIA_CONNECT: 'myria-connect'
};

export class SolanaAppKitService {
  private connection: Connection;
  private keypair: Keypair | null = null;
  private usdcMint: PublicKey;
  private connectedProvider: WalletProvider | null = null;
  private availableProviders: Map<string, WalletProvider> = new Map();
  private multiSigWallets: Map<string, MultiSigWallet> = new Map();

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.usdcMint = new PublicKey(USDC_MINT_ADDRESS);
    this.initializeWalletProviders();
  }

  // Initialize available wallet providers
  private initializeWalletProviders() {
    // Initialize wallet providers - in production, these would be actual wallet adapters
    // For now, we'll leave the providers map empty until real wallet integration is implemented
    if (__DEV__) {
      console.log('🔧 SolanaAppKitService: Wallet providers initialized (no mock providers)');
    }
  }

  // Get available wallet providers
  getAvailableProviders(): WalletProvider[] {
    return Array.from(this.availableProviders.values());
  }

  // Connect to a specific wallet provider
  async connectToProvider(providerKey: string): Promise<WalletInfo> {
    try {
    const provider = this.availableProviders.get(providerKey);
    if (!provider) {
        throw new Error(`Provider ${providerKey} not found`);
    }

    if (!provider.isAvailable) {
        throw new Error(`${provider.name} is not available`);
    }

      const walletInfo = await provider.connect();
      this.connectedProvider = provider;

      return walletInfo;
    } catch (error) {
      console.error(`Error connecting to ${providerKey}:`, error);
      throw new Error(`Failed to connect to ${providerKey}: ${(error as Error).message}`);
    }
  }

  // Disconnect from current wallet provider
  async disconnectFromProvider(): Promise<void> {
    if (this.connectedProvider) {
      await this.connectedProvider.disconnect();
      this.connectedProvider = null;
      this.keypair = null;
    }
  }

  // Create a new wallet using AppKit (app-generated wallet)
  async createWallet(): Promise<CreateWalletResult> {
    try {
      // Generate a new keypair
      const newKeypair = Keypair.generate();
      this.keypair = newKeypair;

      const address = newKeypair.publicKey.toBase58();
      const publicKey = newKeypair.publicKey.toBase58();
      const secretKey = Buffer.from(newKeypair.secretKey).toString('base64');

      // Generate a mnemonic phrase (12 words)
      const mnemonic = this.generateMnemonic();

      // Get initial balance
      const balance = await this.connection.getBalance(newKeypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      // Get USDC balance (will be 0 for new wallet)
      const usdcBalance = await this.getUsdcBalance(newKeypair.publicKey);

      const walletInfo: WalletInfo = {
        address,
        publicKey,
        secretKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'App Generated Wallet',
        walletType: 'app-generated'
      };

      return {
        wallet: walletInfo,
        mnemonic: mnemonic
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }

  // Generate a mnemonic phrase
  generateMnemonic(): string {
    // Simple word list for demonstration (in production, use a proper BIP39 word list)
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
      'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
      'action', 'actor', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult',
      'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree',
      'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien',
      'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always',
      'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle',
      'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety',
      'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area',
      'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive',
      'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist',
      'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit',
      'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward',
      'axis', 'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo',
      'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic', 'basket', 'battle',
      'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin', 'behave', 'behind',
      'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond',
      'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade',
      'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blouse', 'blue',
      'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb', 'bone', 'bonus', 'book',
      'boost', 'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket',
      'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright',
      'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown', 'brush', 'bubble',
      'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle', 'bunker', 'burden',
      'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin',
      'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can', 'canal',
      'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'car',
      'carbon', 'card', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'castle',
      'casual', 'cat', 'catalog', 'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave',
      'ceiling', 'celery', 'cement', 'census', 'century', 'cereal', 'certain', 'chair', 'chalk', 'champion',
      'change', 'chaos', 'chapter', 'charge', 'chase', 'chat', 'cheap', 'check', 'cheese', 'chef',
      'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney', 'choice', 'choose', 'chronic', 'chuckle',
      'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'citizen', 'city', 'civil', 'claim', 'clap',
      'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever', 'click', 'client', 'cliff', 'climb',
      'cling', 'clinic', 'clip', 'clock', 'clog', 'close', 'cloth', 'cloud', 'clown', 'club',
      'clump', 'cluster', 'clutch', 'coach', 'coal', 'coast', 'coconut', 'code', 'coffee', 'coil',
      'coin', 'collect', 'color', 'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company',
      'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince', 'cook', 'cool',
      'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost', 'cotton', 'couch', 'country',
      'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane',
      'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket', 'crime',
      'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble',
      'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup', 'cupboard', 'curious', 'current',
      'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle', 'dad', 'damage', 'dance', 'danger',
      'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december',
      'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy', 'degree', 'delay',
      'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend', 'deposit', 'depth',
      'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy', 'detail', 'detect',
      'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet',
      'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree', 'discover',
      'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide', 'divorce', 'dizzy',
      'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door',
      'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress',
      'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb',
      'dune', 'during', 'dust', 'dutch', 'duty', 'dwarf', 'dynamic', 'eager', 'eagle', 'early',
      'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge', 'edit',
      'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element',
      'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion', 'employ',
      'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy', 'enforce',
      'engage', 'engine', 'enhance', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter',
      'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion',
      'error', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil',
      'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute',
      'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire',
      'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty',
      'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy',
      'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature',
      'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever',
      'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find',
      'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit', 'fitness',
      'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float',
      'flock', 'floor', 'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil',
      'fold', 'follow', 'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum',
      'forward', 'fossil', 'foster', 'found', 'fox', 'fraction', 'fragile', 'frame', 'frequent', 'fresh',
      'friend', 'fringe', 'frog', 'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun',
      'funny', 'furnace', 'fury', 'future', 'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap',
      'garage', 'garbage', 'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge',
      'gaze', 'general', 'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift',
      'giggle', 'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'gleam',
      'glide', 'glimpse', 'globe', 'gloom', 'glory', 'glove', 'glow', 'glue', 'goat', 'goddess',
      'gold', 'good', 'goose', 'gorilla', 'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace',
      'grain', 'grant', 'grape', 'grass', 'gravity', 'great', 'green', 'grid', 'grief', 'grit',
      'grocery', 'group', 'grow', 'grunt', 'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun',
      'gym', 'habit', 'hair', 'half', 'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard',
      'harsh', 'harvest', 'hat', 'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy',
      'hedgehog', 'height', 'hello', 'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill',
      'hint', 'hip', 'hire', 'history', 'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow',
      'home', 'honey', 'hood', 'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hotel',
      'hour', 'hover', 'hub', 'huge', 'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt',
      'hurdle', 'hurry', 'hurt', 'husband', 'hybrid', 'ice', 'icon', 'idea', 'identify', 'idle',
      'ignore', 'ill', 'illegal', 'illness', 'image', 'imitate', 'immense', 'immune', 'impact', 'impose',
      'improve', 'impulse', 'inch', 'include', 'income', 'increase', 'index', 'indicate', 'indoor', 'industry',
      'infant', 'inflict', 'inform', 'inhale', 'inherit', 'initial', 'inject', 'injury', 'inmate', 'inner',
      'innocent', 'input', 'inquiry', 'insane', 'insect', 'inside', 'inspire', 'install', 'intact', 'interest',
      'into', 'invest', 'invite', 'involve', 'iron', 'island', 'isolate', 'issue', 'item', 'ivory',
      'jacket', 'jaguar', 'jar', 'jazz', 'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join',
      'joke', 'journey', 'joy', 'judge', 'juice', 'juicy', 'jump', 'jungle', 'junior', 'junk',
      'just', 'kangaroo', 'keen', 'keep', 'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind',
      'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten', 'kiwi', 'knee', 'knife', 'knock',
      'know', 'lab', 'label', 'labor', 'ladder', 'lady', 'lake', 'lamp', 'language', 'laptop',
      'large', 'later', 'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer',
      'lazy', 'leader', 'leaf', 'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend',
      'leisure', 'lemon', 'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar',
      'liberty', 'library', 'license', 'life', 'lift', 'light', 'like', 'limb', 'limit', 'link',
      'lion', 'liquid', 'list', 'little', 'live', 'lizard', 'load', 'loan', 'lobster', 'local',
      'lock', 'logic', 'long', 'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky',
      'luggage', 'lumber', 'lunar', 'lunch', 'luxury', 'lyrics', 'machine', 'mad', 'magic', 'magnet',
      'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man', 'manage', 'mandate', 'mango',
      'mansion', 'manual', 'maple', 'marble', 'march', 'margin', 'marine', 'market', 'marriage', 'mask',
      'mass', 'master', 'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze', 'meadow',
      'mean', 'measure', 'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member', 'memory',
      'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal', 'method',
      'middle', 'midnight', 'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute', 'miracle',
      'mirror', 'misery', 'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model', 'modify',
      'mom', 'moment', 'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more', 'morning',
      'mosquito', 'mother', 'motion', 'motor', 'mountain', 'mouse', 'move', 'movie', 'much', 'muffin',
      'mule', 'multiply', 'muscle', 'museum', 'mushroom', 'music', 'must', 'mutual', 'myself', 'mystery',
      'myth', 'naive', 'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near', 'neck',
      'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network', 'neutral',
      'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee', 'noodle', 'normal',
      'north', 'nose', 'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear', 'number',
      'nurse', 'nut', 'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain', 'obvious',
      'occur', 'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay',
      'old', 'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open',
      'opera', 'opinion', 'oppose', 'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary', 'organ',
      'orient', 'original', 'orphan', 'ostrich', 'other', 'outdoor', 'outer', 'output', 'outside', 'oval',
      'oven', 'over', 'own', 'owner', 'oxygen', 'oyster', 'ozone', 'pact', 'paddle', 'page',
      'pair', 'palace', 'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent',
      'park', 'parrot', 'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause',
      'pave', 'payment', 'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen', 'penalty', 'pencil',
      'people', 'pepper', 'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical',
      'piano', 'picnic', 'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer',
      'pipe', 'pistol', 'pitch', 'pizza', 'place', 'plate', 'play', 'please', 'pledge', 'pluck',
      'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony',
      'pool', 'poor', 'pop', 'popular', 'portion', 'position', 'possible', 'post', 'potato', 'pottery',
      'poverty', 'powder', 'power', 'practice', 'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty',
      'prevent', 'price', 'pride', 'primary', 'print', 'priority', 'prison', 'private', 'prize', 'problem',
      'process', 'produce', 'profit', 'program', 'project', 'promote', 'proof', 'property', 'prosper', 'protect',
      'proud', 'provide', 'public', 'pudding', 'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil',
      'puppy', 'purchase', 'purity', 'purpose', 'purse', 'push', 'put', 'puzzle', 'pyramid', 'quality',
      'quantum', 'quarter', 'question', 'quick', 'quit', 'quiz', 'quote', 'rabbit', 'raccoon', 'race',
      'rack', 'radar', 'radio', 'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch', 'random',
      'range', 'rapid', 'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready', 'real',
      'reason', 'rebel', 'rebuild', 'recall', 'receive', 'recipe', 'record', 'recycle', 'reduce', 'reflect',
      'reform', 'refuse', 'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely',
      'remain', 'remember', 'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat',
      'replace', 'report', 'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire',
      'retreat', 'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice',
      'rich', 'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'risk',
      'ritual', 'rival', 'river', 'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof',
      'rookie', 'room', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber', 'rude',
      'rug', 'rule', 'run', 'runway', 'rural', 'sad', 'saddle', 'sadness', 'safe', 'sail',
      'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand', 'satisfy', 'satoshi',
      'sauce', 'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene', 'scheme',
      'school', 'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea',
      'search', 'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek', 'segment',
      'select', 'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session', 'settle',
      'setup', 'seven', 'shadow', 'shaft', 'shallow', 'share', 'shelf', 'shell', 'sheriff', 'shield',
      'shift', 'shine', 'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'shore', 'short',
      'shoulder', 'shove', 'shrimp', 'shrug', 'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege',
      'sight', 'sign', 'silent', 'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing',
      'siren', 'sister', 'situate', 'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin',
      'skirt', 'skull', 'slab', 'slam', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim',
      'slogan', 'slot', 'slow', 'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack',
      'snake', 'snap', 'snare', 'snarl', 'sneak', 'sneeze', 'sniff', 'snow', 'soap', 'soccer',
      'social', 'sock', 'soda', 'soft', 'solar', 'soldier', 'solid', 'solution', 'solve', 'someone',
      'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source', 'south', 'space',
      'spare', 'spatial', 'spawn', 'speak', 'speed', 'spell', 'spend', 'sphere', 'spice', 'spider',
      'spike', 'spin', 'spirit', 'split', 'spoil', 'sponsor', 'spoon', 'sport', 'spot', 'spray',
      'spread', 'spring', 'spy', 'square', 'squeeze', 'squirrel', 'stable', 'stadium', 'staff', 'stage',
      'stairs', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steel', 'stem', 'step',
      'stereo', 'stick', 'still', 'sting', 'stomach', 'stone', 'stool', 'story', 'stove', 'strategy',
      'street', 'strike', 'strong', 'struggle', 'student', 'stuff', 'stumble', 'style', 'subject', 'submit',
      'subway', 'success', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer', 'sun',
      'sunny', 'sunset', 'super', 'supply', 'supreme', 'sure', 'surface', 'surge', 'surprise', 'surround',
      'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap', 'swarm', 'swear', 'sweet', 'swift',
      'swim', 'swing', 'switch', 'sword', 'symbol', 'symptom', 'syrup', 'system', 'table', 'tackle',
      'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target', 'task', 'taste', 'tattoo',
      'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent', 'term', 'test',
      'text', 'thank', 'that', 'theme', 'then', 'theory', 'there', 'they', 'thing', 'this',
      'thought', 'three', 'thrive', 'throw', 'thumb', 'thunder', 'ticket', 'tide', 'tiger', 'tilt',
      'timber', 'time', 'tiny', 'tip', 'tired', 'tissue', 'title', 'toast', 'tobacco', 'today',
      'toddler', 'toe', 'together', 'toilet', 'token', 'tomato', 'tomorrow', 'tone', 'tongue', 'tonight',
      'tonne', 'tool', 'tooth', 'top', 'topic', 'topple', 'torch', 'tornado', 'tortoise', 'toss',
      'total', 'tourist', 'toward', 'tower', 'town', 'toy', 'track', 'trade', 'traffic', 'tragic',
      'train', 'transfer', 'trap', 'trash', 'travel', 'tray', 'treat', 'tree', 'trend', 'trial',
      'tribe', 'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble', 'truck', 'true', 'truly',
      'trumpet', 'trust', 'truth', 'try', 'tube', 'tuition', 'tumble', 'tuna', 'tunnel', 'turkey',
      'turn', 'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical',
      'ugly', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold',
      'unhappy', 'unhealthy', 'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual',
      'unveil', 'update', 'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban', 'urge', 'usage',
      'use', 'used', 'useful', 'useless', 'usual', 'utility', 'vacant', 'vacuum', 'vague', 'valid',
      'valley', 'valve', 'van', 'vanish', 'vapor', 'various', 'vast', 'vault', 'vehicle', 'velvet',
      'vendor', 'venture', 'venue', 'verb', 'verify', 'version', 'very', 'vessel', 'veteran', 'viable',
      'vibrant', 'vicious', 'victory', 'video', 'view', 'village', 'vintage', 'violin', 'virtual', 'virus',
      'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void', 'volcano', 'volume',
      'vote', 'voucher', 'vow', 'voyal', 'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut',
      'want', 'warfare', 'warm', 'warrior', 'wash', 'wasp', 'waste', 'water', 'wave', 'way',
      'wealth', 'weapon', 'wear', 'weasel', 'weather', 'web', 'wedding', 'weekend', 'weird', 'welcome',
      'west', 'wet', 'whale', 'what', 'wheat', 'wheel', 'when', 'where', 'whip', 'whisper',
      'who', 'whole', 'why', 'wicked', 'wide', 'width', 'wife', 'wild', 'will', 'win',
      'window', 'wine', 'wing', 'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish',
      'witness', 'wolf', 'woman', 'wonder', 'wood', 'wool', 'word', 'work', 'world', 'worry',
      'worth', 'wrap', 'wreck', 'wrestle', 'wrist', 'write', 'wrong', 'yard', 'year', 'yellow',
      'you', 'young', 'youth', 'zebra', 'zero', 'zone', 'zoo'
    ];

    // Generate 12 random words
    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      mnemonic.push(words[randomIndex]);
    }
    
    return mnemonic.join(' ');
  }

  // Import wallet from secret key
  async importWallet(secretKey: string): Promise<WalletInfo> {
    try {
      let keyData: Uint8Array;
      
      // Try to parse as base64 first
      try {
        keyData = new Uint8Array(Buffer.from(secretKey, 'base64'));
      } catch {
        // If base64 fails, try to parse as JSON array
        try {
          const keyArray = JSON.parse(secretKey);
          keyData = new Uint8Array(keyArray);
        } catch {
          throw new Error('Invalid secret key format');
        }
      }
      
      this.keypair = Keypair.fromSecretKey(keyData);
      
      const address = this.keypair.publicKey.toBase58();
      const publicKey = this.keypair.publicKey.toBase58();
      
      // Get balance
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      const usdcBalance = await this.getUsdcBalance(this.keypair.publicKey);

      return {
        address,
        publicKey,
        secretKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'Imported Wallet',
        walletType: 'app-generated'
      };
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Failed to import wallet: ' + (error as Error).message);
    }
  }

  // Get wallet information
  async getWalletInfo(): Promise<WalletInfo> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      if (this.connectedProvider) {
        // For external wallets, we need to get info from the provider
        // This is a simplified mock implementation
        const mockKeypair = Keypair.generate();
        const address = mockKeypair.publicKey.toBase58();
        const balance = await this.connection.getBalance(mockKeypair.publicKey);
        const usdcBalance = await this.getUsdcBalance(mockKeypair.publicKey);
        
        return {
          address,
          publicKey: address,
          balance: balance / LAMPORTS_PER_SOL,
          usdcBalance,
          isConnected: true,
          walletName: this.connectedProvider.name,
          walletType: 'external'
        };
      }

      // For app-generated wallets
      const address = this.keypair!.publicKey.toBase58();
      const publicKey = this.keypair!.publicKey.toBase58();
      
      // Get SOL balance
      const balance = await this.connection.getBalance(this.keypair!.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      const usdcBalance = await this.getUsdcBalance(this.keypair!.publicKey);
      
      return {
        address,
        publicKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'App Generated Wallet',
        walletType: 'app-generated'
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      throw new Error('Failed to get wallet info');
    }
  }

  // Get USDC balance for a wallet
  private async getUsdcBalance(publicKey: PublicKey): Promise<number> {
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        publicKey
      );
      
      const accountInfo = await getAccount(this.connection, usdcTokenAccount);
      return Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
    } catch (error) {
      // Token account doesn't exist, balance is 0
      return 0;
    }
  }

  // Request airdrop for development
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await this.connection.requestAirdrop(
        this.keypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );
      
      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      throw new Error('Failed to request airdrop');
    }
  }

  // Send SOL transaction
  async sendSolTransaction(to: string, amount: number, memo?: string): Promise<string> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair ? this.keypair.publicKey : new PublicKey(to);
      const toPublicKey = new PublicKey(to);
      const lamports = amount * LAMPORTS_PER_SOL;

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

      // Add memo if provided
      if (memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Sign transaction
      if (this.connectedProvider) {
        // For external wallets, use the provider's signing method
        await this.connectedProvider.signTransaction(transaction);
      } else if (this.keypair) {
        // For app-generated wallets, sign directly
        transaction.sign(this.keypair);
      }

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        this.keypair ? [this.keypair] : [],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      return signature;
    } catch (error) {
      console.error('Error sending SOL transaction:', error);
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }

  // Send USDC transaction
  async sendUsdcTransaction(to: string, amount: number, memo?: string): Promise<string> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair ? this.keypair.publicKey : new PublicKey(to);
      const toPublicKey = new PublicKey(to);
      const usdcAmount = amount * 1000000; // USDC has 6 decimals

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Get or create associated token account for sender
      const fromTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        fromPublicKey
      );

      // Get or create associated token account for recipient
      const toTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        toPublicKey
      );

      // Add create token account instruction if needed
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch {
        // Token account doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey,
            toTokenAccount,
            toPublicKey,
            this.usdcMint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          usdcAmount
        )
      );

      // Add memo if provided
      if (memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Sign transaction
      if (this.connectedProvider) {
        // For external wallets, use the provider's signing method
        await this.connectedProvider.signTransaction(transaction);
      } else if (this.keypair) {
        // For app-generated wallets, sign directly
        transaction.sign(this.keypair);
      }

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        this.keypair ? [this.keypair] : [],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      return signature;
    } catch (error) {
      console.error('Error sending USDC transaction:', error);
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }

  // ===== MULTI-SIGNATURE FUNCTIONALITY =====

  // Create a multi-signature wallet
  async createMultiSigWallet(owners: string[], threshold: number): Promise<MultiSigWallet> {
    try {
      if (threshold > owners.length) {
        throw new Error('Threshold cannot be greater than number of owners');
      }

      if (threshold < 1) {
        throw new Error('Threshold must be at least 1');
      }

      // Generate a new keypair for the multi-sig wallet
      const multiSigKeypair = Keypair.generate();
      const multiSigAddress = multiSigKeypair.publicKey.toBase58();

      const multiSigWallet: MultiSigWallet = {
        address: multiSigAddress,
        owners: owners,
        threshold: threshold,
        pendingTransactions: []
      };

      // Store the multi-sig wallet
      this.multiSigWallets.set(multiSigAddress, multiSigWallet);

      if (__DEV__) {
        console.log('✅ Multi-signature wallet created:', {
          address: multiSigAddress,
          owners,
          threshold
        });
      }

      return multiSigWallet;
    } catch (error) {
      console.error('Error creating multi-signature wallet:', error);
      throw new Error('Failed to create multi-signature wallet: ' + (error as Error).message);
    }
  }

  // Create a transaction that requires multi-signature approval
  async createMultiSigTransaction(
    multiSigAddress: string,
    instructions: TransactionInstruction[],
    signers: string[]
  ): Promise<string> {
    try {
      const multiSigWallet = this.multiSigWallets.get(multiSigAddress);
      if (!multiSigWallet) {
        throw new Error('Multi-signature wallet not found');
      }

      // Create a unique transaction ID
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const multiSigTransaction: MultiSigTransaction = {
        id: transactionId,
        instructions: instructions,
        signers: signers,
        approvals: [],
        rejections: [],
        executed: false,
        createdAt: new Date()
      };

      // Add to pending transactions
      multiSigWallet.pendingTransactions.push(multiSigTransaction);

      if (__DEV__) {
        console.log('✅ Multi-signature transaction created:', {
          transactionId,
          multiSigAddress,
          signersCount: signers.length
        });
      }

      return transactionId;
    } catch (error) {
      console.error('Error creating multi-signature transaction:', error);
      throw new Error('Failed to create multi-signature transaction: ' + (error as Error).message);
    }
  }

  // Approve a multi-signature transaction
  async approveMultiSigTransaction(
    multiSigAddress: string,
    transactionId: string,
    approver: string
  ): Promise<boolean> {
    try {
      const multiSigWallet = this.multiSigWallets.get(multiSigAddress);
      if (!multiSigWallet) {
        throw new Error('Multi-signature wallet not found');
      }

      const transaction = multiSigWallet.pendingTransactions.find(tx => tx.id === transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.executed) {
        throw new Error('Transaction has already been executed');
      }

      if (transaction.rejections.includes(approver)) {
        throw new Error('Cannot approve a transaction that has been rejected');
      }

      if (!transaction.approvals.includes(approver)) {
        transaction.approvals.push(approver);
      }

      // Check if we have enough approvals to execute
      if (transaction.approvals.length >= multiSigWallet.threshold) {
        await this.executeMultiSigTransaction(multiSigAddress, transactionId);
      }

      if (__DEV__) {
        console.log('✅ Multi-signature transaction approved:', {
          transactionId,
          approver,
          approvalsCount: transaction.approvals.length,
          threshold: multiSigWallet.threshold
        });
      }

      return true;
    } catch (error) {
      console.error('Error approving multi-signature transaction:', error);
      throw new Error('Failed to approve transaction: ' + (error as Error).message);
    }
  }

  // Reject a multi-signature transaction
  async rejectMultiSigTransaction(
    multiSigAddress: string,
    transactionId: string,
    rejector: string
  ): Promise<boolean> {
    try {
      const multiSigWallet = this.multiSigWallets.get(multiSigAddress);
      if (!multiSigWallet) {
        throw new Error('Multi-signature wallet not found');
      }

      const transaction = multiSigWallet.pendingTransactions.find(tx => tx.id === transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.executed) {
        throw new Error('Transaction has already been executed');
      }

      if (!transaction.rejections.includes(rejector)) {
        transaction.rejections.push(rejector);
      }

      if (__DEV__) {
        console.log('❌ Multi-signature transaction rejected:', {
          transactionId,
          rejector,
          rejectionsCount: transaction.rejections.length
        });
      }

      return true;
    } catch (error) {
      console.error('Error rejecting multi-signature transaction:', error);
      throw new Error('Failed to reject transaction: ' + (error as Error).message);
    }
  }

  // Execute a multi-signature transaction
  private async executeMultiSigTransaction(
    multiSigAddress: string,
    transactionId: string
  ): Promise<string> {
    try {
      const multiSigWallet = this.multiSigWallets.get(multiSigAddress);
      if (!multiSigWallet) {
        throw new Error('Multi-signature wallet not found');
      }

      const transaction = multiSigWallet.pendingTransactions.find(tx => tx.id === transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.executed) {
        throw new Error('Transaction has already been executed');
      }

      if (transaction.approvals.length < multiSigWallet.threshold) {
        throw new Error('Not enough approvals to execute transaction');
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create the transaction
      const solanaTransaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: new PublicKey(multiSigAddress)
      });

      // Add all instructions
      transaction.instructions.forEach(instruction => {
        solanaTransaction.add(instruction);
      });

      // Sign with all required signers
      const signers = transaction.signers.map(signer => new PublicKey(signer));
      // Note: In a real implementation, you would need to get the actual keypairs for these signers

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        solanaTransaction,
        [], // In real implementation, this would be the actual signers
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      // Mark transaction as executed
      transaction.executed = true;

      if (__DEV__) {
        console.log('✅ Multi-signature transaction executed:', {
          transactionId,
          signature,
          approvalsCount: transaction.approvals.length
        });
      }

      return signature;
    } catch (error) {
      console.error('Error executing multi-signature transaction:', error);
      throw new Error('Failed to execute transaction: ' + (error as Error).message);
    }
  }

  // Get multi-signature wallet information
  async getMultiSigWallet(multiSigAddress: string): Promise<MultiSigWallet | null> {
    return this.multiSigWallets.get(multiSigAddress) || null;
  }

  // Get all multi-signature wallets for a user
  async getUserMultiSigWallets(userAddress: string): Promise<MultiSigWallet[]> {
    const userWallets: MultiSigWallet[] = [];
    
    for (const [address, wallet] of this.multiSigWallets) {
      if (wallet.owners.includes(userAddress)) {
        userWallets.push(wallet);
      }
    }
    
    return userWallets;
  }

  // Get pending transactions for a multi-signature wallet
  async getPendingTransactions(multiSigAddress: string): Promise<MultiSigTransaction[]> {
    const multiSigWallet = this.multiSigWallets.get(multiSigAddress);
    if (!multiSigWallet) {
      return [];
    }
    
    return multiSigWallet.pendingTransactions.filter(tx => !tx.executed);
  }

  // Disconnect wallet
  disconnect(): void {
    this.keypair = null;
    this.connectedProvider = null;
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return this.keypair !== null || this.connectedProvider !== null;
  }

  // Get current network
  getCurrentNetwork(): string {
    return CURRENT_NETWORK;
  }

  // Get RPC endpoint
  getRpcEndpoint(): string {
    return RPC_ENDPOINT;
  }

  // Get connected provider info
  getConnectedProvider(): WalletProvider | null {
    return this.connectedProvider;
  }

  // Check if a specific provider is available
  isProviderAvailable(providerKey: string): boolean {
    const provider = this.availableProviders.get(providerKey);
    return provider ? provider.isAvailable : false;
  }
}

// Export singleton instance
export const solanaAppKitService = new SolanaAppKitService(); 