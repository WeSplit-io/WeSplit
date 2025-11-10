# Company Wallet Security Audit

**Date:** 2024-12-19  
**Scope:** Security audit of company wallet implementation across the WeSplit application  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Executive Summary

The company wallet is used throughout the application for:
1. **Fee Collection**: Collecting transaction fees from users
2. **Gas Fee Payment**: Paying SOL gas fees for all transactions
3. **Premium Payments**: Receiving premium subscription payments

**Critical Finding:** The company wallet secret key is exposed in the client-side application bundle, making it accessible to anyone who can inspect the app. This is a **CRITICAL SECURITY VULNERABILITY** that could lead to complete loss of company funds.

---

## 🔴 CRITICAL Security Issues

### 1. Company Wallet Secret Key Exposed in Client-Side Code

**Location:** Multiple files
- `src/config/constants/feeConfig.ts` (line 123)
- `app.config.js` (line 143)
- `src/config/env.ts` (line 61)

**Issue:**
The company wallet secret key is stored in environment variables with the `EXPO_PUBLIC_` prefix, which means it's bundled into the client-side application. Anyone who can:
- Inspect the app bundle
- Use React Native debugging tools
- Decompile the app
- Access the JavaScript bundle

...can extract the full secret key and gain complete control over the company wallet.

**Evidence:**
```typescript
// src/config/constants/feeConfig.ts:123
export const COMPANY_WALLET_CONFIG = {
  address: getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS'),
  secretKey: getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY'), // ⚠️ EXPOSED
  // ...
};
```

**Impact:**
- **Complete wallet compromise**: Attacker can drain all funds from company wallet
- **Unauthorized fee collection**: Attacker can redirect fees to their own wallet
- **Transaction manipulation**: Attacker can sign transactions on behalf of the company
- **Service disruption**: Attacker can drain SOL reserves, preventing gas fee payments

**Recommendation:**
1. **IMMEDIATE ACTION**: Rotate the company wallet secret key if it's currently in use
2. Move all secret key operations to backend services only
3. Use a backend API endpoint for fee payer signatures
4. Never store secret keys in client-side code

---

### 2. Secret Key Logging (Partial Exposure)

**Location:**
- `src/services/blockchain/transaction/sendInternal.ts` (lines 550-554)
- `src/services/blockchain/transaction/sendExternal.ts` (lines 566-572)

**Issue:**
The code logs partial secret key information, which could be used to identify or partially reconstruct the key.

**Evidence:**
```typescript
// sendInternal.ts:550-554
logger.info('Processing company wallet secret key', {
  secretKeyLength: COMPANY_WALLET_CONFIG.secretKey.length,
  secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey.substring(0, 10) + '...', // ⚠️ EXPOSES FIRST 10 CHARS
  secretKeyFormat: 'base64'
}, 'InternalTransferService');
```

```typescript
// sendExternal.ts:568
secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey.substring(0, 20) + '...', // ⚠️ EXPOSES FIRST 20 CHARS
```

**Impact:**
- Logs may be accessible to unauthorized parties
- Partial key information could aid in key reconstruction
- Log aggregation services may store this sensitive data

**Recommendation:**
1. Remove all secret key logging (even partial)
2. Only log that a secret key exists (boolean check)
3. Implement log sanitization to prevent accidental secret key exposure

---

### 3. Hardcoded Fallback Wallet Address

**Location:** `src/screens/Settings/Premium/PremiumScreen.tsx` (line 115)

**Issue:**
A hardcoded wallet address is used as a fallback, which could be exploited if the environment variable is not set.

**Evidence:**
```typescript
// PremiumScreen.tsx:115
const companyWalletAddress = process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS || 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
```

**Impact:**
- If environment variable is missing, payments go to hardcoded address
- Hardcoded address may be a test/dev wallet
- No validation that the address is correct

**Recommendation:**
1. Remove hardcoded fallback
2. Add validation that company wallet address is configured
3. Show error to user if wallet address is not configured

---

## 🟠 HIGH Security Issues

### 4. Secret Key Processing in Multiple Formats

**Location:**
- `src/services/blockchain/transaction/sendInternal.ts` (lines 556-603)
- `src/services/blockchain/transaction/sendExternal.ts` (lines 574-609)

**Issue:**
The code attempts to parse secret keys in multiple formats (comma-separated array, base64, hex), which increases attack surface and potential for parsing errors.

**Evidence:**
```typescript
// sendInternal.ts:560-602
if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
  // Parse as comma-separated array
  const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
  const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
  companySecretKeyBuffer = Buffer.from(keyArray);
} else {
  // Try base64, then hex
  companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
  // ... fallback to hex
}
```

**Impact:**
- Complex parsing logic increases risk of errors
- Multiple formats make it harder to validate input
- Potential for format confusion leading to incorrect key usage

**Recommendation:**
1. Standardize on a single secret key format (base64)
2. Add strict validation for secret key format
3. Reject invalid formats immediately

---

### 5. No Access Control on Company Wallet Operations

**Location:** All transaction services

**Issue:**
There's no access control or authorization checks before using the company wallet secret key. Any code path that can access the config can use the secret key.

**Impact:**
- Malicious code injection could use the secret key
- No audit trail of who/what uses the company wallet
- No rate limiting on company wallet operations

**Recommendation:**
1. Implement access control checks
2. Add audit logging for all company wallet operations
3. Implement rate limiting on company wallet usage
4. Use a backend service with proper authentication

---

### 6. Company Wallet Secret Key in Environment Examples

**Location:**
- `config/environment/env.example` (line 109)
- `config/environment/env.production.example` (line 73)

**Issue:**
Example files show where the secret key should be stored, which could help attackers identify the location.

**Impact:**
- Low impact, but best practice is to not show secret key locations in examples

**Recommendation:**
1. Use placeholder text that doesn't reveal the variable name pattern
2. Add comments warning about security

---

## 🟡 MEDIUM Security Issues

### 7. Secret Key Validation Not Comprehensive

**Location:** Multiple transaction services

**Issue:**
Secret key validation only checks length (64 or 65 bytes) but doesn't validate:
- Key format correctness
- Key entropy
- Key derivation from address

**Evidence:**
```typescript
// Only checks length
if (companySecretKeyBuffer.length === 65) {
  companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
} else if (companySecretKeyBuffer.length !== 64) {
  throw new Error(`Invalid secret key length: ${companySecretKeyBuffer.length} bytes`);
}
```

**Recommendation:**
1. Validate that the secret key derives to the correct public key
2. Add entropy checks
3. Validate key format more strictly

---

### 8. No Secret Key Rotation Mechanism

**Location:** Entire codebase

**Issue:**
There's no documented or implemented mechanism for rotating the company wallet secret key.

**Impact:**
- If key is compromised, rotation is difficult
- No way to rotate keys without code changes
- Long-lived keys increase exposure window

**Recommendation:**
1. Implement key rotation mechanism
2. Support multiple keys during rotation period
3. Document rotation procedure

---

### 9. Company Wallet Balance Not Monitored

**Location:** `src/config/constants/feeConfig.ts` (line 234)

**Issue:**
While there's a function to validate company wallet SOL balance, it's not actively monitored or alerted on.

**Evidence:**
```typescript
// feeConfig.ts:234
static async validateCompanyWalletSolBalance(connection: any): Promise<...> {
  // Validation exists but not actively called
}
```

**Impact:**
- Company wallet could run out of SOL, preventing transactions
- No proactive alerts when balance is low
- Service could fail silently

**Recommendation:**
1. Implement active monitoring of company wallet balance
2. Set up alerts when balance falls below threshold
3. Automatically check balance before transactions

---

## 🟢 LOW Security Issues

### 10. Inconsistent Secret Key Handling

**Location:** Multiple services

**Issue:**
Different services handle secret keys slightly differently, leading to potential inconsistencies.

**Recommendation:**
1. Standardize secret key handling across all services
2. Create a shared utility for secret key operations
3. Document the standard format

---

### 11. No Encryption at Rest for Secret Key

**Location:** Environment variables

**Issue:**
Secret key is stored in plain text in environment variables (though this is standard practice, it could be improved).

**Recommendation:**
1. Consider using a secrets management service (AWS Secrets Manager, etc.)
2. Encrypt secret keys in environment files
3. Use hardware security modules (HSM) for production

---

## Backend Service Review

### ✅ Good: Backend Service Exists

**Location:** `services/backend/services/transactionSigningService.js`

**Positive:**
- Backend service exists for transaction signing
- Secret key is loaded server-side only
- Proper initialization and validation

**However:**
- Client-side code still has access to secret key
- Backend service may not be used for all operations

**Recommendation:**
1. **Migrate ALL secret key operations to backend service**
2. Remove secret key from client-side code entirely
3. Use backend API for all fee payer signatures

---

## Recommended Security Improvements

### Immediate Actions (Critical)

1. **🔴 ROTATE COMPANY WALLET SECRET KEY IMMEDIATELY**
   - Generate new wallet
   - Update all environment variables
   - Migrate funds from old wallet
   - Update all references

2. **🔴 REMOVE SECRET KEY FROM CLIENT-SIDE CODE**
   - Remove `EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY` from client bundle
   - Move all secret key operations to backend
   - Use API endpoints for fee payer signatures

3. **🔴 REMOVE SECRET KEY LOGGING**
   - Remove all secret key previews from logs
   - Only log boolean checks (key exists/doesn't exist)
   - Implement log sanitization

### Short-term Actions (High Priority)

4. **Implement Backend API for Fee Payer Signatures**
   - Create authenticated endpoint for transaction signing
   - Client sends unsigned transaction
   - Backend adds company wallet signature
   - Backend returns signed transaction

5. **Add Access Control**
   - Implement authentication for company wallet operations
   - Add audit logging
   - Implement rate limiting

6. **Remove Hardcoded Fallback**
   - Remove hardcoded wallet address
   - Add proper validation
   - Show errors if not configured

### Long-term Actions (Medium Priority)

7. **Implement Key Rotation**
   - Support multiple keys during rotation
   - Document rotation procedure
   - Automate rotation where possible

8. **Add Monitoring**
   - Monitor company wallet balance
   - Set up alerts for low balance
   - Track all company wallet operations

9. **Improve Validation**
   - Validate secret key derives to correct public key
   - Add entropy checks
   - Standardize key format

---

## Architecture Recommendation

### Current Architecture (INSECURE)
```
Client App
  ├── Has company wallet secret key ❌
  ├── Signs transactions directly ❌
  └── Exposes key in bundle ❌
```

### Recommended Architecture (SECURE)
```
Client App
  ├── Only has company wallet address ✅
  ├── Creates unsigned transactions ✅
  └── Sends to backend API ✅
       │
Backend API (Authenticated)
  ├── Has company wallet secret key ✅
  ├── Validates transaction ✅
  ├── Adds company signature ✅
  └── Returns signed transaction ✅
       │
Client App
  └── Submits signed transaction ✅
```

---

## Testing Recommendations

1. **Security Testing**
   - Test that secret key is not in client bundle
   - Test that secret key is not in logs
   - Test that API endpoints require authentication

2. **Penetration Testing**
   - Attempt to extract secret key from app bundle
   - Attempt to intercept secret key in transit
   - Attempt to use secret key without authorization

3. **Code Review**
   - Review all code that accesses company wallet config
   - Ensure no secret keys in client-side code
   - Verify all secret key operations are server-side

---

## Conclusion

The company wallet implementation has **CRITICAL security vulnerabilities** that must be addressed immediately. The most critical issue is the exposure of the company wallet secret key in the client-side application bundle, which could lead to complete loss of company funds.

**Priority Actions:**
1. Rotate company wallet secret key
2. Remove secret key from client-side code
3. Implement backend API for all secret key operations
4. Remove secret key logging

**Estimated Time to Fix Critical Issues:** 2-3 days  
**Estimated Time to Fix All Issues:** 1-2 weeks

---

## References

- Files reviewed:
  - `src/config/constants/feeConfig.ts`
  - `src/services/blockchain/transaction/sendInternal.ts`
  - `src/services/blockchain/transaction/sendExternal.ts`
  - `src/services/split/SplitWalletPayments.ts`
  - `src/screens/Settings/Premium/PremiumScreen.tsx`
  - `app.config.js`
  - `services/backend/services/transactionSigningService.js`

---

**Audit completed by:** AI Security Audit  
**Next review date:** After critical issues are resolved

