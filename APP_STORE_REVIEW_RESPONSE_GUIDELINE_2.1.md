# App Store Review Response - Guideline 2.1

**App Name:** WeSplit  
**Bundle ID:** com.wesplit.app  
**Review ID:** [Your Review ID from App Store Connect]  
**Issue:** Guideline 2.1 - Information Needed (Cryptocurrency Exchange Services)

---

## Clarification: WeSplit is NOT a Cryptocurrency Exchange Service

Dear App Review Team,

Thank you for your review. We would like to clarify that **WeSplit is not a cryptocurrency exchange service** and does not fall under App Review Guideline 3.1.5(iii). WeSplit is a **bill-splitting and expense management application** that allows users to split expenses with friends and settle payments using cryptocurrency they already own.

---

## App Functionality Overview

**WeSplit** enables users to:
- Create expense groups and split bills (meals, trips, shared expenses)
- Settle payments using cryptocurrency (Solana/USDC) from their existing wallets
- Manage group expenses transparently and efficiently

**WeSplit does NOT:**
- Facilitate the purchase, sale, or exchange of cryptocurrency for fiat currency
- Provide cryptocurrency exchange services
- Act as a financial intermediary or money transmitter
- Require MSB registration (we are not a money services business)

---

## Deposit Functionality (How Users Add Funds)

**Method:** Users can only deposit cryptocurrency by receiving transfers from external wallets.

**Process:**
1. Users share their wallet address (via QR code or text)
2. They receive cryptocurrency transfers from external wallets (Phantom, Solflare, etc.)
3. Users must already possess cryptocurrency in external wallets to use the app

**No On-Ramp Functionality:**
- The app does not allow users to buy cryptocurrency with fiat currency
- MoonPay integration exists in code but is **disabled** and shows "Coming Soon" message
- Users cannot purchase cryptocurrency through our app
- No credit/debit card processing for cryptocurrency purchases

**Evidence:**
- In-app deposit screen shows "Credit/Debit Card - Coming soon - Feature in development"
- MoonPay button is disabled with alert message: "Credit/Debit card funding via MoonPay is currently unavailable"
- Only active deposit method is "Crypto Transfer" (receiving from external wallets)

---

## Withdrawal Functionality (How Users Remove Funds)

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

---

## Currency Conversion Feature

**Purpose:** Display and calculation only (similar to a currency converter)

The app includes a `convertFiatToUSDC` function that:
- Converts fiat currency amounts to USDC equivalent for expense splitting calculations
- Displays exchange rates for informational purposes
- Does NOT facilitate actual exchange transactions
- Users cannot buy, sell, or exchange cryptocurrency through this feature

**Analogy:** Similar to a currency converter app showing USD to EUR rates - it displays information but does not facilitate actual currency exchange.

---

## Compliance Statement

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

---

## Technical Implementation Details

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

---

## Comparison to Similar Apps

**WeSplit is similar to:**
- Venmo or Cash App (but uses cryptocurrency instead of fiat)
- Splitwise (but with cryptocurrency settlements)
- Group expense management apps

**WeSplit is NOT similar to:**
- Coinbase, Binance, or other cryptocurrency exchanges
- Cryptocurrency trading platforms
- Fiat-to-crypto on-ramp services
- Crypto-to-fiat off-ramp services

---

## Conclusion

**WeSplit falls outside the scope of App Review Guideline 3.1.5(iii)** as we do not provide cryptocurrency exchange services. The app is a **utility application for expense management** using cryptocurrency as a settlement method, similar to how Venmo uses traditional currency.

**Key Points:**
1. ✅ Users must already own cryptocurrency (no on-ramp)
2. ✅ Users can only withdraw to crypto wallets (no off-ramp)
3. ✅ No fiat currency transactions
4. ✅ No exchange services provided
5. ✅ No MSB registration required

We respectfully request that our app be reviewed under **standard app review guidelines for social/utility applications** rather than cryptocurrency exchange guidelines.

---

## Additional Information

If you need any additional clarification or have questions about our app's functionality, please do not hesitate to contact us. We are committed to full transparency and compliance with App Store guidelines.

**Contact Information:**
- Email: wesplit.io@gmail.com
- App Website: https://wesplit.io

Thank you for your consideration.

---

**Prepared by:** WeSplit Development Team  
**Date:** [Current Date]  
**App Version:** 1.1.2
