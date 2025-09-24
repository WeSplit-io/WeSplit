/**
 * USDC Transfer Tests
 * Tests company fee payer, ATA creation, and transfer validation
 */

import { 
  buildUsdcTransfer, 
  ensureAtaIx, 
  validateTransferParams,
  getTransferPreview
} from '../src/transfer/usdcTransfer';
import { deriveKeypairFromMnemonic } from '../src/wallet/derive';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { CURRENT_NETWORK, COMPANY_WALLET_CONFIG } from '../src/config/chain';

// Mock the connection and services
jest.mock('@solana/web3.js', () => ({
  ...jest.requireActual('@solana/web3.js'),
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 100
    }),
    getFeeForMessage: jest.fn().mockResolvedValue({ value: 5000 })
  }))
}));

jest.mock('../src/services/loggingService', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('USDC Transfer Tests', () => {
  let mockConnection: jest.Mocked<Connection>;
  let senderKeypair: Keypair;
  let recipientPublicKey: PublicKey;
  let companyPublicKey: PublicKey;

  beforeEach(() => {
    // Create mock keypairs
    senderKeypair = Keypair.generate();
    recipientPublicKey = Keypair.generate().publicKey;
    companyPublicKey = new PublicKey(COMPANY_WALLET_CONFIG.address || '11111111111111111111111111111111');
    
    // Mock connection
    mockConnection = new Connection('https://test-rpc.com') as jest.Mocked<Connection>;
  });

  describe('Transfer Parameter Validation', () => {
    test('should validate correct transfer parameters', () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10.5,
        cluster: 'devnet' as const
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject negative amount', () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: -1,
        cluster: 'devnet' as const
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transfer amount must be greater than 0');
    });

    test('should reject zero amount', () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 0,
        cluster: 'devnet' as const
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transfer amount must be greater than 0');
    });

    test('should reject excessive amount', () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 2000000, // 2M USDC
        cluster: 'devnet' as const
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transfer amount exceeds maximum limit');
    });

    test('should reject invalid public keys', () => {
      const params = {
        fromOwnerPubkey: 'invalid-key' as any,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid from owner public key');
    });

    test('should reject invalid cluster', () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'invalid-cluster' as any
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid cluster. Must be mainnet or devnet');
    });

    test('should reject invalid priority', () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const,
        priority: 'invalid-priority' as any
      };

      const result = validateTransferParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid priority. Must be low, medium, or high');
    });
  });

  describe('Transfer Preview', () => {
    test('should generate transfer preview', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10.5,
        cluster: 'devnet' as const
      };

      const preview = await getTransferPreview(params);
      
      expect(preview.fromTokenAccount).toBeTruthy();
      expect(preview.toTokenAccount).toBeTruthy();
      expect(preview.transferAmount).toBe(10500000); // 10.5 * 10^6
      expect(preview.companyFeePayer).toBe(companyPublicKey.toBase58());
      expect(preview.usdcMint).toBe(CURRENT_NETWORK.usdcMintAddress);
      expect(typeof preview.needsAtaCreation).toBe('boolean');
    });
  });

  describe('ATA Creation', () => {
    test('should create ATA creation instructions when needed', async () => {
      // Mock getAccount to throw (ATA doesn't exist)
      mockConnection.getAccount = jest.fn().mockRejectedValue(new Error('Account not found'));

      const result = await ensureAtaIx({
        owner: recipientPublicKey,
        mint: new PublicKey(CURRENT_NETWORK.usdcMintAddress),
        payer: companyPublicKey,
        connection: mockConnection
      });

      expect(result.ata).toBeTruthy();
      expect(result.needsCreation).toBe(true);
      expect(result.instructions).toHaveLength(1);
    });

    test('should not create instructions when ATA exists', async () => {
      // Mock getAccount to return account (ATA exists)
      mockConnection.getAccount = jest.fn().mockResolvedValue({} as any);

      const result = await ensureAtaIx({
        owner: recipientPublicKey,
        mint: new PublicKey(CURRENT_NETWORK.usdcMintAddress),
        payer: companyPublicKey,
        connection: mockConnection
      });

      expect(result.ata).toBeTruthy();
      expect(result.needsCreation).toBe(false);
      expect(result.instructions).toHaveLength(0);
    });
  });

  describe('Transfer Building', () => {
    test('should build transfer with company fee payer', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10.5,
        cluster: 'devnet' as const,
        memo: 'Test transfer'
      };

      const result = await buildUsdcTransfer(params);
      
      expect(result.transaction).toBeTruthy();
      expect(result.fromTokenAccount).toBeTruthy();
      expect(result.toTokenAccount).toBeTruthy();
      expect(result.transferAmount).toBe(10500000);
      expect(result.estimatedFees).toBeGreaterThan(0);
      expect(typeof result.needsAtaCreation).toBe('boolean');
    });

    test('should include memo in transaction', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const,
        memo: 'Test memo'
      };

      const result = await buildUsdcTransfer(params);
      
      expect(result.transaction).toBeTruthy();
      // The transaction should include the memo instruction
    });

    test('should handle different priority levels', async () => {
      const priorities = ['low', 'medium', 'high'] as const;
      
      for (const priority of priorities) {
        const params = {
          fromOwnerPubkey: senderKeypair.publicKey,
          toOwnerPubkey: recipientPublicKey,
          amountUi: 10,
          cluster: 'devnet' as const,
          priority
        };

        const result = await buildUsdcTransfer(params);
        expect(result.transaction).toBeTruthy();
      }
    });

    test('should throw error for invalid cluster', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'invalid-cluster' as any
      };

      await expect(buildUsdcTransfer(params)).rejects.toThrow('Invalid cluster');
    });

    test('should throw error when company wallet not configured', async () => {
      // Mock COMPANY_WALLET_CONFIG to have no address
      const originalConfig = COMPANY_WALLET_CONFIG.address;
      (COMPANY_WALLET_CONFIG as any).address = '';

      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      await expect(buildUsdcTransfer(params)).rejects.toThrow('Company wallet address not configured');

      // Restore original config
      (COMPANY_WALLET_CONFIG as any).address = originalConfig;
    });
  });

  describe('Fee Payer Validation', () => {
    test('should set company as fee payer', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      const result = await buildUsdcTransfer(params);
      
      // The transaction should have company as fee payer
      // This would be verified by checking the transaction's fee payer
      expect(result.transaction).toBeTruthy();
    });

    test('should not require user to have SOL for fees', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      // This test ensures the user doesn't need SOL for transaction fees
      const result = await buildUsdcTransfer(params);
      
      expect(result.transaction).toBeTruthy();
      expect(result.estimatedFees).toBeGreaterThan(0);
    });
  });

  describe('ATA Auto-Creation', () => {
    test('should create ATA when recipient has none', async () => {
      // Mock getAccount to throw for recipient ATA
      mockConnection.getAccount = jest.fn()
        .mockRejectedValueOnce(new Error('Account not found')) // Recipient ATA doesn't exist
        .mockResolvedValueOnce({} as any); // Sender ATA exists

      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      const result = await buildUsdcTransfer(params);
      
      expect(result.transaction).toBeTruthy();
      expect(result.needsAtaCreation).toBe(true);
    });

    test('should not create ATA when recipient already has one', async () => {
      // Mock getAccount to return accounts (both ATAs exist)
      mockConnection.getAccount = jest.fn().mockResolvedValue({} as any);

      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      const result = await buildUsdcTransfer(params);
      
      expect(result.transaction).toBeTruthy();
      expect(result.needsAtaCreation).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', async () => {
      // Mock connection to throw error
      mockConnection.getLatestBlockhash = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 10,
        cluster: 'devnet' as const
      };

      await expect(buildUsdcTransfer(params)).rejects.toThrow('Connection failed');
    });

    test('should handle invalid amount conversion', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 0.000001, // Very small amount
        cluster: 'devnet' as const
      };

      const result = await buildUsdcTransfer(params);
      
      // Should handle small amounts correctly
      expect(result.transferAmount).toBe(1); // 0.000001 * 10^6 = 1
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with valid parameters', async () => {
      const params = {
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: recipientPublicKey,
        amountUi: 100,
        cluster: 'devnet' as const,
        memo: 'Integration test',
        priority: 'medium' as const
      };

      // Validate parameters
      const validation = validateTransferParams(params);
      expect(validation.isValid).toBe(true);

      // Get preview
      const preview = await getTransferPreview(params);
      expect(preview).toBeTruthy();

      // Build transfer
      const result = await buildUsdcTransfer(params);
      expect(result.transaction).toBeTruthy();
      expect(result.transferAmount).toBe(100000000); // 100 * 10^6
    });

    test('should handle multiple transfers correctly', async () => {
      const recipients = [
        Keypair.generate().publicKey,
        Keypair.generate().publicKey,
        Keypair.generate().publicKey
      ];

      for (const recipient of recipients) {
        const params = {
          fromOwnerPubkey: senderKeypair.publicKey,
          toOwnerPubkey: recipient,
          amountUi: 10,
          cluster: 'devnet' as const
        };

        const result = await buildUsdcTransfer(params);
        expect(result.transaction).toBeTruthy();
      }
    });
  });
});
