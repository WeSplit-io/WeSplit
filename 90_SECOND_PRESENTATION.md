# WeSplit App - 90-Second FigJam Presentation Structure

## ⏱️ **Timing Strategy: 90 Seconds Total**

### **Slide 1: Complete Overview (60 seconds)**
### **Slide 2: Detailed Flow Example (30 seconds)**

---

## 📊 **SLIDE 1: Complete System Overview (60 seconds)**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          WESPLIT APP - COMPLETE ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  📱 USER DEVICE                          ☁️ BACKEND SERVICES                   │
│  ┌────────────────────────────────┐     ┌────────────────────────────────────┐│
│  │  Mobile App (React Native)     │     │  Firebase Cloud                   ││
│  │  • Dashboard • Send/Request    │◄───►│  • User Data • TransactionUSDs      ││
│  │  • Split Bills • Settings      │     │  • Notifications • Split Data    ││
│  │                                 │     └────────────────────────────────────┘│
│  │  Digital Wallet (Secure)       │                │                           │
│  │  • Private Keys (Encrypted)     │                │                           │
│  │  • Seed Phrases (Local StorageDashSPri)│                ▼                           │
│  └────────────────────────────────┘     ┌────────────────────────────────────┐│
│           │                              │  Solana Blockchain                  ││
│           │                              │  • USDC Transfers                   ││
│           └────────────────────────────►│  • Wallet Management               ││
│                                          │  • Transaction Verification         ││
│                                          └────────────────────────────────────┘│
│                                                                                 │
│  🏦 EXTERNAL INTEGRATIONS                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐│
│  │   MoonPay            │  │   AI Services        │  │   Push Notifications ││
│  │   Bank Integration   │  │   Receipt OCR        │  │   Real-time Alerts   ││
│  │   Fiat → Crypto      │  │   Bill Processing    │  │   User Updates       ││
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘│
│                                                                                 │
│  🔄 DATA FLOW: User Action → App → Firebase → Blockchain → Notification → UI  │
│                                                                                 │
│  🛡️ SECURITY: Encrypted Storage • Blockchain Verification • Regulatory Compliance│
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Speaking Points (60 seconds):**
- "WeSplit is a mobile payment app using cryptocurrency on Solana blockchain"
- "Users interact through our mobile app, which connects to Firebase for data storage"
- "All money transfers happen on Solana blockchain using USDC tokens"
- "Three external services: MoonPay for bank deposits, AI for receipt scanning, push notifications"
- "Security: private keys stored on device, blockchain verification, regulatory compliance"
- "Complete audit trail: every transaction tracked and verified"

---

## 🔄 **SLIDE 2: Example Flow - Send Money (30 seconds)**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    EXAMPLE FLOW: SENDING MONEY                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  STEP 1: USER ACTION          STEP 2: BACKEND          STEP 3: BLOCKCHAIN    │
│  ┌──────────────────┐         ┌──────────────────┐    ┌──────────────────┐ │
│  │ Select Contact   │  ────►  │ Validate User    │ ──► │ Check Balance    │ │
│  │ Enter Amount     │         │ Create Record     │    │ Sign Transaction │ │
│  │ Confirm Send     │         │ Save to Database │    │ Execute Transfer │ │
│  └──────────────────┘         └──────────────────┘    └──────────────────┘ │
│                                                                                 │
│                    STEP 4: NOTIFICATION      STEP 5: UI UPDATE                 │
│                   ┌──────────────────┐      ┌──────────────────┐             │
│                    │ Send Alert       │ ───► │ Show Success     │             │
│                    │ Update Recipient │      │ Update Balances  │             │
│                    └──────────────────┘      └──────────────────┘             │
│                                                                                 │
│  ✅ RESULT: Money transferred instantly • Securely verified • Fully tracked   │
│                                                                                 │
│  📊 SAME FLOW APPLIES TO: Split Bills • Request Money • Deposit • Withdraw    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Speaking Points (30 seconds):**
- "Let me show you how a money transfer works as an example"
- "User selects recipient and amount, app validates and creates transaction"
- "Blockchain executes the transfer instantly and securely"
- "Both users get notifications and see updated balances"
- "This same secure flow applies to all features: splits, requests, deposits"
- "Every step is tracked and auditable for compliance"

---

## 🎯 **ALTERNATIVE: Single Comprehensive Slide (90 seconds)**

If you prefer one slide that shows everything:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WESPLIT APP - COMPLETE DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  📱 FRONTEND                    🔧 BACKEND                  ⛓️ BLOCKCHAIN     │
│  ┌──────────────┐               ┌──────────────┐          ┌──────────────┐    │
│  │ Mobile App   │──────────────►│ Firebase     │─────────►│ Solana       │    │
│  │ • Dashboard  │               │ • User Data  │          │ • USDC       │    │
│  │ • Send/Req   │               │ • Transactions│         │ • Wallets    │    │
│  │ • Split      │               │ • Notifications│        │ • Verification│    │
│  └──────────────┘               └──────────────┘          └──────────────┘    │
│         │                              │                           │            │
│         │                              │                           │            │
│         ▼                              ▼                           ▼            │
│  🏦 EXTERNAL SERVICES                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│  │ MoonPay      │  │ AI Services   │  │ Notifications│                    │
│  │ Bank → Crypto│  │ Receipt OCR  │  │ Push Alerts  │                    │
│  └──────────────┘  └──────────────┘  └──────────────┘                    │
│                                                                                 │
│  🔄 USER FLOW: Action → App → Firebase → Blockchain → Notification → Update    │
│                                                                                 │
│  🛡️ SECURITY: Device Encryption • Blockchain Verification • Audit Trail        │
│  📊 FEATURES: Send Money • Split Bills • Bank Deposits • Real-time Updates    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Speaking Points (90 seconds):**
- "WeSplit enables cryptocurrency payments and bill splitting"
- "Users interact through mobile app which connects to Firebase cloud database"
- "All money transfers executed on Solana blockchain using USDC tokens"
- "Three integrations: MoonPay for bank deposits, AI for receipt scanning, push notifications"
- "Security: encrypted device storage, blockchain verification, complete audit trail"
- "Example: User sends money → validated in Firebase → executed on blockchain → notifications sent → balances updated"
- "Same secure flow applies to all features: splits, requests, deposits"
- "System tracks everything for compliance and provides real-time updates"

---

## 🎤 **90-Second Presentation Script**

### **Opening (15 seconds)**
"WeSplit is a mobile payment app using cryptocurrency. Users can send money, split bills, and deposit from banks—all secured with blockchain technology."

### **Architecture (30 seconds)**
"Here's how it works: Users interact through our mobile app, which connects to Firebase for data storage. All money transfers happen on Solana blockchain using USDC tokens. We integrate with MoonPay for bank deposits, AI services for receipt scanning, and push notifications for real-time updatesBl
### **Security & Flow (30 seconds)**
"Security is multi-layered: private keys stored on device, blockchain verification, and complete audit trails. Example flow: User sends money → validated in Firebase → executed on blockchain → notifications sent → balances updated instantly. This same secure flow applies to splits, requests, and deposits."

### **Closing (15 seconds)**
"Every action is tracked, verified, and secured. The system provides complete transparency for compliance while delivering instant, low-cost payments."

---

## 📝 **Quick Reference Checklist**

✅ **What to Cover:**
- [ ] What WeSplit does (10 sec)
- [ ] Architecture overview (30 sec)
- [ ] Data flow example (30 sec)
- [ ] Security highlights (15 sec)
- [ ] Closing statement (5 sec)

✅ **What to Skip:**
- ❌ Detailed technical implementation
- ❌ Individual screen breakdowns
- ❌ Extensive service descriptions
- ❌ Technical jargon

✅ **Visual Elements:**
- Large, clear boxes
- Color-coded layers
- Simple flow arrows
- Minimal text
- Icons for quick recognition

---

## 🎨 **FigJam Implementation Tips**

1. **Use Large Frames**: Make everything clearly visible
2. **Color Code Layers**:
   - Blue = Frontend
   - Green = Backend
   - Purple = Blockchain
   - Orange = External
3. **Thick Arrows**: Use bold connectors for main flows
4. **Minimal Text**: Use icons and short labels
5. **Zoom Out**: Design to view entire slide at once
6. **Highlight Key Points**: Use highlights for important elements

This condensed structure gives you everything you need in just 90 seconds! 🚀
