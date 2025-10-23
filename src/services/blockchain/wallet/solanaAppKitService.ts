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
// walletLogoService functionality moved to walletService

// Import shared constants and utilities
import { RPC_CONFIG, USDC_CONFIG, PHANTOM_SCHEMES } from '../../../services/shared/walletConstants';
import { FeeService, TransactionType } from '../../../config/constants/feeConfig';
import { optimizedTransactionUtils } from '../../../services/shared/transactionUtilsOptimized';
import { TransactionUtils } from '../../../services/shared/transactionUtils';
import { balanceUtils } from '../../../services/shared/balanceUtils';
import { logger } from '../../../services/analytics/loggingService';


  
  
export interface WalletProvider {
  name: string;
  icon: string;
  logoUrl: string;
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
  NIGHTLY: 'nightly',
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
  private keypair: Keypair | null = null;
  private usdcMint: PublicKey;
  private connectedProvider: WalletProvider | null = null;
  private availableProviders: Map<string, WalletProvider> = new Map();
  private multiSigWallets: Map<string, MultiSigWallet> = new Map();

  constructor() {
    // Use shared connection from transactionUtils
    this.usdcMint = new PublicKey(USDC_CONFIG.mintAddress);
    // Initialize providers synchronously to ensure they're always available
    this.initializeFallbackProviders();
    // Then try to initialize from logo service asynchronously
    this.initializeWalletProviders().catch(error => {
      console.error('Error initializing wallet providers:', error);
    });
  }

  // Initialize available wallet providers
  private async initializeWalletProviders() {
    
    try {
      // Get available wallets from the logo service
      // Wallet logo service functionality moved to walletService
      // This service now provides the available wallets directly
      const availableWallets = [];
      
      // Create wallet providers from the available wallets
      const providers: WalletProvider[] = availableWallets.map(wallet => ({
        name: wallet.name,
        icon: wallet.fallbackIcon,
        logoUrl: wallet.logoUrl,
        isAvailable: wallet.isAvailable,
        connect: async () => this.mockConnectProvider(wallet.name),
        disconnect: async () => this.mockDisconnectProvider(),
        signTransaction: async (transaction) => this.mockSignTransaction(transaction),
        signMessage: async (message) => this.mockSignMessage(message)
      }));

      // Add all providers to the available providers map
      providers.forEach(provider => {
        this.availableProviders.set(provider.name.toLowerCase(), provider);
      });


      if (__DEV__) {
      }
    } catch (error) {
      console.error('Error initializing wallet providers:', error);
      // Fallback to basic providers if logo service fails
      this.initializeFallbackProviders();
    }
  }

  // Initialize fallback providers if logo service fails
  private initializeFallbackProviders() {
    
    const fallbackProviders: WalletProvider[] = [
      {
        name: 'Phantom',
        icon: '👻',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.png',
        isAvailable: true,
        connect: async () => this.mockConnectProvider('Phantom'),
        disconnect: async () => this.mockDisconnectProvider(),
        signTransaction: async (transaction) => this.mockSignTransaction(transaction),
        signMessage: async (message) => this.mockSignMessage(message)
      },
      {
        name: 'Solflare',
        icon: '🔥',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.png',
        isAvailable: true,
        connect: async () => this.mockConnectProvider('Solflare'),
        disconnect: async () => this.mockDisconnectProvider(),
        signTransaction: async (transaction) => this.mockSignTransaction(transaction),
        signMessage: async (message) => this.mockSignMessage(message)
      },
      {
        name: 'Backpack',
        icon: '🎒',
        logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/backpack.png',
        isAvailable: true,
        connect: async () => this.mockConnectProvider('Backpack'),
        disconnect: async () => this.mockDisconnectProvider(),
        signTransaction: async (transaction) => this.mockSignTransaction(transaction),
        signMessage: async (message) => this.mockSignMessage(message)
      }
    ];

    // Add fallback providers to the map
    fallbackProviders.forEach(provider => {
      this.availableProviders.set(provider.name.toLowerCase(), provider);
    });
  }

  // Get available wallet providers
  getAvailableProviders(): WalletProvider[] {
    const providers = Array.from(this.availableProviders.values());
    logger.info('Available providers', { count: providers.length, names: providers.map(p => p.name) }, 'solanaAppKitService');
    
    // Fallback: if no providers are available, return some basic ones
    if (providers.length === 0) {
      logger.warn('No providers found, creating fallback providers', null, 'solanaAppKitService');
      const fallbackProviders: WalletProvider[] = [
        {
          name: 'Phantom',
          icon: '👻',
          logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.png',
          isAvailable: true,
          connect: async () => this.mockConnectProvider('Phantom'),
          disconnect: async () => this.mockDisconnectProvider(),
          signTransaction: async (transaction) => this.mockSignTransaction(transaction),
          signMessage: async (message) => this.mockSignMessage(message)
        },
        {
          name: 'Solflare',
          icon: '🔥',
          logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.png',
          isAvailable: true,
          connect: async () => this.mockConnectProvider('Solflare'),
          disconnect: async () => this.mockDisconnectProvider(),
          signTransaction: async (transaction) => this.mockSignTransaction(transaction),
          signMessage: async (message) => this.mockSignMessage(message)
        },
        {
          name: 'Backpack',
          icon: '🎒',
          logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/backpack.png',
          isAvailable: true,
          connect: async () => this.mockConnectProvider('Backpack'),
          disconnect: async () => this.mockDisconnectProvider(),
          signTransaction: async (transaction) => this.mockSignTransaction(transaction),
          signMessage: async (message) => this.mockSignMessage(message)
        }
      ];
      
      // Add fallback providers to the map
      fallbackProviders.forEach(provider => {
        this.availableProviders.set(provider.name.toLowerCase(), provider);
      });
      
      logger.info('Fallback providers added', null, 'solanaAppKitService');
      return fallbackProviders;
    }
    
    return providers;
  }

  // Connect to a specific wallet provider
  async connectToProvider(providerKey: string): Promise<WalletInfo> {
    try {
      // Try to find provider by exact name first
      let provider = this.availableProviders.get(providerKey);
      
      // If not found, try by lowercase name
      if (!provider) {
        provider = this.availableProviders.get(providerKey.toLowerCase());
      }
      
      // If still not found, try to find by partial match
      if (!provider) {
        for (const [key, prov] of this.availableProviders.entries()) {
          if (key.includes(providerKey.toLowerCase()) || prov.name.toLowerCase().includes(providerKey.toLowerCase())) {
            provider = prov;
            break;
          }
        }
      }

      if (!provider) {
        throw new Error(`Provider ${providerKey} not found. Available providers: ${Array.from(this.availableProviders.keys()).join(', ')}`);
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

      // Get initial balance using shared utilities
      const solBalance = await balanceUtils.getSolBalance(newKeypair.publicKey);
      const usdcResult = await balanceUtils.getUsdcBalance(newKeypair.publicKey, this.usdcMint);
      const usdcBalance = usdcResult.balance;

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
      
      // Get balance using shared utilities
      const solBalance = await balanceUtils.getSolBalance(this.keypair.publicKey);
      const usdcResult = await balanceUtils.getUsdcBalance(this.keypair.publicKey, this.usdcMint);
      const usdcBalance = usdcResult.balance;

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
        const solBalance = await balanceUtils.getSolBalance(mockKeypair.publicKey);
        const usdcResult = await balanceUtils.getUsdcBalance(mockKeypair.publicKey, this.usdcMint);
        const usdcBalance = usdcResult.balance;
        
        return {
          address,
          publicKey: address,
          balance: solBalance,
          usdcBalance,
          isConnected: true,
          walletName: this.connectedProvider.name,
          walletType: 'external'
        };
      }

      // For app-generated wallets
      const address = this.keypair!.publicKey.toBase58();
      const publicKey = this.keypair!.publicKey.toBase58();
      
      // Get balance using shared utilities
      const solBalance = await balanceUtils.getSolBalance(this.keypair!.publicKey);
      const usdcResult = await balanceUtils.getUsdcBalance(this.keypair!.publicKey, this.usdcMint);
      const usdcBalance = usdcResult.balance;
      
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

  // USDC balance logic moved to shared balanceUtils

  // Request airdrop for development
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await (await optimizedTransactionUtils.getConnection()).requestAirdrop(
        this.keypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );
      
      await optimizedTransactionUtils.confirmTransactionWithTimeout(signature);
      return signature;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      throw new Error('Failed to request airdrop');
    }
  }

  // SOL transactions are not supported in WeSplit app
  async sendSolTransaction(to: string, amount: number, memo?: string): Promise<string> {
    throw new Error('SOL transfers are not supported within WeSplit app. Only USDC transfers are allowed.');
  }

  // Send USDC transaction
  async sendUsdcTransaction(to: string, amount: number, memo?: string, transactionType: TransactionType = 'send'): Promise<string> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair ? this.keypair.publicKey : new PublicKey(to);
      const toPublicKey = new PublicKey(to);

      // Calculate company fee using centralized service
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(amount, transactionType);
      
      // Use standardized USDC conversion
      const { PriceUtils } = await import('../../utils/core');
      const recipientAmountRaw = PriceUtils.convertUsdcToRawUnits(recipientAmount);
      const companyFeeRaw = PriceUtils.convertUsdcToRawUnits(companyFee);

      // Get recent blockhash
      const connection = await optimizedTransactionUtils.getConnection();
      const blockhash = await TransactionUtils.getLatestBlockhashWithRetry(connection);

      // Use centralized fee payer logic - Company pays SOL gas fees
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
      
      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey
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
            feePayerPublicKey, // Fee payer pays for account creation
            toTokenAccount,
            toPublicKey,
            this.usdcMint
          )
        );
      }

      // Add transfer instruction for recipient (full amount)
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          recipientAmountRaw
        )
      );

      // Add company fee transfer instruction to company wallet
      if (companyFee > 0) {
        const { COMPANY_WALLET_CONFIG } = await import('../../../config/constants/feeConfig');
        const companyTokenAccount = await getAssociatedTokenAddress(
          this.usdcMint,
          new PublicKey(COMPANY_WALLET_CONFIG.address)
        );

        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey,
            companyFeeRaw
          )
        );
      }

      // Add memo if provided
      if (memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: feePayerPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Prepare signers array
      const signers: Keypair[] = [];
      
      // Add user keypair
      if (this.keypair) {
        signers.push(this.keypair);
      }
      
      // Add company wallet keypair for fee payment
      const { COMPANY_WALLET_CONFIG } = await import('../../../config/constants/feeConfig');
      if (COMPANY_WALLET_CONFIG.secretKey) {
        try {
          let companySecretKeyBuffer: Buffer;
          
          // Handle different secret key formats
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
            const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
            companySecretKeyBuffer = Buffer.from(keyArray);
          } else {
            companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
          }
          
          // Validate and trim if needed
          if (companySecretKeyBuffer.length === 65) {
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
          }
          
          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          signers.push(companyKeypair);
        } catch (error) {
          console.error('Failed to load company wallet keypair:', error);
          throw new Error('Company wallet keypair not available for signing');
        }
      }

      // Sign transaction
      if (this.connectedProvider) {
        // For external wallets, use the provider's signing method
        await this.connectedProvider.signTransaction(transaction);
      } else if (this.keypair) {
        // For app-generated wallets, sign directly
        transaction.sign(...signers);
      }

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        signers,
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
        logger.info('Multi-signature wallet created', {
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
        logger.info('Multi-signature transaction created', {
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
        logger.info('Multi-signature transaction approved', {
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
        logger.warn('Multi-signature transaction rejected', {
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
      const connection = await optimizedTransactionUtils.getConnection();
      const blockhash = await TransactionUtils.getLatestBlockhashWithRetry(connection);

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
        logger.info('Multi-signature transaction executed', {
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

  // Check if a provider is available
  isProviderAvailable(providerKey: string): boolean {
    const provider = this.availableProviders.get(providerKey.toLowerCase());
    return provider ? provider.isAvailable : false;
  }

  // Mock methods for development
  private async mockConnectProvider(name: string): Promise<WalletInfo> {
    if (__DEV__) {
      logger.info('Mock connecting to provider', { name }, 'solanaAppKitService');
    }
    
    // For Phantom, use passive detection instead of opening the app
    if (name.toLowerCase() === 'phantom') {
      return await this.connectToPhantomWalletPassively();
    }
    
    // For other wallets, use mock connection
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const mockKeypair = Keypair.generate();
    const address = mockKeypair.publicKey.toBase58();
    const solBalance = await balanceUtils.getSolBalance(mockKeypair.publicKey);
    const usdcResult = await balanceUtils.getUsdcBalance(mockKeypair.publicKey, this.usdcMint);
    const usdcBalance = usdcResult.balance;
    return {
      address,
      publicKey: address,
      balance: solBalance,
      usdcBalance,
      isConnected: true,
      walletName: name,
      walletType: 'external'
    };
  }

  /**
   * Connect to Phantom wallet passively without opening the app
   */
  private async connectToPhantomWalletPassively(): Promise<WalletInfo> {
    try {
      logger.info('Attempting to connect to Phantom wallet passively', null, 'solanaAppKitService');
      
      const { Linking, Platform } = require('react-native');
      
      // Test multiple Phantom deep link schemes without opening the app
      const phantomSchemes = PHANTOM_SCHEMES;
      
      let canOpen = false;
      let workingScheme = '';
      
      // Test each scheme to find one that works
      for (const scheme of phantomSchemes) {
        try {
          const schemeCanOpen = await Linking.canOpenURL(scheme);
          logger.debug('Testing scheme', { scheme, canOpen: schemeCanOpen }, 'solanaAppKitService');
          if (schemeCanOpen) {
            canOpen = true;
            workingScheme = scheme;
            break;
          }
        } catch (error) {
          logger.warn('Scheme test failed', { scheme, error: error.message }, 'solanaAppKitService');
        }
      }
      
      // For Android, try package-based detection
      if (!canOpen && Platform.OS === 'android') {
        try {
          const packageCanOpen = await Linking.canOpenURL('app.phantom://');
          if (packageCanOpen) {
            logger.info('Phantom package detection successful', null, 'solanaAppKitService');
            canOpen = true;
            workingScheme = 'app.phantom://';
          }
        } catch (error) {
          logger.warn('Phantom package detection failed', { error: error.message }, 'solanaAppKitService');
        }
      }
      
      if (!canOpen) {
        throw new Error('Phantom wallet is not available on this device');
      }
      
      logger.info('Phantom wallet detected via scheme', { workingScheme }, 'solanaAppKitService');
      
      // For now, we'll use a temporary connection since we can't get the actual wallet address
      // In a real implementation, you would need to implement the Solana Wallet Adapter protocol
      // This would involve setting up a connection and waiting for the wallet to respond
      
      // Generate a temporary keypair for demonstration
      const tempKeypair = Keypair.generate();
      const address = tempKeypair.publicKey.toBase58();
      
      logger.info('Generated temporary wallet address', { address }, 'solanaAppKitService');
      
      return {
        address,
        publicKey: address,
        balance: 0, // We don't have the real balance yet
        usdcBalance: 0,
        isConnected: true,
        walletName: 'Phantom',
        walletType: 'external'
      };
      
    } catch (error) {
      console.error('🔗 SolanaAppKitService: Error connecting to Phantom:', error);
      throw new Error(`Failed to connect to Phantom: ${(error as Error).message}`);
    }
  }

  // Removed deprecated connectToPhantomWallet method - use connectToPhantomWalletPassively instead

  private async mockDisconnectProvider(): Promise<void> {
    if (__DEV__) {
      logger.info('Mock disconnecting provider', null, 'solanaAppKitService');
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    this.connectedProvider = null;
    this.keypair = null;
  }

  private async mockSignTransaction(transaction: Transaction): Promise<Transaction> {
    if (__DEV__) {
      logger.info('Mock signing transaction', null, 'solanaAppKitService');
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    if (this.keypair) {
      transaction.sign(this.keypair);
    }
    return transaction;
  }

  private async mockSignMessage(message: Uint8Array): Promise<Uint8Array> {
    if (__DEV__) {
      logger.info('Mock signing message', null, 'solanaAppKitService');
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return message; // Mock signing is a no-op for now
  }
}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _solanaAppKitService: SolanaAppKitService | null = null;

export const solanaAppKitService = {
  get instance() {
    if (!_solanaAppKitService) {
      _solanaAppKitService = new SolanaAppKitService();
    }
    return _solanaAppKitService;
  }
};

// Ensure providers are initialized
logger.info('Singleton instance created', null, 'solanaAppKitService');
// Note: Provider initialization logging moved to lazy initialization 