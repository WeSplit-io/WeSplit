#!/usr/bin/env node

/**
 * Naming Convention Fixer Script
 * Automatically fixes common naming inconsistencies in the WeSplit codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Naming convention fixes
const NAMING_FIXES = [
  // Interface naming fixes
  { pattern: /interface\s+([A-Z][a-zA-Z]*Props)\s*{/g, replacement: 'interface $1 {' },
  { pattern: /interface\s+I([A-Z][a-zA-Z]*)\s*{/g, replacement: 'interface $1 {' },
  { pattern: /interface\s+([a-z][a-zA-Z]*)\s*{/g, replacement: (match, name) => `interface ${name.charAt(0).toUpperCase() + name.slice(1)} {` },
  
  // Class naming fixes
  { pattern: /class\s+([a-z][a-zA-Z]*)\s*{/g, replacement: (match, name) => `class ${name.charAt(0).toUpperCase() + name.slice(1)} {` },
  { pattern: /class\s+([A-Z][a-zA-Z]*Service)\s*{/g, replacement: (match, name) => {
    // Remove redundant "Service" suffix if class name already indicates it's a service
    const baseName = name.replace(/Service$/, '');
    if (baseName.endsWith('Manager') || baseName.endsWith('Processor') || baseName.endsWith('Handler')) {
      return `class ${baseName} {`;
    }
    return match;
  }},
  
  // Type naming fixes
  { pattern: /type\s+([a-z][a-zA-Z]*)\s*=/g, replacement: (match, name) => `type ${name.charAt(0).toUpperCase() + name.slice(1)} =` },
  { pattern: /type\s+I([A-Z][a-zA-Z]*)\s*=/g, replacement: 'type $1 =' },
  
  // Variable naming fixes (be careful with this one)
  { pattern: /const\s+([A-Z][a-zA-Z]*)\s*=/g, replacement: (match, name) => {
    // Only fix if it's clearly a variable (not a component)
    if (name.endsWith('Service') || name.endsWith('Manager') || name.endsWith('Processor')) {
      return `const ${name.charAt(0).toLowerCase() + name.slice(1)} =`;
    }
    return match;
  }},
  
  // Function naming fixes
  { pattern: /function\s+([A-Z][a-zA-Z]*)\s*\(/g, replacement: (match, name) => `function ${name.charAt(0).toLowerCase() + name.slice(1)}(` },
  { pattern: /const\s+([A-Z][a-zA-Z]*)\s*=\s*\(/g, replacement: (match, name) => `const ${name.charAt(0).toLowerCase() + name.slice(1)} = (` },
  
  // Export naming fixes
  { pattern: /export\s+const\s+([A-Z][a-zA-Z]*)\s*=/g, replacement: (match, name) => {
    // Keep PascalCase for components and classes, camelCase for services
    if (name.endsWith('Service') || name.endsWith('Manager') || name.endsWith('Processor')) {
      return `export const ${name.charAt(0).toLowerCase() + name.slice(1)} =`;
    }
    return match;
  }},
];

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.expo',
  'ios/build',
  'android/build'
];

// File extensions to process
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcessFile(filePath) {
  // Check if file should be excluded
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern)) {
      return false;
    }
  }
  
  // Check file extension
  const ext = path.extname(filePath);
  return FILE_EXTENSIONS.includes(ext);
}

function fixNamingInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesMade = 0;
    
    // Apply naming fixes
    for (const fix of NAMING_FIXES) {
      if (typeof fix.replacement === 'function') {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          changesMade++;
        }
      } else {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          changesMade++;
        }
      }
    }
    
    // Write back if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed naming in: ${filePath} (${changesMade} changes)`);
      return changesMade;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
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
      } else if (shouldProcessFile(filePath)) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return fileList;
}

function fixNamingConventions() {
  console.log('🔧 Fixing naming conventions in WeSplit codebase...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log(`📁 Found ${files.length} files to process\n`);
  
  let totalChanges = 0;
  let filesChanged = 0;
  
  for (const file of files) {
    const changes = fixNamingInFile(file);
    if (changes > 0) {
      totalChanges += changes;
      filesChanged++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files changed: ${filesChanged}`);
  console.log(`   Total changes: ${totalChanges}`);
  
  if (filesChanged > 0) {
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Review the changes: git diff`);
    console.log(`   2. Run tests to ensure nothing broke: npm test`);
    console.log(`   3. Run linter to check for issues: npm run lint`);
    console.log(`   4. Commit the changes: git add . && git commit -m "fix: standardize naming conventions"`);
  } else {
    console.log(`\n✅ No naming convention issues found!`);
  }
}

// Run the fixer
fixNamingConventions();
