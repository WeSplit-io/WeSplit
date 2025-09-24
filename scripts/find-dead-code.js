#!/usr/bin/env node

/**
 * Dead Code Detection Script
 * Finds unused exports, imports, and dependencies
 */

const fs = require('fs');
const path = require('path');

class DeadCodeFinder {
  constructor() {
    this.usedExports = new Set();
    this.usedImports = new Set();
    this.allExports = new Map();
    this.allImports = new Map();
    this.files = [];
  }

  /**
   * Find dead code in the codebase
   */
  async findDeadCode() {
    console.log('🔍 Scanning for dead code...\n');

    // Get all source files
    await this.scanDirectory('src');
    
    // Analyze exports and imports
    await this.analyzeExportsAndImports();
    
    // Find unused exports
    const unusedExports = this.findUnusedExports();
    
    // Find unused imports
    const unusedImports = this.findUnusedImports();
    
    // Generate report
    this.printReport(unusedExports, unusedImports);
    
    return {
      unusedExports,
      unusedImports,
      totalFiles: this.files.length,
      totalExports: this.allExports.size,
      totalImports: this.allImports.size
    };
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git', '.expo', 'coverage'].includes(item)) {
            await this.scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            this.files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }

  /**
   * Analyze exports and imports in all files
   */
  async analyzeExportsAndImports() {
    for (const file of this.files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        this.analyzeFile(file, content);
      } catch (error) {
        console.log(`⚠️  Could not read file: ${file}`);
      }
    }
  }

  /**
   * Analyze individual file
   */
  analyzeFile(filePath, content) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Find exports
    const exportMatches = content.match(/^export\s+(?:const|let|var|function|class|interface|type|enum|default)\s+(\w+)/gm);
    if (exportMatches) {
      for (const match of exportMatches) {
        const exportName = match.match(/^export\s+(?:const|let|var|function|class|interface|type|enum|default)\s+(\w+)/)[1];
        this.allExports.set(exportName, relativePath);
      }
    }

    // Find named exports
    const namedExportMatches = content.match(/^export\s*\{\s*([^}]+)\s*\}/gm);
    if (namedExportMatches) {
      for (const match of namedExportMatches) {
        const exports = match.match(/^export\s*\{\s*([^}]+)\s*\}/)[1];
        const exportNames = exports.split(',').map(name => name.trim().split(' as ')[0]);
        for (const name of exportNames) {
          this.allExports.set(name, relativePath);
        }
      }
    }

    // Find imports
    const importMatches = content.match(/^import\s+(?:.*?,\s*)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm);
    if (importMatches) {
      for (const match of importMatches) {
        const [, imports, modulePath] = match.match(/^import\s+(?:.*?,\s*)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
        const importNames = imports.split(',').map(name => name.trim().split(' as ')[0]);
        for (const name of importNames) {
          this.usedImports.add(name);
          this.allImports.set(name, { file: relativePath, module: modulePath });
        }
      }
    }

    // Find default imports
    const defaultImportMatches = content.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/gm);
    if (defaultImportMatches) {
      for (const match of defaultImportMatches) {
        const [, importName, modulePath] = match.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
        this.usedImports.add(importName);
        this.allImports.set(importName, { file: relativePath, module: modulePath });
      }
    }

    // Find usage of exports within the same file
    for (const [exportName, exportFile] of this.allExports.entries()) {
      if (exportFile === relativePath) {
        // Check if the export is used within the same file
        const usageRegex = new RegExp(`\\b${exportName}\\b`, 'g');
        const matches = content.match(usageRegex);
        if (matches && matches.length > 1) { // More than just the export declaration
          this.usedExports.add(exportName);
        }
      }
    }
  }

  /**
   * Find unused exports
   */
  findUnusedExports() {
    const unused = [];
    
    for (const [exportName, exportFile] of this.allExports.entries()) {
      if (!this.usedImports.has(exportName) && !this.usedExports.has(exportName)) {
        unused.push({
          name: exportName,
          file: exportFile
        });
      }
    }
    
    return unused;
  }

  /**
   * Find unused imports
   */
  findUnusedImports() {
    const unused = [];
    
    for (const [importName, importInfo] of this.allImports.entries()) {
      // Check if the import is actually used in the file
      const filePath = path.join(process.cwd(), importInfo.file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
        const matches = content.match(usageRegex);
        
        // If only one match, it's likely just the import statement
        if (!matches || matches.length <= 1) {
          unused.push({
            name: importName,
            file: importInfo.file,
            module: importInfo.module
          });
        }
      } catch (error) {
        // File might not exist, skip
      }
    }
    
    return unused;
  }

  /**
   * Print detailed report
   */
  printReport(unusedExports, unusedImports) {
    console.log('📊 Dead Code Analysis Report');
    console.log('============================\n');

    console.log('Summary:');
    console.log(`  Files analyzed: ${this.files.length}`);
    console.log(`  Total exports: ${this.allExports.size}`);
    console.log(`  Total imports: ${this.allImports.size}`);
    console.log(`  Unused exports: ${unusedExports.length}`);
    console.log(`  Unused imports: ${unusedImports.length}\n`);

    if (unusedExports.length > 0) {
      console.log('🔍 Unused Exports:');
      unusedExports.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} in ${item.file}`);
      });
      console.log();
    }

    if (unusedImports.length > 0) {
      console.log('🔍 Unused Imports:');
      unusedImports.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} from ${item.module} in ${item.file}`);
      });
      console.log();
    }

    if (unusedExports.length === 0 && unusedImports.length === 0) {
      console.log('✅ No dead code found!');
    } else {
      console.log('📋 Recommendations:');
      console.log('1. Remove unused exports to reduce bundle size');
      console.log('2. Remove unused imports to improve code clarity');
      console.log('3. Consider using tree-shaking to eliminate dead code');
      console.log('4. Set up automated dead code detection in CI/CD\n');
    }
  }
}

// Main execution
async function main() {
  const finder = new DeadCodeFinder();
  const report = await finder.findDeadCode();
  
  // Exit with error code if dead code found
  if (report.unusedExports.length > 0 || report.unusedImports.length > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Dead code analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { DeadCodeFinder };
