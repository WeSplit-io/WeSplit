#!/usr/bin/env tsx

/**
 * Codemod Runner
 * Automates refactoring operations to consolidate duplicate code
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

interface CodemodResult {
  file: string;
  changes: number;
  errors: string[];
}

interface Codemod {
  name: string;
  description: string;
  run: (filePath: string, content: string) => { content: string; changes: number; errors: string[] };
}

class CodemodRunner {
  private results: CodemodResult[] = [];

  /**
   * Available codemods
   */
  private codemods: Codemod[] = [
    {
      name: 'consolidate-imports',
      description: 'Consolidate duplicate imports and update paths',
      run: this.consolidateImports.bind(this)
    },
    {
      name: 'remove-duplicate-exports',
      description: 'Remove duplicate export statements',
      run: this.removeDuplicateExports.bind(this)
    },
    {
      name: 'consolidate-types',
      description: 'Consolidate duplicate type definitions',
      run: this.consolidateTypes.bind(this)
    },
    {
      name: 'update-import-paths',
      description: 'Update import paths to use new architecture',
      run: this.updateImportPaths.bind(this)
    }
  ];

  /**
   * Run all codemods on the codebase
   */
  async runAll(): Promise<void> {
    console.log('🚀 Running codemods...\n');

    for (const codemod of this.codemods) {
      console.log(`📝 Running: ${codemod.name}`);
      console.log(`   Description: ${codemod.description}`);
      
      await this.runCodemod(codemod);
      
      console.log(`✅ Completed: ${codemod.name}\n`);
    }

    this.printResults();
  }

  /**
   * Run a specific codemod
   */
  private async runCodemod(codemod: Codemod): Promise<void> {
    const files = await this.getSourceFiles();
    let totalChanges = 0;
    let totalErrors = 0;

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const result = codemod.run(file, content);
        
        if (result.changes > 0) {
          writeFileSync(file, result.content);
          totalChanges += result.changes;
        }
        
        if (result.errors.length > 0) {
          totalErrors += result.errors.length;
          console.log(`   ⚠️  ${relative(process.cwd(), file)}: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ ${relative(process.cwd(), file)}: ${error}`);
        totalErrors++;
      }
    }

    console.log(`   📊 Changes: ${totalChanges}, Errors: ${totalErrors}`);
  }

  /**
   * Get all source files
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string): void => {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!['node_modules', 'dist', 'build', '.git', '.expo', 'coverage'].includes(item)) {
              scanDirectory(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = extname(fullPath);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    };

    scanDirectory('src');
    return files;
  }

  /**
   * Consolidate duplicate imports
   */
  private consolidateImports(filePath: string, content: string): { content: string; changes: number; errors: string[] } {
    const errors: string[] = [];
    let changes = 0;

    // Find all import statements
    const importRegex = /^import\s+.*?from\s+['"]([^'"]+)['"];?$/gm;
    const imports = new Map<string, string[]>();
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const modulePath = match[1];
      const importStatement = match[0];
      
      if (!imports.has(modulePath)) {
        imports.set(modulePath, []);
      }
      imports.get(modulePath)!.push(importStatement);
    }

    // Consolidate duplicate imports
    let newContent = content;
    for (const [modulePath, importStatements] of imports.entries()) {
      if (importStatements.length > 1) {
        // Merge import statements
        const mergedImport = this.mergeImportStatements(importStatements);
        
        // Replace all duplicate imports with merged version
        for (const importStatement of importStatements) {
          newContent = newContent.replace(importStatement, '');
        }
        
        // Add merged import at the top
        newContent = mergedImport + '\n' + newContent;
        changes++;
      }
    }

    return { content: newContent, changes, errors };
  }

  /**
   * Merge multiple import statements from the same module
   */
  private mergeImportStatements(importStatements: string[]): string {
    const imports = new Set<string>();
    let modulePath = '';
    
    for (const statement of importStatements) {
      const match = statement.match(/^import\s+(.*?)\s+from\s+['"]([^'"]+)['"];?$/);
      if (match) {
        const importClause = match[1];
        modulePath = match[2];
        
        // Parse import clause
        if (importClause.includes('{')) {
          // Named imports
          const namedImports = importClause.match(/\{([^}]+)\}/);
          if (namedImports) {
            const names = namedImports[1].split(',').map(name => name.trim());
            names.forEach(name => imports.add(name));
          }
        } else if (importClause.includes('*')) {
          // Namespace import
          imports.add(importClause);
        } else {
          // Default import
          imports.add(importClause);
        }
      }
    }
    
    // Build merged import statement
    const importClause = Array.from(imports).join(', ');
    return `import ${importClause} from '${modulePath}';`;
  }

  /**
   * Remove duplicate export statements
   */
  private removeDuplicateExports(filePath: string, content: string): { content: string; changes: number; errors: string[] } {
    const errors: string[] = [];
    let changes = 0;

    // Find all export statements
    const exportRegex = /^export\s+.*?;?$/gm;
    const exports = new Set<string>();
    const exportStatements: string[] = [];
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const exportStatement = match[0];
      if (exports.has(exportStatement)) {
        changes++;
      } else {
        exports.add(exportStatement);
        exportStatements.push(exportStatement);
      }
    }

    if (changes > 0) {
      // Remove all export statements
      let newContent = content.replace(exportRegex, '');
      
      // Add unique export statements at the end
      newContent += '\n' + exportStatements.join('\n');
      
      return { content: newContent, changes, errors };
    }

    return { content, changes, errors };
  }

  /**
   * Consolidate duplicate type definitions
   */
  private consolidateTypes(filePath: string, content: string): { content: string; changes: number; errors: string[] } {
    const errors: string[] = [];
    let changes = 0;

    // Find duplicate type definitions
    const typeRegex = /^(export\s+)?(interface|type|enum)\s+(\w+)/gm;
    const types = new Map<string, string[]>();
    
    let match;
    while ((match = typeRegex.exec(content)) !== null) {
      const typeName = match[3];
      const fullMatch = match[0];
      
      if (!types.has(typeName)) {
        types.set(typeName, []);
      }
      types.get(typeName)!.push(fullMatch);
    }

    // Remove duplicate type definitions
    let newContent = content;
    for (const [typeName, definitions] of types.entries()) {
      if (definitions.length > 1) {
        // Keep the first definition, remove the rest
        for (let i = 1; i < definitions.length; i++) {
          const duplicateDefinition = definitions[i];
          newContent = newContent.replace(duplicateDefinition, '');
          changes++;
        }
      }
    }

    return { content: newContent, changes, errors };
  }

  /**
   * Update import paths to use new architecture
   */
  private updateImportPaths(filePath: string, content: string): { content: string; changes: number; errors: string[] } {
    const errors: string[] = [];
    let changes = 0;

    // Path mapping for new architecture
    const pathMappings: Record<string, string> = {
      '../services/': '@features/',
      '../utils/': '@libs/',
      '../config/': '@config/',
      '../theme/': '@theme/',
      '../components/': '@components/',
      '../types/': '@features/',
      '../wallet/': '@features/wallet/',
      '../transfer/': '@features/payments/',
      '../funding/': '@features/payments/'
    };

    let newContent = content;
    for (const [oldPath, newPath] of Object.entries(pathMappings)) {
      const regex = new RegExp(`from\\s+['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^'"]+)['"]`, 'g');
      const matches = newContent.match(regex);
      
      if (matches) {
        newContent = newContent.replace(regex, `from '${newPath}$1'`);
        changes += matches.length;
      }
    }

    return { content: newContent, changes, errors };
  }

  /**
   * Print results summary
   */
  private printResults(): void {
    console.log('📊 Codemod Results Summary');
    console.log('==========================\n');

    const totalChanges = this.results.reduce((sum, result) => sum + result.changes, 0);
    const totalErrors = this.results.reduce((sum, result) => sum + result.errors.length, 0);

    console.log(`Total changes: ${totalChanges}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Files processed: ${this.results.length}\n`);

    if (totalErrors > 0) {
      console.log('⚠️  Errors encountered:');
      this.results.forEach(result => {
        if (result.errors.length > 0) {
          console.log(`  ${result.file}: ${result.errors.join(', ')}`);
        }
      });
    }

    console.log('\n✅ Codemod execution completed!');
  }
}

// Main execution
async function main() {
  const runner = new CodemodRunner();
  await runner.runAll();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Codemod execution failed:', error);
    process.exit(1);
  });
}

export { CodemodRunner };
