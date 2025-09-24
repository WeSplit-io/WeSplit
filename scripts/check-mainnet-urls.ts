#!/usr/bin/env tsx

/**
 * Check Mainnet URLs Script
 * Ensures production builds only use mainnet endpoints
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface CheckResult {
  file: string;
  line: number;
  content: string;
  issue: string;
}

class MainnetChecker {
  private devnetPatterns = [
    /devnet/i,
    /testnet/i,
    /api\.devnet\.solana\.com/,
    /api\.testnet\.solana\.com/,
    /localhost/i,
    /127\.0\.0\.1/,
    /0\.0\.0\.0/,
  ];

  private testnetPatterns = [
    /testnet/i,
    /api\.testnet\.solana\.com/,
  ];

  private issues: CheckResult[] = [];

  /**
   * Check if production build has devnet/testnet references
   */
  async checkProductionBuild(): Promise<boolean> {
    console.log('🔍 Checking for devnet/testnet references in production build...\n');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_FORCE_MAINNET === 'true';
    
    if (!isProduction) {
      console.log('⚠️  Not a production build, skipping mainnet-only check');
      return true;
    }

    // Check source files
    await this.checkDirectory('src');
    await this.checkDirectory('backend');
    await this.checkFile('package.json');
    await this.checkFile('app.config.js');
    await this.checkFile('metro.config.js');

    // Report results
    this.reportResults();

    return this.issues.length === 0;
  }

  /**
   * Check directory recursively
   */
  private async checkDirectory(dirPath: string): Promise<void> {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other build directories
          if (!['node_modules', 'dist', 'build', '.git', '.expo'].includes(item)) {
            await this.checkDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          await this.checkFile(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }

  /**
   * Check individual file
   */
  private async checkFile(filePath: string): Promise<void> {
    try {
      // Skip non-text files
      const ext = extname(filePath);
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
        return;
      }

      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // Check for devnet/testnet patterns
        for (const pattern of this.devnetPatterns) {
          if (pattern.test(line)) {
            // Skip comments and documentation
            if (this.isCommentOrDocumentation(line)) {
              continue;
            }

            this.issues.push({
              file: filePath,
              line: lineNumber,
              content: line.trim(),
              issue: 'Contains devnet/testnet reference'
            });
          }
        }
      });
    } catch (error) {
      // File might not be readable, skip
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
    
    // Skip import statements that are clearly for development
    if (trimmed.includes('import') && (trimmed.includes('devnet') || trimmed.includes('testnet'))) {
      return false; // This is an actual import, not a comment
    }
    
    return false;
  }

  /**
   * Report check results
   */
  private reportResults(): void {
    if (this.issues.length === 0) {
      console.log('✅ No devnet/testnet references found in production build');
      return;
    }

    console.log(`❌ Found ${this.issues.length} devnet/testnet references in production build:\n`);

    this.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Content: ${issue.content}`);
      console.log('');
    });

    console.log('🚨 Production builds must only use mainnet endpoints!');
    console.log('   Please remove or guard these references with environment checks.');
  }
}

// Main execution
async function main() {
  const checker = new MainnetChecker();
  const isClean = await checker.checkProductionBuild();
  
  if (!isClean) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
}

export { MainnetChecker };
