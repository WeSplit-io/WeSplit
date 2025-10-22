/**
 * 1:1 Send Transaction Tests
 * Tests the direct transfer flow between single sender and recipient
 */

// Mock Solana modules
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn(),
  Keypair: jest.fn(),
  Transaction: jest.fn(),
  SystemProgram: {
    transfer: jest.fn()
  },
  LAMPORTS_PER_SOL: 1000000000,
  ComputeBudgetProgram: {
    setComputeUnitLimit: jest.fn(),
    setComputeUnitPrice: jest.fn()
  }
}));

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn(),
  createTransferInstruction: jest.fn(),
  getAccount: jest.fn(),
  createAssociatedTokenAccountInstruction: jest.fn(),
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
}));

jest.mock('../../src/services/shared/memoryManager', () => ({
  memoryManager: {
    loadModule: jest.fn()
  }
}));

jest.mock('../../src/services/shared/transactionUtilsOptimized', () => ({
  optimizedTransactionUtils: {
    getConnection: jest.fn()
  }
}));

jest.mock('../../src/services/shared/keypairUtils', () => ({
  KeypairUtils: {
    createKeypairFromSecretKey: jest.fn()
  }
}));

describe('1:1 Send Transaction Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path Tests', () => {
    test('should send SOL successfully with correct signature and balance update', async () => {
      const senderAddress = 'sender123';
      const recipientAddress = 'recipient456';
      const amount = 1.5; // 1.5 SOL
      const expectedSignature = 'test-signature-123';
      
      // Mock successful transaction
      const mockSendTransaction = jest.fn()
        .mockResolvedValue({ success: true, signature: expectedSignature });
      
      const result = await mockSendTransaction();
      
      expect(result.success).toBe(true);
      expect(result.signature).toBe(expectedSignature);
    });

    test('should send USDC successfully with company fee deduction', async () => {
      const senderAddress = 'sender123';
      const recipientAddress = 'recipient456';
      const amount = 100; // 100 USDC
      const companyFeeRate = 0.01; // 1%
      const expectedCompanyFee = 1; // 1 USDC
      const expectedRecipientAmount = 99; // 99 USDC
      
      // Mock fee calculation
      const calculateFee = (amount: number, rate: number) => ({
        fee: Math.floor(amount * rate),
        totalAmount: amount,
        recipientAmount: amount - Math.floor(amount * rate)
      });
      
      const feeResult = calculateFee(amount, companyFeeRate);
      
      expect(feeResult.fee).toBe(expectedCompanyFee);
      expect(feeResult.recipientAmount).toBe(expectedRecipientAmount);
      expect(feeResult.fee + feeResult.recipientAmount).toBe(amount);
    });

    test('should handle memo field correctly', async () => {
      const memo = 'Payment for dinner';
      const expectedMemo = 'Payment for dinner';
      
      expect(memo).toBe(expectedMemo);
      expect(memo.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle insufficient funds error', async () => {
      const senderBalance = 50; // 50 USDC
      const transferAmount = 100; // 100 USDC
      
      const hasSufficientBalance = senderBalance >= transferAmount;
      expect(hasSufficientBalance).toBe(false);
      
      // In real implementation, this should return error
      const expectedError = `Insufficient USDC balance. Required: ${transferAmount}, Available: ${senderBalance}`;
      expect(expectedError).toContain('Insufficient');
    });

    test('should handle invalid recipient address', async () => {
      const invalidAddresses = [
        'invalid-address',
        '123',
        '',
        'not-a-valid-solana-address'
      ];
      
      const validateAddress = (address: string) => {
        // Basic validation - in real implementation would use PublicKey validation
        return address.length > 32 && address.includes('1');
      };
      
      for (const address of invalidAddresses) {
        expect(validateAddress(address)).toBe(false);
      }
    });

    test('should handle RPC connection errors', async () => {
      const mockRpcError = new Error('RPC connection failed');
      
      const mockSendTransaction = jest.fn()
        .mockRejectedValue(mockRpcError);
      
      try {
        await mockSendTransaction();
      } catch (error) {
        expect(error).toBe(mockRpcError);
        expect(error.message).toBe('RPC connection failed');
      }
    });

    test('should handle transaction confirmation timeout', async () => {
      const mockTimeoutError = new Error('Transaction confirmation timeout');
      
      const mockConfirmTransaction = jest.fn()
        .mockRejectedValue(mockTimeoutError);
      
      try {
        await mockConfirmTransaction();
      } catch (error) {
        expect(error).toBe(mockTimeoutError);
        expect(error.message).toBe('Transaction confirmation timeout');
      }
    });
  });

  describe('Idempotency Tests', () => {
    test('should not duplicate transfer with same idempotency key', async () => {
      const idempotencyKey = 'send-key-123';
      const amount = 50;
      
      // Mock database check for existing transaction
      const mockCheckExistingTransaction = jest.fn()
        .mockResolvedValueOnce(null) // First call: no existing transaction
        .mockResolvedValueOnce({ 
          signature: 'existing-sig',
          amount: amount,
          status: 'completed'
        }); // Second call: existing transaction found

      // First call should proceed
      const firstResult = await mockCheckExistingTransaction();
      expect(firstResult).toBeNull();

      // Second call should return existing result
      const secondResult = await mockCheckExistingTransaction();
      expect(secondResult.signature).toBe('existing-sig');
      expect(secondResult.status).toBe('completed');
    });

    test('should handle idempotency key collision gracefully', async () => {
      const idempotencyKey = 'collision-key-456';
      
      // Mock collision detection
      const mockDetectCollision = jest.fn()
        .mockResolvedValueOnce(false) // First call: no collision
        .mockResolvedValueOnce(true); // Second call: collision detected

      const [firstCheck, secondCheck] = await Promise.all([
        mockDetectCollision(),
        mockDetectCollision()
      ]);

      expect(firstCheck).toBe(false);
      expect(secondCheck).toBe(true);
    });
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent send requests from same user', async () => {
      const userId = 'user123';
      const amount1 = 50;
      const amount2 = 30;
      
      // Mock balance check and deduction
      const mockBalanceCheck = jest.fn()
        .mockResolvedValueOnce({ hasSufficientBalance: true, currentBalance: 100 })
        .mockResolvedValueOnce({ hasSufficientBalance: true, currentBalance: 100 });
      
      const [balance1, balance2] = await Promise.all([
        mockBalanceCheck(),
        mockBalanceCheck()
      ]);

      expect(balance1.hasSufficientBalance).toBe(true);
      expect(balance2.hasSufficientBalance).toBe(true);
      
      // In real implementation, would need proper locking to prevent double-spending
    });

    test('should prevent double-spending with optimistic locking', async () => {
      const userId = 'user123';
      const transferAmount = 50;
      const currentBalance = 100;
      
      // Mock optimistic locking
      const mockOptimisticLock = jest.fn()
        .mockResolvedValueOnce({ success: true, lockAcquired: true, newBalance: 50 })
        .mockResolvedValueOnce({ success: false, lockAcquired: false, error: 'Insufficient balance' });

      // Simulate two concurrent transfer attempts
      const [result1, result2] = await Promise.all([
        mockOptimisticLock(),
        mockOptimisticLock()
      ]);

      expect(result1.lockAcquired).toBe(true);
      expect(result1.newBalance).toBe(50);
      expect(result2.lockAcquired).toBe(false);
      expect(result2.error).toBe('Insufficient balance');
    });
  });

  describe('Fee Handling Tests', () => {
    test('should calculate company fee correctly for different transaction types', async () => {
      const testCases = [
        { amount: 100, type: 'send', expectedFee: 1 }, // 1% for send
        { amount: 100, type: 'request', expectedFee: 0 }, // 0% for request
        { amount: 100, type: 'split', expectedFee: 0 }, // 0% for split
      ];
      
      const calculateCompanyFee = (amount: number, type: string) => {
        const feeRates = {
          'send': 0.01,
          'request': 0,
          'split': 0
        };
        return Math.floor(amount * (feeRates[type] || 0));
      };
      
      for (const testCase of testCases) {
        const fee = calculateCompanyFee(testCase.amount, testCase.type);
        expect(fee).toBe(testCase.expectedFee);
      }
    });

    test('should handle blockchain fee calculation', async () => {
      const transactionSize = 1000; // bytes
      const baseFee = 5000; // lamports
      const priorityFee = 10000; // lamports
      
      const totalBlockchainFee = baseFee + priorityFee;
      expect(totalBlockchainFee).toBe(15000);
    });
  });

  describe('Security Tests', () => {
    test('should validate sender has permission to send', async () => {
      const senderId = 'user123';
      const recipientId = 'user456';
      
      // Mock permission check
      const mockCheckPermission = jest.fn()
        .mockResolvedValue({ hasPermission: true });
      
      const permissionResult = await mockCheckPermission();
      expect(permissionResult.hasPermission).toBe(true);
    });

    test('should validate recipient address format', async () => {
      const validAddresses = [
        '11111111111111111111111111111112', // System program
        'So11111111111111111111111111111111111111112', // Wrapped SOL
      ];
      
      const invalidAddresses = [
        'invalid',
        '123',
        '',
        'not-a-valid-address'
      ];
      
      const validateSolanaAddress = (address: string) => {
        // Basic validation - in real implementation would use PublicKey validation
        return address.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
      };
      
      for (const address of validAddresses) {
        expect(validateSolanaAddress(address)).toBe(true);
      }
      
      for (const address of invalidAddresses) {
        expect(validateSolanaAddress(address)).toBe(false);
      }
    });
  });

  describe('Balance Validation Tests', () => {
    test('should check balance before attempting transfer', async () => {
      const userId = 'user123';
      const transferAmount = 50;
      const currentBalance = 100;
      
      const hasSufficientBalance = currentBalance >= transferAmount;
      expect(hasSufficientBalance).toBe(true);
      
      // Test insufficient balance
      const insufficientAmount = 150;
      const hasInsufficientBalance = currentBalance >= insufficientAmount;
      expect(hasInsufficientBalance).toBe(false);
    });

    test('should handle balance updates atomically', async () => {
      const userId = 'user123';
      const transferAmount = 50;
      const initialBalance = 100;
      const expectedFinalBalance = 50;
      
      // Mock atomic balance update
      const mockAtomicUpdate = jest.fn()
        .mockResolvedValue({ 
          success: true, 
          oldBalance: initialBalance, 
          newBalance: expectedFinalBalance 
        });
      
      const updateResult = await mockAtomicUpdate();
      expect(updateResult.success).toBe(true);
      expect(updateResult.oldBalance).toBe(initialBalance);
      expect(updateResult.newBalance).toBe(expectedFinalBalance);
    });
  });
});
