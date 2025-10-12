#!/usr/bin/env node

/**
 * Performance Optimization Script
 * Automatically applies performance optimizations to React components
 */

const fs = require('fs');
const path = require('path');

// Performance optimization patterns
const PERFORMANCE_FIXES = [
  // Add React.memo to components
  {
    pattern: /const\s+([A-Z][a-zA-Z]*)\s*:\s*React\.FC<([^>]+)>\s*=\s*\(/g,
    replacement: 'const $1: React.FC<$2> = React.memo((',
    postfix: ')',
    description: 'Add React.memo to functional components'
  },
  
  // Add useMemo for expensive calculations
  {
    pattern: /const\s+([a-zA-Z]+)\s*=\s*useCallback\(/g,
    replacement: 'const $1 = useCallback(',
    description: 'Ensure useCallback is used for functions'
  },
  
  // Add useMemo for expensive calculations
  {
    pattern: /const\s+([a-zA-Z]+)\s*=\s*([^=]+\.reduce\([^)]+\))/g,
    replacement: 'const $1 = useMemo(() => $2, [dependencies])',
    description: 'Add useMemo for expensive calculations'
  },
  
  // Fix useEffect dependencies
  {
    pattern: /useEffect\(\(\)\s*=>\s*\{([^}]+)\},\s*\[\]\)/g,
    replacement: 'useEffect(() => {$1}, [])',
    description: 'Ensure useEffect has proper dependencies'
  },
  
  // Add useCallback to event handlers
  {
    pattern: /const\s+(handle[A-Z][a-zA-Z]*)\s*=\s*\([^)]*\)\s*=>\s*\{/g,
    replacement: 'const $1 = useCallback(($2) => {',
    description: 'Add useCallback to event handlers'
  }
];

// Files to optimize
const OPTIMIZE_PATTERNS = [
  'src/screens/**/*.tsx',
  'src/components/**/*.tsx'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.expo'
];

function shouldOptimizeFile(filePath) {
  // Check if file should be excluded
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern)) {
      return false;
    }
  }
  
  // Only optimize React components
  return filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.');
}

function optimizeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let optimizationsApplied = 0;
    
    // Check if file imports React
    if (!content.includes('import React')) {
      return 0;
    }
    
    // Apply performance optimizations
    for (const fix of PERFORMANCE_FIXES) {
      if (fix.pattern && fix.replacement) {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          optimizationsApplied++;
        }
      }
    }
    
    // Add missing imports
    if (content.includes('React.memo') && !content.includes('React, { memo }')) {
      content = content.replace(
        /import React from 'react';/g,
        'import React, { memo, useMemo, useCallback } from \'react\';'
      );
    }
    
    // Write back if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Optimized: ${filePath} (${optimizationsApplied} optimizations)`);
      return optimizationsApplied;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error optimizing ${filePath}:`, error.message);
    return 0;
  }
}

function findFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findFiles(filePath, fileList);
      } else if (shouldOptimizeFile(filePath)) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return fileList;
}

function optimizePerformance() {
  console.log('⚡ Optimizing performance in WeSplit codebase...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log(`📁 Found ${files.length} React components to optimize\n`);
  
  let totalOptimizations = 0;
  let filesOptimized = 0;
  
  for (const file of files) {
    const optimizations = optimizeFile(file);
    if (optimizations > 0) {
      totalOptimizations += optimizations;
      filesOptimized++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files optimized: ${filesOptimized}`);
  console.log(`   Total optimizations: ${totalOptimizations}`);
  
  if (filesOptimized > 0) {
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Review the changes: git diff`);
    console.log(`   2. Run tests to ensure nothing broke: npm test`);
    console.log(`   3. Run linter to check for issues: npm run lint`);
    console.log(`   4. Test performance improvements in the app`);
    console.log(`   5. Commit the changes: git add . && git commit -m "perf: optimize React component performance"`);
  } else {
    console.log(`\n✅ No performance optimizations needed!`);
  }
}

// Run the optimizer
optimizePerformance();
