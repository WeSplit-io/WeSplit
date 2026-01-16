# 🔐 WeSplit Codebase Security Summary

**Technical security details for audit preparation**

---

## 📊 Security Status Overview

### Vulnerability Summary
- **Production Vulnerabilities:** 3 high-severity (isolated to `@solana/spl-token` dependency)
- **Development Vulnerabilities:** 7 high-severity (dev tools only: Lighthouse CI, Puppeteer)
- **Risk Level:** LOW
- **Last Audit:** November 29, 2025
- **Next Scheduled Audit:** December 6, 2025

### Security Resolution History
- **Before:** 15 high-severity vulnerabilities total
- **After:** 3 high-severity vulnerabilities (isolated to dependency)
- **Solution:** Hybrid secure token utilities with safe @solana/spl-token functions

---

## 🛡️ Security Architecture

### 1. Secure Vault System

**Location:** `src/services/security/secureVault.ts`

**Implementation:**
- **Encryption:** AES-256-GCM
- **Storage:** Keychain (iOS) + MMKV (Android) with SecureStore fallback
- **Authentication:** Biometric (Face ID/Touch ID/fingerprint) or device passcode
- **Cache:** 30-minute authentication cache with proactive refresh

**Security Features:**
- Private keys never stored in plaintext
- Encryption key derived from device Keychain
- Request deduplication to prevent multiple biometric prompts
- Automatic cache expiration
- SecureStore fallback for Expo Go (no biometrics required)

**Key Functions:**
- `secureVault.store(userId, name, value)` - Encrypt and store
- `secureVault.get(userId, name)` - Retrieve and decrypt
- `secureVault.preAuthenticate()` - Pre-authenticate before operations
- `secureVault.batchStore()` - Batch operations with single auth

**Security Considerations:**
- Keychain unavailable detection (Expo Go)
- Concurrent access prevention
- Result caching to prevent duplicate reads

---

### 2. Split Wallet Security

**Location:** `src/services/split/SplitWalletSecurity.ts`

**Implementation:**
- **Encryption:** AES-256-CBC
- **Key Derivation:** HMAC-SHA256 (v2, ~100x faster than PBKDF2)
- **Storage:** Firebase (encrypted) + Local SecureStore (Fair splits)
- **Access Control:** Participant-based for Degen splits, creator-only for Fair splits

**Security Features:**
- Private keys encrypted before Firebase storage
- Participant verification before decryption
- Migration from plaintext to encrypted format
- In-memory cache with 5-minute TTL
- Encrypted payload cache (10-minute TTL)

**Key Functions:**
- `storeSplitWalletPrivateKeyForAllParticipants()` - Store encrypted key in Firebase
- `getSplitWalletPrivateKey()` - Retrieve and decrypt (with participant check)
- `encryptPrivateKey()` - AES-256-CBC encryption
- `decryptEncryptedPrivateKey()` - Decryption with format detection

**Encryption Details:**
- **Algorithm:** AES-256-CBC
- **Key Derivation:** HMAC-SHA256 (passphrase: `baseSecret:splitWalletId`)
- **IV:** Random 16 bytes
- **Salt:** Random 16 bytes
- **Padding:** PKCS7

**Security Considerations:**
- Base64 vs. UTF8 format detection
- Control character removal
- Format validation (base64, JSON array, hex)

---

### 3. Transaction Signing Service

**Location:** `services/firebase-functions/src/transactionSigningService.js`

**Implementation:**
- **Validation:** Transaction structure, fee payer, blockhash, signatures
- **Rate Limiting:** Transaction hash-based (Firestore)
- **Hash Tracking:** Prevents duplicate signing/replay attacks
- **Blockhash Validation:** On-chain validation before signing

**Security Features:**
- Transaction hash tracking (prevents duplicates)
- Rate limiting (transaction-based, not user-based)
- Blockhash expiration check
- Company wallet signature verification
- User signature verification before company signature

**Key Functions:**
- `addCompanySignature()` - Add company signature to transaction
- `validateTransaction()` - Validate transaction before signing
- `checkTransactionHash()` - Prevent duplicate signing
- `checkRateLimit()` - Rate limiting check

**Security Considerations:**
- Timeout handling (5 seconds for hash check, 500ms for rate limit)
- Non-blocking rate limit checks
- Transaction hash prefix for rate limiting

---

### 4. Firestore Security Rules

**Location:** `config/deployment/firestore.rules`

**Implementation:**
- **Authentication:** Required for all operations
- **Access Control:** User-based, participant-based, creator-based
- **Collections:** Granular rules per collection

**Key Rules:**
- **Users:** Authenticated read, own document write
- **Split Wallets:** Authenticated read/write (participant check in app code)
- **Split Wallet Private Keys:** Authenticated read/write (participant check + encryption)
- **Transactions:** Sender/recipient read, sender write
- **API Keys:** Admin-only (server-side only)
- **Rate Limits:** Admin-only (server-side only)

**Security Features:**
- Defense in depth (rules + application code)
- No public access to sensitive data
- Proper user ownership verification
- Encrypted private keys require auth + participant check

**Security Considerations:**
- Nested array checks (participants) handled in application code
- Complex queries require application-level validation
- Admin collections blocked from client access

---

### 5. Backend Security Middleware

**Location:** `services/backend/middleware/security.js`

**Implementation:**
- **Rate Limiting:** General (100/15min), Auth (5/15min), Strict (10/15min)
- **Security Headers:** Helmet.js
- **CORS:** Configurable origins
- **Authentication:** JWT token verification
- **Input Validation:** Email, numeric, required fields
- **Sanitization:** XSS prevention

**Security Features:**
- Rate limiting per IP
- Security headers (CSP, HSTS, etc.)
- CORS origin validation
- JWT token verification
- Input sanitization (script tags, javascript:, event handlers)
- Email domain blocking (temp mail services)

**Security Considerations:**
- Rate limiting uses IP (can be bypassed with proxies)
- CORS allows localhost in development
- Email validation is basic (regex-based)

---

### 6. Device Fingerprinting

**Location:** `src/services/security/deviceFingerprintService.ts`

**Implementation:**
- **Fingerprint:** Device ID + platform + app version
- **Storage:** Firebase (user document)
- **Verification:** Compare stored vs. current fingerprint

**Security Features:**
- Device fingerprinting for security
- Stored in Firebase user document
- Verification on login/transactions

**Security Considerations:**
- Fingerprint can be spoofed
- Used for additional security layer, not primary authentication

---

## 🔒 Secret Management

### Current Secret Storage

**Firebase Functions Secrets:**
- `COMPANY_WALLET_SECRET_KEY` - Company wallet private key
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `TWITTER_CLIENT_SECRET` - Twitter OAuth secret
- `MOONPAY_SECRET_KEY` - MoonPay API secret
- `MOONPAY_WEBHOOK_SECRET` - MoonPay webhook secret

**EAS Environment Variables (Public Only):**
- `EXPO_PUBLIC_FIREBASE_*` - Firebase public config
- `EXPO_PUBLIC_PHANTOM_APP_ID` - Phantom app ID
- `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` - Public wallet address
- `EXPO_PUBLIC_HELIUS_API_KEY` - RPC API key (public is OK)

### Secret Rotation History
- ✅ Company wallet private key rotated
- ✅ Google OAuth client secret rotated
- ✅ Twitter OAuth client secret rotated
- ✅ MoonPay secret key rotated
- ✅ MoonPay webhook secret rotated

---

## 🔍 Security Testing

### Automated Security Checks

```bash
# Check all vulnerabilities
npm run security:audit

# Check production vulnerabilities only
npm run security:audit:prod

# Quick security verification
npm run security:check
```

### Security Monitoring
- Weekly dependency updates
- Monthly security audits
- Critical vulnerability alerts monitored
- Automated npm audits

---

## 📋 Security Checklist

### Code Security ✅
- [x] No dangerous execution patterns
- [x] No hardcoded secrets
- [x] Proper environment variable usage
- [x] Secure wallet key handling
- [x] Hybrid secure token utilities

### Firebase Security ✅
- [x] Authentication required
- [x] Granular access control
- [x] Secure Firestore rules
- [x] Encrypted private key storage

### Network Security ✅
- [x] HTTPS-only communications
- [x] API key management
- [x] Input validation and sanitization
- [x] Rate limiting
- [x] CORS configuration

### Wallet Security ✅
- [x] Secure vault with biometric auth
- [x] AES-256-GCM encryption
- [x] Keychain + MMKV storage
- [x] Split wallet encryption
- [x] Device fingerprinting

### Transaction Security ✅
- [x] Transaction hash tracking
- [x] Rate limiting
- [x] Transaction validation
- [x] Company wallet signature verification
- [x] Blockhash validation

### Backend Security ✅
- [x] Helmet.js security headers
- [x] JWT authentication
- [x] Input sanitization
- [x] Email validation
- [x] Numeric input validation

---

## 🚨 Incident Response

### Process
1. Immediately assess impact and risk level
2. Apply patches or workarounds within 24 hours for critical issues
3. Notify users if user data is affected
4. Update security documentation

### Contact
- **Security Email:** security@wesplit.com

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `SECURITY.md` | Current security status |
| `CRITICAL_SECURITY_ALERT.md` | Resolved secret exposure issues |
| `config/deployment/firestore.rules` | Database security rules |
| `src/services/security/secureVault.ts` | Wallet security implementation |
| `src/services/split/SplitWalletSecurity.ts` | Split wallet encryption |
| `services/firebase-functions/src/transactionSigningService.js` | Transaction security |
| `services/backend/middleware/security.js` | Backend security middleware |
| `.github/security.yml` | Security configuration |

---

**Last Updated:** January 2025  
**Document Owner:** Security Team
