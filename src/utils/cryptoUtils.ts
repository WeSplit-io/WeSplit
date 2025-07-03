export interface Cryptocurrency {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
}

export const SOLANA_CRYPTOCURRENCIES: Cryptocurrency[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: '💵',
    decimals: 6
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: '☀️',
    decimals: 9
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    icon: '💱',
    decimals: 6
  },
  {
    symbol: 'RAY',
    name: 'Raydium',
    icon: '⚡',
    decimals: 6
  },
  {
    symbol: 'SRM',
    name: 'Serum',
    icon: '🔗',
    decimals: 6
  },
  {
    symbol: 'ORCA',
    name: 'Orca',
    icon: '🐋',
    decimals: 6
  },
  {
    symbol: 'MNGO',
    name: 'Mango',
    icon: '🥭',
    decimals: 6
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    icon: '🐕',
    decimals: 5
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    icon: '🪐',
    decimals: 6
  },
  {
    symbol: 'PYTH',
    name: 'Pyth Network',
    icon: '🔮',
    decimals: 6
  }
];

export const getCryptocurrencyBySymbol = (symbol: string): Cryptocurrency | undefined => {
  return SOLANA_CRYPTOCURRENCIES.find(crypto => crypto.symbol === symbol);
};

export const formatCryptoAmount = (amount: number, symbol: string): string => {
  const crypto = getCryptocurrencyBySymbol(symbol);
  if (!crypto) return `${amount} ${symbol}`;
  
  return `${amount.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: crypto.decimals 
  })} ${symbol}`;
}; 