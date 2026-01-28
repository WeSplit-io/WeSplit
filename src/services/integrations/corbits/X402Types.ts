/**
 * x402 Integration Types
 * TypeScript types for Corbits x402 payment protocol integration
 */

/**
 * x402 Payment Requirements
 * Payment requirements structure for x402 protocol
 */
export interface X402PaymentRequirements {
  network: 'mainnet-beta' | 'devnet';
  asset: 'USDC';
  amount: string; // Amount in base units (e.g., "10000" for $0.01 USDC)
  payTo: string; // Recipient wallet address
  nonce?: string; // Anti-replay protection
  timestamp?: number; // Request timestamp
}

/**
 * x402 Authorization Result
 * Result of x402 payment authorization
 */
export interface X402AuthorizationResult {
  success: boolean;
  authorized: boolean;
  authorizationId?: string; // Unique authorization identifier
  paymentRequirements?: X402PaymentRequirements;
  error?: string;
  message?: string;
}

/**
 * x402 Validation Result
 * Result of x402 payment validation
 */
export interface X402ValidationResult {
  success: boolean;
  valid: boolean;
  riskScore?: number; // Risk score (0-100, lower is better)
  riskLevel?: 'low' | 'medium' | 'high';
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * x402 Payment Verification Result
 * Result of verifying a completed payment
 */
export interface X402PaymentVerificationResult {
  success: boolean;
  verified: boolean;
  transactionSignature?: string;
  amount?: number;
  error?: string;
  message?: string;
}

/**
 * x402 Payment Metadata
 * Metadata structure for splits using x402 payments
 */
export interface X402PaymentMetadata {
  authorizationId?: string;
  paymentRequirements?: X402PaymentRequirements;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  validatedAt?: string; // ISO timestamp
  authorizedAt?: string; // ISO timestamp
  verifiedAt?: string; // ISO timestamp
}

/**
 * x402 Service Configuration
 * Configuration for x402 service methods
 */
export interface X402ServiceConfig {
  userId: string;
  amount: number;
  currency?: string;
  context?: string;
  metadata?: Record<string, any>;
}
