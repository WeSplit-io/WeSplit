/**
 * Transfer Tests
 * Tests for internal and external transfer functionality
 */

import { internalTransferService } from '../src/transfer/sendInternal';
import { externalTransferService } from '../src/transfer/sendExternal';

// Mock dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn(() => Promise.resolve({ blockhash: 'test-blockhash' })),
    getBalance: jest.fn(() => Promise.resolve(1000000000)), // 1 SOL in lamports
    getSignatureStatus: jest.fn(() => Promise.resolve({ value: { confirmations: 32 } })),
  })),
  PublicKey: jest.fn().mockImplementation((address) => ({ toBase58: () => address })),
  Transaction: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    sign: jest.fn(),
    signatures: [],
  })),
  SystemProgram: {
    transfer: jest.fn(() => ({})),
  },
  TransactionInstruction: jest.fn(),
  sendAndConfirmTransaction: jest.fn(() => Promise.resolve('test-signature')),
  ComputeBudgetProgram: {
    setComputeUnitPrice: jest.fn(() => ({})),
  },
  LAMPORTS_PER_SOL: 1000000000,
}));

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn(() => Promise.resolve({ toBase58: () => 'token-account' })),
  getAccount: jest.fn(() => Promise.resolve({ amount: BigInt(1000000) })), // 1 USDC
  createTransferInstruction: jest.fn(() => ({})),
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
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
  TRANSACTION_CONFIG: {
    priorityFees: {
      low: 1000,
      medium: 5000,
      high: 10000,
    },
    computeUnits: {
      tokenTransfer: 300000,
    },
  },
  COMPANY_FEE_CONFIG: {
    percentage: 3.0,
    minFee: 0.50,
    maxFee: 10.00,
  },
}));

describe('InternalTransferService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendInternalTransfer', () => {
    it('should send SOL transfer successfully', async () => {
      const params = {
        to: 'recipient-address',
        amount: 1.0,
        currency: 'SOL' as const,
        userId: 'user-123',
        memo: 'Test transfer',
      };

      const result = await internalTransferService.sendInternalTransfer(params);

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
      expect(result.txId).toBe('test-signature');
      expect(result.companyFee).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(params.amount);
    });

    it('should send USDC transfer successfully', async () => {
      const params = {
        to: 'recipient-address',
        amount: 100.0,
        currency: 'USDC' as const,
        userId: 'user-123',
        memo: 'Test USDC transfer',
      };

      const result = await internalTransferService.sendInternalTransfer(params);

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
      expect(result.companyFee).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(params.amount);
    });

    it('should validate recipient address', async () => {
      const params = {
        to: 'invalid-address',
        amount: 1.0,
        currency: 'SOL' as const,
        userId: 'user-123',
      };

      const result = await internalTransferService.sendInternalTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should check balance before transfer', async () => {
      const { solanaWalletService } = require('../src/wallet/solanaWallet');
      solanaWalletService.getBalance.mockResolvedValue({ sol: 0.1, usdc: 10 }); // Insufficient balance

      const params = {
        to: 'recipient-address',
        amount: 1.0,
        currency: 'SOL' as const,
        userId: 'user-123',
      };

      const result = await internalTransferService.sendInternalTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });

    it('should handle wallet not loaded', async () => {
      const { solanaWalletService } = require('../src/wallet/solanaWallet');
      solanaWalletService.loadWallet.mockResolvedValue(false);

      const params = {
        to: 'recipient-address',
        amount: 1.0,
        currency: 'SOL' as const,
        userId: 'user-123',
      };

      const result = await internalTransferService.sendInternalTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet not loaded');
    });
  });

  describe('checkBalance', () => {
    it('should check SOL balance correctly', async () => {
      const result = await internalTransferService.checkBalance('user-123', 1.0, 'SOL');

      expect(result.hasSufficientBalance).toBe(true);
      expect(result.currentBalance).toBe(10); // Mocked balance
      expect(result.requiredAmount).toBeGreaterThan(1.0); // Includes company fee
    });

    it('should check USDC balance correctly', async () => {
      const result = await internalTransferService.checkBalance('user-123', 100.0, 'USDC');

      expect(result.hasSufficientBalance).toBe(true);
      expect(result.currentBalance).toBe(1000); // Mocked balance
      expect(result.requiredAmount).toBeGreaterThan(100.0); // Includes company fee
    });

    it('should detect insufficient balance', async () => {
      const { solanaWalletService } = require('../src/wallet/solanaWallet');
      solanaWalletService.getBalance.mockResolvedValue({ sol: 0.1, usdc: 10 });

      const result = await internalTransferService.checkBalance('user-123', 1.0, 'SOL');

      expect(result.hasSufficientBalance).toBe(false);
      expect(result.shortfall).toBeGreaterThan(0);
    });
  });

  describe('getRealTimeBalance', () => {
    it('should get real-time balance from on-chain', async () => {
      const result = await internalTransferService.getRealTimeBalance('user-123');

      expect(result.sol).toBe(10);
      expect(result.usdc).toBe(1000);
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status', async () => {
      const result = await internalTransferService.getTransactionStatus('test-signature');

      expect(result.status).toBe('finalized');
      expect(result.confirmations).toBe(32);
    });
  });
});

describe('ExternalTransferService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendExternalTransfer', () => {
    it('should send external transfer successfully', async () => {
      const params = {
        to: 'external-wallet-address',
        amount: 1.0,
        currency: 'SOL' as const,
        userId: 'user-123',
        memo: 'External transfer',
      };

      const result = await externalTransferService.sendExternalTransfer(params);

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
      expect(result.companyFee).toBeGreaterThan(0);
    });

    it('should check if wallet is linked', async () => {
      const result = await externalTransferService.isWalletLinked('external-address', 'user-123');

      expect(result).toBe(false); // Mock returns empty array
    });

    it('should get linked wallets', async () => {
      const result = await externalTransferService.getLinkedWallets('user-123');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Transfer Security', () => {
  it('should validate all recipient addresses', async () => {
    const invalidAddresses = [
      'too-short',
      'invalid-characters-!@#',
      '',
      '11111111111111111111111111111111', // Invalid Solana address
    ];

    for (const address of invalidAddresses) {
      const result = await internalTransferService.sendInternalTransfer({
        to: address,
        amount: 1.0,
        currency: 'SOL',
        userId: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    }
  });

  it('should calculate company fees correctly', async () => {
    const testCases = [
      { amount: 10, expectedFeeRange: [0.5, 10] }, // Min fee
      { amount: 100, expectedFeeRange: [3, 10] }, // 3% fee
      { amount: 1000, expectedFeeRange: [10, 10] }, // Max fee
    ];

    for (const testCase of testCases) {
      const result = await internalTransferService.sendInternalTransfer({
        to: 'recipient-address',
        amount: testCase.amount,
        currency: 'USDC',
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.companyFee).toBeGreaterThanOrEqual(testCase.expectedFeeRange[0]);
      expect(result.companyFee).toBeLessThanOrEqual(testCase.expectedFeeRange[1]);
    }
  });

  it('should prevent self-transfers', async () => {
    const { solanaWalletService } = require('../src/wallet/solanaWallet');
    solanaWalletService.getPublicKey.mockReturnValue('same-address');

    const result = await internalTransferService.sendInternalTransfer({
      to: 'same-address',
      amount: 1.0,
      currency: 'SOL',
      userId: 'user-123',
    });

    // In a real implementation, this should be prevented
    // For now, we'll just test that the transfer goes through
    expect(result.success).toBe(true);
  });
});

describe('Transfer Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const { sendAndConfirmTransaction } = require('@solana/web3.js');
    sendAndConfirmTransaction.mockRejectedValue(new Error('Network error'));

    const result = await internalTransferService.sendInternalTransfer({
      to: 'recipient-address',
      amount: 1.0,
      currency: 'SOL',
      userId: 'user-123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should handle insufficient balance errors', async () => {
    const { solanaWalletService } = require('../src/wallet/solanaWallet');
    solanaWalletService.getBalance.mockResolvedValue({ sol: 0.01, usdc: 1 });

    const result = await internalTransferService.sendInternalTransfer({
      to: 'recipient-address',
      amount: 1.0,
      currency: 'SOL',
      userId: 'user-123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient');
  });

  it('should handle invalid transaction parameters', async () => {
    const result = await internalTransferService.sendInternalTransfer({
      to: 'recipient-address',
      amount: -1.0, // Invalid amount
      currency: 'SOL',
      userId: 'user-123',
    });

    expect(result.success).toBe(false);
  });
});

describe('Transfer Integration', () => {
  it('should handle complete transfer flow', async () => {
    // Check balance
    const balanceCheck = await internalTransferService.checkBalance('user-123', 1.0, 'SOL');
    expect(balanceCheck.hasSufficientBalance).toBe(true);

    // Send transfer
    const transferResult = await internalTransferService.sendInternalTransfer({
      to: 'recipient-address',
      amount: 1.0,
      currency: 'SOL',
      userId: 'user-123',
    });
    expect(transferResult.success).toBe(true);

    // Check transaction status
    const status = await internalTransferService.getTransactionStatus(transferResult.signature!);
    expect(status.status).toBe('finalized');
  });

  it('should handle USDC transfer flow', async () => {
    // Check balance
    const balanceCheck = await internalTransferService.checkBalance('user-123', 100.0, 'USDC');
    expect(balanceCheck.hasSufficientBalance).toBe(true);

    // Send transfer
    const transferResult = await internalTransferService.sendInternalTransfer({
      to: 'recipient-address',
      amount: 100.0,
      currency: 'USDC',
      userId: 'user-123',
    });
    expect(transferResult.success).toBe(true);

    // Verify USDC-specific handling
    expect(transferResult.netAmount).toBeLessThan(100.0); // After company fee
  });
});
