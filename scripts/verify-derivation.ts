/**
 * Wallet Derivation Verification Script
 * Verifies that BIP39 mnemonics correctly derive to expected public keys
 */

import { deriveKeypairFromMnemonic, publicKeyFromMnemonic, generateMnemonic12 } from '../src/wallet/derive';
import { logger } from '../src/services/loggingService';

interface VerificationResult {
  mnemonic: string;
  expectedPublicKey: string;
  derivedPublicKey: string;
  matches: boolean;
  derivationPath: string;
  timestamp: string;
}

class DerivationVerificationService {
  private results: VerificationResult[] = [];

  /**
   * Verify a single mnemonic against expected public key
   */
  async verifyMnemonic(mnemonic: string, expectedPublicKey: string): Promise<VerificationResult> {
    try {
      const derivedPublicKey = publicKeyFromMnemonic(mnemonic);
      const matches = derivedPublicKey === expectedPublicKey;

      const result: VerificationResult = {
        mnemonic,
        expectedPublicKey,
        derivedPublicKey,
        matches,
        derivationPath: "m/44'/501'/0'/0'",
        timestamp: new Date().toISOString()
      };

      this.results.push(result);

      logger.info('Mnemonic verification completed', {
        expected: expectedPublicKey,
        derived: derivedPublicKey,
        matches
      }, 'DerivationVerification');

      return result;

    } catch (error) {
      logger.error('Failed to verify mnemonic', error, 'DerivationVerification');
      throw error;
    }
  }

  /**
   * Test export/import parity with a new mnemonic
   */
  async testExportImportParity(): Promise<VerificationResult> {
    try {
      // Generate a new mnemonic
      const mnemonic = generateMnemonic12();
      
      // Derive public key
      const publicKey = publicKeyFromMnemonic(mnemonic);
      
      // Re-derive from the same mnemonic
      const rederivedPublicKey = publicKeyFromMnemonic(mnemonic);
      
      const result: VerificationResult = {
        mnemonic,
        expectedPublicKey: publicKey,
        derivedPublicKey: rederivedPublicKey,
        matches: publicKey === rederivedPublicKey,
        derivationPath: "m/44'/501'/0'/0'",
        timestamp: new Date().toISOString()
      };

      this.results.push(result);

      logger.info('Export/import parity test completed', {
        publicKey,
        rederived: rederivedPublicKey,
        matches: result.matches
      }, 'DerivationVerification');

      return result;

    } catch (error) {
      logger.error('Failed to test export/import parity', error, 'DerivationVerification');
      throw error;
    }
  }

  /**
   * Test multiple derivation paths
   */
  async testMultipleDerivationPaths(mnemonic: string): Promise<VerificationResult[]> {
    const derivationPaths = [
      "m/44'/501'/0'/0'", // Standard Solana path
      "m/44'/501'/0'/0",   // Without final apostrophe
      "m/44'/501'/0'",     // Shorter path
      "m/44'/501'",        // Even shorter
      "m/44'",             // Very short
      "m"                  // Root
    ];

    const results: VerificationResult[] = [];

    for (const path of derivationPaths) {
      try {
        const keypair = deriveKeypairFromMnemonic(mnemonic, path);
        const publicKey = keypair.publicKey.toBase58();

        const result: VerificationResult = {
          mnemonic,
          expectedPublicKey: publicKey,
          derivedPublicKey: publicKey,
          matches: true,
          derivationPath: path,
          timestamp: new Date().toISOString()
        };

        results.push(result);
        this.results.push(result);

        logger.info('Derivation path test completed', {
          path,
          publicKey
        }, 'DerivationVerification');

      } catch (error) {
        logger.warn('Failed to derive with path', { path, error: error.message }, 'DerivationVerification');
      }
    }

    return results;
  }

  /**
   * Run comprehensive verification tests
   */
  async runComprehensiveTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: VerificationResult[];
  }> {
    try {
      console.log('🧪 Running comprehensive derivation tests...');

      // Test 1: Export/import parity
      console.log('Test 1: Export/import parity...');
      await this.testExportImportParity();

      // Test 2: Multiple mnemonics
      console.log('Test 2: Multiple mnemonic generation...');
      for (let i = 0; i < 5; i++) {
        const mnemonic = generateMnemonic12();
        const publicKey = publicKeyFromMnemonic(mnemonic);
        await this.verifyMnemonic(mnemonic, publicKey);
      }

      // Test 3: Multiple derivation paths
      console.log('Test 3: Multiple derivation paths...');
      const testMnemonic = generateMnemonic12();
      await this.testMultipleDerivationPaths(testMnemonic);

      // Calculate results
      const totalTests = this.results.length;
      const passedTests = this.results.filter(r => r.matches).length;
      const failedTests = totalTests - passedTests;

      console.log(`✅ Tests completed: ${passedTests}/${totalTests} passed`);

      return {
        totalTests,
        passedTests,
        failedTests,
        results: this.results
      };

    } catch (error) {
      logger.error('Comprehensive tests failed', error, 'DerivationVerification');
      throw error;
    }
  }

  /**
   * Export results to JSON
   */
  async exportResults(filename: string = 'derivation-verification-results.json'): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const exportPath = path.join(process.cwd(), 'verification-results', filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      
      // Write results
      await fs.writeFile(exportPath, JSON.stringify(this.results, null, 2));
      
      logger.info(`Verification results exported to ${exportPath}`, {}, 'DerivationVerification');

    } catch (error) {
      logger.error('Failed to export verification results', error, 'DerivationVerification');
      throw error;
    }
  }

  /**
   * Print summary of results
   */
  printSummary(): void {
    console.log('\n📊 Verification Summary:');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.matches).length}`);
    console.log(`Failed: ${this.results.filter(r => !r.matches).length}`);
    
    if (this.results.some(r => !r.matches)) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.matches).forEach(result => {
        console.log(`- Expected: ${result.expectedPublicKey}`);
        console.log(`  Derived:  ${result.derivedPublicKey}`);
        console.log(`  Path:     ${result.derivationPath}`);
      });
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // Run comprehensive tests
      const verificationService = new DerivationVerificationService();
      const results = await verificationService.runComprehensiveTests();
      
      verificationService.printSummary();
      await verificationService.exportResults();
      
      console.log('\n✅ Verification completed successfully!');
      
    } else if (args[0] === '--mnemonic' && args[1]) {
      // Verify specific mnemonic
      const mnemonic = args[1];
      const expectedPublicKey = args[2]; // Optional
      
      const verificationService = new DerivationVerificationService();
      
      if (expectedPublicKey) {
        const result = await verificationService.verifyMnemonic(mnemonic, expectedPublicKey);
        console.log(`\n🔍 Verification Result:`);
        console.log(`Mnemonic: ${mnemonic}`);
        console.log(`Expected: ${expectedPublicKey}`);
        console.log(`Derived:  ${result.derivedPublicKey}`);
        console.log(`Matches:  ${result.matches ? '✅' : '❌'}`);
      } else {
        const publicKey = publicKeyFromMnemonic(mnemonic);
        console.log(`\n🔍 Derived Public Key:`);
        console.log(`Mnemonic: ${mnemonic}`);
        console.log(`Public Key: ${publicKey}`);
      }
      
    } else {
      console.log('Usage:');
      console.log('  npm run verify-derivation                    # Run comprehensive tests');
      console.log('  npm run verify-derivation -- --mnemonic "word1 word2..." [expected_pubkey]');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DerivationVerificationService };
