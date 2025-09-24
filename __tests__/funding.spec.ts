/**
 * Funding Tests
 * Tests for MoonPay integration and external funding
 */

import { fundingService } from '../src/funding/index';

// Mock dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn(() => Promise.resolve(1000000000)), // 1 SOL in lamports
  })),
  PublicKey: jest.fn().mockImplementation((address) => ({ toBase58: () => address })),
  LAMPORTS_PER_SOL: 1000000000,
}));

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn(() => Promise.resolve({ toBase58: () => 'token-account' })),
  getAccount: jest.fn(() => Promise.resolve({ amount: BigInt(1000000) })), // 1 USDC
}));

jest.mock('../src/wallet/solanaWallet', () => ({
  solanaWalletService: {
    loadWallet: jest.fn(() => Promise.resolve(true)),
    getPublicKey: jest.fn(() => 'test-public-key'),
    getBalance: jest.fn(() => Promise.resolve({ sol: 10, usdc: 1000 })),
  },
}));

jest.mock('../src/config/chain', () => ({
  CURRENT_NETWORK: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    commitment: 'confirmed',
    usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
}));

describe('FundingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing polling intervals
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleMoonPayFunding', () => {
    it('should handle MoonPay funding with expected amount', async () => {
      const walletAddress = 'test-wallet-address';
      const expectedAmount = 100;
      const currency = 'USDC';

      // Mock initial balance
      const { getBalance } = require('@solana/web3.js').Connection.prototype;
      getBalance.mockResolvedValue(1000000000); // 1 SOL

      const { getAccount } = require('@solana/spl-token');
      getAccount.mockResolvedValue({ amount: BigInt(1000000) }); // 1 USDC initially

      const promise = fundingService.handleMoonPayFunding(walletAddress, expectedAmount, currency);

      // Simulate balance increase after funding
      setTimeout(() => {
        getAccount.mockResolvedValue({ amount: BigInt(101000000) }); // 101 USDC after funding
      }, 1000);

      // Fast-forward time to trigger polling
      jest.advanceTimersByTime(5000);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.currency).toBe(currency);
    });

    it('should handle MoonPay funding without expected amount', async () => {
      const walletAddress = 'test-wallet-address';
      const currency = 'USDC';

      // Mock initial balance
      const { getBalance } = require('@solana/web3.js').Connection.prototype;
      getBalance.mockResolvedValue(1000000000);

      const { getAccount } = require('@solana/spl-token');
      getAccount.mockResolvedValue({ amount: BigInt(1000000) }); // 1 USDC initially

      const promise = fundingService.handleMoonPayFunding(walletAddress, undefined, currency);

      // Simulate balance increase
      setTimeout(() => {
        getAccount.mockResolvedValue({ amount: BigInt(1500000) }); // 1.5 USDC after funding
      }, 1000);

      jest.advanceTimersByTime(5000);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
    });

    it('should timeout if no balance increase detected', async () => {
      const walletAddress = 'test-wallet-address';
      const expectedAmount = 100;
      const currency = 'USDC';

      // Mock constant balance (no increase)
      const { getAccount } = require('@solana/spl-token');
      getAccount.mockResolvedValue({ amount: BigInt(1000000) }); // Constant 1 USDC

      const promise = fundingService.handleMoonPayFunding(walletAddress, expectedAmount, currency);

      // Fast-forward past timeout (5 minutes)
      jest.advanceTimersByTime(300000);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('handleExternalFunding', () => {
    it('should handle external funding successfully', async () => {
      const walletAddress = 'test-wallet-address';
      const expectedAmount = 50;
      const currency = 'SOL';

      // Mock initial balance
      const { getBalance } = require('@solana/web3.js').Connection.prototype;
      getBalance.mockResolvedValue(1000000000); // 1 SOL initially

      const promise = fundingService.handleExternalFunding(walletAddress, expectedAmount, currency);

      // Simulate balance increase
      setTimeout(() => {
        getBalance.mockResolvedValue(1500000000); // 1.5 SOL after funding
      }, 1000);

      jest.advanceTimersByTime(5000);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.currency).toBe(currency);
    });
  });

  describe('getWalletBalance', () => {
    it('should get wallet balance from on-chain', async () => {
      const { PublicKey } = require('@solana/web3.js');
      const publicKey = new PublicKey('test-address');

      const result = await fundingService.getWalletBalance(publicKey);

      expect(result.sol).toBe(1); // 1 SOL
      expect(result.usdc).toBe(1); // 1 USDC
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getCurrentUserBalance', () => {
    it('should get current user balance', async () => {
      const result = await fundingService.getCurrentUserBalance();

      expect(result.sol).toBe(10); // Mocked balance
      expect(result.usdc).toBe(1000); // Mocked balance
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error if wallet not loaded', async () => {
      const { solanaWalletService } = require('../src/wallet/solanaWallet');
      solanaWalletService.loadWallet.mockResolvedValue(false);

      await expect(fundingService.getCurrentUserBalance()).rejects.toThrow('Wallet not loaded');
    });
  });

  describe('getFundingAddress', () => {
    it('should get funding address', async () => {
      const result = await fundingService.getFundingAddress();

      expect(result.address).toBe('test-public-key');
    });

    it('should throw error if wallet not loaded', async () => {
      const { solanaWalletService } = require('../src/wallet/solanaWallet');
      solanaWalletService.loadWallet.mockResolvedValue(false);

      await expect(fundingService.getFundingAddress()).rejects.toThrow('Wallet not loaded');
    });
  });

  describe('validateFundingTransaction', () => {
    it('should validate funding transaction', async () => {
      const result = await fundingService.validateFundingTransaction(
        'test-signature',
        100,
        'USDC'
      );

      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(100);
    });
  });

  describe('getFundingStatus', () => {
    it('should get funding status', async () => {
      const result = await fundingService.getFundingStatus('test-polling-id');

      expect(result.status).toBe('pending');
      expect(result.confirmations).toBe(0);
    });
  });

  describe('cancelFunding', () => {
    it('should cancel funding operation', async () => {
      const result = await fundingService.cancelFunding('test-polling-id');

      expect(result.success).toBe(true);
    });
  });
});

describe('Funding Polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should poll balance with exponential backoff', async () => {
    const walletAddress = 'test-wallet-address';
    const expectedAmount = 100;
    const currency = 'USDC';

    // Mock initial balance
    const { getAccount } = require('@solana/spl-token');
    getAccount.mockResolvedValue({ amount: BigInt(1000000) }); // 1 USDC initially

    const promise = fundingService.handleMoonPayFunding(walletAddress, expectedAmount, currency);

    // Simulate balance increase after some time
    setTimeout(() => {
      getAccount.mockResolvedValue({ amount: BigInt(101000000) }); // 101 USDC after funding
    }, 10000);

    // Fast-forward time to trigger multiple polls
    jest.advanceTimersByTime(15000);

    const result = await promise;

    expect(result.success).toBe(true);
  });

  it('should handle polling errors gracefully', async () => {
    const walletAddress = 'test-wallet-address';
    const expectedAmount = 100;
    const currency = 'USDC';

    // Mock initial balance
    const { getAccount } = require('@solana/spl-token');
    getAccount.mockResolvedValue({ amount: BigInt(1000000) });

    const promise = fundingService.handleMoonPayFunding(walletAddress, expectedAmount, currency);

    // Simulate error after a few polls
    setTimeout(() => {
      getAccount.mockRejectedValue(new Error('Network error'));
    }, 5000);

    // Fast-forward time
    jest.advanceTimersByTime(10000);

    const result = await promise;

    // Should continue polling despite errors
    expect(result.success).toBe(false);
  });
});

describe('Funding Security', () => {
  it('should validate wallet addresses', async () => {
    const invalidAddresses = [
      'invalid-address',
      '',
      'too-short',
    ];

    for (const address of invalidAddresses) {
      const result = await fundingService.handleMoonPayFunding(address, 100, 'USDC');
      expect(result.success).toBe(false);
    }
  });

  it('should handle network errors gracefully', async () => {
    const { Connection } = require('@solana/web3.js');
    Connection.prototype.getBalance.mockRejectedValue(new Error('Network error'));

    const { PublicKey } = require('@solana/web3.js');
    const publicKey = new PublicKey('test-address');

    await expect(fundingService.getWalletBalance(publicKey)).rejects.toThrow('Network error');
  });
});

describe('Funding Integration', () => {
  it('should handle complete MoonPay funding flow', async () => {
    const walletAddress = 'test-wallet-address';
    const expectedAmount = 100;
    const currency = 'USDC';

    // Mock initial balance
    const { getAccount } = require('@solana/spl-token');
    getAccount.mockResolvedValue({ amount: BigInt(1000000) }); // 1 USDC initially

    const promise = fundingService.handleMoonPayFunding(walletAddress, expectedAmount, currency);

    // Simulate successful funding
    setTimeout(() => {
      getAccount.mockResolvedValue({ amount: BigInt(101000000) }); // 101 USDC after funding
    }, 1000);

    jest.advanceTimersByTime(5000);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.amount).toBeGreaterThan(0);
    expect(result.currency).toBe(currency);
    expect(result.transactionSignature).toBeDefined();
  });

  it('should handle external funding flow', async () => {
    const walletAddress = 'test-wallet-address';
    const expectedAmount = 50;
    const currency = 'SOL';

    // Mock initial balance
    const { getBalance } = require('@solana/web3.js').Connection.prototype;
    getBalance.mockResolvedValue(1000000000); // 1 SOL initially

    const promise = fundingService.handleExternalFunding(walletAddress, expectedAmount, currency);

    // Simulate successful funding
    setTimeout(() => {
      getBalance.mockResolvedValue(1500000000); // 1.5 SOL after funding
    }, 1000);

    jest.advanceTimersByTime(5000);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.amount).toBeGreaterThan(0);
    expect(result.currency).toBe(currency);
  });
});
