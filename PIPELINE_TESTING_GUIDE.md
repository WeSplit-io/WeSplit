# 🧪 WeSplit Pipeline Testing Guide

This guide shows you how to test your GitHub Actions workflows locally before pushing to the repository.

## 🚀 **Quick Start**

### **1. Test Individual Workflow Steps**
```bash
# Test all workflow steps locally
npm run test:workflows:steps

# Test specific components
npm run test:pipeline
npm run security:audit
npm run typecheck
npm run lint
```

### **2. Test with Act (GitHub Actions Local Runner)**
```bash
# List available workflows
act --list

# Test specific workflow (dry-run)
act -W ".github/workflows/ci.yml" --dry-run

# Test all workflows (dry-run)
act --dry-run

# Test with specific event
act push --dry-run
```

### **3. Validate Workflow Files**
```bash
# Validate workflow syntax
npm run test:workflows:validate

# Check environment setup
npm run test:workflows:environment
```

## 🔧 **Testing Methods**

### **Method 1: Individual Script Testing**
Test each component that your workflows use:

```bash
# Dependencies
npm ci

# TypeScript compilation
npm run typecheck

# Linting
npm run lint

# Security audit
npm run security:audit

# Testing
npm test

# Bundle analysis
npm run bundle:report
```

### **Method 2: Act (GitHub Actions Local Runner)**
Act runs your GitHub Actions workflows locally using Docker:

```bash
# Install act (if not already installed)
brew install act

# Test CI workflow
act -W ".github/workflows/ci.yml" --dry-run

# Test code quality workflow
act -W ".github/workflows/code-quality.yml" --dry-run

# Test with secrets (create .secrets file first)
act push --secret-file .secrets
```

### **Method 3: Comprehensive Pipeline Testing**
Use the custom pipeline testing script:

```bash
# Run comprehensive tests
npm run test:pipeline

# This will test:
# - Dependency installation
# - TypeScript compilation
# - ESLint
# - Jest tests
# - Security audit
# - Bundle analysis
# - Duplicate detection
# - Dead code detection
# - Environment validation
# - Build processes
```

## 📋 **Available Testing Commands**

| Command | Description |
|---------|-------------|
| `npm run test:workflows` | Show help for workflow testing |
| `npm run test:workflows:steps` | Test individual workflow steps |
| `npm run test:workflows:act` | Test workflows with act |
| `npm run test:workflows:validate` | Validate workflow files |
| `npm run test:workflows:environment` | Test environment setup |
| `npm run test:workflows:all` | Run all workflow tests |
| `npm run test:pipeline` | Run comprehensive pipeline tests |
| `npm run security:audit` | Run security audit |
| `npm run security:check` | Run security audit + dependency scan |

## 🐳 **Act Configuration**

### **Setup Secrets for Local Testing**
1. Copy `.secrets.example` to `.secrets`:
```bash
cp .secrets.example .secrets
```

2. Fill in your actual values (optional for basic testing):
```bash
# .secrets file
GITHUB_TOKEN=your_github_token_here
FIREBASE_API_KEY=your_firebase_api_key_here
# ... other secrets
```

### **Act Configuration File**
The `.actrc` file configures act for your project:
- Uses Ubuntu latest image
- Sets Node.js version 18
- Enables verbose output
- Binds mount for better performance

## 🔍 **Testing Workflow Components**

### **1. Security Scanning**
```bash
# Test security audit
npm run security:audit

# Test dependency vulnerabilities
npm audit --audit-level=moderate

# Test secret detection
act -W ".github/workflows/ci.yml" --dry-run
```

### **2. Code Quality**
```bash
# Test TypeScript compilation
npm run typecheck

# Test ESLint
npm run lint

# Test code duplication
npm run dup:blocks

# Test dead code detection
npm run deadcode:ts
```

### **3. Testing**
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### **4. Build Processes**
```bash
# Test prebuild
npm run prebuild

# Test bundle analysis
npm run bundle:report

# Test performance
npm run lighthouse:ci
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: TypeScript Errors**
**Problem**: Many TypeScript compilation errors
**Solution**: 
- These are existing code issues, not pipeline problems
- The pipeline will still work with `continue-on-error: true`
- Focus on critical errors first

### **Issue 2: Missing Dependencies**
**Problem**: `npm ci` fails due to missing packages
**Solution**:
```bash
# Update package-lock.json
npm install

# Then test again
npm run test:workflows:steps
```

### **Issue 3: Act Docker Issues**
**Problem**: Act can't find Docker or images
**Solution**:
```bash
# Check Docker is running
docker --version

# Pull required images
act --pull

# Use specific image
act -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

### **Issue 4: Network Issues**
**Problem**: npm install fails due to network
**Solution**:
- Check your internet connection
- Try using a different network
- Use `npm install` instead of `npm ci` for testing

## 📊 **Test Results Interpretation**

### **Pipeline Test Report**
After running `npm run test:pipeline`, check `pipeline-test-report.json`:

```json
{
  "summary": {
    "total": 13,
    "passed": 6,
    "failed": 1,
    "warnings": 6
  }
}
```

### **Success Criteria**
- ✅ **Passed**: Critical tests that must work
- ⚠️ **Warnings**: Non-critical tests (allowed to fail)
- ❌ **Failed**: Critical tests that need fixing

### **What to Fix**
1. **Critical Failures**: Fix immediately
2. **Warnings**: Fix when possible, but not blocking
3. **TypeScript Errors**: Fix gradually, not blocking for now

## 🎯 **Pre-Push Checklist**

Before pushing to GitHub, run:

```bash
# 1. Test environment
npm run test:workflows:environment

# 2. Validate workflows
npm run test:workflows:validate

# 3. Test critical components
npm run security:audit
npm run typecheck

# 4. Test with act (optional)
act --dry-run

# 5. Run comprehensive test
npm run test:pipeline
```

## 🔄 **Continuous Testing**

### **Local Development**
- Run `npm run test:pipeline` before major commits
- Use `npm run security:audit` regularly
- Test specific components as you develop

### **Pre-commit Hooks** (Optional)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
npm run security:audit
npm run typecheck
```

### **IDE Integration**
- Configure your IDE to run TypeScript checking
- Set up ESLint integration
- Enable security scanning extensions

## 📚 **Additional Resources**

- [Act Documentation](https://github.com/nektos/act)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

## 🆘 **Getting Help**

If you encounter issues:

1. **Check the logs**: Look at the detailed output from failed tests
2. **Review the report**: Check `pipeline-test-report.json` for details
3. **Test individually**: Run each component separately to isolate issues
4. **Check dependencies**: Ensure all required packages are installed
5. **Verify environment**: Make sure your local environment matches CI

---

**Remember**: The goal is to catch issues locally before they reach GitHub Actions. Start with the basic tests and gradually add more comprehensive testing as your pipeline matures.
