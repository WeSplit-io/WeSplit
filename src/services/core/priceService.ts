import { apiRequest } from '../../config/network/api';
import { logger } from '../analytics/loggingService';

export interface PriceData {
  symbol: string;
  price_usd: number;
  price_usdc: number;
}

// Cache for price data to avoid excessive API calls
const priceCache: Record<string, PriceData> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const lastFetchTime: Record<string, number> = {};
const pendingRequests: Record<string, Promise<PriceData | null>> = {};
const conversionCache: Record<string, { value: number; timestamp: number }> = {};
const CONVERSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes instead of 30 seconds

export async function getCryptoPrice(symbol: string): Promise<PriceData | null> {
  try {
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (priceCache[symbol] && (now - (lastFetchTime[symbol] || 0)) < CACHE_DURATION) {
      const cacheAge = Math.round((now - (lastFetchTime[symbol] || 0)) / 1000);
      logger.debug('Using cached crypto price', { 
        symbol, 
        priceUsd: priceCache[symbol].price_usd,
        cacheAgeSeconds: cacheAge,
        isLiveData: false
      }, 'priceService');
      return priceCache[symbol];
    }

    // Check if there's already a pending request for this symbol
    if (pendingRequests[symbol] !== undefined) {
      return await pendingRequests[symbol];
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
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

        if (__DEV__) {
          logger.info('Price service update', { symbol, priceUsd }, 'priceService');
        }

        return priceData;
      } finally {
        // Clean up the pending request
        delete pendingRequests[symbol];
      }
    })();

    // Store the pending request
    pendingRequests[symbol] = requestPromise;

    return await requestPromise;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Convert amount from any currency to USDC using live market rates
 * Throws error if conversion fails to prevent using incorrect hardcoded values
 */
export async function convertToUSDC(amount: number, fromCurrency: string, retries: number = 3): Promise<number> {
  // USDC is pegged to USD, so USD = USDC
  if (fromCurrency === 'USDC' || fromCurrency === 'USD') {
    return amount;
  }

  // Handle fiat currencies (EUR, GBP, etc.) with direct API call
  const fiatCurrencies = ['EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY'];
  if (fiatCurrencies.includes(fromCurrency)) {
    let lastError: Error | null = null;
    
    // Retry logic for API failures
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Use ExchangeRate-API for fiat currency conversion
        // Create abort controller for timeout (fallback for environments without AbortSignal.timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const response = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              signal: controller.signal
            }
          );
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch exchange rate for ${fromCurrency} to USD`);
          }

          const data = await response.json();
          const rate = data.rates?.['USD'];
          const apiTimestamp = data.time_last_updated || data.date || 'unknown';
          const apiDate = data.date || 'unknown';

          if (!rate || typeof rate !== 'number' || rate <= 0) {
            throw new Error(`Invalid exchange rate received for ${fromCurrency} to USD`);
          }

          const convertedAmount = amount * rate;
          
          logger.info('Converting fiat currency to USDC - LIVE MARKET RATE', { 
            amount, 
            fromCurrency, 
            rate, 
            convertedAmount: convertedAmount.toFixed(4),
            attempt: attempt + 1,
            apiDate,
            apiTimestamp,
            source: 'ExchangeRate-API',
            isLiveData: true
          }, 'priceService');

          return convertedAmount;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Currency conversion attempt ${attempt + 1} failed`, { 
          fromCurrency, 
          amount, 
          error: lastError.message 
        }, 'priceService');
        
        // Wait before retrying (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed - throw error instead of using hardcoded fallback
    const errorMessage = `Failed to convert ${amount} ${fromCurrency} to USDC after ${retries} attempts. Please check your internet connection and try again.`;
    logger.error('Currency conversion failed', { 
      fromCurrency, 
      amount, 
      error: lastError?.message,
      attempts: retries
    }, 'priceService');
    throw new Error(errorMessage);
  }

  // Handle crypto currencies with CoinGecko
  let lastCryptoError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const priceData = await getCryptoPrice(fromCurrency);
      
      if (!priceData || !priceData.price_usdc || priceData.price_usdc <= 0) {
        throw new Error(`Invalid price data received for ${fromCurrency}`);
      }

      const convertedAmount = amount * priceData.price_usdc;
      
      logger.info('Converting crypto currency to USDC - LIVE MARKET RATE', { 
        amount, 
        fromCurrency, 
        priceUsdc: priceData.price_usdc, 
        convertedAmount: convertedAmount.toFixed(4),
        attempt: attempt + 1,
        source: 'CoinGecko',
        isLiveData: true
      }, 'priceService');

      return convertedAmount;
    } catch (error) {
      lastCryptoError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Crypto conversion attempt ${attempt + 1} failed`, { 
        fromCurrency, 
        amount, 
        error: lastCryptoError.message 
      }, 'priceService');
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // All retries failed - throw error instead of using hardcoded fallback
  const errorMessage = `Failed to convert ${amount} ${fromCurrency} to USDC after ${retries} attempts. Please check your internet connection and try again.`;
  logger.error('Crypto currency conversion failed', { 
    fromCurrency, 
    amount, 
    error: lastCryptoError?.message,
    attempts: retries
  }, 'priceService');
  throw new Error(errorMessage);
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

export async function getTotalSpendingInUSDC(expenses: {amount: number, currency: string}[]): Promise<number> {
  // Create a cache key based on the expenses array
  const cacheKey = JSON.stringify(expenses.sort((a, b) => a.currency.localeCompare(b.currency)));
  const now = Date.now();
  
  // Check if we have a recent cached result
  if (conversionCache[cacheKey] && (now - conversionCache[cacheKey].timestamp) < CONVERSION_CACHE_DURATION) {
    if (__DEV__) {
      logger.debug('Using cached conversion result', { value: conversionCache[cacheKey].value.toFixed(2) }, 'priceService');
    }
    return conversionCache[cacheKey].value;
  }

  let totalUSDC = 0;

  for (const expense of expenses) {
    const usdcAmount = await convertToUSDC(expense.amount, expense.currency);
    totalUSDC += usdcAmount;
  }

  // Cache the result
  conversionCache[cacheKey] = {
    value: totalUSDC,
    timestamp: now
  };

  if (__DEV__) {
    logger.debug('Cached new conversion result', { value: totalUSDC.toFixed(2) }, 'priceService');
  }

  return totalUSDC;
}

// Export missing functions
export const convertFiatToUSDC = convertToUSDC;
export const formatCurrencyAmount = (amount: number, currency: string = 'USD'): string => {
  // Handle USDC as a special case since it's not a standard ISO 4217 currency code
  if (currency === 'USDC') {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' USDC';
  }
  
  // For other currencies, use standard currency formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}; 