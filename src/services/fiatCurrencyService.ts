/**
 * Fiat Currency Conversion Service
 * Handles conversion between fiat currencies (USD, EUR, GBP, etc.) and USDC
 */

export interface FiatCurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

// Cache for exchange rates to avoid excessive API calls
const exchangeRateCache: Record<string, FiatCurrencyRate> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests: Record<string, Promise<FiatCurrencyRate | null>> = {};

/**
 * Get exchange rate between two fiat currencies
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string = 'USD'): Promise<FiatCurrencyRate | null> {
  if (fromCurrency === toCurrency) {
    return {
      from: fromCurrency,
      to: toCurrency,
      rate: 1,
      timestamp: Date.now()
    };
  }

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const now = Date.now();

  // Check if we have cached data that's still valid
  if (exchangeRateCache[cacheKey] && (now - exchangeRateCache[cacheKey].timestamp) < CACHE_DURATION) {
    return exchangeRateCache[cacheKey];
  }

  // Check if there's already a pending request for this pair
  if (pendingRequests[cacheKey] !== undefined) {
    return await pendingRequests[cacheKey];
  }

  // Create a new request promise
  const requestPromise = (async () => {
    try {
      // Use ExchangeRate-API (free tier: 1500 requests/month)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
      );
      
      if (!response.ok) {
        console.warn(`Failed to fetch exchange rate for ${fromCurrency} to ${toCurrency}`);
        return null;
      }

      const data = await response.json();
      const rate = data.rates[toCurrency];

      if (!rate) {
        console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
        return null;
      }

      const exchangeRate: FiatCurrencyRate = {
        from: fromCurrency,
        to: toCurrency,
        rate: rate,
        timestamp: now
      };

      // Cache the result
      exchangeRateCache[cacheKey] = exchangeRate;

      if (__DEV__) {
        console.log(`💱 Exchange rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
      }

      return exchangeRate;
    } catch (error) {
      console.error(`Error fetching exchange rate for ${fromCurrency} to ${toCurrency}:`, error);
      return null;
    } finally {
      // Clean up the pending request
      delete pendingRequests[cacheKey];
    }
  })();

  // Store the pending request
  pendingRequests[cacheKey] = requestPromise;

  return await requestPromise;
}

/**
 * Convert fiat currency amount to USDC
 * Since USDC is pegged to USD, we convert to USD first
 */
export async function convertFiatToUSDC(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'USD' || fromCurrency === 'USDC') {
    return amount;
  }

  const exchangeRate = await getExchangeRate(fromCurrency, 'USD');
  if (!exchangeRate) {
    console.warn(`Could not convert ${amount} ${fromCurrency} to USDC - using fallback rate`);
    return getFallbackConversion(amount, fromCurrency);
  }

  const convertedAmount = amount * exchangeRate.rate;
  
  if (__DEV__) {
    console.log(`💱 Converting ${amount} ${fromCurrency} to USDC: ${amount} × ${exchangeRate.rate} = $${convertedAmount.toFixed(2)}`);
  }

  return convertedAmount;
}

/**
 * Convert USDC to fiat currency
 */
export async function convertUSDCToFiat(amount: number, toCurrency: string): Promise<number> {
  if (toCurrency === 'USD' || toCurrency === 'USDC') {
    return amount;
  }

  const exchangeRate = await getExchangeRate('USD', toCurrency);
  if (!exchangeRate) {
    console.warn(`Could not convert ${amount} USDC to ${toCurrency} - using fallback rate`);
    return getFallbackConversion(amount, toCurrency, true);
  }

  const convertedAmount = amount * exchangeRate.rate;
  
  if (__DEV__) {
    console.log(`💱 Converting ${amount} USDC to ${toCurrency}: ${amount} × ${exchangeRate.rate} = ${convertedAmount.toFixed(2)} ${toCurrency}`);
  }

  return convertedAmount;
}

/**
 * Get fallback conversion rates when API is unavailable
 */
function getFallbackConversion(amount: number, currency: string, reverse: boolean = false): number {
  const fallbackRates: Record<string, number> = {
    'EUR': 1.05,  // 1 EUR = 1.05 USD
    'GBP': 1.25,  // 1 GBP = 1.25 USD
    'CAD': 0.75,  // 1 CAD = 0.75 USD
    'AUD': 0.65,  // 1 AUD = 0.65 USD
    'JPY': 0.0067, // 1 JPY = 0.0067 USD
    'CHF': 1.10,  // 1 CHF = 1.10 USD
    'CNY': 0.14,  // 1 CNY = 0.14 USD
  };

  const rate = fallbackRates[currency] || 1;
  
  if (__DEV__) {
    console.warn(`💱 Using fallback rate for ${currency}: ${rate} (${reverse ? 'reverse' : 'normal'})`);
  }

  return reverse ? amount / rate : amount * rate;
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'USDC': 'USDC'
  };

  return symbols[currency] || currency;
}

/**
 * Format currency amount with proper symbol and decimals
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const decimals = currency === 'JPY' ? 0 : 2; // JPY doesn't use decimals
  
  if (currency === 'USDC') {
    return `${amount.toFixed(decimals)} USDC`;
  }
  
  return `${symbol}${amount.toFixed(decimals)}`;
}
