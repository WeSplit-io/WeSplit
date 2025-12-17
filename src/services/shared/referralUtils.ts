// Shared helpers for referral-related logic
// Centralizes normalization so frontend & backend stay consistent

/** Minimum and maximum referral code lengths used across the app */
export const REFERRAL_CODE_MIN_LENGTH = 8;
export const REFERRAL_CODE_MAX_LENGTH = 12;

/** Normalize a referral code for storage and comparison.
 * - Trims whitespace
 * - Uppercases
 * - Removes internal spaces
 */
export function normalizeReferralCode(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.trim().toUpperCase().replace(/\s/g, '');
}

/**
 * Rate limiting for referral code lookups
 * Prevents abuse/enumeration attacks by limiting lookups per identifier
 */
class ReferralCodeRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_REQUESTS = 30; // 30 requests per 15 minutes per identifier

  /**
   * Check if a request is allowed based on rate limiting
   * @param identifier - User ID, IP address, or other identifier
   * @returns Object with allowed status and remaining requests
   */
  checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime?: number } {
    const now = Date.now();
    const key = `referral_lookup_${identifier}`;
    
    const record = this.store.get(key);
    
    // No record or window expired - allow and create new record
    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.WINDOW_MS });
      return { allowed: true, remaining: this.MAX_REQUESTS - 1 };
    }
    
    // Check if limit exceeded
    if (record.count >= this.MAX_REQUESTS) {
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: record.resetTime
      };
    }
    
    // Increment count
    record.count++;
    this.store.set(key, record);
    
    return { 
      allowed: true, 
      remaining: this.MAX_REQUESTS - record.count 
    };
  }

  /**
   * Clean up expired rate limit records (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Export singleton instance
export const referralCodeRateLimiter = new ReferralCodeRateLimiter();
