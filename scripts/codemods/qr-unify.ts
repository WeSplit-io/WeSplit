/**
 * QR Unification Codemod
 * Automatically migrates existing QR implementations to the unified system
 */

import { Project, SourceFile, ImportDeclaration, CallExpression, JsxElement } from 'ts-morph';
import * as path from 'path';

interface MigrationResult {
  file: string;
  changes: string[];
  errors: string[];
}

class QRUnificationCodemod {
  private project: Project;
  private results: MigrationResult[] = [];

  constructor(projectRoot: string) {
    this.project = new Project({
      tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    });
  }

  async run(): Promise<MigrationResult[]> {
    console.log('🔍 Starting QR unification codemod...');

    // Find all TypeScript/TSX files
    const sourceFiles = this.project.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      if (this.shouldProcessFile(sourceFile)) {
        await this.processFile(sourceFile);
      }
    }

    console.log(`✅ Codemod completed. Processed ${this.results.length} files.`);
    return this.results;
  }

  private shouldProcessFile(sourceFile: SourceFile): boolean {
    const filePath = sourceFile.getFilePath();
    
    // Skip test files, node_modules, and build outputs
    if (filePath.includes('node_modules') || 
        filePath.includes('.test.') || 
        filePath.includes('.spec.') ||
        filePath.includes('build/') ||
        filePath.includes('dist/')) {
      return false;
    }

    // Only process TypeScript/TSX files
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  }

  private async processFile(sourceFile: SourceFile): Promise<void> {
    const filePath = sourceFile.getFilePath();
    const result: MigrationResult = {
      file: filePath,
      changes: [],
      errors: []
    };

    try {
      // 1. Update imports
      this.updateImports(sourceFile, result);

      // 2. Replace QRCode components
      this.replaceQRCodeComponents(sourceFile, result);

      // 3. Replace scanner components
      this.replaceScannerComponents(sourceFile, result);

      // 4. Update QR generation functions
      this.updateQRGeneration(sourceFile, result);

      // 5. Update share functions
      this.updateShareFunctions(sourceFile, result);

      // Save file if changes were made
      if (result.changes.length > 0) {
        sourceFile.save();
      }

    } catch (error) {
      result.errors.push(`Error processing file: ${error}`);
    }

    if (result.changes.length > 0 || result.errors.length > 0) {
      this.results.push(result);
    }
  }

  private updateImports(sourceFile: SourceFile, result: MigrationResult): void {
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Replace direct QR library imports
      if (moduleSpecifier === 'react-native-qrcode-svg') {
        importDecl.setModuleSpecifier('@features/qr');
        result.changes.push('Updated react-native-qrcode-svg import to @features/qr');
      }

      if (moduleSpecifier === 'expo-barcode-scanner') {
        importDecl.setModuleSpecifier('@features/qr');
        result.changes.push('Updated expo-barcode-scanner import to @features/qr');
      }

      if (moduleSpecifier === 'expo-camera') {
        importDecl.setModuleSpecifier('@features/qr');
        result.changes.push('Updated expo-camera import to @features/qr');
      }
    }
  }

  private replaceQRCodeComponents(sourceFile: SourceFile, result: MigrationResult): void {
    const jsxElements = sourceFile.getDescendantsOfKind('JsxElement');

    for (const element of jsxElements) {
      const tagName = element.getTagNameNode().getText();

      // Replace QRCode with QrCodeView
      if (tagName === 'QRCode') {
        element.getTagNameNode().replaceWithText('QrCodeView');
        result.changes.push('Replaced QRCode component with QrCodeView');
      }

      // Replace BarCodeScanner with ScannerScreen
      if (tagName === 'BarCodeScanner') {
        element.getTagNameNode().replaceWithText('ScannerScreen');
        result.changes.push('Replaced BarCodeScanner with ScannerScreen');
      }
    }
  }

  private replaceScannerComponents(sourceFile: SourceFile, result: MigrationResult): void {
    const jsxElements = sourceFile.getDescendantsOfKind('JsxElement');

    for (const element of jsxElements) {
      const tagName = element.getTagNameNode().getText();

      // Replace Camera with ScannerScreen
      if (tagName === 'Camera') {
        element.getTagNameNode().replaceWithText('ScannerScreen');
        result.changes.push('Replaced Camera component with ScannerScreen');
      }
    }
  }

  private updateQRGeneration(sourceFile: SourceFile, result: MigrationResult): void {
    const callExpressions = sourceFile.getDescendantsOfKind('CallExpression');

    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression();
      const expressionText = expression.getText();

      // Replace generateProfileLink with createUsdcRequestUri
      if (expressionText === 'generateProfileLink') {
        expression.replaceWithText('createUsdcRequestUri');
        result.changes.push('Replaced generateProfileLink with createUsdcRequestUri');
      }

      // Replace generateTransferLink with createUsdcRequestUri
      if (expressionText === 'generateTransferLink') {
        expression.replaceWithText('createUsdcRequestUri');
        result.changes.push('Replaced generateTransferLink with createUsdcRequestUri');
      }

      // Replace generateSendLink with createUsdcRequestUri
      if (expressionText === 'generateSendLink') {
        expression.replaceWithText('createUsdcRequestUri');
        result.changes.push('Replaced generateSendLink with createUsdcRequestUri');
      }
    }
  }

  private updateShareFunctions(sourceFile: SourceFile, result: MigrationResult): void {
    const callExpressions = sourceFile.getDescendantsOfKind('CallExpression');

    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression();
      const expressionText = expression.getText();

      // Replace Share.share with shareAddress
      if (expressionText === 'Share.share') {
        expression.replaceWithText('shareAddress');
        result.changes.push('Replaced Share.share with shareAddress');
      }

      // Replace Clipboard.setString with copyToClipboard
      if (expressionText === 'Clipboard.setString') {
        expression.replaceWithText('copyToClipboard');
        result.changes.push('Replaced Clipboard.setString with copyToClipboard');
      }
    }
  }

  private printResults(): void {
    console.log('\n📊 Migration Results:');
    console.log('===================');

    for (const result of this.results) {
      console.log(`\n📁 ${result.file}`);
      
      if (result.changes.length > 0) {
        console.log('  ✅ Changes:');
        result.changes.forEach(change => console.log(`    - ${change}`));
      }

      if (result.errors.length > 0) {
        console.log('  ❌ Errors:');
        result.errors.forEach(error => console.log(`    - ${error}`));
      }
    }
  }
}

// CLI execution
async function main() {
  const projectRoot = process.cwd();
  const codemod = new QRUnificationCodemod(projectRoot);
  
  try {
    const results = await codemod.run();
    
    // Print summary
    const totalFiles = results.length;
    const totalChanges = results.reduce((sum, result) => sum + result.changes.length, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
    
    console.log(`\n📈 Summary:`);
    console.log(`  Files processed: ${totalFiles}`);
    console.log(`  Total changes: ${totalChanges}`);
    console.log(`  Total errors: ${totalErrors}`);
    
    if (totalErrors > 0) {
      console.log('\n⚠️  Some errors occurred. Please review the results above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Codemod failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { QRUnificationCodemod };
