#!/usr/bin/env node

/**
 * Metro Bundle Analyzer
 * Analyzes bundle size and identifies large modules and duplicates
 */

const fs = require('fs');
const path = require('path');

class MetroBundleAnalyzer {
  constructor() {
    this.modules = new Map();
    this.duplicates = new Map();
    this.totalSize = 0;
    this.thresholds = {
      largeModule: 100000, // 100KB
      duplicateModule: 50000, // 50KB
      bundleSize: 5000000 // 5MB
    };
  }

  /**
   * Analyze bundle
   */
  async analyzeBundle() {
    console.log('📦 Analyzing Metro bundle...\n');

    // Analyze node_modules for large dependencies
    await this.analyzeNodeModules();
    
    // Analyze source files
    await this.analyzeSourceFiles();
    
    // Find duplicate modules
    this.findDuplicateModules();
    
    // Generate report
    this.printReport();
    
    return {
      totalSize: this.totalSize,
      largeModules: this.getLargeModules(),
      duplicateModules: this.getDuplicateModules(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Analyze node_modules for large dependencies
   */
  async analyzeNodeModules() {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('⚠️  node_modules not found, skipping dependency analysis');
      return;
    }

    try {
      const packages = fs.readdirSync(nodeModulesPath);
      
      for (const packageName of packages) {
        if (packageName.startsWith('.')) continue;
        
        const packagePath = path.join(nodeModulesPath, packageName);
        const stat = fs.statSync(packagePath);
        
        if (stat.isDirectory()) {
          const size = this.getDirectorySize(packagePath);
          this.modules.set(packageName, {
            name: packageName,
            size: size,
            type: 'dependency',
            path: packagePath
          });
          this.totalSize += size;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not analyze node_modules:', error.message);
    }
  }

  /**
   * Analyze source files
   */
  async analyzeSourceFiles() {
    await this.analyzeDirectory('src', 'source');
  }

  /**
   * Analyze directory recursively
   */
  async analyzeDirectory(dirPath, type) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git', '.expo', 'coverage'].includes(item)) {
            await this.analyzeDirectory(fullPath, type);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
            const relativePath = path.relative(process.cwd(), fullPath);
            this.modules.set(relativePath, {
              name: relativePath,
              size: stat.size,
              type: type,
              path: fullPath
            });
            this.totalSize += stat.size;
          }
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }

  /**
   * Get directory size recursively
   */
  getDirectorySize(dirPath) {
    let size = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          size += this.getDirectorySize(fullPath);
        } else {
          size += stat.size;
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible, skip
    }
    
    return size;
  }

  /**
   * Find duplicate modules
   */
  findDuplicateModules() {
    const sizeMap = new Map();
    
    for (const [name, module] of this.modules.entries()) {
      if (module.size > this.thresholds.duplicateModule) {
        if (!sizeMap.has(module.size)) {
          sizeMap.set(module.size, []);
        }
        sizeMap.get(module.size).push(module);
      }
    }
    
    for (const [size, modules] of sizeMap.entries()) {
      if (modules.length > 1) {
        this.duplicates.set(size, modules);
      }
    }
  }

  /**
   * Get large modules
   */
  getLargeModules() {
    const large = [];
    
    for (const [name, module] of this.modules.entries()) {
      if (module.size > this.thresholds.largeModule) {
        large.push(module);
      }
    }
    
    return large.sort((a, b) => b.size - a.size);
  }

  /**
   * Get duplicate modules
   */
  getDuplicateModules() {
    const duplicates = [];
    
    for (const [size, modules] of this.duplicates.entries()) {
      duplicates.push({
        size: size,
        modules: modules,
        wastedBytes: size * (modules.length - 1)
      });
    }
    
    return duplicates.sort((a, b) => b.wastedBytes - a.wastedBytes);
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    // Bundle size recommendations
    if (this.totalSize > this.thresholds.bundleSize) {
      recommendations.push({
        type: 'bundle_size',
        message: `Bundle size (${this.formatBytes(this.totalSize)}) exceeds threshold (${this.formatBytes(this.thresholds.bundleSize)})`,
        priority: 'high'
      });
    }
    
    // Large module recommendations
    const largeModules = this.getLargeModules();
    if (largeModules.length > 0) {
      recommendations.push({
        type: 'large_modules',
        message: `${largeModules.length} modules exceed ${this.formatBytes(this.thresholds.largeModule)}`,
        priority: 'medium',
        modules: largeModules.slice(0, 5).map(m => m.name)
      });
    }
    
    // Duplicate module recommendations
    const duplicateModules = this.getDuplicateModules();
    if (duplicateModules.length > 0) {
      const totalWasted = duplicateModules.reduce((sum, dup) => sum + dup.wastedBytes, 0);
      recommendations.push({
        type: 'duplicate_modules',
        message: `${duplicateModules.length} duplicate module groups wasting ${this.formatBytes(totalWasted)}`,
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Print detailed report
   */
  printReport() {
    console.log('📊 Metro Bundle Analysis Report');
    console.log('===============================\n');

    console.log('Summary:');
    console.log(`  Total bundle size: ${this.formatBytes(this.totalSize)}`);
    console.log(`  Total modules: ${this.modules.size}`);
    console.log(`  Large modules: ${this.getLargeModules().length}`);
    console.log(`  Duplicate groups: ${this.getDuplicateModules().length}\n`);

    // Large modules
    const largeModules = this.getLargeModules();
    if (largeModules.length > 0) {
      console.log('🔍 Largest Modules:');
      largeModules.slice(0, 10).forEach((module, index) => {
        console.log(`  ${index + 1}. ${module.name} (${this.formatBytes(module.size)})`);
      });
      console.log();
    }

    // Duplicate modules
    const duplicateModules = this.getDuplicateModules();
    if (duplicateModules.length > 0) {
      console.log('🔍 Duplicate Modules:');
      duplicateModules.forEach((duplicate, index) => {
        console.log(`  ${index + 1}. ${this.formatBytes(duplicate.size)} (${duplicate.modules.length} copies, ${this.formatBytes(duplicate.wastedBytes)} wasted)`);
        duplicate.modules.forEach(module => {
          console.log(`     - ${module.name}`);
        });
      });
      console.log();
    }

    // Recommendations
    const recommendations = this.getRecommendations();
    if (recommendations.length > 0) {
      console.log('📋 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        if (rec.modules) {
          rec.modules.forEach(module => {
            console.log(`     - ${module}`);
          });
        }
      });
      console.log();
    }

    // Optimization suggestions
    console.log('🚀 Optimization Suggestions:');
    console.log('1. Use dynamic imports for large modules');
    console.log('2. Implement code splitting for different routes');
    console.log('3. Remove unused dependencies');
    console.log('4. Use lighter alternatives for heavy libraries');
    console.log('5. Enable tree shaking in build configuration');
    console.log('6. Use Metro bundle splitting for better caching\n');
  }
}

// Main execution
async function main() {
  const analyzer = new MetroBundleAnalyzer();
  const report = await analyzer.analyzeBundle();
  
  // Exit with error code if bundle is too large
  if (report.totalSize > analyzer.thresholds.bundleSize) {
    console.log('❌ Bundle size exceeds threshold!');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Bundle analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { MetroBundleAnalyzer };
