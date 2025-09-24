/**
 * Wallet Migration Audit Script
 * Identifies users with mismatched wallets (random keypairs without mnemonics)
 * Flags them for migration to recoverable BIP39 wallets
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { firebaseDataService } from '../src/services/firebaseDataService';
import { secureStorageService } from '../src/services/secureStorageService';
import { deriveKeypairFromMnemonic, publicKeyFromMnemonic } from '../src/wallet/derive';
import { logger } from '../src/services/loggingService';
import { CURRENT_NETWORK } from '../src/config/chain';

interface WalletIssue {
  userId: string;
  userEmail: string;
  storedPublicKey: string;
  derivedPublicKey?: string;
  hasMnemonic: boolean;
  mnemonicLength?: number;
  issueType: 'MISSING_MNEMONIC' | 'MISMATCHED_KEYS' | 'INVALID_MNEMONIC' | 'LEGACY_WALLET';
  recommendedAction: 'MIGRATE_TO_BIP39' | 'VERIFY_MNEMONIC' | 'RECREATE_WALLET';
  createdAt: string;
  lastLoginAt?: string;
}

interface AuditResult {
  totalUsers: number;
  usersWithWallets: number;
  usersWithMnemonics: number;
  mismatchedWallets: number;
  issues: WalletIssue[];
  summary: {
    missingMnemonics: number;
    mismatchedKeys: number;
    invalidMnemonics: number;
    legacyWallets: number;
  };
}

class WalletAuditService {
  private connection: Connection;
  private issues: WalletIssue[] = [];

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
    });
  }

  /**
   * Run the complete wallet audit
   */
  async runAudit(): Promise<AuditResult> {
    try {
      logger.info('Starting wallet audit', {}, 'WalletAudit');

      // Get all users from Firebase
      const users = await this.getAllUsers();
      logger.info(`Found ${users.length} total users`, {}, 'WalletAudit');

      // Filter users with wallets
      const usersWithWallets = users.filter(user => 
        user.wallet_address && 
        user.wallet_address.trim() !== '' && 
        user.wallet_address !== '11111111111111111111111111111111'
      );

      logger.info(`Found ${usersWithWallets.length} users with wallets`, {}, 'WalletAudit');

      // Audit each user's wallet
      for (const user of usersWithWallets) {
        await this.auditUserWallet(user);
      }

      // Generate summary
      const summary = this.generateSummary();

      const result: AuditResult = {
        totalUsers: users.length,
        usersWithWallets: usersWithWallets.length,
        usersWithMnemonics: this.issues.filter(issue => issue.hasMnemonic).length,
        mismatchedWallets: this.issues.filter(issue => issue.issueType === 'MISMATCHED_KEYS').length,
        issues: this.issues,
        summary
      };

      // Save issues to Firebase
      await this.saveIssuesToFirebase();

      logger.info('Wallet audit completed', {
        totalUsers: result.totalUsers,
        usersWithWallets: result.usersWithWallets,
        mismatchedWallets: result.mismatchedWallets,
        issuesFound: this.issues.length
      }, 'WalletAudit');

      return result;

    } catch (error) {
      logger.error('Wallet audit failed', error, 'WalletAudit');
      throw error;
    }
  }

  /**
   * Get all users from Firebase
   */
  private async getAllUsers(): Promise<any[]> {
    try {
      // This would need to be implemented based on your Firebase setup
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      logger.error('Failed to get users from Firebase', error, 'WalletAudit');
      throw error;
    }
  }

  /**
   * Audit a single user's wallet
   */
  private async auditUserWallet(user: any): Promise<void> {
    try {
      const userId = user.id || user.uid;
      const userEmail = user.email || 'unknown@example.com';
      const storedPublicKey = user.wallet_address || user.wallet_public_key;

      if (!storedPublicKey) {
        return;
      }

      // Check if user has a stored mnemonic
      const mnemonic = await secureStorageService.getSeedPhrase(userId);
      const hasMnemonic = !!mnemonic;

      let issue: WalletIssue;

      if (!hasMnemonic) {
        // User has wallet but no mnemonic - likely a random keypair
        issue = {
          userId,
          userEmail,
          storedPublicKey,
          hasMnemonic: false,
          issueType: 'MISSING_MNEMONIC',
          recommendedAction: 'MIGRATE_TO_BIP39',
          createdAt: new Date().toISOString(),
          lastLoginAt: user.lastLoginAt
        };
      } else {
        // User has mnemonic - verify it matches the stored public key
        try {
          const derivedPublicKey = publicKeyFromMnemonic(mnemonic);
          
          if (derivedPublicKey === storedPublicKey) {
            // Keys match - no issue
            return;
          } else {
            // Keys don't match - serious issue
            issue = {
              userId,
              userEmail,
              storedPublicKey,
              derivedPublicKey,
              hasMnemonic: true,
              mnemonicLength: mnemonic.split(' ').length,
              issueType: 'MISMATCHED_KEYS',
              recommendedAction: 'VERIFY_MNEMONIC',
              createdAt: new Date().toISOString(),
              lastLoginAt: user.lastLoginAt
            };
          }
        } catch (error) {
          // Invalid mnemonic
          issue = {
            userId,
            userEmail,
            storedPublicKey,
            hasMnemonic: true,
            mnemonicLength: mnemonic.split(' ').length,
            issueType: 'INVALID_MNEMONIC',
            recommendedAction: 'RECREATE_WALLET',
            createdAt: new Date().toISOString(),
            lastLoginAt: user.lastLoginAt
          };
        }
      }

      this.issues.push(issue);

      logger.info('User wallet audited', {
        userId,
        userEmail,
        issueType: issue.issueType,
        hasMnemonic: issue.hasMnemonic
      }, 'WalletAudit');

    } catch (error) {
      logger.error('Failed to audit user wallet', error, 'WalletAudit');
      // Continue with other users
    }
  }

  /**
   * Generate audit summary
   */
  private generateSummary() {
    const summary = {
      missingMnemonics: 0,
      mismatchedKeys: 0,
      invalidMnemonics: 0,
      legacyWallets: 0
    };

    for (const issue of this.issues) {
      switch (issue.issueType) {
        case 'MISSING_MNEMONIC':
          summary.missingMnemonics++;
          break;
        case 'MISMATCHED_KEYS':
          summary.mismatchedKeys++;
          break;
        case 'INVALID_MNEMONIC':
          summary.invalidMnemonics++;
          break;
        case 'LEGACY_WALLET':
          summary.legacyWallets++;
          break;
      }
    }

    return summary;
  }

  /**
   * Save issues to Firebase for tracking
   */
  private async saveIssuesToFirebase(): Promise<void> {
    try {
      // Save each issue to a 'wallet_issues' collection
      for (const issue of this.issues) {
        await firebaseDataService.createDocument('wallet_issues', {
          ...issue,
          auditedAt: new Date().toISOString(),
          status: 'PENDING'
        });
      }

      logger.info(`Saved ${this.issues.length} wallet issues to Firebase`, {}, 'WalletAudit');

    } catch (error) {
      logger.error('Failed to save issues to Firebase', error, 'WalletAudit');
      throw error;
    }
  }

  /**
   * Generate migration recommendations
   */
  generateMigrationRecommendations(): string[] {
    const recommendations: string[] = [];

    const missingMnemonics = this.issues.filter(issue => issue.issueType === 'MISSING_MNEMONIC');
    if (missingMnemonics.length > 0) {
      recommendations.push(`${missingMnemonics.length} users need migration to BIP39 wallets`);
    }

    const mismatchedKeys = this.issues.filter(issue => issue.issueType === 'MISMATCHED_KEYS');
    if (mismatchedKeys.length > 0) {
      recommendations.push(`${mismatchedKeys.length} users have mismatched keys - require manual verification`);
    }

    const invalidMnemonics = this.issues.filter(issue => issue.issueType === 'INVALID_MNEMONIC');
    if (invalidMnemonics.length > 0) {
      recommendations.push(`${invalidMnemonics.length} users have invalid mnemonics - require wallet recreation`);
    }

    return recommendations;
  }

  /**
   * Export audit results to JSON file
   */
  async exportResults(result: AuditResult, filename: string = 'wallet-audit-results.json'): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const exportPath = path.join(process.cwd(), 'audit-results', filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      
      // Write results
      await fs.writeFile(exportPath, JSON.stringify(result, null, 2));
      
      logger.info(`Audit results exported to ${exportPath}`, {}, 'WalletAudit');

    } catch (error) {
      logger.error('Failed to export audit results', error, 'WalletAudit');
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const auditService = new WalletAuditService();
    
    console.log('🔍 Starting wallet audit...');
    const result = await auditService.runAudit();
    
    console.log('📊 Audit Results:');
    console.log(`Total Users: ${result.totalUsers}`);
    console.log(`Users with Wallets: ${result.usersWithWallets}`);
    console.log(`Users with Mnemonics: ${result.usersWithMnemonics}`);
    console.log(`Mismatched Wallets: ${result.mismatchedWallets}`);
    console.log(`Total Issues: ${result.issues.length}`);
    
    console.log('\n📋 Summary:');
    console.log(`Missing Mnemonics: ${result.summary.missingMnemonics}`);
    console.log(`Mismatched Keys: ${result.summary.mismatchedKeys}`);
    console.log(`Invalid Mnemonics: ${result.summary.invalidMnemonics}`);
    console.log(`Legacy Wallets: ${result.summary.legacyWallets}`);
    
    console.log('\n💡 Recommendations:');
    const recommendations = auditService.generateMigrationRecommendations();
    recommendations.forEach(rec => console.log(`- ${rec}`));
    
    // Export results
    await auditService.exportResults(result);
    
    console.log('\n✅ Audit completed successfully!');
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { WalletAuditService };
