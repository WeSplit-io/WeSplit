#!/usr/bin/env tsx

/**
 * Find Duplicate Files Script
 * Walks through src/ and app/ directories, hashes files, and identifies duplicates
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { createHash } from 'crypto';

interface DuplicateFile {
  hash: string;
  size: number;
  files: Array<{
    path: string;
    relativePath: string;
    lastModified: Date;
  }>;
}

interface DuplicateReport {
  exactDuplicates: DuplicateFile[];
  totalDuplicates: number;
  totalWastedBytes: number;
  recommendations: Array<{
    canonical: string;
    duplicates: string[];
    action: string;
  }>;
}

class DuplicateFileFinder {
  private duplicates: Map<string, DuplicateFile> = new Map();
  private scannedFiles = 0;
  private totalSize = 0;

  /**
   * Find duplicate files in the codebase
   */
  async findDuplicates(): Promise<DuplicateReport> {
    console.log('🔍 Scanning for duplicate files...\n');

    // Scan directories
    await this.scanDirectory('src');
    await this.scanDirectory('app');

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    const report: DuplicateReport = {
      exactDuplicates: Array.from(this.duplicates.values()),
      totalDuplicates: this.duplicates.size,
      totalWastedBytes: this.calculateWastedBytes(),
      recommendations
    };

    this.printReport(report);
    return report;
  }

  /**
   * Scan directory recursively
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, build artifacts, and other non-source directories
          if (!['node_modules', 'dist', 'build', '.git', '.expo', 'coverage', '__tests__'].includes(item)) {
            await this.scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          await this.processFile(fullPath, stat);
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }

  /**
   * Process individual file
   */
  private async processFile(filePath: string, stat: any): Promise<void> {
    try {
      // Skip non-text files and very large files
      const ext = extname(filePath);
      if (this.shouldSkipFile(ext, stat.size)) {
        return;
      }

      const content = readFileSync(filePath, 'utf8');
      const hash = createHash('sha1').update(content).digest('hex');
      
      this.scannedFiles++;
      this.totalSize += stat.size;

      if (this.duplicates.has(hash)) {
        const duplicate = this.duplicates.get(hash)!;
        duplicate.files.push({
          path: filePath,
          relativePath: relative(process.cwd(), filePath),
          lastModified: stat.mtime
        });
      } else {
        // Check if this is a potential duplicate (same size)
        const existingDuplicate = Array.from(this.duplicates.values())
          .find(d => d.size === stat.size);
        
        if (existingDuplicate) {
          // This might be a duplicate, add to existing group
          existingDuplicate.files.push({
            path: filePath,
            relativePath: relative(process.cwd(), filePath),
            lastModified: stat.mtime
          });
        } else {
          // Create new potential duplicate group
          this.duplicates.set(hash, {
            hash,
            size: stat.size,
            files: [{
              path: filePath,
              relativePath: relative(process.cwd(), filePath),
              lastModified: stat.mtime
            }]
          });
        }
      }
    } catch (error) {
      // File might not be readable, skip
    }
  }

  /**
   * Check if file should be skipped
   */
  private shouldSkipFile(ext: string, size: number): boolean {
    // Skip binary files
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz'];
    if (binaryExtensions.includes(ext)) {
      return true;
    }

    // Skip very large files (>1MB)
    if (size > 1024 * 1024) {
      return true;
    }

    // Skip generated files
    if (ext === '.map' || ext === '.min.js') {
      return true;
    }

    return false;
  }

  /**
   * Generate recommendations for duplicate files
   */
  private generateRecommendations(): Array<{
    canonical: string;
    duplicates: string[];
    action: string;
  }> {
    const recommendations: Array<{
      canonical: string;
      duplicates: string[];
      action: string;
    }> = [];

    for (const duplicate of this.duplicates.values()) {
      if (duplicate.files.length > 1) {
        // Sort files by path to ensure consistent canonical choice
        const sortedFiles = duplicate.files.sort((a, b) => a.path.localeCompare(b.path));
        const canonical = sortedFiles[0].relativePath;
        const duplicates = sortedFiles.slice(1).map(f => f.relativePath);

        let action = 'delete';
        if (canonical.includes('test') || canonical.includes('spec')) {
          action = 'consolidate_tests';
        } else if (canonical.includes('config') || canonical.includes('constant')) {
          action = 'merge_configs';
        } else if (canonical.includes('component') || canonical.includes('ui')) {
          action = 'merge_components';
        }

        recommendations.push({
          canonical,
          duplicates,
          action
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate total wasted bytes
   */
  private calculateWastedBytes(): number {
    let wastedBytes = 0;
    
    for (const duplicate of this.duplicates.values()) {
      if (duplicate.files.length > 1) {
        wastedBytes += duplicate.size * (duplicate.files.length - 1);
      }
    }

    return wastedBytes;
  }

  /**
   * Print detailed report
   */
  private printReport(report: DuplicateReport): void {
    console.log('📊 Duplicate Files Report');
    console.log('========================\n');

    console.log('Summary:');
    console.log(`  Files scanned: ${this.scannedFiles}`);
    console.log(`  Total size: ${(this.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Duplicate groups: ${report.totalDuplicates}`);
    console.log(`  Wasted bytes: ${(report.totalWastedBytes / 1024).toFixed(2)} KB\n`);

    if (report.exactDuplicates.length === 0) {
      console.log('✅ No exact duplicates found!');
      return;
    }

    console.log('🔍 Exact Duplicates Found:');
    report.exactDuplicates.forEach((duplicate, index) => {
      if (duplicate.files.length > 1) {
        console.log(`\n${index + 1}. ${duplicate.files.length} identical files (${(duplicate.size / 1024).toFixed(2)} KB each):`);
        duplicate.files.forEach(file => {
          console.log(`   - ${file.relativePath}`);
        });
      }
    });

    console.log('\n📋 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.action.toUpperCase()}`);
      console.log(`   Canonical: ${rec.canonical}`);
      console.log(`   Duplicates: ${rec.duplicates.join(', ')}`);
    });

    console.log('\n🎯 Next Steps:');
    console.log('1. Review recommendations above');
    console.log('2. Choose canonical files for each duplicate group');
    console.log('3. Update imports to use canonical paths');
    console.log('4. Delete duplicate files');
    console.log('5. Run tests to ensure no functionality is broken\n');
  }
}

// Main execution
async function main() {
  const finder = new DuplicateFileFinder();
  const report = await finder.findDuplicates();
  
  // Exit with error code if duplicates found
  if (report.totalDuplicates > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Duplicate file scan failed:', error);
    process.exit(1);
  });
}

export { DuplicateFileFinder };
