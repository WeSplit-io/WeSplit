#!/usr/bin/env node

/**
 * Find Duplicate Code Blocks Script
 * Identifies similar code patterns and potential duplications
 */

const fs = require('fs');
const path = require('path');

class DuplicateBlockFinder {
  constructor() {
    this.blocks = new Map();
    this.similarityThreshold = 30; // Minimum similarity percentage
  }

  /**
   * Find duplicate code blocks
   */
  async findDuplicates() {
    console.log('🔍 Scanning for duplicate code blocks...\n');

    // Scan TypeScript/JavaScript files
    await this.scanDirectory('src');
    await this.scanDirectory('app');

    // Analyze similarities
    const similarities = this.findSimilarities();

    this.printReport(similarities);
    return similarities;
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
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }

  /**
   * Process individual file
   */
  async processFile(filePath) {
    try {
      const ext = path.extname(filePath);
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Extract code blocks (functions, classes, etc.)
      const blocks = this.extractCodeBlocks(content, filePath);
      
      for (const block of blocks) {
        const key = this.normalizeCode(block.code);
        if (!this.blocks.has(key)) {
          this.blocks.set(key, []);
        }
        this.blocks.get(key).push({
          file: path.relative(process.cwd(), filePath),
          startLine: block.startLine,
          endLine: block.endLine,
          code: block.code
        });
      }
    } catch (error) {
      // File might not be readable, skip
    }
  }

  /**
   * Extract code blocks from file content
   */
  extractCodeBlocks(content, filePath) {
    const blocks = [];
    const lines = content.split('\n');
    
    let currentBlock = null;
    let braceCount = 0;
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect function/class/interface declarations
      if (this.isBlockStart(trimmed)) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          startLine: i + 1,
          endLine: i + 1,
          code: line
        };
        inBlock = true;
        braceCount = 0;
      } else if (inBlock && currentBlock) {
        currentBlock.code += '\n' + line;
        currentBlock.endLine = i + 1;

        // Count braces to detect block end
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        // End of block
        if (braceCount === 0 && trimmed.includes('}')) {
          blocks.push(currentBlock);
          currentBlock = null;
          inBlock = false;
        }
      }
    }

    // Add any remaining block
    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * Check if line starts a code block
   */
  isBlockStart(line) {
    const patterns = [
      /^(export\s+)?(async\s+)?function\s+/,
      /^(export\s+)?(async\s+)?const\s+\w+\s*=\s*(async\s+)?\(/,
      /^(export\s+)?class\s+/,
      /^(export\s+)?interface\s+/,
      /^(export\s+)?type\s+/,
      /^(export\s+)?enum\s+/,
      /^(export\s+)?const\s+\w+\s*=\s*\{/,
      /^(export\s+)?const\s+\w+\s*=\s*\[/
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Normalize code for comparison
   */
  normalizeCode(code) {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\b\w+\b/g, (match) => {
        // Replace variable names with placeholders
        if (['function', 'const', 'let', 'var', 'class', 'interface', 'type', 'enum'].includes(match)) {
          return match;
        }
        return 'VAR';
      })
      .trim();
  }

  /**
   * Find similar code blocks
   */
  findSimilarities() {
    const similarities = [];
    const processed = new Set();

    for (const [key, blocks] of this.blocks.entries()) {
      if (blocks.length > 1) {
        // Exact duplicates
        similarities.push({
          type: 'exact',
          similarity: 100,
          blocks: blocks,
          recommendation: 'merge_into_shared_utility'
        });
      } else if (blocks.length === 1) {
        // Check for similar blocks
        for (const [otherKey, otherBlocks] of this.blocks.entries()) {
          if (key !== otherKey && !processed.has(otherKey)) {
            const similarity = this.calculateSimilarity(key, otherKey);
            if (similarity >= this.similarityThreshold) {
              similarities.push({
                type: 'similar',
                similarity: similarity,
                blocks: [...blocks, ...otherBlocks],
                recommendation: 'consider_shared_utility'
              });
            }
          }
        }
      }
      processed.add(key);
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two normalized code strings
   */
  calculateSimilarity(code1, code2) {
    const words1 = code1.split(' ');
    const words2 = code2.split(' ');
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return Math.round((intersection.size / union.size) * 100);
  }

  /**
   * Print detailed report
   */
  printReport(similarities) {
    console.log('📊 Duplicate Code Blocks Report');
    console.log('===============================\n');

    console.log('Summary:');
    console.log(`  Code blocks analyzed: ${this.blocks.size}`);
    console.log(`  Similarities found: ${similarities.length}`);
    console.log(`  Similarity threshold: ${this.similarityThreshold}%\n`);

    if (similarities.length === 0) {
      console.log('✅ No significant duplications found!');
      return;
    }

    console.log('🔍 Duplicate/Similar Code Blocks:');
    similarities.forEach((similarity, index) => {
      console.log(`\n${index + 1}. ${similarity.type.toUpperCase()} (${similarity.similarity}% similarity)`);
      console.log(`   Recommendation: ${similarity.recommendation}`);
      
      similarity.blocks.forEach(block => {
        console.log(`   - ${block.file}:${block.startLine}-${block.endLine}`);
      });
    });

    console.log('\n📋 Recommendations:');
    console.log('1. Review similar code blocks above');
    console.log('2. Extract common patterns into shared utilities');
    console.log('3. Use composition over duplication');
    console.log('4. Consider custom hooks for repeated logic');
    console.log('5. Create shared components for similar UI patterns\n');
  }
}

// Main execution
async function main() {
  const finder = new DuplicateBlockFinder();
  const similarities = await finder.findDuplicates();
  
  // Exit with error code if significant duplications found
  const significantDuplications = similarities.filter(s => s.similarity >= 80);
  if (significantDuplications.length > 0) {
    console.log(`⚠️  Found ${significantDuplications.length} significant duplications (≥80% similarity)`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Duplicate block scan failed:', error);
    process.exit(1);
  });
}

module.exports = { DuplicateBlockFinder };
