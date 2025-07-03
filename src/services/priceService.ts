const BACKEND_URL = 'http://192.168.1.75:4000';

export interface PriceData {
  symbol: string;
  price_usd: number;
  price_usdc: number;
}

// Cache for price data to avoid excessive API calls
const priceCache: Record<string, PriceData> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const lastFetchTime: Record<string, number> = {};

export async function getCryptoPrice(symbol: string): Promise<PriceData | null> {
  try {
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (priceCache[symbol] && (now - (lastFetchTime[symbol] || 0)) < CACHE_DURATION) {
      return priceCache[symbol];
    }

    // Fetch from CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(symbol)}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch price for ${symbol}`);
      return null;
    }

    const data = await response.json();
    const coinId = getCoinGeckoId(symbol);
    const priceUsd = data[coinId]?.usd;

    if (!priceUsd) {
      console.warn(`No price data found for ${symbol}`);
      return null;
    }

    const priceData: PriceData = {
      symbol,
      price_usd: priceUsd,
      price_usdc: priceUsd // USDC is pegged to USD
    };

    // Cache the result
    priceCache[symbol] = priceData;
    lastFetchTime[symbol] = now;

    return priceData;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

export async function convertToUSDC(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'USDC') {
    return amount;
  }

  const priceData = await getCryptoPrice(fromCurrency);
  if (!priceData) {
    console.warn(`Could not convert ${amount} ${fromCurrency} to USDC - using 1:1 ratio`);
    return amount; // Fallback to 1:1 ratio
  }

  return amount * priceData.price_usdc;
}

// Map our symbols to CoinGecko IDs
function getCoinGeckoId(symbol: string): string {
  const coinGeckoIds: Record<string, string> = {
    'SOL': 'solana',
    'USDT': 'tether',
    'BONK': 'bonk',
    'RAY': 'raydium',
    'SRM': 'serum',
    'ORCA': 'orca',
    'MNGO': 'mango-markets',
    'JUP': 'jupiter',
    'PYTH': 'pyth-network',
    'USDC': 'usd-coin'
  };

  return coinGeckoIds[symbol] || symbol.toLowerCase();
}

export async function getTotalSpendingInUSDC(expenses: Array<{amount: number, currency: string}>): Promise<number> {
  let totalUSDC = 0;

  for (const expense of expenses) {
    const usdcAmount = await convertToUSDC(expense.amount, expense.currency);
    totalUSDC += usdcAmount;
  }

  return totalUSDC;
} 