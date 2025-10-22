/**
 * Solana Pay Tests
 * Unit tests for Solana Pay URI generation and parsing
 */

import {
  createUsdcRequestUri,
  parseUri,
  validateSolanaPayUri,
  extractRecipientAddress,
  isSolanaPayUri,
  getDisplayAmount,
  getAmountInSmallestUnit,
} from '../solanaPay';

describe('Solana Pay', () => {
  const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
  const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  describe('createUsdcRequestUri', () => {
    it('should create a basic USDC request URI', () => {
      const uri = createUsdcRequestUri({ recipient: validAddress });
      expect(uri).toBe(`solana:${validAddress}?spl-token=${usdcMint}`);
    });

    it('should create a USDC request URI with amount', () => {
      const uri = createUsdcRequestUri({ 
        recipient: validAddress, 
        amount: 10.5 
      });
      expect(uri).toBe(`solana:${validAddress}?spl-token=${usdcMint}&amount=10500000`);
    });

    it('should create a USDC request URI with all parameters', () => {
      const uri = createUsdcRequestUri({
        recipient: validAddress,
        amount: 25.75,
        label: 'WeSplit Payment',
        message: 'Payment for dinner',
        reference: 'ref123'
      });
      
      expect(uri).toContain(`solana:${validAddress}`);
      expect(uri).toContain(`spl-token=${usdcMint}`);
      expect(uri).toContain('amount=25750000');
      expect(uri).toContain('label=WeSplit%20Payment');
      expect(uri).toContain('message=Payment%20for%20dinner');
      expect(uri).toContain('reference=ref123');
    });

    it('should throw error for invalid address', () => {
      expect(() => {
        createUsdcRequestUri({ recipient: 'invalid-address' });
      }).toThrow('Invalid Solana address');
    });
  });

  describe('parseUri', () => {
    it('should parse a basic USDC request URI', () => {
      const uri = `solana:${validAddress}?spl-token=${usdcMint}`;
      const parsed = parseUri(uri);
      
      expect(parsed.isValid).toBe(true);
      expect(parsed.recipient).toBe(validAddress);
      expect(parsed.splToken).toBe(usdcMint);
      expect(parsed.amount).toBeUndefined();
    });

    it('should parse a USDC request URI with amount', () => {
      const uri = `solana:${validAddress}?spl-token=${usdcMint}&amount=10500000`;
      const parsed = parseUri(uri);
      
      expect(parsed.isValid).toBe(true);
      expect(parsed.recipient).toBe(validAddress);
      expect(parsed.splToken).toBe(usdcMint);
      expect(parsed.amount).toBe(10.5);
    });

    it('should parse a USDC request URI with all parameters', () => {
      const uri = `solana:${validAddress}?spl-token=${usdcMint}&amount=25750000&label=WeSplit%20Payment&message=Payment%20for%20dinner&reference=ref123`;
      const parsed = parseUri(uri);
      
      expect(parsed.isValid).toBe(true);
      expect(parsed.recipient).toBe(validAddress);
      expect(parsed.splToken).toBe(usdcMint);
      expect(parsed.amount).toBe(25.75);
      expect(parsed.label).toBe('WeSplit Payment');
      expect(parsed.message).toBe('Payment for dinner');
      expect(parsed.reference).toBe('ref123');
    });

    it('should reject non-Solana Pay URIs', () => {
      const parsed = parseUri('https://example.com');
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('Not a Solana Pay URI');
    });

    it('should reject invalid recipient addresses', () => {
      const uri = `solana:invalid-address?spl-token=${usdcMint}`;
      const parsed = parseUri(uri);
      
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('Invalid recipient address');
    });

    it('should reject non-USDC tokens', () => {
      const uri = `solana:${validAddress}?spl-token=So11111111111111111111111111111111111111112`;
      const parsed = parseUri(uri);
      
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('Only USDC transactions are supported');
    });

    it('should reject invalid amounts', () => {
      const uri = `solana:${validAddress}?spl-token=${usdcMint}&amount=invalid`;
      const parsed = parseUri(uri);
      
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('Invalid amount');
    });
  });

  describe('validateSolanaPayUri', () => {
    it('should validate correct USDC URIs', () => {
      const uri = `solana:${validAddress}?spl-token=${usdcMint}`;
      expect(validateSolanaPayUri(uri)).toBe(true);
    });

    it('should reject invalid URIs', () => {
      expect(validateSolanaPayUri('invalid-uri')).toBe(false);
      expect(validateSolanaPayUri('solana:invalid-address')).toBe(false);
    });
  });

  describe('extractRecipientAddress', () => {
    it('should extract address from Solana Pay URI', () => {
      const uri = `solana:${validAddress}?spl-token=${usdcMint}`;
      const address = extractRecipientAddress(uri);
      expect(address).toBe(validAddress);
    });

    it('should extract address from raw address', () => {
      const address = extractRecipientAddress(validAddress);
      expect(address).toBe(validAddress);
    });

    it('should return null for invalid input', () => {
      expect(extractRecipientAddress('invalid')).toBe(null);
    });
  });

  describe('isSolanaPayUri', () => {
    it('should identify Solana Pay URIs', () => {
      expect(isSolanaPayUri('solana:address')).toBe(true);
      expect(isSolanaPayUri('https://example.com')).toBe(false);
      expect(isSolanaPayUri('invalid')).toBe(false);
    });
  });

  describe('getDisplayAmount', () => {
    it('should format amounts with 6 decimals', () => {
      expect(getDisplayAmount(10.5)).toBe('10.500000');
      expect(getDisplayAmount(0.001)).toBe('0.001000');
    });
  });

  describe('getAmountInSmallestUnit', () => {
    it('should convert amounts to smallest unit', () => {
      expect(getAmountInSmallestUnit(10.5)).toBe(10500000);
      expect(getAmountInSmallestUnit(0.001)).toBe(1000);
    });
  });
});
