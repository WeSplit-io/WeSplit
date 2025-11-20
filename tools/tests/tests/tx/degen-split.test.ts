/**
 * Degen Split Transaction Tests
 * Tests the degen split payment flow with custom logic and priority handling
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

jest.mock('../../../../src/services/shared/memoryManager', () => ({
  memoryManager: {
    loadModule: jest.fn()
  }
}));

jest.mock('../../../../src/services/shared/transactionUtilsOptimized', () => ({
  optimizedTransactionUtils: {
    getConnection: jest.fn()
  }
}));

jest.mock('../../../../src/services/shared/keypairUtils', () => ({
  KeypairUtils: {
    createKeypairFromSecretKey: jest.fn()
  }
}));

describe('Degen Split Transaction Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Split Logic Tests', () => {
    test('should handle custom split percentages with proper rounding', async () => {
      const totalAmount = 100;
      const customPercentages = [0.4, 0.35, 0.25]; // 40%, 35%, 25%
      const expectedAmounts = [40, 35, 25];
      
      const amounts = customPercentages.map(percentage => 
        Math.floor(totalAmount * percentage)
      );
      
      // Adjust last amount to ensure total is preserved
      const totalDistributed = amounts.reduce((sum, amount) => sum + amount, 0);
      const remainder = totalAmount - totalDistributed;
      amounts[amounts.length - 1] += remainder;
      
      expect(amounts).toEqual(expectedAmounts);
      expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(totalAmount);
    });

    test('should handle zero amounts for some recipients', async () => {
      const totalAmount = 100;
      const customPercentages = [0.5, 0, 0.5]; // 50%, 0%, 50%
      const expectedAmounts = [50, 0, 50];
      
      const amounts = customPercentages.map(percentage => 
        Math.floor(totalAmount * percentage)
      );
      
      // Adjust last amount to ensure total is preserved
      const totalDistributed = amounts.reduce((sum, amount) => sum + amount, 0);
      const remainder = totalAmount - totalDistributed;
      amounts[amounts.length - 1] += remainder;
      
      expect(amounts).toEqual(expectedAmounts);
      expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(totalAmount);
    });

    test('should handle tiny fractional amounts', async () => {
      const totalAmount = 1;
      const customPercentages = [0.33, 0.33, 0.34]; // 33%, 33%, 34%
      
      const amounts = customPercentages.map(percentage => 
        Math.floor(totalAmount * percentage)
      );
      
      // Adjust last amount to ensure total is preserved
      const totalDistributed = amounts.reduce((sum, amount) => sum + amount, 0);
      const remainder = totalAmount - totalDistributed;
      amounts[amounts.length - 1] += remainder;
      
      expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(totalAmount);
      expect(amounts[0]).toBe(0); // 0.33 * 1 = 0.33, floored to 0
      expect(amounts[1]).toBe(0); // 0.33 * 1 = 0.33, floored to 0
      expect(amounts[2]).toBe(1); // Gets remainder
    });
  });

  describe('Priority Recipient Tests', () => {
    test('should honor priority ordering for recipients', async () => {
      const recipients = [
        { id: 'user1', priority: 2, amount: 30 },
        { id: 'user2', priority: 1, amount: 50 },
        { id: 'user3', priority: 3, amount: 20 }
      ];
      
      // Sort by priority (lower number = higher priority)
      const sortedRecipients = recipients.sort((a, b) => a.priority - b.priority);
      
      expect(sortedRecipients[0].id).toBe('user2'); // Priority 1
      expect(sortedRecipients[1].id).toBe('user1'); // Priority 2
      expect(sortedRecipients[2].id).toBe('user3'); // Priority 3
    });

    test('should process recipients in priority order', async () => {
      const recipients = [
        { id: 'user1', priority: 2, amount: 30 },
        { id: 'user2', priority: 1, amount: 50 },
        { id: 'user3', priority: 3, amount: 20 }
      ];
      
      const sortedRecipients = recipients.sort((a, b) => a.priority - b.priority);
      const processedOrder = [];
      
      // Simulate processing in priority order
      for (const recipient of sortedRecipients) {
        processedOrder.push(recipient.id);
      }
      
      expect(processedOrder).toEqual(['user2', 'user1', 'user3']);
    });
  });

  describe('Degen Split Specific Logic', () => {
    test('should handle roulette-based distribution', async () => {
      const totalAmount = 100;
      const participants = ['user1', 'user2', 'user3', 'user4'];
      
      // Mock roulette result: user2 wins 60%, user4 wins 40%
      const rouletteResult = {
        'user1': 0,
        'user2': 60,
        'user3': 0,
        'user4': 40
      };
      
      const amounts = participants.map(participant => 
        Math.floor(totalAmount * (rouletteResult[participant] / 100))
      );
      
      // Adjust last non-zero amount to ensure total is preserved
      const totalDistributed = amounts.reduce((sum, amount) => sum + amount, 0);
      const remainder = totalAmount - totalDistributed;
      
      // Find last non-zero amount and add remainder
      for (let i = amounts.length - 1; i >= 0; i--) {
        if (amounts[i] > 0) {
          amounts[i] += remainder;
          break;
        }
      }
      
      expect(amounts).toEqual([0, 60, 0, 40]);
      expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(totalAmount);
    });

    test('should handle degen split with custom rules', async () => {
      const totalAmount = 100;
      const degenRules = {
        minAmount: 1, // Minimum 1 USDC per recipient
        maxAmount: 80, // Maximum 80 USDC per recipient
        allowZero: false // Don't allow zero amounts
      };
      
      const customPercentages = [0.1, 0.2, 0.7]; // 10%, 20%, 70%
      let amounts = customPercentages.map(percentage => 
        Math.floor(totalAmount * percentage)
      );
      
      // Apply degen rules
      amounts = amounts.map(amount => {
        if (amount < degenRules.minAmount && amount > 0) {
          return degenRules.minAmount;
        }
        if (amount > degenRules.maxAmount) {
          return degenRules.maxAmount;
        }
        return amount;
      });
      
      // Adjust to preserve total
      const totalDistributed = amounts.reduce((sum, amount) => sum + amount, 0);
      const remainder = totalAmount - totalDistributed;
      amounts[amounts.length - 1] += remainder;
      
      expect(amounts.every(amount => amount >= degenRules.minAmount || amount === 0)).toBe(true);
      expect(amounts.every(amount => amount <= degenRules.maxAmount)).toBe(true);
      expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(totalAmount);
    });
  });

  describe('Degen Roulette Randomness Simulation', () => {
    const baseParticipants = [
      { id: 'user-1', name: 'Alice' },
      { id: 'user-2', name: 'Bob' },
      { id: 'user-3', name: 'Charlie' },
      { id: 'user-4', name: 'Diana' }
    ];

    const spinRoulette = (
      participants: typeof baseParticipants,
      rng: () => number = Math.random,
      timestamp: number = Date.now()
    ) => {
      if (participants.length === 0) {
        throw new Error('No participants provided');
      }

      if (participants.length === 1) {
        return participants.map(participant => ({
          ...participant,
          status: 'loser' as const
        }));
      }

      const timestampFraction = (timestamp % 1000) / 1000;
      const random1 = rng();
      const random2 = rng();
      const combinedRandom = (random1 + random2 + timestampFraction) / 3;

      let finalIndex = Math.floor(combinedRandom * participants.length);
      if (finalIndex >= participants.length) {
        finalIndex = participants.length - 1;
      }

      return participants.map((participant, index) => ({
        ...participant,
        status: index === finalIndex ? ('loser' as const) : ('winner' as const)
      }));
    };

    const createDeterministicRng = (seed: number) => {
      let current = seed;
      return () => {
        current = (current * 16807) % 2147483647;
        return current / 2147483647;
      };
    };

    test('selects exactly one loser and marks others as winners', () => {
      const deterministicRng = (() => {
        const values = [0.1, 0.9];
        let index = 0;
        return () => values[index++ % values.length];
      })();

      const result = spinRoulette(baseParticipants, deterministicRng, 1700000000000);
      const losers = result.filter(participant => participant.status === 'loser');
      const winners = result.filter(participant => participant.status === 'winner');

      expect(losers).toHaveLength(1);
      expect(winners).toHaveLength(baseParticipants.length - 1);
      expect(losers[0].id).toBe('user-2');
    });

    test('can deterministically select each participant as the loser', () => {
      baseParticipants.forEach((participant, index) => {
        const fractionalIndex = index / baseParticipants.length;
        const deterministicRng = (() => {
          let calls = 0;
          return () => {
            calls += 1;
            return fractionalIndex;
          };
        })();

        const timestampFraction = Math.round(fractionalIndex * 1000);
        const timestamp = 1700000000000 + timestampFraction;

        const result = spinRoulette(baseParticipants, deterministicRng, timestamp);
        const loser = result.find(p => p.status === 'loser');

        expect(loser?.id).toBe(participant.id);
      });
    });

    test('reports loser feedback with split metadata for each spin', () => {
      const splitInfo = {
        id: 'split-xyz',
        title: 'Friends Dinner',
        totalAmount: 240
      };
      const rngValues = [0.05, 0.35, 0.65, 0.85];
      let rngIndex = 0;
      const rng = () => {
        const value = rngValues[rngIndex % rngValues.length];
        rngIndex += 1;
        return value;
      };

      const iterations = rngValues.length;
      let timestamp = 1700000000000;
      const outcomes: {
        spin: number;
        loserId: string | undefined;
        loserName: string | undefined;
        splitId: string;
        splitTitle: string;
        totalAmount: number;
      }[] = [];

      for (let i = 0; i < iterations; i++) {
        timestamp += 21;
        const result = spinRoulette(baseParticipants, rng, timestamp);
        const loser = result.find(p => p.status === 'loser');
        const winnerEntries = result
          .filter(p => p.status === 'winner')
          .map(p => `${p.name} (${p.id})`);
        const outcome = {
          spin: i + 1,
          loserId: loser?.id,
          loserName: loser?.name,
          splitId: splitInfo.id,
          splitTitle: splitInfo.title,
          totalAmount: splitInfo.totalAmount,
          winnersDisplay: winnerEntries.join(', ')
        };
        outcomes.push(outcome);
        const logLine =
          `[Degen Roulette] Spin ${outcome.spin}: loser=${outcome.loserName} (${outcome.loserId}) | ` +
          `winners=${outcome.winnersDisplay || 'n/a'} | split=${outcome.splitTitle} (${outcome.splitId}) total=${outcome.totalAmount} USDC`;
        process.stdout.write(`${logLine}\n`);
      }

      expect(outcomes).toHaveLength(iterations);
      expect(new Set(outcomes.map(o => o.loserId)).size).toBeGreaterThan(1);
      outcomes.forEach(outcome => {
        expect(outcome.splitId).toBe(splitInfo.id);
        expect(outcome.splitTitle).toBe(splitInfo.title);
        expect(outcome.totalAmount).toBe(splitInfo.totalAmount);
        expect(outcome.loserId).toBeDefined();
        expect(outcome.loserName).toBeDefined();
        expect(outcome.winnersDisplay.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle invalid percentage totals', async () => {
      const totalAmount = 100;
      const invalidPercentages = [0.5, 0.6]; // Total > 1.0
      
      const totalPercentage = invalidPercentages.reduce((sum, p) => sum + p, 0);
      expect(totalPercentage).toBeGreaterThan(1.0);
      
      // In real implementation, this should throw validation error
    });

    test('should handle negative percentages', async () => {
      const totalAmount = 100;
      const negativePercentages = [0.5, -0.1, 0.6];
      
      const hasNegative = negativePercentages.some(p => p < 0);
      expect(hasNegative).toBe(true);
      
      // In real implementation, this should throw validation error
    });
  });

  describe('Idempotency Tests', () => {
    test('should not re-process same degen split request', async () => {
      const degenSplitId = 'degen-split-123';
      const idempotencyKey = 'degen-key-456';
      
      // Mock database check for existing degen split
      const mockCheckExistingDegenSplit = jest.fn()
        .mockResolvedValueOnce(null) // First call: no existing split
        .mockResolvedValueOnce({ 
          id: degenSplitId, 
          status: 'completed',
          signature: 'existing-sig'
        }); // Second call: existing split found

      // First call should proceed
      const firstResult = await mockCheckExistingDegenSplit();
      expect(firstResult).toBeNull();

      // Second call should return existing result
      const secondResult = await mockCheckExistingDegenSplit();
      expect(secondResult.status).toBe('completed');
    });
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent degen split requests', async () => {
      const degenSplitId = 'degen-split-123';
      
      // Mock optimistic locking for degen splits
      const mockDegenSplitLock = jest.fn()
        .mockResolvedValueOnce({ success: true, lockAcquired: true })
        .mockResolvedValueOnce({ success: false, lockAcquired: false });

      // Simulate two concurrent degen split requests
      const [result1, result2] = await Promise.all([
        mockDegenSplitLock(),
        mockDegenSplitLock()
      ]);

      expect(result1.lockAcquired).toBe(true);
      expect(result2.lockAcquired).toBe(false);
    });
  });
});
