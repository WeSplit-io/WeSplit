# WeSplit Documentation

Welcome to the WeSplit documentation. This directory contains comprehensive documentation for the WeSplit application, organized by category.

---

## 📁 Directory Structure

```
docs/
├── audits/          # System audits and verification documents
├── features/        # Feature-specific documentation
├── guides/          # Setup guides, tutorials, and how-to documents
└── README.md        # This file
```

---

## 📚 Documentation Categories

### 🔍 Audits (`audits/`)

System audits, verification documents, and comprehensive analysis of various components:

- **Transaction System**
  - [Transaction System Complete Audit](./audits/TRANSACTION_SYSTEM_COMPLETE_AUDIT.md) - Complete transaction system audit
  - [Transaction Duplicate Prevention Complete](./audits/TRANSACTION_DUPLICATE_PREVENTION_COMPLETE.md) - Duplicate prevention system

- **Security**
  - [Security Audit: Company Wallet](./audits/SECURITY_AUDIT_COMPANY_WALLET.md)
  - [Security Audit: Environment Files](./audits/SECURITY_AUDIT_ENV_FILES.md)

- **System Audits**
  - [Code Quality Summary](./audits/CODE_QUALITY_SUMMARY.md)
  - [Codebase Status](./audits/CODEBASE_STATUS.md)
  - [Complete Storage Audit](./audits/COMPLETE_STORAGE_AUDIT.md)
  - [Memory Leak Fixes](./audits/MEMORY_LEAK_FIXES.md)

- **Network & RPC**
  - [Mainnet RPC Optimization Summary](./audits/MAINNET_RPC_OPTIMIZATION_SUMMARY.md)
  - [Solana RPC Provider Comparison](./audits/SOLANA_RPC_PROVIDER_COMPARISON.md)
  - [Devnet vs Mainnet Differences](./audits/DEVNET_VS_MAINNET_DIFFERENCES.md)

See [audits/README.md](./audits/README.md) for complete list.

---

### ✨ Features (`features/`)

Feature-specific documentation covering implementation details, architecture, and best practices:

- **Shared Wallet**
  - [Shared Wallet Complete Guide](./features/SHARED_WALLET_COMPLETE_GUIDE.md) - Complete shared wallet documentation
  - [Shared Wallet Navigation Flow](./features/SHARED_WALLET_NAVIGATION_FLOW.md)
  - [Shared Wallet Data Flow](./features/SHARED_WALLET_DATA_FLOW.md)
  - [Shared Wallet Component Optimization](./features/SHARED_WALLET_COMPONENT_OPTIMIZATION.md)
  - [Participant Invitation Architecture](./features/PARTICIPANT_INVITATION_ARCHITECTURE.md)

- **Transaction Features**
  - [Transaction Enrichment Integration](./features/TRANSACTION_ENRICHMENT_INTEGRATION.md)
  - [Transaction Display Refactor](./features/TRANSACTION_DISPLAY_REFACTOR.md)
  - [Transaction History Unified Component](./features/TRANSACTION_HISTORY_UNIFIED_COMPONENT.md)
  - [Split Transaction History Integration](./features/SPLIT_TRANSACTION_HISTORY_INTEGRATION.md)

- **Rewards & Referrals**
  - [Referral System Complete](./REFERRAL_SYSTEM_COMPLETE.md) - Complete referral system documentation
  - [Referral Flow Verification](./REFERRAL_FLOW_VERIFICATION.md) - Flow verification details
  - [Community Badge Bonus Implementation](./COMMUNITY_BADGE_BONUS_IMPLEMENTATION.md) - Community badge bonus system

---

### 📖 Guides (`guides/`)

Setup guides, tutorials, deployment instructions, and how-to documents:

- **Setup & Configuration**
  - [Environment Setup Guide](./guides/CENTRALIZED_ENV_SETUP.md) - Complete environment variable setup
  - [Network Configuration Guide](./guides/DEVNET_MAINNET_QUICK_START.md) - Network configuration (devnet/mainnet)
  - [Production Build Quick Start](./guides/LOCAL_PRODUCTION_BUILD_SETUP.md) - Local production build guide
  - [Firebase Secrets Setup Guide](./guides/FIREBASE_SECRETS_SETUP_GUIDE.md)
  - [RPC API Keys Setup](./guides/RPC_API_KEYS_SETUP.md)

- **Development**
  - [Developer Guide](./guides/DEVELOPER_GUIDE.md)
  - [Complete Testing Guide](./guides/COMPLETE_TESTING_GUIDE.md)
  - [Local Testing with Emulator](./guides/LOCAL_TESTING_WITH_EMULATOR.md)
  - [Firebase Emulator Quick Start](./guides/EMULATOR_QUICK_START.md)

- **Deployment**
  - [Deployment Instructions](./guides/DEPLOYMENT_INSTRUCTIONS.md)
  - [Production Deployment Checklist](./guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
  - [Deployment Wallet Migration Guide](./guides/DEPLOYMENT_WALLET_MIGRATION_GUIDE.md)

- **Company Wallet**
  - [Company Wallet Complete Guide](./guides/COMPANY_WALLET_COMPLETE_GUIDE.md)
  - [Company Wallet Change Guide](./guides/COMPANY_WALLET_CHANGE_GUIDE.md)

- **Integration**
  - [SPEND Integration](./guides/SPEND_INTEGRATION/) - External payment integration

See [guides/README.md](./guides/README.md) for complete list.

---

## 🚀 Quick Start

### For New Developers

1. **Setup Environment**
   - Read [Environment Setup Guide](./guides/CENTRALIZED_ENV_SETUP.md)
   - Configure [Network Settings](./guides/DEVNET_MAINNET_QUICK_START.md)

2. **Understand Architecture**
   - Review [Transaction System Complete Audit](./audits/TRANSACTION_SYSTEM_COMPLETE_AUDIT.md)
   - Read [Developer Guide](./guides/DEVELOPER_GUIDE.md)

3. **Start Development**
   - Follow [Local Testing with Emulator](./guides/LOCAL_TESTING_WITH_EMULATOR.md)
   - Review [Complete Testing Guide](./guides/COMPLETE_TESTING_GUIDE.md)

### For Deployment

1. **Production Setup**
   - Follow [Production Build Quick Start](./guides/LOCAL_PRODUCTION_BUILD_SETUP.md)
   - Review [Production Deployment Checklist](./guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

2. **Security**
   - Configure [Firebase Secrets](./guides/FIREBASE_SECRETS_SETUP_GUIDE.md)
   - Review [Security Audits](./audits/SECURITY_AUDIT_COMPANY_WALLET.md)

---

## 📋 Common Tasks

### Setting Up Development Environment
- [Environment Setup Guide](./guides/CENTRALIZED_ENV_SETUP.md)
- [Network Configuration](./guides/DEVNET_MAINNET_QUICK_START.md)
- [Local Testing with Emulator](./guides/LOCAL_TESTING_WITH_EMULATOR.md)

### Understanding Transaction System
- [Transaction System Complete Audit](./audits/TRANSACTION_SYSTEM_COMPLETE_AUDIT.md)
- [Transaction Duplicate Prevention](./audits/TRANSACTION_DUPLICATE_PREVENTION_COMPLETE.md)

### Working with Shared Wallets
- [Shared Wallet Complete Guide](./features/SHARED_WALLET_COMPLETE_GUIDE.md)
- [Shared Wallet Navigation Flow](./features/SHARED_WALLET_NAVIGATION_FLOW.md)

### Understanding Referral System
- [Referral System Complete](./REFERRAL_SYSTEM_COMPLETE.md) - Complete documentation
- [Referral Flow Verification](./REFERRAL_FLOW_VERIFICATION.md) - Flow verification

### Deploying to Production
- [Production Build Quick Start](./guides/LOCAL_PRODUCTION_BUILD_SETUP.md)
- [Production Deployment Checklist](./guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Firebase Secrets Setup](./guides/FIREBASE_SECRETS_SETUP_GUIDE.md)

---

## 🔗 Related Documentation

- **Main Project README**: See [../README.md](../README.md)
- **Firebase Functions**: See [../services/firebase-functions/README.md](../services/firebase-functions/README.md)
- **Backend Services**: See [../services/backend/](../services/backend/)

---

## 📝 Documentation Standards

### File Naming
- Use `UPPER_SNAKE_CASE.md` for file names
- Be descriptive and specific
- Group related files together

### Structure
- Start with a clear title and purpose
- Include date and status when relevant
- Use clear sections and headings
- Include code examples where helpful
- Link to related documentation

### Maintenance
- Update documentation when code changes
- Remove outdated information
- Keep documentation organized
- Consolidate duplicate information

---

## 🤝 Contributing

When adding new documentation:

1. **Choose the right category** (audits, features, or guides)
2. **Follow naming conventions** (UPPER_SNAKE_CASE.md)
3. **Include clear structure** (title, purpose, sections)
4. **Link to related docs** (cross-reference)
5. **Update this README** (add to appropriate section)

---

**Last Updated:** 2025-01-XX




