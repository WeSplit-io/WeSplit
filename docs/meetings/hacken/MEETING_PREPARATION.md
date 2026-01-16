# 🔒 Hacken Security Audit Meeting - Preparation Document

**Meeting Date:** [To be scheduled]  
**Prepared:** January 2025  
**Status:** Ready for Meeting

---

## 📋 Table of Contents

1. [Hacken Overview](#hacken-overview)
2. [WeSplit Codebase Security Status](#wesplit-codebase-security-status)
3. [Key Security Features](#key-security-features)
4. [Areas Requiring Audit](#areas-requiring-audit)
5. [Questions for Hacken](#questions-for-hacken)
6. [Meeting Agenda](#meeting-agenda)
7. [Quick Reference](#quick-reference)

---

## 🏢 Hacken Overview

### What Hacken Is (Public Information)
- **Founded:** 2017 by Ukrainian security researchers
- **Headquarters:** Tallinn, Estonia (also operates from Lisbon, Ukraine)
- **Mission:** "We make Web3 a safer place"
- **Team:** 130+ experts globally, 60+ certified engineers
- **Track Record:** 
  - 1,500+ public security assessments completed
  - 4,000+ vulnerabilities found
  - $430B+ assets verified in PoR audits
  - <1% incident rate among audited projects
  - Zero "scam ventures" reported

### Services Offered (Public Information)
- **Smart Contract Audits:** EVM and non-EVM (Solidity, Rust, Move, Vyper, etc.)
- **Protocol Audits:** Blockchain protocols, dApps, cross-chain bridges
- **Penetration Testing:** Web, mobile, APIs, infrastructure (ISO 27001 ready)
- **Compliance & Advisory:** MiCA, DORA, VARA, VASP, CCSS, ISO 27001
- **Proof of Reserves (PoR):** Exchange transparency audits
- **Tokenomics Audits:** Economic attack detection, incentive analysis
- **Ongoing Monitoring:** Extractor (on-chain/off-chain threat detection)
- **Bug Bounties:** HackenProof (crowdsourced security)
- **Virtual CISO (vCISO):** Security leadership and maturity assessment

### Certifications & Standards
- ✅ **ISO 27001 certified**
- ✅ Aligns with **NIST SP 800-115** and **PTES** (Penetration Testing Execution Standard)
- ✅ Members of multiple security/crypto standard bodies

### Audit Methodology (Public - v3.0, Oct 2025)
**Phases:**
1. **Onboarding:** Functional requirements, technical descriptions, dev environment setup
2. **Code Review & Testing:** Manual line-by-line (2 auditors), automated tools, static/dynamic/fuzzing/invariant testing
3. **Reporting:** Formal report with severity categorization, PoC for critical issues, recommendations
4. **Remediation Check:** Review fixes, retest, issue final report

**Timeline:** 5-15 business days for smart contract audits (varies by scope)

**Deliverables:**
- Formal audit report (executive summary + technical details)
- Proof of Concept (PoC) for high/critical issues
- "Audited by Hacken" badge
- Inclusion in CER.live, CoinGecko, CoinMarketCap

### Recent Notable Work
- **QANplatform QVM Audit** (Feb 2025)
  - 2,800+ test cases
  - 22 high-severity issues found
  - Full protocol analysis
- **Open-Source AI Threat Modeling Tool**
  - Built for QANplatform audit
  - Open-sourced for community use
- **GitHub:** `github.com/hknio` (public tools like WASMCOV)

### Strengths
- ✅ Web3-native expertise (built for blockchain from day one)
- ✅ AI-augmented traditional audits
- ✅ Transparent reporting (public reports, remediation case studies)
- ✅ Regulatory alignment (certifications, compliance artifacts)
- ✅ Strong track record (1,500+ audits, <1% incident rate)

### What NOT to Ask (Already Public)
❌ **Don't ask these - they're documented on hacken.io:**
- General company overview or mission
- List of services they offer
- Basic audit methodology/phases (it's published)
- What languages/blockchains they support
- Basic pricing/timeline estimates (5-15 days is public)
- What they need for audit prep (documented in their docs)
- Basic compliance standards they handle (MiCA, DORA, ISO 27001, etc.)

✅ **Instead, ask deeper questions about:**
- How they adapt methodology to YOUR specific stack
- Post-audit support details and SLAs
- False positive rates and regression testing
- Economic attack detection methods
- Compliance evidence packages format
- Team expertise in React Native + Solana

---

## 🔐 WeSplit Codebase Security Status

### Current Security Posture

#### ✅ Production Vulnerabilities: MITIGATED
- **Status:** 3 high-severity vulnerabilities in `@solana/spl-token` dependency
- **Resolution:** Hybrid approach using safe functions + secure custom parsing
- **Risk Level:** Low (isolated to third-party dependency)

#### ⚠️ Development Vulnerabilities
- **Count:** 7 high-severity
- **Location:** Dev tools only (Lighthouse CI, Puppeteer)
- **Risk Level:** Low (not in production builds)

### Security Measures Implemented

#### 1. Code Security ✅
- No dangerous execution patterns (`eval`, `Function()`, etc.)
- No hardcoded secrets in source code
- Proper environment variable usage
- Secure wallet key handling
- Hybrid secure token utilities

#### 2. Firebase Security ✅
- Authentication required for all operations
- Granular Firestore rules (see `config/deployment/firestore.rules`)
- Access control per user/collection
- Encrypted private key storage for split wallets

#### 3. Network Security ✅
- HTTPS-only communications
- API key management
- Input validation and sanitization
- Rate limiting:
  - General: 100 requests/15min
  - Auth: 5 requests/15min
  - Strict: 10 requests/15min
- CORS configuration

#### 4. Wallet Security ✅
- Secure vault with Face ID/Touch ID/biometric authentication
- AES-256-GCM encryption for private keys
- Keychain + MMKV storage (iOS/Android)
- SecureStore fallback
- Split wallet private keys encrypted (AES-256-CBC) before Firebase storage
- Device fingerprinting service

#### 5. Transaction Security ✅
- Transaction hash tracking (prevents duplicate signing/replay attacks)
- Rate limiting on transaction signing
- Transaction validation before signing
- Company wallet signature verification
- Blockhash validation

#### 6. Backend Security ✅
- Helmet.js (security headers)
- JWT authentication
- Input sanitization (XSS prevention)
- Email validation with domain blocking
- Numeric input validation

### Critical Security Issues (RESOLVED)

#### Previously Exposed Secrets (Now Fixed)
1. ✅ Company wallet private key → Moved to Firebase Functions secrets
2. ✅ Google OAuth client secret → Rotated and secured
3. ✅ Twitter OAuth client secret → Rotated and secured
4. ✅ MoonPay secret key → Rotated and secured
5. ✅ MoonPay webhook secret → Rotated and secured

**Current Secret Management:**
- ✅ Secrets stored in Firebase Functions (not in EAS environment variables)
- ✅ No `EXPO_PUBLIC_*` secrets in client code
- ✅ Proper separation of public vs. private configuration

---

## 🛡️ Key Security Features

### 1. Secure Vault Implementation
**Location:** `src/services/security/secureVault.ts`

**Features:**
- Biometric authentication (Face ID/Touch ID/fingerprint)
- AES-256-GCM encryption
- Keychain + MMKV storage (iOS/Android)
- SecureStore fallback for Expo Go
- 30-minute authentication cache
- Request deduplication to prevent multiple prompts

**Security Highlights:**
- Private keys never stored in plaintext
- Encryption key derived from device Keychain
- Automatic cache expiration
- Proactive cache refresh

### 2. Split Wallet Security
**Location:** `src/services/split/SplitWalletSecurity.ts`

**Features:**
- AES-256-CBC encryption for shared private keys
- HMAC-based key derivation (v2, ~100x faster than PBKDF2)
- Participant-based access control
- Firebase storage with encryption
- Local storage for Fair splits (creator-only)

**Security Highlights:**
- Private keys encrypted before Firebase storage
- Participant verification before decryption
- Migration from plaintext to encrypted format
- In-memory cache with 5-minute TTL

### 3. Transaction Signing Service
**Location:** `services/firebase-functions/src/transactionSigningService.js`

**Features:**
- Transaction hash tracking (prevents duplicates)
- Rate limiting (transaction-based)
- Blockhash validation
- Company wallet signature verification
- Transaction validation before signing

**Security Highlights:**
- Prevents replay attacks via hash tracking
- Validates fee payer is company wallet
- Checks blockhash expiration
- Verifies user signatures before company signature

### 4. Firestore Security Rules
**Location:** `config/deployment/firestore.rules`

**Features:**
- Authentication required for all operations
- Granular access control per collection
- User-based read/write permissions
- Participant verification for splits
- Admin-only collections (API keys, webhooks)

**Security Highlights:**
- Defense in depth (rules + application code)
- No public access to sensitive data
- Proper user ownership verification
- Encrypted private keys require auth + participant check

### 5. Backend Security Middleware
**Location:** `services/backend/middleware/security.js`

**Features:**
- Rate limiting (general, auth, strict)
- Helmet.js security headers
- CORS configuration
- JWT authentication
- Input sanitization (XSS prevention)
- Email validation with domain blocking

---

## 🔍 Areas Requiring Audit

### High Priority

1. **Split Wallet Encryption**
   - AES-256-CBC implementation
   - HMAC key derivation (v2)
   - Participant access control
   - Migration from plaintext

2. **Transaction Signing Service**
   - Company wallet signature flow
   - Transaction hash tracking
   - Rate limiting implementation
   - Blockhash validation

3. **Firestore Security Rules**
   - Complex nested array checks
   - Participant verification logic
   - Admin-only collections
   - User ownership verification

4. **Secure Vault**
   - Biometric authentication flow
   - Keychain integration
   - Encryption key derivation
   - Cache management

### Medium Priority

5. **API Key Validation**
   - SPEND endpoints authentication
   - API key storage and rotation
   - Permission-based access

6. **Phantom Authentication**
   - OAuth flow security
   - Token storage
   - Session management

7. **Device Fingerprinting**
   - Fingerprint generation
   - Storage and verification
   - Privacy implications

8. **Rate Limiting**
   - Firestore-based rate limiting
   - Transaction-based limits
   - IP-based limits

---

## ❓ Questions for Hacken

### 1. Audit Scope & Methodology

**General Questions:**
- What does a full security audit include for a React Native + Firebase + Solana app?
- Do you audit smart contracts, mobile apps, backend services, and infrastructure?
- What's your process: threat modeling → test generation → manual review → follow-ups?
- What tools do you use? Internal vs. open-source?

**AI & Automation:**
- Do you use AI agents for our stack (React Native, TypeScript, Solana)?
- How reusable is the QAN-nondeterministic-AI-agent for other environments?
- What training data/architecture do you use for AI agents?
- How do you handle false positives with AI-generated tests?

**Formal Verification:**
- When do you use formal verification vs. fuzzing vs. manual analysis?
- Do you support Solidity, Rust, Go, TypeScript?
- What's the cost/time trade-off for formal verification?

### 2. Web3-Specific Concerns

**Solana Security:**
- How do you audit Solana transaction signing and wallet security?
- What's your approach to testing private key storage (Keychain, SecureStore, encrypted Firebase)?
- Do you test for replay attacks, transaction hash collisions, and blockhash expiration?
- How do you verify split wallet encryption and participant access controls?

**Blockchain Security:**
- How do you audit on-chain vs. off-chain security?
- What's your approach to testing transaction validation?
- How do you verify wallet key derivation and storage?

### 3. Mobile App Security

**React Native Security:**
- Do you audit React Native apps for:
  - Secure storage implementations
  - Biometric authentication flows
  - API key exposure in app bundles
  - Deep linking security
  - Certificate pinning
- How do you test for secrets in compiled app bundles?
- What's your approach to testing native module security?

### 4. Deliverables & Transparency

**Audit Reports:**
- What's included in audit reports? (test cases, code paths, stack traces, fuzz inputs?)
- Do you provide remediation guidance with code examples?
- Will we get access to internal tools/test harnesses?
- Do you publish audit reports publicly (if we choose)?

**Open Source:**
- What tools are open-source vs. proprietary?
- Can we get access to test cases and fuzz inputs?
- Do you provide CI/CD integration for continuous testing?

### 5. Compliance & Certification

**Regulatory Alignment:**
- How do your assessments map to regulations (MiCA, DORA, GDPR)?
- Do you provide artifacts for auditors/regulators?
- Are you certified (CCSS, ISO, CREST)? What level of assurance?

**Compliance Artifacts:**
- What documentation do you provide for compliance?
- Do you help with regulatory submissions?
- Can you provide ongoing compliance monitoring?

### 6. Post-Audit Support

**Continuous Monitoring:**
- Do you provide continuous monitoring or alerting for new threats?
- How do you verify fixes/follow-ups? (Regression tests, retests?)
- What's your retest process after remediation?

**Ongoing Support:**
- Do you offer ongoing security monitoring?
- What's included in post-audit support?
- How do you handle new vulnerabilities discovered post-audit?

### 7. Cost & Timeline

**Pricing:**
- What's the typical cost range for an audit of our scope?
- Do you offer phased audits (critical issues first, then full audit)?
- What's included in the base price vs. add-ons?

**Timeline:**
- What's the typical timeline? (2-4 weeks? Longer?)
- How long for critical issues vs. full audit?
- What's the retest timeline after remediation?

### 8. Partnership Model

**Federation Network:**
- If we engage through a regional partner, what's the governance model?
- How is liability/accountability handled across jurisdictions?
- What's the quality assurance process for partner audits?

---

## 📅 Meeting Agenda

### Suggested Structure (50 minutes)

1. **Introduction (5 min)**
   - Brief overview of WeSplit
   - Current security posture summary
   - Why we're seeking an audit

2. **Hacken Capabilities (10 min)**
   - Their services and expertise
   - Recent case studies (QANplatform audit)
   - AI-driven security approach

3. **WeSplit Security Needs (10 min)**
   - React Native + Firebase + Solana stack
   - Critical areas: wallet security, transaction signing, split wallets
   - Compliance requirements (if any)

4. **Audit Scope Discussion (15 min)**
   - What's included in a full audit
   - Timeline and cost estimates
   - Deliverables and reporting
   - Post-audit support

5. **Q&A (10 min)**
   - Technical questions
   - Compliance needs
   - Next steps

---

## 📚 Quick Reference

### Key Files to Reference
- `SECURITY.md` - Current security status
- `CRITICAL_SECURITY_ALERT.md` - Resolved issues (shows proactive approach)
- `config/deployment/firestore.rules` - Database security rules
- `src/services/security/secureVault.ts` - Wallet security implementation
- `src/services/split/SplitWalletSecurity.ts` - Split wallet encryption
- `services/firebase-functions/src/transactionSigningService.js` - Transaction security
- `services/backend/middleware/security.js` - Backend security

### Security Metrics
- **Production Vulnerabilities:** 3 (isolated to dependency)
- **Development Vulnerabilities:** 7 (dev tools only)
- **Secret Exposure Issues:** 5 (all resolved)
- **Security Measures:** 6 major categories implemented
- **Risk Level:** LOW

### Talking Points
1. ✅ Proactive security: Resolved critical secret exposure issues
2. ✅ Defense in depth: Multiple layers (Firestore rules + application code + encryption)
3. ✅ Secure wallet handling: Biometric auth, encrypted storage, proper key management
4. ✅ Transaction security: Hash tracking, rate limiting, validation
5. ✅ Regular security monitoring: Automated npm audits, security scripts

---

## 📝 Meeting Notes Template

### Attendees
- [ ] Hacken: _______________
- [ ] WeSplit: _______________

### Key Discussion Points
1. 
2. 
3. 

### Decisions Made
- 
- 

### Next Steps
- [ ] 
- [ ] 

### Follow-up Items
- [ ] 
- [ ] 

---

**Last Updated:** January 2025  
**Document Owner:** Security Team  
**Next Review:** After meeting
