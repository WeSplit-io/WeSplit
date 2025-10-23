/**
 * Wallet Generation and Derivation Tests
 * Tests BIP39 mnemonic generation, derivation, and export/import parity
 */

import { 
  generateMnemonic12, 
  generateMnemonic24,
  deriveKeypairFromMnemonic, 
  publicKeyFromMnemonic,
  generateWalletFromMnemonic,
  validateBip39Mnemonic,
  verifyExportImportParity,
  SOLANA_DERIVATION_PATH
} from '../src/wallet/derive';
import { Keypair } from '@solana/web3.js';

describe('Wallet Derivation Tests', () => {
  
  describe('Mnemonic Generation', () => {
    test('should generate valid 12-word mnemonic', () => {
      const mnemonic = generateMnemonic12();
      const words = mnemonic.split(' ');
      
      expect(words).toHaveLength(12);
      expect(mnemonic).toBeTruthy();
      expect(typeof mnemonic).toBe('string');
    });

    test('should generate valid 24-word mnemonic', () => {
      const mnemonic = generateMnemonic24();
      const words = mnemonic.split(' ');
      
      expect(words).toHaveLength(24);
      expect(mnemonic).toBeTruthy();
      expect(typeof mnemonic).toBe('string');
    });

    test('should generate different mnemonics each time', () => {
      const mnemonic1 = generateMnemonic12();
      const mnemonic2 = generateMnemonic12();
      
      expect(mnemonic1).not.toBe(mnemonic2);
    });
  });

  describe('Mnemonic Validation', () => {
    test('should validate correct BIP39 mnemonic', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const result = validateBip39Mnemonic(mnemonic);
      
      expect(result.isValid).toBe(true);
      expect(result.wordCount).toBe(12);
      expect(result.checksum).toBeTruthy();
    });

    test('should reject invalid mnemonic', () => {
      const mnemonic = 'invalid mnemonic phrase that is not valid bip39';
      const result = validateBip39Mnemonic(mnemonic);
      
      expect(result.isValid).toBe(false);
      expect(result.wordCount).toBe(0);
    });

    test('should reject mnemonic with wrong word count', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
      const result = validateBip39Mnemonic(mnemonic);
      
      expect(result.isValid).toBe(false);
      expect(result.wordCount).toBe(11);
    });
  });

  describe('Keypair Derivation', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('should derive keypair from valid mnemonic', () => {
      const keypair = deriveKeypairFromMnemonic(testMnemonic);
      
      expect(keypair).toBeInstanceOf(Keypair);
      expect(keypair.publicKey).toBeTruthy();
      expect(keypair.secretKey).toBeTruthy();
      expect(keypair.secretKey).toHaveLength(64);
    });

    test('should derive same keypair with same mnemonic', () => {
      const keypair1 = deriveKeypairFromMnemonic(testMnemonic);
      const keypair2 = deriveKeypairFromMnemonic(testMnemonic);
      
      expect(keypair1.publicKey.toBase58()).toBe(keypair2.publicKey.toBase58());
      expect(keypair1.secretKey).toEqual(keypair2.secretKey);
    });

    test('should derive different keypairs with different mnemonics', () => {
      const mnemonic1 = generateMnemonic12();
      const mnemonic2 = generateMnemonic12();
      
      const keypair1 = deriveKeypairFromMnemonic(mnemonic1);
      const keypair2 = deriveKeypairFromMnemonic(mnemonic2);
      
      expect(keypair1.publicKey.toBase58()).not.toBe(keypair2.publicKey.toBase58());
    });

    test('should use correct derivation path', () => {
      const keypair = deriveKeypairFromMnemonic(testMnemonic, SOLANA_DERIVATION_PATH);
      
      expect(keypair).toBeInstanceOf(Keypair);
      expect(keypair.publicKey).toBeTruthy();
    });

    test('should throw error for invalid mnemonic', () => {
      const invalidMnemonic = 'invalid mnemonic phrase';
      
      expect(() => {
        deriveKeypairFromMnemonic(invalidMnemonic);
      }).toThrow('Invalid BIP39 mnemonic');
    });
  });

  describe('Public Key Derivation', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('should derive public key from mnemonic', () => {
      const publicKey = publicKeyFromMnemonic(testMnemonic);
      
      expect(publicKey).toBeTruthy();
      expect(typeof publicKey).toBe('string');
      expect(publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 format
    });

    test('should derive same public key with same mnemonic', () => {
      const publicKey1 = publicKeyFromMnemonic(testMnemonic);
      const publicKey2 = publicKeyFromMnemonic(testMnemonic);
      
      expect(publicKey1).toBe(publicKey2);
    });

    test('should match keypair public key', () => {
      const keypair = deriveKeypairFromMnemonic(testMnemonic);
      const publicKey = publicKeyFromMnemonic(testMnemonic);
      
      expect(keypair.publicKey.toBase58()).toBe(publicKey);
    });
  });

  describe('Wallet Generation', () => {
    test('should generate complete wallet from mnemonic', () => {
      const result = generateWalletFromMnemonic();
      
      expect(result.keypair).toBeTruthy();
      expect(result.mnemonic).toBeTruthy();
      expect(result.address).toBeTruthy();
      expect(result.publicKey).toBeTruthy();
      expect(result.secretKey).toBeTruthy();
      expect(result.derivationPath).toBe(SOLANA_DERIVATION_PATH);
      
      // Verify consistency
      expect(result.address).toBe(result.publicKey);
      expect(result.publicKey).toBe(result.keypair.publicKey.toBase58());
    });

    test('should generate wallet from provided mnemonic', () => {
      const mnemonic = generateMnemonic12();
      const result = generateWalletFromMnemonic(mnemonic);
      
      expect(result.mnemonic).toBe(mnemonic);
      expect(result.keypair).toBeTruthy();
      expect(result.address).toBeTruthy();
    });

    test('should generate different wallets with different mnemonics', () => {
      const result1 = generateWalletFromMnemonic();
      const result2 = generateWalletFromMnemonic();
      
      expect(result1.address).not.toBe(result2.address);
      expect(result1.mnemonic).not.toBe(result2.mnemonic);
    });
  });

  describe('Export/Import Parity', () => {
    test('should maintain parity between export and import', () => {
      const mnemonic = generateMnemonic12();
      const parity = verifyExportImportParity(mnemonic);
      
      expect(parity).toBe(true);
    });

    test('should maintain parity with known mnemonic', () => {
      const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const parity = verifyExportImportParity(testMnemonic);
      
      expect(parity).toBe(true);
    });

    test('should generate same wallet from same mnemonic multiple times', () => {
      const mnemonic = generateMnemonic12();
      
      const wallet1 = generateWalletFromMnemonic(mnemonic);
      const wallet2 = generateWalletFromMnemonic(mnemonic);
      
      expect(wallet1.address).toBe(wallet2.address);
      expect(wallet1.publicKey).toBe(wallet2.publicKey);
      expect(wallet1.secretKey).toBe(wallet2.secretKey);
    });
  });

  describe('Negative Tests', () => {
    test('should not allow random keypair to be paired with generated mnemonic', () => {
      // Generate a random keypair
      const randomKeypair = Keypair.generate();
      const randomPublicKey = randomKeypair.publicKey.toBase58();
      
      // Generate a mnemonic
      const mnemonic = generateMnemonic12();
      const derivedPublicKey = publicKeyFromMnemonic(mnemonic);
      
      // They should be different
      expect(randomPublicKey).not.toBe(derivedPublicKey);
    });

    test('should throw error for empty mnemonic', () => {
      expect(() => {
        deriveKeypairFromMnemonic('');
      }).toThrow();
    });

    test('should throw error for null mnemonic', () => {
      expect(() => {
        deriveKeypairFromMnemonic(null as any);
      }).toThrow();
    });

    test('should throw error for undefined mnemonic', () => {
      expect(() => {
        deriveKeypairFromMnemonic(undefined as any);
      }).toThrow();
    });
  });

  describe('Derivation Path Tests', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('should use standard Solana derivation path by default', () => {
      const keypair = deriveKeypairFromMnemonic(testMnemonic);
      const keypairWithPath = deriveKeypairFromMnemonic(testMnemonic, SOLANA_DERIVATION_PATH);
      
      expect(keypair.publicKey.toBase58()).toBe(keypairWithPath.publicKey.toBase58());
    });

    test('should derive different keypairs with different paths', () => {
      const path1 = "m/44'/501'/0'/0'";
      const path2 = "m/44'/501'/0'/0";
      
      const keypair1 = deriveKeypairFromMnemonic(testMnemonic, path1);
      const keypair2 = deriveKeypairFromMnemonic(testMnemonic, path2);
      
      expect(keypair1.publicKey.toBase58()).not.toBe(keypair2.publicKey.toBase58());
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end: generate -> derive -> verify', () => {
      // Generate mnemonic
      const mnemonic = generateMnemonic12();
      
      // Derive wallet
      const wallet = generateWalletFromMnemonic(mnemonic);
      
      // Verify the mnemonic is valid
      const validation = validateBip39Mnemonic(mnemonic);
      expect(validation.isValid).toBe(true);
      
      // Verify export/import parity
      const parity = verifyExportImportParity(mnemonic);
      expect(parity).toBe(true);
      
      // Verify all components are consistent
      expect(wallet.address).toBe(wallet.publicKey);
      expect(wallet.publicKey).toBe(wallet.keypair.publicKey.toBase58());
      expect(wallet.secretKey).toBe(Buffer.from(wallet.keypair.secretKey).toString('base64'));
    });

    test('should handle multiple wallets correctly', () => {
      const wallets = [];
      
      // Generate 5 different wallets
      for (let i = 0; i < 5; i++) {
        const wallet = generateWalletFromMnemonic();
        wallets.push(wallet);
      }
      
      // All should be different
      const addresses = wallets.map(w => w.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(5);
      
      // All should be valid
      wallets.forEach(wallet => {
        expect(wallet.address).toBeTruthy();
        expect(wallet.publicKey).toBeTruthy();
        expect(wallet.secretKey).toBeTruthy();
        expect(wallet.mnemonic).toBeTruthy();
      });
    });
  });
});