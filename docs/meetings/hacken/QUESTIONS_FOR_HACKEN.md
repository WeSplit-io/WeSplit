# ❓ Questions for Hacken - Detailed List

**Organized by category for easy reference during the meeting**

> ⚠️ **Note:** Basic questions about Hacken's services, methodology, and timeline are already answered on their website (hacken.io). This list focuses on deeper, strategic questions tailored to our specific needs.

---

## ⛔ What NOT to Ask (Already Public)

These are documented on hacken.io - asking them shows lack of preparation:

- ❌ "What services do you offer?" → They list everything on their services page
- ❌ "What's your audit methodology?" → v3.0 methodology is published (docs.hacken.io)
- ❌ "What languages do you support?" → Solidity, Rust, Move, Vyper, etc. are listed
- ❌ "How long do audits take?" → 5-15 business days is public info
- ❌ "What compliance standards?" → MiCA, DORA, ISO 27001, VARA, etc. are listed
- ❌ "What do you need for audit prep?" → Documented in their preparation guidelines

---

## 1. Audit Scope & Methodology (Tailored to Our Stack)

### Stack-Specific Adaptation
- [ ] How do you adapt your methodology (v3.0) for a React Native + Firebase + Solana stack?
- [ ] Have you audited similar hybrid Web2-Web3 architectures before? Can you share anonymized examples?
- [ ] For our stack, what's the breakdown of effort: mobile app vs. backend vs. blockchain components?
- [ ] How do you handle off-chain components (Firebase Functions, Firestore) in a Web3 audit?
- [ ] What custom checks would you recommend specific to Solana transaction signing and wallet security?

### Methodology Depth & Tools
- [ ] Can you walk through how you combine automated tools (static/dynamic analysis, fuzzing) with manual review for a project like ours?
- [ ] How do you define and validate invariants? Do you use property-based testing or custom assertion frameworks?
- [ ] What's your false positive rate or misclassification rate in audits?
- [ ] How do you handle novel code patterns or emergent vulnerabilities not in standard checklists?
- [ ] What's your process for detecting economic attacks (flash-loan, sandwich attacks, etc.)?

### AI & Automation
- [ ] How reusable is the QAN-nondeterministic-AI-agent for React Native + Solana environments?
- [ ] What training data/architecture do you use for AI agents? Can they adapt to our stack?
- [ ] How do you handle false positives with AI-generated tests?
- [ ] What's the balance between AI automation and human expertise in your audits?

### Formal Verification
- [ ] When do you recommend formal verification vs. fuzzing vs. manual analysis for our critical components?
- [ ] What's the cost/time trade-off for formal verification on our transaction signing service?
- [ ] How do you handle non-deterministic behaviors in formal verification (e.g., blockhash expiration)?

---

## 2. Web3-Specific Security

### Solana Security
- [ ] How do you audit Solana transaction signing and wallet security?
- [ ] What's your approach to testing private key storage (Keychain, SecureStore, encrypted Firebase)?
- [ ] Do you test for replay attacks, transaction hash collisions, and blockhash expiration?
- [ ] How do you verify split wallet encryption and participant access controls?
- [ ] What's your approach to testing transaction validation and signature verification?

### Blockchain Security
- [ ] How do you audit on-chain vs. off-chain security?
- [ ] What's your approach to testing transaction validation?
- [ ] How do you verify wallet key derivation and storage?
- [ ] Do you test for front-running, MEV, and other blockchain-specific attacks?

---

## 3. Mobile App Security

### React Native Security
- [ ] Do you audit React Native apps for:
  - Secure storage implementations
  - Biometric authentication flows
  - API key exposure in app bundles
  - Deep linking security
  - Certificate pinning
- [ ] How do you test for secrets in compiled app bundles?
- [ ] What's your approach to testing native module security?
- [ ] How do you verify secure communication between native and JS layers?

### Mobile-Specific Concerns
- [ ] Do you test for jailbreak/root detection?
- [ ] How do you verify secure keychain usage?
- [ ] What's your approach to testing app tampering and reverse engineering?

---

## 4. Deliverables & Transparency

### Audit Reports (Beyond Public Info)
- [ ] Beyond the standard report format, can we get access to test cases, fuzz inputs, and code paths?
- [ ] Do you provide remediation guidance with code examples or just descriptions?
- [ ] Will we get access to internal tools/test harnesses used during the audit?
- [ ] What's the format of deliverables? (PDF, interactive dashboard, code examples, etc.)
- [ ] Can we get regression test suites for post-remediation verification?

### Open Source & Tools
- [ ] What tools are open-source vs. proprietary?
- [ ] Can we get access to test cases and fuzz inputs?
- [ ] Do you provide CI/CD integration for continuous testing?
- [ ] What's included in the toolchain? (static analysis, dynamic analysis, fuzzing?)

---

## 5. Compliance & Certification (Deep Dive)

### Regulatory Alignment (Beyond Basic Info)
- [ ] How do you map audit outputs to specific MiCA/DORA requirements? Can you share examples?
- [ ] What format do compliance evidence packages take? (PDF, structured data, etc.)
- [ ] Have you helped clients with successful regulatory submissions? Can you share anonymized examples?
- [ ] For our jurisdiction, what specific compliance artifacts would we need?

### Compliance Artifacts
- [ ] Beyond the audit report, what additional documentation do you provide for regulators?
- [ ] How do you help with ongoing compliance monitoring and evidence collection?
- [ ] What's the process for updating compliance evidence as regulations evolve?

---

## 6. Post-Audit Support (Detailed)

### Continuous Monitoring (Extractor & HackenProof)
- [ ] How does Extractor work for our stack? What types of triggers and alerts?
- [ ] How do you manage false positives in continuous monitoring?
- [ ] How does HackenProof bug bounty integrate with the audit lifecycle?
- [ ] What's the SLA for alerts and response times?

### Remediation & Retesting
- [ ] After we fix issues, how do you verify there are no regressions? What's your regression testing process?
- [ ] What's the turnaround time for retesting after we submit fixes?
- [ ] How many rounds of retesting are included? What if we need additional rounds?
- [ ] What support do you provide during remediation? (Code examples, proofs, patches?)

### Post-Deployment
- [ ] How do you monitor for post-audit incidents or newly discovered exploits?
- [ ] What happens if a vulnerability is found after deployment that wasn't caught in audit?
- [ ] What's included in ongoing support vs. one-time assessment?

---

## 7. Cost & Timeline (Specific to Our Scope)

### Pricing (Beyond Public Estimates)
- [ ] For our scope (React Native app + Firebase backend + Solana integration), what's a realistic cost estimate?
- [ ] Do you offer phased audits (critical issues first, then full audit)? What's the cost difference?
- [ ] What's included in base price vs. add-ons? (Monitoring, retesting, compliance artifacts?)
- [ ] Are there hidden costs we should be aware of? (Scope changes, additional retests, etc.)
- [ ] What's the pricing model? (Fixed fee, hourly, retainer?)

### Timeline (Tailored)
- [ ] For our specific stack and scope, what's a realistic timeline?
- [ ] Can we prioritize certain areas (e.g., wallet security) for faster turnaround?
- [ ] What's the retest timeline after remediation? Is it included or separate?
- [ ] How do scope changes affect timeline and cost?

---

## 8. Partnership Model

### Federation Network
- [ ] If we engage through a regional partner, what's the governance model?
- [ ] How is liability/accountability handled across jurisdictions?
- [ ] What's the quality assurance process for partner audits?
- [ ] How do you ensure consistency across partners?

### Collaboration
- [ ] How do you work with development teams during audits?
- [ ] What's the communication process during audits?
- [ ] How do you handle urgent issues discovered during audits?

---

## 9. Technical Deep Dive (Our Specific Implementation)

### Our Specific Stack
- [ ] Have you audited React Native + Firebase + Solana apps before? Can you share anonymized case studies?
- [ ] What are common vulnerabilities in this stack that we should be aware of?
- [ ] How do you test Firebase Functions security? (Rate limiting, authentication, input validation)
- [ ] What's your approach to testing Firestore security rules? (Complex nested array checks, participant verification)

### Our Specific Features (Critical Areas)
- [ ] How would you audit our split wallet encryption (AES-256-CBC with HMAC key derivation)?
- [ ] What's your approach to testing transaction hash tracking for replay attack prevention?
- [ ] How do you verify participant access controls in split wallets?
- [ ] What's your approach to testing biometric authentication flows (Face ID/Touch ID)?
- [ ] How would you test our company wallet signature service for transaction security?
- [ ] What's your approach to testing rate limiting implementation (Firestore-based)?

---

## 10. Process & Workflow (Operational Details)

### Audit Process (Beyond Public Methodology)
- [ ] How do you prioritize findings during the audit? (Critical first, or by component?)
- [ ] What's your severity classification system? (Critical/High/Medium/Low - any subcategories?)
- [ ] How do you handle disagreements or conflicts in internal review?
- [ ] What's your process for handling false positives? How do you verify before reporting?

### Communication & Collaboration
- [ ] How often do you provide updates during audits? (Daily, weekly, milestone-based?)
- [ ] What's the communication channel? (Slack, email, meetings, dashboard?)
- [ ] How do you handle urgent issues discovered during audits?
- [ ] What's the process for questions during audits? Can we have direct access to auditors?
- [ ] Who leads audits? Can we know the principal auditor's background in our domain?

---

## 📝 Notes Section

### Answers During Meeting

**Audit Scope:**
- 
- 

**Timeline:**
- 
- 

**Cost:**
- 
- 

**Next Steps:**
- 
- 

---

**Use this document to check off questions as they're answered during the meeting**
