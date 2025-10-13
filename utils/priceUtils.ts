// Price conversion utilities for SOL to USDC
// Using Coingecko API for price data

interface PriceData {
  solana: {
    usd: number;
    usdc: number;
  };
}

export class PriceUtils {
  private static readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private static readonly BIRDEYE_API = 'https://public-api.birdeye.so';

  /**
   * Get SOL to USDC price from Coingecko
   */
  static async getSolToUsdcPrice(): Promise<number> {
    try {
      const response = await fetch(
        `${this.COINGECKO_API}/simple/price?ids=solana&vs_currencies=usd,usd-coin`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price data');
      }

      const data: PriceData = await response.json();
      return data.solana.usdc || data.solana.usd;
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      // Fallback to a default price (you can update this)
      return 100; // Default fallback price
    }
  }

  /**
   * Convert SOL amount to USDC
   */
  static async convertSolToUsdc(solAmount: number): Promise<number> {
    const price = await this.getSolToUsdcPrice();
    return solAmount * price;
  }

  /**
   * Convert USDC amount to SOL
   */
  static async convertUsdcToSol(usdcAmount: number): Promise<number> {
    const price = await this.getSolToUsdcPrice();
    return usdcAmount / price;
  }

  /**
   * Get price from Birdeye (alternative API)
   */
  static async getBirdeyePrice(): Promise<number> {
    try {
      const response = await fetch(
        `${this.BIRDEYE_API}/public/price?address=So11111111111111111111111111111111111111112`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Birdeye price data');
      }

      const data = await response.json();
      return data.data.value;
    } catch (error) {
      console.error('Error fetching Birdeye price:', error);
      return await this.getSolToUsdcPrice(); // Fallback to Coingecko
    }
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: 'SOL' | 'USDC' = 'USDC'): string {
    if (currency === 'SOL') {
      return `${price.toFixed(4)} SOL`;
    }
    return `$${price.toFixed(2)}`;
  }

  /**
   * Convert USDC amount to raw units (6 decimals) with proper rounding
   * This ensures consistent conversion across all services
   */
  static convertUsdcToRawUnits(amount: number): number {
    return Math.floor(amount * 1_000_000 + 0.5);
  }

  /**
   * Convert raw USDC units to display amount (6 decimals)
   */
  static convertRawUnitsToUsdc(rawUnits: number): number {
    return rawUnits / 1_000_000;
  }

  /**
   * Round USDC amount to 6 decimal places
   */
  static roundUsdcAmount(amount: number): number {
    return Math.round(amount * 1000000) / 1000000;
  }
} 