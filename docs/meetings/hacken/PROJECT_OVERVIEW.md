# 🚀 WeSplit - Project Overview for Hacken

**Concise overview for 15-minute call**

---

## What WeSplit Is

**WeSplit is a mobile payment app that enables users to split bills and expenses using USDC on Solana.**

### Core Functionality
- Users create wallets (Solana keypairs)
- Users can split expenses with others
- Shared "split wallets" for group payments
- USDC transactions on Solana blockchain
- Biometric authentication (Face ID/Touch ID)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React Native (iOS/Android) |
| **Backend** | Firebase (Functions, Firestore) |
| **Blockchain** | Solana (USDC transactions) |
| **Authentication** | Firebase Auth + Phantom Wallet |
| **Storage** | Keychain (iOS), SecureStore (Android) |

---

## Critical Security Components

### 1. Split Wallet Security 🔐
**What it does:** Encrypts and stores shared private keys for split wallets

**Implementation:**
- AES-256-CBC encryption
- HMAC-SHA256 key derivation (v2)
- Participant-based access control
- Encrypted storage in Firebase

**Why it's critical:** Private keys control funds - must be secure

**Location:** `src/services/split/SplitWalletSecurity.ts`

---

### 2. Transaction Signing Service 🔐
**What it does:** Signs transactions with company wallet for fee coverage

**Implementation:**
- Transaction hash tracking (prevents duplicates)
- Rate limiting (Firestore-based)
- Blockhash validation
- Company wallet signature verification

**Why it's critical:** Prevents replay attacks and unauthorized transactions

**Location:** `services/firebase-functions/src/transactionSigningService.js`

---

### 3. Secure Vault (Mobile) 🔐
**What it does:** Stores user private keys with biometric authentication

**Implementation:**
- Biometric auth (Face ID/Touch ID/fingerprint)
- AES-256-GCM encryption
- Keychain + MMKV storage
- 30-minute authentication cache

**Why it's critical:** User funds security - private keys must be protected

**Location:** `src/services/security/secureVault.ts`

---

### 4. Firestore Security Rules 🔐
**What it does:** Database access control and user permissions

**Implementation:**
- Authentication required for all operations
- User ownership verification
- Participant-based access (application code)
- Admin-only collections

**Why it's critical:** Prevents unauthorized data access

**Location:** `config/deployment/firestore.rules`

---

## Current Security Status

### ✅ Strengths
- All critical secrets resolved and secured
- Multiple layers of security (defense in depth)
- Biometric authentication for wallet access
- Transaction hash tracking prevents replay attacks
- Encrypted private key storage

### ⚠️ Areas for Audit
1. Split wallet encryption implementation
2. Transaction signing service security
3. Firestore security rules (complex logic)
4. Secure vault (biometric auth flow)
5. Rate limiting implementation

### 📊 Security Metrics
- **Production Vulnerabilities:** 3 (isolated to dependency)
- **Development Vulnerabilities:** 7 (dev tools only)
- **Secret Exposure Issues:** 5 (all resolved)
- **Risk Level:** LOW

---

## What We Need from Hacken

### Audit Scope
1. **Mobile App Security** (React Native)
   - Secure storage implementations
   - Biometric authentication flows
   - API key exposure in bundles

2. **Backend Security** (Firebase)
   - Firebase Functions security
   - Firestore security rules
   - Rate limiting implementation

3. **Blockchain Security** (Solana)
   - Transaction signing security
   - Wallet key management
   - Replay attack prevention

4. **Split Wallet Security** (Critical)
   - Encryption implementation
   - Access control verification
   - Participant management

### Expected Deliverables
- Security audit report
- Proof of Concept for critical issues
- Remediation guidance
- Retest after fixes

---

## Key Questions for Hacken

1. **Experience:** Have you audited React Native + Firebase + Solana apps before?
2. **Timeline:** What's realistic for our scope?
3. **Cost:** What's the estimate range?
4. **Support:** What's included in post-audit support?
5. **Testing:** How would you test our critical security components?

---

## Contact

- **Security Email:** vcharles@wesplit.com
- **Project:** WeSplit
- **Stack:** React Native + Firebase + Solana

---

**Ready for audit discussion! 🔒**
