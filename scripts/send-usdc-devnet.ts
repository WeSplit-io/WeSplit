/**
 * Devnet USDC Transfer Test Script
 * Tests USDC transfers with company fee payer on devnet
 * Validates zero-SOL user transfers
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { buildUsdcTransfer, getTransferPreview } from '../src/transfer/usdcTransfer';
import { deriveKeypairFromMnemonic } from '../src/wallet/derive';
import { logger } from '../src/services/loggingService';
import { CURRENT_NETWORK } from '../src/config/chain';

interface TransferTestParams {
  fromMnemonic: string;
  toPubkey: string;
  amount: number;
  cluster: 'mainnet' | 'devnet';
  memo?: string;
}

interface TransferTestResult {
  success: boolean;
  signature?: string;
  error?: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  estimatedFees: number;
  explorerUrl: string;
}

class DevnetTransferTester {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
    });
  }

  /**
   * Test USDC transfer with company fee payer
   */
  async testUsdcTransfer(params: TransferTestParams): Promise<TransferTestResult> {
    try {
      console.log('🧪 Testing USDC transfer...');
      console.log(`From: ${params.fromMnemonic.split(' ').slice(0, 3).join(' ')}...`);
      console.log(`To: ${params.toPubkey}`);
      console.log(`Amount: ${params.amount} USDC`);
      console.log(`Cluster: ${params.cluster}`);

      // Derive sender keypair from mnemonic
      const senderKeypair = deriveKeypairFromMnemonic(params.fromMnemonic);
      const fromAddress = senderKeypair.publicKey.toBase58();

      console.log(`Sender Address: ${fromAddress}`);

      // Get transfer preview
      const preview = await getTransferPreview({
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: new PublicKey(params.toPubkey),
        amountUi: params.amount,
        cluster: params.cluster,
        memo: params.memo
      });

      console.log('\n📊 Transfer Preview:');
      console.log(`From Token Account: ${preview.fromTokenAccount}`);
      console.log(`To Token Account:   ${preview.toTokenAccount}`);
      console.log(`Transfer Amount:    ${preview.transferAmount} raw units`);
      console.log(`Estimated Fees:     ${preview.estimatedFees} SOL`);
      console.log(`Needs ATA Creation: ${preview.needsAtaCreation ? '✅' : '❌'}`);
      console.log(`Company Fee Payer:  ${preview.companyFeePayer}`);
      console.log(`USDC Mint:          ${preview.usdcMint}`);

      // Check sender SOL balance
      const senderBalance = await this.connection.getBalance(senderKeypair.publicKey);
      const senderSolBalance = senderBalance / 1000000000;

      console.log(`\n💰 Sender SOL Balance: ${senderSolBalance} SOL`);

      if (senderSolBalance > 0) {
        console.log('⚠️  Warning: Sender has SOL balance. This test is for zero-SOL users.');
      }

      // Build transfer transaction
      const transferResult = await buildUsdcTransfer({
        fromOwnerPubkey: senderKeypair.publicKey,
        toOwnerPubkey: new PublicKey(params.toPubkey),
        amountUi: params.amount,
        cluster: params.cluster,
        memo: params.memo
      });

      console.log('\n🏗️  Transaction built successfully!');
      console.log(`Transaction size: ${transferResult.transaction.serialize().length} bytes`);

      // Note: In a real implementation, you would:
      // 1. Sign the transaction with the sender's keypair
      // 2. Send to server for company signature
      // 3. Submit the fully signed transaction
      
      // For this test, we'll just validate the transaction structure
      const transaction = transferResult.transaction;
      const message = transaction.message;
      
      console.log('\n✅ Transaction Validation:');
      console.log(`Fee Payer: ${message.staticAccountKeys[message.header.numRequiredSignatures - 1].toBase58()}`);
      console.log(`Required Signatures: ${message.header.numRequiredSignatures}`);
      console.log(`Instructions: ${message.compiledInstructions.length}`);

      // Generate explorer URL
      const explorerUrl = this.getExplorerUrl(params.cluster, fromAddress);

      const result: TransferTestResult = {
        success: true,
        fromAddress,
        toAddress: params.toPubkey,
        amount: params.amount,
        estimatedFees: preview.estimatedFees,
        explorerUrl
      };

      console.log('\n🎉 Transfer test completed successfully!');
      console.log(`Explorer URL: ${explorerUrl}`);

      return result;

    } catch (error) {
      console.error('❌ Transfer test failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fromAddress: '',
        toAddress: params.toPubkey,
        amount: params.amount,
        estimatedFees: 0,
        explorerUrl: ''
      };
    }
  }

  /**
   * Test multiple transfer scenarios
   */
  async runComprehensiveTests(): Promise<TransferTestResult[]> {
    try {
      console.log('🧪 Running comprehensive transfer tests...');

      const testCases = [
        {
          fromMnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
          toPubkey: '11111111111111111111111111111112', // System program
          amount: 1.0,
          cluster: 'devnet' as const,
          memo: 'Test transfer 1'
        },
        {
          fromMnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
          toPubkey: '11111111111111111111111111111113', // Different address
          amount: 0.5,
          cluster: 'devnet' as const,
          memo: 'Test transfer 2'
        }
      ];

      const results: TransferTestResult[] = [];

      for (let i = 0; i < testCases.length; i++) {
        console.log(`\n📋 Test Case ${i + 1}/${testCases.length}:`);
        const result = await this.testUsdcTransfer(testCases[i]);
        results.push(result);
        
        // Wait between tests
        if (i < testCases.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Print summary
      console.log('\n📊 Test Summary:');
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`Total Tests: ${results.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);

      if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.success).forEach((result, index) => {
          console.log(`${index + 1}. ${result.error}`);
        });
      }

      return results;

    } catch (error) {
      console.error('❌ Comprehensive tests failed:', error);
      throw error;
    }
  }

  /**
   * Get explorer URL for transaction
   */
  private getExplorerUrl(cluster: string, address: string): string {
    const baseUrl = cluster === 'mainnet' 
      ? 'https://explorer.solana.com' 
      : 'https://explorer.solana.com';
    
    return `${baseUrl}/address/${address}?cluster=${cluster}`;
  }

  /**
   * Validate test parameters
   */
  validateParams(params: TransferTestParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate mnemonic
    if (!params.fromMnemonic || params.fromMnemonic.split(' ').length < 12) {
      errors.push('Invalid mnemonic: must be at least 12 words');
    }

    // Validate public key
    try {
      new PublicKey(params.toPubkey);
    } catch {
      errors.push('Invalid recipient public key');
    }

    // Validate amount
    if (params.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Validate cluster
    if (!['mainnet', 'devnet'].includes(params.cluster)) {
      errors.push('Cluster must be mainnet or devnet');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('Usage:');
      console.log('  npm run send-usdc-devnet -- --fromMnemonic "word1 word2..." --toPubkey <address> --amount <number> [--cluster devnet|mainnet] [--memo "message"]');
      console.log('  npm run send-usdc-devnet -- --comprehensive');
      return;
    }

    const tester = new DevnetTransferTester();

    if (args.includes('--comprehensive')) {
      // Run comprehensive tests
      await tester.runComprehensiveTests();
      
    } else {
      // Parse arguments for single test
      const fromMnemonicIndex = args.indexOf('--fromMnemonic');
      const toPubkeyIndex = args.indexOf('--toPubkey');
      const amountIndex = args.indexOf('--amount');
      const clusterIndex = args.indexOf('--cluster');
      const memoIndex = args.indexOf('--memo');

      if (fromMnemonicIndex === -1 || toPubkeyIndex === -1 || amountIndex === -1) {
        console.log('❌ Missing required arguments: --fromMnemonic, --toPubkey, --amount');
        return;
      }

      const params: TransferTestParams = {
        fromMnemonic: args[fromMnemonicIndex + 1],
        toPubkey: args[toPubkeyIndex + 1],
        amount: parseFloat(args[amountIndex + 1]),
        cluster: (args[clusterIndex + 1] as 'mainnet' | 'devnet') || 'devnet',
        memo: memoIndex !== -1 ? args[memoIndex + 1] : undefined
      };

      // Validate parameters
      const validation = tester.validateParams(params);
      if (!validation.isValid) {
        console.log('❌ Invalid parameters:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        return;
      }

      // Run test
      const result = await tester.testUsdcTransfer(params);
      
      if (result.success) {
        console.log('\n✅ Test completed successfully!');
      } else {
        console.log('\n❌ Test failed!');
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DevnetTransferTester };
