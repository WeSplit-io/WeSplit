/**
 * ATA Creation and Management Script
 * Ensures Associated Token Accounts exist for given owner and mint
 * Company pays all creation fees
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { logger } from '../src/services/loggingService';
import { CURRENT_NETWORK } from '../src/config/chain';
import { COMPANY_WALLET_CONFIG } from '../src/config/feeConfig';

interface AtaInfo {
  ata: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  exists: boolean;
  balance?: number;
  decimals?: number;
}

interface AtaCreationResult {
  ata: PublicKey;
  created: boolean;
  transactionSignature?: string;
  estimatedCost: number;
}

class AtaManagementService {
  private connection: Connection;
  private companyKeypair: Keypair;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
    });

    // Initialize company keypair
    this.initializeCompanyKeypair();
  }

  /**
   * Initialize company keypair from environment
   */
  private initializeCompanyKeypair(): void {
    try {
      const secretKeyString = process.env.COMPANY_WALLET_SECRET_KEY;
      if (!secretKeyString) {
        throw new Error('COMPANY_WALLET_SECRET_KEY not found in environment');
      }

      const secretKeyArray = JSON.parse(secretKeyString);
      this.companyKeypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));

      // Verify public key matches
      const expectedPublicKey = process.env.COMPANY_WALLET_ADDRESS;
      if (this.companyKeypair.publicKey.toBase58() !== expectedPublicKey) {
        throw new Error('Company wallet public key mismatch');
      }

      logger.info('Company keypair initialized', {
        address: this.companyKeypair.publicKey.toBase58()
      }, 'AtaManagement');

    } catch (error) {
      logger.error('Failed to initialize company keypair', error, 'AtaManagement');
      throw error;
    }
  }

  /**
   * Get ATA information for owner and mint
   */
  async getAtaInfo(owner: PublicKey, mint: PublicKey): Promise<AtaInfo> {
    try {
      const ata = await getAssociatedTokenAddress(mint, owner, true);
      
      let exists = false;
      let balance = 0;
      let decimals = 0;

      try {
        const account = await getAccount(this.connection, ata);
        exists = true;
        balance = Number(account.amount);
        decimals = account.mint.toString() === mint.toBase58() ? 6 : 0; // USDC has 6 decimals
      } catch (error) {
        // Account doesn't exist
        exists = false;
      }

      const info: AtaInfo = {
        ata,
        owner,
        mint,
        exists,
        balance,
        decimals
      };

      logger.info('ATA info retrieved', {
        ata: ata.toBase58(),
        owner: owner.toBase58(),
        mint: mint.toBase58(),
        exists,
        balance
      }, 'AtaManagement');

      return info;

    } catch (error) {
      logger.error('Failed to get ATA info', error, 'AtaManagement');
      throw error;
    }
  }

  /**
   * Create ATA if it doesn't exist
   */
  async createAtaIfNeeded(owner: PublicKey, mint: PublicKey): Promise<AtaCreationResult> {
    try {
      const ataInfo = await this.getAtaInfo(owner, mint);
      
      if (ataInfo.exists) {
        logger.info('ATA already exists', {
          ata: ataInfo.ata.toBase58(),
          owner: owner.toBase58(),
          mint: mint.toBase58()
        }, 'AtaManagement');

        return {
          ata: ataInfo.ata,
          created: false,
          estimatedCost: 0
        };
      }

      // Create ATA
      const result = await this.createAta(owner, mint);
      
      logger.info('ATA created successfully', {
        ata: result.ata.toBase58(),
        owner: owner.toBase58(),
        mint: mint.toBase58(),
        signature: result.transactionSignature
      }, 'AtaManagement');

      return result;

    } catch (error) {
      logger.error('Failed to create ATA if needed', error, 'AtaManagement');
      throw error;
    }
  }

  /**
   * Create ATA with company paying fees
   */
  async createAta(owner: PublicKey, mint: PublicKey): Promise<AtaCreationResult> {
    try {
      const ata = await getAssociatedTokenAddress(mint, owner, true);

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction with company as fee payer
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: this.companyKeypair.publicKey
      });

      // Add ATA creation instruction
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.companyKeypair.publicKey, // Company pays
          ata,                          // ATA address
          owner,                        // Owner
          mint                          // Mint
        )
      );

      // Sign and send transaction
      transaction.sign(this.companyKeypair);
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Estimate cost (rough estimate)
      const estimatedCost = 0.00203928; // Approximate cost for ATA creation

      return {
        ata,
        created: true,
        transactionSignature: signature,
        estimatedCost
      };

    } catch (error) {
      logger.error('Failed to create ATA', error, 'AtaManagement');
      throw error;
    }
  }

  /**
   * Batch create ATAs for multiple owners
   */
  async batchCreateAtas(owners: PublicKey[], mint: PublicKey): Promise<AtaCreationResult[]> {
    try {
      const results: AtaCreationResult[] = [];

      for (const owner of owners) {
        try {
          const result = await this.createAtaIfNeeded(owner, mint);
          results.push(result);
        } catch (error) {
          logger.error('Failed to create ATA for owner', { 
            owner: owner.toBase58(), 
            error: error.message 
          }, 'AtaManagement');
          
          // Continue with other owners
          results.push({
            ata: await getAssociatedTokenAddress(mint, owner, true),
            created: false,
            estimatedCost: 0
          });
        }
      }

      logger.info('Batch ATA creation completed', {
        totalOwners: owners.length,
        successfulCreations: results.filter(r => r.created).length
      }, 'AtaManagement');

      return results;

    } catch (error) {
      logger.error('Failed to batch create ATAs', error, 'AtaManagement');
      throw error;
    }
  }

  /**
   * Get company wallet balance
   */
  async getCompanyBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.companyKeypair.publicKey);
      return balance / 1000000000; // Convert lamports to SOL
    } catch (error) {
      logger.error('Failed to get company balance', error, 'AtaManagement');
      throw error;
    }
  }

  /**
   * Print ATA information
   */
  async printAtaInfo(owner: PublicKey, mint: PublicKey): Promise<void> {
    try {
      const info = await this.getAtaInfo(owner, mint);
      
      console.log('\n📊 ATA Information:');
      console.log(`ATA Address: ${info.ata.toBase58()}`);
      console.log(`Owner:       ${info.owner.toBase58()}`);
      console.log(`Mint:        ${info.mint.toBase58()}`);
      console.log(`Exists:      ${info.exists ? '✅' : '❌'}`);
      
      if (info.exists) {
        console.log(`Balance:     ${info.balance} (${info.balance / Math.pow(10, info.decimals || 6)} tokens)`);
        console.log(`Decimals:    ${info.decimals}`);
      }
      
    } catch (error) {
      console.error('Failed to print ATA info:', error);
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
      console.log('Usage:');
      console.log('  npm run create-ata -- --owner <public_key> --mint <mint_address>');
      console.log('  npm run create-ata -- --batch <owner1,owner2,owner3> --mint <mint_address>');
      console.log('  npm run create-ata -- --info --owner <public_key> --mint <mint_address>');
      return;
    }

    const ataService = new AtaManagementService();
    
    // Parse arguments
    const ownerIndex = args.indexOf('--owner');
    const mintIndex = args.indexOf('--mint');
    const batchIndex = args.indexOf('--batch');
    const infoIndex = args.indexOf('--info');

    if (infoIndex !== -1 && ownerIndex !== -1 && mintIndex !== -1) {
      // Print ATA info
      const owner = new PublicKey(args[ownerIndex + 1]);
      const mint = new PublicKey(args[mintIndex + 1]);
      await ataService.printAtaInfo(owner, mint);
      
    } else if (batchIndex !== -1 && mintIndex !== -1) {
      // Batch create ATAs
      const ownerStrings = args[batchIndex + 1].split(',');
      const owners = ownerStrings.map(addr => new PublicKey(addr.trim()));
      const mint = new PublicKey(args[mintIndex + 1]);
      
      console.log(`🏭 Creating ATAs for ${owners.length} owners...`);
      const results = await ataService.batchCreateAtas(owners, mint);
      
      console.log('\n📊 Batch Results:');
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.ata.toBase58()} - ${result.created ? '✅ Created' : '⏭️  Existed'}`);
        if (result.transactionSignature) {
          console.log(`   Signature: ${result.transactionSignature}`);
        }
      });
      
    } else if (ownerIndex !== -1 && mintIndex !== -1) {
      // Create single ATA
      const owner = new PublicKey(args[ownerIndex + 1]);
      const mint = new PublicKey(args[mintIndex + 1]);
      
      console.log('🏗️  Creating ATA...');
      const result = await ataService.createAtaIfNeeded(owner, mint);
      
      console.log('\n📊 Result:');
      console.log(`ATA Address: ${result.ata.toBase58()}`);
      console.log(`Created:     ${result.created ? '✅' : '⏭️  Already existed'}`);
      if (result.transactionSignature) {
        console.log(`Signature:   ${result.transactionSignature}`);
      }
      console.log(`Cost:        ${result.estimatedCost} SOL`);
      
    } else {
      console.log('❌ Invalid arguments. Use --help for usage information.');
    }
    
    // Show company balance
    const balance = await ataService.getCompanyBalance();
    console.log(`\n💰 Company Balance: ${balance} SOL`);
    
  } catch (error) {
    console.error('❌ ATA operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AtaManagementService };
