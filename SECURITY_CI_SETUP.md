# 🔒 WeSplit Security & CI/CD Setup

This document outlines the comprehensive security and CI/CD setup for the WeSplit application.

## 🚀 GitHub Actions Workflows

### 1. CI/CD Pipeline (`ci.yml`)
- **Security Scanning**: Automated security audits, dependency checks, and secret scanning
- **Testing**: Unit tests, integration tests, and coverage reporting
- **Building**: Android and iOS builds with EAS
- **Quality Assurance**: TypeScript checks, bundle analysis, and performance testing
- **Deployment**: Automated deployment to Firebase (main branch only)
- **Performance Monitoring**: Lighthouse CI for performance metrics

### 2. Code Quality (`code-quality.yml`)
- **TypeScript**: Strict type checking
- **ESLint**: Code quality and security rule enforcement
- **Testing**: Comprehensive test suite execution
- **Duplicate Detection**: Code duplication analysis
- **Dead Code Detection**: Unused code and dependencies identification
- **Bundle Analysis**: Size and performance optimization

## 🔐 Security Features

### Automated Security Scanning
- **Custom Security Audit**: Comprehensive security checks via `scripts/security-audit.js`
- **Dependency Vulnerabilities**: npm audit with moderate severity threshold
- **Secret Detection**: TruffleHog for hardcoded secrets scanning
- **CodeQL Analysis**: GitHub's semantic code analysis

### Security Configuration
- **ESLint Security Rules**: Enforced security best practices
- **TypeScript Strict Mode**: Enhanced type safety
- **Environment Variable Validation**: Required variables documented and validated
- **Secret Baseline**: Known false positives documented

### Security Scripts
```bash
# Run comprehensive security audit
npm run security:audit

# Run security check (audit + dependency scan)
npm run security:check

# Run linting with security rules
npm run lint

# Type checking
npm run typecheck
```

## 📊 Code Quality Tools

### Linting & Formatting
- **ESLint**: Code quality and security enforcement
- **TypeScript**: Strict type checking
- **React Native**: Platform-specific linting rules

### Testing
- **Jest**: Unit and integration testing
- **Coverage**: Code coverage reporting
- **Performance**: Performance testing framework

### Analysis Tools
- **Bundle Analysis**: Webpack bundle analyzer
- **Duplicate Detection**: jscpd for code duplication
- **Dead Code**: ts-unused-exports and depcheck
- **Performance**: Lighthouse CI

## 🛡️ Security Best Practices

### Environment Variables
- All sensitive data stored in environment variables
- `.env.example` template provided
- Production secrets managed via EAS secrets
- No hardcoded API keys or secrets

### Code Security
- ESLint security rules enforced
- TypeScript strict mode enabled
- Regular dependency vulnerability scanning
- Automated secret detection

### Build Security
- Signed commits required
- Environment approval for deployments
- Artifact scanning
- Runtime monitoring

## 📋 Available Scripts

### Development
```bash
npm start              # Start development server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web
```

### Testing
```bash
npm test              # Run all tests
npm run test:coverage # Run tests with coverage
npm run test:integration # Run integration tests
npm run test:performance # Run performance tests
```

### Code Quality
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run typecheck     # TypeScript type checking
npm run analyze       # Bundle analysis
```

### Security
```bash
npm run security:audit    # Comprehensive security audit
npm run security:check    # Security audit + dependency scan
npm run dup:files         # Check for duplicate files
npm run dup:blocks        # Check for duplicate code blocks
npm run deadcode:ts       # Find unused TypeScript exports
npm run deadcode:deps     # Find unused dependencies
```

### Building
```bash
npm run build:android     # Build Android APK
npm run build:ios         # Build iOS IPA
npm run build:both        # Build both platforms
npm run eas:build:android # EAS Android build
npm run eas:build:ios     # EAS iOS build
```

## 🔧 Configuration Files

### ESLint (`.eslintrc.js`)
- Expo configuration
- React Native rules
- Security-focused rules
- TypeScript support

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- Path mapping for clean imports
- Expo base configuration

### Lighthouse (`lighthouserc.js`)
- Performance thresholds
- Accessibility checks
- Best practices validation

### Security (`.secrets.baseline`)
- Known false positives
- Secret detection baseline
- Audit trail

## 🚨 Security Incident Response

### Automated Monitoring
- GitHub Actions security scanning
- Dependency vulnerability alerts
- Secret detection notifications
- Performance degradation alerts

### Manual Reviews
- Code review process
- Security architecture reviews
- Penetration testing
- Compliance audits

## 📈 Performance Monitoring

### Metrics Tracked
- Bundle size analysis
- Performance scores (Lighthouse)
- Test coverage
- Build times
- Deployment success rates

### Optimization
- Bundle splitting
- Dead code elimination
- Dependency optimization
- Performance budgets

## 🔄 Continuous Integration

### Triggers
- Push to main/develop branches
- Pull requests
- Weekly security scans
- Manual triggers

### Quality Gates
- All tests must pass
- Security audit must pass
- TypeScript compilation must succeed
- ESLint must pass (warnings allowed)
- Coverage thresholds met

## 📚 Documentation

- **SECURITY.md**: Security policies and procedures
- **SECURITY_CI_SETUP.md**: This comprehensive setup guide
- **README.md**: Project overview and setup
- **API Documentation**: Inline code documentation

## 🎯 Next Steps

1. **Monitor**: Watch GitHub Actions for any failures
2. **Review**: Regular security audit reports
3. **Update**: Keep dependencies current
4. **Optimize**: Continuous performance improvement
5. **Scale**: Add more security checks as needed

---

**Security is everyone's responsibility. Report security issues to the development team immediately.**
