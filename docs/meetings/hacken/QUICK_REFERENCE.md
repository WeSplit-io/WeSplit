# 🚀 Hacken Meeting - Quick Reference Cheat Sheet

**One-page reference for the meeting**

---

## 🏢 Hacken - Key Facts (Public Info)

- **Founded:** 2017 | **HQ:** Tallinn, Estonia (also Lisbon, Ukraine)
- **Team:** 130+ experts, 60+ certified engineers
- **Track Record:** 1,500+ audits, 4,000+ vulnerabilities found, <1% incident rate
- **Certified:** ISO 27001
- **Methodology:** v3.0 (Oct 2025) - NIST SP 800-115, PTES aligned
- **Timeline:** 5-15 business days (smart contracts)
- **Recent Work:** QANplatform audit (2,800+ tests, 22 high-severity issues)
- **GitHub:** `github.com/hknio` (open-source tools)

---

## 🔐 WeSplit Security Status

### Current State
- ✅ **Production:** 3 high-severity vulnerabilities (isolated to dependency)
- ✅ **Development:** 7 high-severity (dev tools only, not in production)
- ✅ **Secrets:** All critical secrets resolved and secured
- ✅ **Risk Level:** LOW

### Security Measures
1. ✅ Secure vault (biometric auth, AES-256-GCM)
2. ✅ Split wallet encryption (AES-256-CBC, participant access)
3. ✅ Transaction security (hash tracking, rate limiting)
4. ✅ Firestore rules (granular access control)
5. ✅ Backend security (rate limiting, input validation)
6. ✅ Network security (HTTPS, CORS, API key management)

---

## ❓ Top Questions to Ask (Strategic)

> ⚠️ **Don't ask basic questions** - they're on hacken.io. Focus on deeper, tailored questions.

### 1. Stack-Specific Adaptation
- How do you adapt methodology v3.0 for React Native + Firebase + Solana?
- Have you audited similar hybrid Web2-Web3 architectures?

### 2. Post-Audit Support
- How does Extractor work for our stack? What's the SLA?
- What's the retest process and turnaround time after remediation?

### 3. Technical Depth
- False positive rate? How do you handle regression testing?
- How do you detect economic attacks (flash-loan, sandwich)?

### 4. Compliance Evidence
- What format do compliance evidence packages take?
- Have you helped clients with successful regulatory submissions?

### 5. Cost & Timeline (Our Scope)
- Realistic cost estimate for our specific scope?
- Can we prioritize critical areas for faster turnaround?

---

## 📁 Key Files to Reference

| File | Purpose |
|------|---------|
| `SECURITY.md` | Current security status |
| `CRITICAL_SECURITY_ALERT.md` | Resolved issues |
| `config/deployment/firestore.rules` | Database security |
| `src/services/security/secureVault.ts` | Wallet security |
| `src/services/split/SplitWalletSecurity.ts` | Split wallet encryption |

---

## 🎯 Talking Points

### Strengths to Highlight
1. ✅ Proactive security (resolved critical issues)
2. ✅ Defense in depth (multiple security layers)
3. ✅ Secure wallet handling (biometric, encryption)
4. ✅ Transaction security (hash tracking, validation)
5. ✅ Regular monitoring (automated audits)

### Areas to Audit
1. Split wallet encryption implementation
2. Transaction signing service
3. Firestore security rules
4. Secure vault (biometric auth)
5. API key validation

---

## 📊 Security Metrics

- **Production Vulnerabilities:** 3 (low risk)
- **Development Vulnerabilities:** 7 (dev tools only)
- **Secret Exposure Issues:** 5 (all resolved)
- **Security Measures:** 6 major categories
- **Overall Risk:** LOW

---

## 📞 Contact Info

- **Security Email:** security@wesplit.com
- **Hacken Website:** hacken.io
- **Hacken GitHub:** github.com/hknio

---

**Quick Access:** `docs/meetings/hacken/MEETING_PREPARATION.md` for full details
