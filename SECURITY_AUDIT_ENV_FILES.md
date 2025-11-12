# Environment Files Security Audit

**Date:** 2024-12-19  
**Status:** 🔴 **CRITICAL ISSUES FOUND**

---

## 🔴 Critical Security Issues Found

### 1. OAuth Client Secrets in Client-Side `.env` Files

**Issue:** OAuth client secrets are exposed in client-side environment files with `EXPO_PUBLIC_` prefix, which means they're bundled into the client app.

**Location:**
- `.env` (root): `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=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`
- `.env` (root): `EXPO_PUBLIC_TWITTER_CLIENT_SECRET=jIBIQfwtExp-Ap4x4WKkleqG1SfWKLXdsNscHIS0uZZmQugJSU`
- `.env.production` (root): `EXPO_PUBLIC_TWITTER_CLIENT_SECRET=jIBIQfwtExp-Ap4x4WKkleqG1SfWKLXdsNscHIS0uZZmQugJSU`

**Impact:**
- Client secrets are bundled into the app
- Anyone can extract them from the app bundle
- Can be used to impersonate your OAuth application

**Fix Required:**
- Remove `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` from `.env`
- Remove `EXPO_PUBLIC_TWITTER_CLIENT_SECRET` from `.env` and `.env.production`
- These should only be on backend services

---

### 2. MoonPay Secret Keys in Client-Side `.env` File

**Issue:** MoonPay secret keys are in the client-side `.env` file.

**Location:**
- `.env` (root): 
  - `MOONPAY_SECRET_KEY=sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH`
  - `MOONPAY_WEBHOOK_SECRET=wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL`

**Impact:**
- Secret keys could be accessed if code reads them
- Should only be on backend

**Fix Required:**
- Remove `MOONPAY_SECRET_KEY` from `.env` (should be in `services/backend/.env`)
- Remove `MOONPAY_WEBHOOK_SECRET` from `.env` (should be in `services/backend/.env`)

**Note:** These don't have `EXPO_PUBLIC_` prefix, so they might not be bundled, but they shouldn't be in client-side `.env` files.

---

## ✅ Secure Configurations

### 1. Company Wallet Configuration

**Status:** ✅ **SECURE**

- ✅ No `EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY` in client-side files
- ✅ `COMPANY_WALLET_SECRET_KEY` only in `services/backend/.env`
- ✅ Client-side code properly prevents secret key access
- ✅ All transaction services throw errors instead of using secret key

**Files:**
- `.env`: `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN` ✅
- `.env.production`: `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN` ✅
- `services/backend/.env`: `COMPANY_WALLET_SECRET_KEY=[...]` ✅

---

### 2. Code Implementation

**Status:** ✅ **SECURE**

- ✅ `COMPANY_WALLET_CONFIG` does NOT include `secretKey` property
- ✅ All imports use `COMPANY_WALLET_CONFIG.address` only
- ✅ No code attempts to access `COMPANY_WALLET_CONFIG.secretKey`
- ✅ All transaction services throw errors instead of using secret key

---

## 🔧 Required Fixes

### Fix 1: Remove OAuth Client Secrets from Client-Side Files

**Action:** Remove these lines from `.env` and `.env.production`:
```bash
# Remove from .env
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=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
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=jIBIQfwtExp-Ap4x4WKkleqG1SfWKLXdsNscHIS0uZZmQugJSU

# Remove from .env.production
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=jIBIQfwtExp-Ap4x4WKkleqG1SfWKLXdsNscHIS0uZZmQugJSU
```

**Note:** These should be moved to backend services if needed, but OAuth client secrets are typically not needed in client-side code at all.

---

### Fix 2: Move MoonPay Secrets to Backend

**Action:** 
1. Remove from `.env`:
```bash
MOONPAY_SECRET_KEY=sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH
MOONPAY_WEBHOOK_SECRET=wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL
```

2. Add to `services/backend/.env`:
```bash
MOONPAY_SECRET_KEY=sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH
MOONPAY_WEBHOOK_SECRET=wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL
```

---

## 📋 Verification Checklist

- [ ] Remove `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` from `.env`
- [ ] Remove `EXPO_PUBLIC_TWITTER_CLIENT_SECRET` from `.env`
- [ ] Remove `EXPO_PUBLIC_TWITTER_CLIENT_SECRET` from `.env.production`
- [ ] Remove `MOONPAY_SECRET_KEY` from `.env`
- [ ] Remove `MOONPAY_WEBHOOK_SECRET` from `.env`
- [ ] Add `MOONPAY_SECRET_KEY` to `services/backend/.env`
- [ ] Add `MOONPAY_WEBHOOK_SECRET` to `services/backend/.env`
- [ ] Verify no `EXPO_PUBLIC_*_SECRET*` in any client-side `.env` files
- [ ] Verify `COMPANY_WALLET_SECRET_KEY` only in `services/backend/.env`
- [ ] Verify code doesn't access secrets in client-side

---

**Last Updated:** 2024-12-19

