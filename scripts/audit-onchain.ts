#!/usr/bin/env tsx

/**
 * On-Chain Audit Script
 * Analyzes the codebase for on-chain functionality and security
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface AuditResult {
  category: string;
  file: string;
  line?: number;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

interface AuditSummary {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  categories: Record<string, number>;
}

class OnChainAuditor {
  private issues: AuditResult[] = [];
  private summary: AuditSummary = {
    totalIssues: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    categories: {}
  };

  /**
   * Run comprehensive on-chain audit
   */
  async runAudit(): Promise<void> {
    console.log('🔍 Running On-Chain Security Audit...\n');

    // Check wallet implementation
    await this.auditWalletImplementation();
    
    // Check network configuration
    await this.auditNetworkConfiguration();
    
    // Check transaction handling
    await this.auditTransactionHandling();
    
    // Check balance management
    await this.auditBalanceManagement();
    
    // Check security practices
    await this.auditSecurityPractices();
    
    // Check MoonPay integration
    await this.auditMoonPayIntegration();
    
    // Check external wallet integration
    await this.auditExternalWalletIntegration();

    // Generate report
    this.generateReport();
  }

  /**
   * Audit wallet implementation
   */
  private async auditWalletImplementation(): Promise<void> {
    console.log('📱 Auditing wallet implementation...');
    
    const walletFiles = [
      'src/services/userWalletService.ts',
      'src/services/consolidatedWalletService.ts',
      'src/services/secureStorageService.ts',
      'src/wallet/solanaWallet.ts'
    ];

    for (const file of walletFiles) {
      await this.checkFile(file, 'wallet', [
        {
          pattern: /mock|fake|stub/i,
          issue: 'Mock implementation in wallet service',
          severity: 'critical' as const,
          recommendation: 'Replace with real implementation'
        },
        {
          pattern: /AsyncStorage\.setItem|localStorage/i,
          issue: 'Insecure storage for private keys',
          severity: 'critical' as const,
          recommendation: 'Use expo-secure-store for private keys'
        },
        {
          pattern: /console\.log.*secret|console\.log.*private/i,
          issue: 'Private key logging',
          severity: 'critical' as const,
          recommendation: 'Remove private key logging'
        },
        {
          pattern: /generateMnemonic|createWallet/i,
          issue: 'Wallet generation found',
          severity: 'low' as const,
          recommendation: 'Verify BIP-39 compliance'
        }
      ]);
    }
  }

  /**
   * Audit network configuration
   */
  private async auditNetworkConfiguration(): Promise<void> {
    console.log('🌐 Auditing network configuration...');
    
    await this.checkFile('src/config/solanaConfig.ts', 'network', [
      {
        pattern: /devnet|testnet/i,
        issue: 'Devnet/testnet configuration',
        severity: 'high' as const,
        recommendation: 'Ensure production uses mainnet only'
      },
      {
        pattern: /helius|rpc/i,
        issue: 'RPC configuration found',
        severity: 'low' as const,
        recommendation: 'Verify RPC endpoint security'
      }
    ]);

    await this.checkFile('src/config/chain.ts', 'network', [
      {
        pattern: /IS_PRODUCTION|FORCE_MAINNET/i,
        issue: 'Production enforcement found',
        severity: 'low' as const,
        recommendation: 'Verify production enforcement works'
      }
    ]);
  }

  /**
   * Audit transaction handling
   */
  private async auditTransactionHandling(): Promise<void> {
    console.log('💸 Auditing transaction handling...');
    
    const transactionFiles = [
      'src/services/consolidatedTransactionService.ts',
      'src/transfer/sendInternal.ts',
      'src/transfer/sendExternal.ts'
    ];

    for (const file of transactionFiles) {
      await this.checkFile(file, 'transaction', [
        {
          pattern: /return.*usdc.*100|return.*sol.*1/i,
          issue: 'Mock balance return',
          severity: 'critical' as const,
          recommendation: 'Replace with real on-chain balance query'
        },
        {
          pattern: /sendAndConfirmTransaction|sendTransaction/i,
          issue: 'Real transaction sending found',
          severity: 'low' as const,
          recommendation: 'Verify transaction confirmation handling'
        },
        {
          pattern: /mock|fake|stub/i,
          issue: 'Mock transaction implementation',
          severity: 'critical' as const,
          recommendation: 'Replace with real implementation'
        }
      ]);
    }
  }

  /**
   * Audit balance management
   */
  private async auditBalanceManagement(): Promise<void> {
    console.log('💰 Auditing balance management...');
    
    await this.checkFile('src/services/consolidatedTransactionService.ts', 'balance', [
      {
        pattern: /getUserWalletBalance.*return.*usdc.*100/i,
        issue: 'Hardcoded mock balance',
        severity: 'critical' as const,
        recommendation: 'Implement real on-chain balance query'
      },
      {
        pattern: /getBalance.*connection/i,
        issue: 'Real balance query found',
        severity: 'low' as const,
        recommendation: 'Verify balance caching and updates'
      }
    ]);
  }

  /**
   * Audit security practices
   */
  private async auditSecurityPractices(): Promise<void> {
    console.log('🔒 Auditing security practices...');
    
    const securityFiles = [
      'src/services/secureStorageService.ts',
      'src/wallet/solanaWallet.ts'
    ];

    for (const file of securityFiles) {
      await this.checkFile(file, 'security', [
        {
          pattern: /expo-secure-store|Keychain/i,
          issue: 'Secure storage implementation found',
          severity: 'low' as const,
          recommendation: 'Verify secure storage is properly implemented'
        },
        {
          pattern: /biometric|authentication/i,
          issue: 'Biometric authentication found',
          severity: 'low' as const,
          recommendation: 'Verify biometric protection for sensitive operations'
        },
        {
          pattern: /encrypt|decrypt/i,
          issue: 'Encryption implementation found',
          severity: 'low' as const,
          recommendation: 'Verify encryption strength and key management'
        }
      ]);
    }
  }

  /**
   * Audit MoonPay integration
   */
  private async auditMoonPayIntegration(): Promise<void> {
    console.log('🌙 Auditing MoonPay integration...');
    
    const moonpayFiles = [
      'src/services/firebaseMoonPayService.ts',
      'src/components/MoonPayWidget.tsx'
    ];

    for (const file of moonpayFiles) {
      await this.checkFile(file, 'moonpay', [
        {
          pattern: /walletAddress|wallet_address/i,
          issue: 'Wallet address handling found',
          severity: 'low' as const,
          recommendation: 'Verify wallet address validation'
        },
        {
          pattern: /usdc_sol|currency/i,
          issue: 'Currency configuration found',
          severity: 'low' as const,
          recommendation: 'Verify correct currency codes for Solana'
        }
      ]);
    }
  }

  /**
   * Audit external wallet integration
   */
  private async auditExternalWalletIntegration(): Promise<void> {
    console.log('🔗 Auditing external wallet integration...');
    
    const externalFiles = [
      'src/services/solanaAppKitService.ts',
      'src/wallet/linkExternal.ts'
    ];

    for (const file of externalFiles) {
      await this.checkFile(file, 'external', [
        {
          pattern: /phantom|solflare|backpack/i,
          issue: 'External wallet support found',
          severity: 'low' as const,
          recommendation: 'Verify external wallet integration'
        },
        {
          pattern: /signature|verify/i,
          issue: 'Signature verification found',
          severity: 'low' as const,
          recommendation: 'Verify signature validation'
        }
      ]);
    }
  }

  /**
   * Check individual file for issues
   */
  private async checkFile(filePath: string, category: string, checks: Array<{
    pattern: RegExp;
    issue: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
  }>): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        for (const check of checks) {
          if (check.pattern.test(line)) {
            // Skip comments and documentation
            if (this.isCommentOrDocumentation(line)) {
              continue;
            }

            this.addIssue({
              category,
              file: filePath,
              line: lineNumber,
              issue: check.issue,
              severity: check.severity,
              recommendation: check.recommendation
            });
          }
        }
      });
    } catch (error) {
      // File might not exist, skip
    }
  }

  /**
   * Check if line is a comment or documentation
   */
  private isCommentOrDocumentation(line: string): boolean {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return true;
    
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
      return true;
    }
    
    // Skip documentation files
    if (trimmed.startsWith('<!--') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
      return true;
    }
    
    return false;
  }

  /**
   * Add issue to audit results
   */
  private addIssue(issue: AuditResult): void {
    this.issues.push(issue);
    this.summary.totalIssues++;
    this.summary[issue.severity]++;
    this.summary.categories[issue.category] = (this.summary.categories[issue.category] || 0) + 1;
  }

  /**
   * Generate audit report
   */
  private generateReport(): void {
    console.log('\n📊 On-Chain Audit Report');
    console.log('========================\n');

    // Summary
    console.log('Summary:');
    console.log(`  Total Issues: ${this.summary.totalIssues}`);
    console.log(`  Critical: ${this.summary.critical}`);
    console.log(`  High: ${this.summary.high}`);
    console.log(`  Medium: ${this.summary.medium}`);
    console.log(`  Low: ${this.summary.low}\n`);

    // Issues by category
    console.log('Issues by Category:');
    Object.entries(this.summary.categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    console.log('');

    // Critical and high issues
    const criticalHighIssues = this.issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    );

    if (criticalHighIssues.length > 0) {
      console.log('🚨 Critical & High Priority Issues:');
      criticalHighIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.issue} (${issue.severity.toUpperCase()})`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   Recommendation: ${issue.recommendation}`);
      });
    }

    // All issues
    if (this.issues.length > 0) {
      console.log('\n📋 All Issues:');
      this.issues.forEach((issue, index) => {
        const severity = issue.severity.toUpperCase();
        const emoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[issue.severity];
        
        console.log(`\n${index + 1}. ${emoji} ${issue.issue} (${severity})`);
        console.log(`   Category: ${issue.category}`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   Recommendation: ${issue.recommendation}`);
      });
    } else {
      console.log('✅ No issues found!');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Address all critical and high priority issues');
    console.log('2. Implement real on-chain functionality');
    console.log('3. Add comprehensive testing');
    console.log('4. Review security practices');
    console.log('5. Update documentation\n');
  }
}

// Main execution
async function main() {
  const auditor = new OnChainAuditor();
  await auditor.runAudit();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
}

export { OnChainAuditor };
