# 🎯 Hacken Security Audit - 15 Minute Call Guide

**Time:** 15 minutes  
**Goal:** Determine if Hacken is a good fit and get initial scope/cost estimate

---

## ⏱️ Call Structure (15 minutes)

### 1. Introduction & Project Overview (3 min)
### 2. Hacken Capabilities (2 min - let them speak)
### 3. Our Security Needs (3 min)
### 4. Critical Questions (5 min)
### 5. Next Steps (2 min)

---

## 📋 1. PROJECT OVERVIEW (3 minutes)

### WeSplit - What We Do
**WeSplit is a mobile payment app built on Solana that enables users to split bills and expenses using USDC.**

**Tech Stack:**
- **Frontend:** React Native (iOS/Android)
- **Backend:** Firebase (Functions, Firestore)
- **Blockchain:** Solana (USDC transactions)
- **Key Features:**
  - User wallets (Solana keypairs)
  - Split wallets (shared multi-sig wallets)
  - Transaction signing service
  - Biometric authentication (Face ID/Touch ID)

### Current Security Status
- ✅ **Production:** 3 high-severity vulnerabilities (isolated to dependency)
- ✅ **Secrets:** All critical secrets resolved and secured
- ✅ **Risk Level:** LOW
- ✅ **Security Measures:** 6 major categories implemented

### Why We Need an Audit
- **Critical Areas:**
  1. Split wallet encryption (AES-256-CBC, participant access)
  2. Transaction signing service (company wallet, hash tracking)
  3. Secure vault (biometric auth, keychain storage)
  4. Firestore security rules (complex access control)

---

## 🎤 2. LET HACKEN SPEAK (2 minutes)

**Ask:** "Can you briefly walk us through how you'd approach an audit for a React Native + Firebase + Solana stack like ours?"

**Listen for:**
- Experience with similar stacks
- Methodology adaptation
- Timeline estimates
- Team expertise

---

## 🎯 3. OUR SECURITY NEEDS (3 minutes)

### Critical Areas to Audit

**1. Split Wallet Security**
- AES-256-CBC encryption with HMAC key derivation
- Participant-based access control
- Firebase storage of encrypted private keys
- **Question:** How would you test encryption strength and access controls?

**2. Transaction Signing Service**
- Company wallet signature flow
- Transaction hash tracking (prevents replay attacks)
- Rate limiting (Firestore-based)
- Blockhash validation
- **Question:** How do you test for replay attacks and transaction security?

**3. Secure Vault (Mobile)**
- Biometric authentication (Face ID/Touch ID)
- Keychain + MMKV storage
- AES-256-GCM encryption
- **Question:** How do you audit React Native secure storage implementations?

**4. Firestore Security Rules**
- Complex nested array checks (participants)
- User ownership verification
- Admin-only collections
- **Question:** How do you test Firestore rules for edge cases?

---

## ❓ 4. CRITICAL QUESTIONS (5 minutes)

### Question 1: Stack-Specific Experience (1 min)
**"Have you audited React Native + Firebase + Solana apps before? Can you share anonymized examples or case studies?"**

**Why:** Need to know if they have relevant experience.

---

### Question 2: Audit Scope & Timeline (1 min)
**"For our scope (mobile app + backend + Solana integration), what's a realistic timeline and cost estimate?"**

**Why:** Need practical numbers for planning.

---

### Question 3: Post-Audit Support (1 min)
**"What's included in post-audit support? How does Extractor work for our stack, and what's the retest process after remediation?"**

**Why:** Need to understand ongoing support and remediation verification.

---

### Question 4: Critical Security Testing (1 min)
**"How would you specifically test our split wallet encryption, transaction hash tracking, and biometric authentication flows?"**

**Why:** Need to know their approach to our critical features.

---

### Question 5: Deliverables & Next Steps (1 min)
**"Beyond the standard report, what deliverables do we get? What's the process to get started?"**

**Why:** Need to understand what we'll receive and how to proceed.

---

## ✅ 5. NEXT STEPS (2 minutes)

### If They're a Good Fit:
- [ ] Request detailed proposal/quote
- [ ] Ask for case studies similar to our project
- [ ] Schedule follow-up call for detailed discussion
- [ ] Request timeline for audit start

### Information to Collect:
- [ ] Contact person for follow-up
- [ ] Email for proposal
- [ ] Timeline estimate
- [ ] Cost range (if provided)

---

## 📝 QUICK NOTES TEMPLATE

**Hacken Contact:**
- Name: _______________
- Email: _______________
- Phone: _______________

**Key Takeaways:**
1. 
2. 
3. 

**Timeline Estimate:**
- 

**Cost Estimate:**
- 

**Next Steps:**
- [ ] 
- [ ] 

---

## 🚨 REMINDERS

✅ **DO:**
- Keep it concise (15 minutes)
- Focus on critical questions only
- Let them speak about their capabilities
- Take notes on timeline/cost
- Ask for follow-up materials

❌ **DON'T:**
- Ask basic questions (they're on hacken.io)
- Go into deep technical details (save for follow-up)
- Discuss pricing in detail (get estimate only)
- Try to cover everything (focus on fit)

---

## 📚 Reference Documents

- **Full Prep:** `MEETING_PREPARATION.md`
- **All Questions:** `QUESTIONS_FOR_HACKEN.md`
- **Quick Facts:** `QUICK_REFERENCE.md`
- **What NOT to Ask:** `HACKEN_PUBLIC_INFO.md`

---

**Good luck with your call! 🚀**
