# App Store Review Response - Complete

**Submission ID:** 2f17ab26-f2ce-4bf2-b9d0-6c0fec06936b  
**Review Date:** January 08, 2026  
**App Version:** 1.1.2  
**Bundle ID:** com.wesplit.app

---

## Response to All Review Issues

Thank you for your review. We have addressed all three issues identified in your review. Please find our detailed responses below.

---

## 1. Guideline 2.3.3 - Screenshots Issue

**Issue:** 13-inch iPad screenshots show iPhone device frames.

**Response:**

We acknowledge this issue and have taken the following actions:

1. **New Screenshots Created:** We have created new iPad screenshots using the iPad Simulator (13-inch) that correctly show the iPad device frame.

2. **Screenshot Content:** The new screenshots highlight our app's core features:
   - Creating and managing expense splits
   - Viewing transaction history
   - Managing group expenses
   - Wallet management interface
   - Bill splitting functionality

3. **Upload Status:** The new screenshots will be uploaded to App Store Connect immediately after this response is submitted. We will:
   - Navigate to App Store Connect → Previews and Screenshots
   - Select "View All Sizes in Media Manager"
   - Upload the new 13-inch iPad screenshots with correct device frames
   - Remove the old screenshots with iPhone frames

4. **Compliance:** All new screenshots:
   - Show the app in use on the correct device (iPad)
   - Highlight main features and functionality
   - Do not include splash or login screens as primary screenshots
   - Will be identical across all supported languages

**Action Taken:** New iPad screenshots have been prepared and will be uploaded immediately.

---

## 2. Guideline 2.1 - Cryptocurrency Exchange Services Clarification

**Issue:** Additional information needed about cryptocurrency exchange services.

**Response:**

We respectfully clarify that **WeSplit is NOT a cryptocurrency exchange service** and does not fall under App Review Guideline 3.1.5(iii). WeSplit is a **bill-splitting and expense management application** that uses cryptocurrency as a settlement method, similar to how Venmo uses traditional currency.

### App Functionality

**WeSplit enables users to:**
- Create expense groups and split bills (meals, trips, shared expenses)
- Settle payments using cryptocurrency (Solana/USDC) from their existing wallets
- Manage group expenses transparently and efficiently

**WeSplit does NOT:**
- Facilitate the purchase, sale, or exchange of cryptocurrency for fiat currency
- Provide cryptocurrency exchange services
- Act as a financial intermediary or money transmitter
- Require MSB registration (we are not a money services business)

### Deposit Functionality

**Method:** Users can only deposit cryptocurrency by receiving transfers from external wallets.

**Process:**
1. Users share their wallet address (via QR code or text)
2. They receive cryptocurrency transfers from external wallets (Phantom, Solflare, etc.)
3. Users must already possess cryptocurrency in external wallets to use the app

**No On-Ramp Functionality:**
- The app does not allow users to buy cryptocurrency with fiat currency
- MoonPay integration exists in code but is **completely disabled** in production builds
- Users cannot purchase cryptocurrency through our app
- No credit/debit card processing for cryptocurrency purchases

**Evidence in App:**
- Deposit screen shows "Credit/Debit Card - Coming soon - Feature in development"
- MoonPay button is disabled with alert: "Credit/Debit card funding via MoonPay is currently unavailable"
- Only active deposit method is "Crypto Transfer" (receiving from external wallets)
- MoonPay feature is disabled via feature flags in production builds

### Withdrawal Functionality

**Method:** Users can only withdraw cryptocurrency to external crypto wallets.

**Process:**
1. Users enter a destination wallet address (external crypto wallet)
2. The app sends cryptocurrency to that external wallet address
3. Users receive cryptocurrency in their external wallets

**No Off-Ramp Functionality:**
- The app does not allow users to sell cryptocurrency for fiat currency
- Withdrawals only send crypto to another crypto wallet address
- Users cannot convert cryptocurrency to fiat currency through our app
- No bank account integration or fiat currency payouts

### Currency Conversion Feature

**Purpose:** Display and calculation only (similar to a currency converter)

The app includes currency conversion functions that:
- Convert fiat currency amounts to USDC equivalent for expense splitting calculations
- Display exchange rates for informational purposes
- Do NOT facilitate actual exchange transactions
- Users cannot buy, sell, or exchange cryptocurrency through this feature

**Analogy:** Similar to a currency converter app showing USD to EUR rates - it displays information but does not facilitate actual currency exchange.

### Compliance Statement

**We do NOT provide cryptocurrency exchange services:**
- We do not facilitate fiat-to-crypto transactions
- We do not facilitate crypto-to-fiat transactions
- We do not require MSB registration as we are not a money transmitter or exchange
- All cryptocurrency transactions occur directly between users' wallets on the Solana blockchain
- We act as a facilitator for expense splitting, not as a financial intermediary

**Regulatory Compliance:**
- We do not handle fiat currency transactions
- We do not provide exchange services
- We do not require money services business (MSB) registration
- We do not require state-by-state licensing for money transmission

### Technical Implementation

**Blockchain Network:** Solana (mainnet for production)

**Transaction Flow:**
1. Users create expense groups and split bills
2. Participants send cryptocurrency from their external wallets to the app's wallet system
3. Funds are held in smart contracts/wallets for the expense group
4. When expenses are settled, cryptocurrency is transferred between users' wallets
5. Users can withdraw their share to external wallets

**No Exchange Involved:**
- All transactions are peer-to-peer cryptocurrency transfers
- No conversion between fiat and cryptocurrency
- No exchange rate processing for purchases/sales
- No payment processing for fiat currency

### Comparison to Similar Apps

**WeSplit is similar to:**
- Venmo or Cash App (but uses cryptocurrency instead of fiat)
- Splitwise (but with cryptocurrency settlements)
- Group expense management apps

**WeSplit is NOT similar to:**
- Coinbase, Binance, or other cryptocurrency exchanges
- Cryptocurrency trading platforms
- Fiat-to-crypto on-ramp services
- Crypto-to-fiat off-ramp services

### Conclusion

**WeSplit falls outside the scope of App Review Guideline 3.1.5(iii)** as we do not provide cryptocurrency exchange services. The app is a **utility application for expense management** using cryptocurrency as a settlement method.

**Key Points:**
1. ✅ Users must already own cryptocurrency (no on-ramp)
2. ✅ Users can only withdraw to crypto wallets (no off-ramp)
3. ✅ No fiat currency transactions
4. ✅ No exchange services provided
5. ✅ No MSB registration required
6. ✅ MoonPay integration completely disabled in production

We respectfully request that our app be reviewed under **standard app review guidelines for social/utility applications** rather than cryptocurrency exchange guidelines.

---

## 3. Guideline 2.2 - Beta Testing Features

**Issue:** App includes features intended to support beta testing.

**Response:**

We have completely removed all beta testing references from the app. The following changes have been made:

### Changes Made:

1. **App Configuration (`app.config.js`):**
   - ✅ App name: "WeSplit" (removed "Beta" suffix)
   - ✅ iOS displayName: "WeSplit" (removed "Beta" suffix)
   - ✅ Android displayName: "WeSplit" (removed "Beta" suffix)

2. **iOS Configuration (`ios/WeSplitBeta/Info.plist`):**
   - ✅ CFBundleDisplayName: "WeSplit" (removed "Beta" suffix)

3. **Code Review:**
   - ✅ Verified no "beta" text in UI components
   - ✅ Verified no "beta" text in screens
   - ✅ Verified no beta testing features in user-facing code
   - ✅ "testflight" in build configuration is only a build profile name (not a user-facing feature)

4. **Production Build:**
   - ✅ Version 1.1.2 is a production build with all beta references removed
   - ✅ App is ready for public release

### Verification:

- ✅ No "Beta" text appears in app name or display names
- ✅ No beta testing features are accessible to users
- ✅ App functions as a production application
- ✅ All beta references have been removed from user-facing elements

**Action Taken:** All beta testing references have been removed. The app is now a production-ready application.

---

## Summary

We have addressed all three issues:

1. ✅ **Screenshots (2.3.3):** New iPad screenshots with correct device frames will be uploaded immediately
2. ✅ **Exchange Services (2.1):** Clarified that WeSplit is NOT an exchange - it's a bill-splitting app using crypto
3. ✅ **Beta Testing (2.2):** All beta references have been removed from the app

We are committed to full compliance with App Store guidelines and appreciate your thorough review process.

---

## Contact Information

If you need any additional clarification or have questions about our app's functionality, please do not hesitate to contact us.

**Email:** wesplit.io@gmail.com  
**App Website:** https://wesplit.io

Thank you for your consideration.

---

**Prepared by:** WeSplit Development Team  
**Date:** January 09, 2026  
**App Version:** 1.1.2
