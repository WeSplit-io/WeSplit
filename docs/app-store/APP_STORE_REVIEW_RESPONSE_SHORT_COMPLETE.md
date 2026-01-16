# App Store Review Response - Short Version (For Review Notes)

**Submission ID:** 2f17ab26-f2ce-4bf2-b9d0-6c0fec06936b  
**Version:** 1.1.2

---

## Response to All Issues

### 1. Guideline 2.3.3 - Screenshots
**Action Taken:** New iPad screenshots with correct device frames have been created and will be uploaded immediately via "View All Sizes in Media Manager" in App Store Connect.

### 2. Guideline 2.1 - Cryptocurrency Exchange Clarification

**WeSplit is NOT a cryptocurrency exchange.** We are a bill-splitting app that uses cryptocurrency for settlements, similar to how Venmo uses traditional currency.

**Key Points:**
- ✅ **No On-Ramp:** Users cannot buy cryptocurrency. MoonPay is completely disabled in production. Users must already own crypto in external wallets.
- ✅ **No Off-Ramp:** Users cannot sell cryptocurrency. Withdrawals only send crypto to external crypto wallets.
- ✅ **No Exchange Services:** We do not facilitate fiat-to-crypto or crypto-to-fiat transactions. All transactions are peer-to-peer crypto transfers on Solana blockchain.
- ✅ **No MSB Required:** We are not a money transmitter or exchange. We facilitate expense splitting, not currency exchange.

**Evidence in App:**
- Deposit screen shows "Credit/Debit Card - Coming soon - Feature in development"
- MoonPay button is disabled with alert: "Credit/Debit card funding via MoonPay is currently unavailable"
- Only active deposit method is "Crypto Transfer" (receiving from external wallets)
- MoonPay feature is disabled via feature flags in production builds

**Conclusion:** WeSplit is a utility app for expense management (like Venmo) but uses cryptocurrency instead of fiat. We request review under standard utility app guidelines, not cryptocurrency exchange guidelines.

### 3. Guideline 2.2 - Beta Testing
**Action Taken:** All beta references have been removed:
- ✅ App name: "WeSplit" (removed "Beta")
- ✅ iOS/Android displayName: "WeSplit" (removed "Beta")
- ✅ Info.plist: CFBundleDisplayName: "WeSplit" (removed "Beta")
- ✅ No beta testing features accessible to users

The app is now production-ready with all beta references removed.

---

**Contact:** wesplit.io@gmail.com
