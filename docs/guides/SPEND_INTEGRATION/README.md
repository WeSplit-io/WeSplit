# SPEND Integration Documentation

> ⚠️ **DOCUMENTATION CONSOLIDATED**  
> **Single Source of Truth:** [`docs/SPEND_INTEGRATION_GUIDE.md`](../../SPEND_INTEGRATION_GUIDE.md)

---

## 📖 For SPEND Developers

**Use this single file for all integration needs:**

### **[SPEND Integration Guide](../../SPEND_INTEGRATION_GUIDE.md)** ⭐

Contains everything needed:
- ✅ All API endpoints with examples
- ✅ Webhook documentation
- ✅ Authentication
- ✅ Error handling
- ✅ Testing commands

---

## 📁 Folder Structure

### 📤 FOR_SPEND/ - Archived Files
Files in this folder have been **consolidated** into the main guide.
See `FOR_SPEND/README.md` for details.

### 🔒 INTERNAL/ - WeSplit Team Only
Internal implementation details. Do NOT share externally.

---

## 🚀 Quick Start

### For SPEND Developers
→ **[SPEND Integration Guide](../../SPEND_INTEGRATION_GUIDE.md)**

### For WeSplit Developers
- **Implementation Status**: `PRODUCTION_READINESS_CHECKLIST.md`
- **Fix Summaries**: `../../SPEND_ENDPOINTS_FIXES_SUMMARY.md`

---

## 📊 Integration Status

### ✅ **Production Ready**
- Complete Firebase Functions implementation
- Bidirectional webhook communication
- Secure API key authentication
- Real-time payment processing
- Comprehensive error handling
- Production monitoring and logging

### 🔧 **Active Endpoints**
- `matchUsersByEmail` - Cross-reference user emails
- `batchInviteParticipants` - Bulk participant invitations
- `payParticipantShare` - Process individual payments
- `getSplitStatus` - Real-time split progress
- `spendWebhook` - Order status synchronization

---

## 🔗 Code Implementation

### Backend Services
- `services/integrations/spend/` - Complete integration services
- `services/firebase-functions/src/spend*.js` - Firebase Functions
- `src/screens/SpendSplit/` - Frontend implementation

### Key Components
- **SpendMerchantPaymentService** - Automatic treasury payments
- **SpendWebhookService** - Bidirectional webhooks
- **SpendPaymentModeService** - Payment mode detection
- **SpendSplitScreen** - User interface

---

## 📞 Support & Contact

For technical support:
- **SPEND Team**: Contact WeSplit integration team
- **WeSplit Team**: Check `INTERNAL/` documentation
- **API Issues**: Review `SPEND_API_REFERENCE.md`

---

## 📋 Production Summary

### Integration Architecture

#### Backend Services (`services/integrations/spend/`)
- **SpendMerchantPaymentService** - Treasury wallet payments & webhooks
- **SpendWebhookService** - Bidirectional webhook communication
- **SpendPaymentModeService** - Payment mode detection & thresholds
- **SpendTypes** - Complete TypeScript type definitions

#### Firebase Functions (`services/firebase-functions/src/`)
- **spendIntegration.js** - Mock endpoints & webhook testing
- **spendApiEndpoints.js** - Production API endpoints
- **spendWebhook receiver** - Order status synchronization

#### Frontend Integration (`src/screens/SpendSplit/`)
- **SpendSplitScreen** - User interface with payment flow
- **Payment modal** - Custom keypad with validation
- **Real-time updates** - Live balance & split progress

#### Data Storage & Flow
**Firestore Collections**:
- **`splits`** - Split documents with `splitType: "spend"` and full SP3ND order data in `externalMetadata.orderData`
- **`users`** - User accounts with wallet addresses for cross-referencing
- **`apiKeys`** - API key management and usage tracking
- **`pending_invitations`** - Invitation management for new users

**Data Flow Process**:
1. **SPEND** sends order data → Firebase Functions extract SP3ND order
2. **Order data** stored in `splits.externalMetadata.orderData` (full SP3ND object)
3. **Frontend** uses `extractOrderData()` utility to parse order information
4. **Components** display data from order object (items, status, store, amounts)
5. **Payments** processed through SplitWalletPayments → automatic treasury transfers
6. **Webhooks** notify SPEND of payment completion and order updates

### User Experience Flow

**SPEND Split Screens**:
- **Order Detail Screen**: Displays SP3ND order info, payment progress, participant status
- **Payment Modal**: Custom numeric keypad for amount entry with balance validation
- **Confirmation Screen**: Slide-to-pay interaction with network fee display
- **Success Screen**: Payment confirmation with transaction details

**Key User Flows**:
1. **View Order**: Order details, items list, payment progress visualization
2. **Send Payment**: Custom keypad input → balance check → confirmation → success
3. **Track Progress**: Real-time participant payments and completion percentage
4. **Automatic Fulfillment**: 100% payment triggers merchant treasury transfer

### Data Flow Architecture

```
SPEND Merchant Portal
    ↓ POST /matchUsersByEmail
WeSplit API (Email Cross-reference)
    ↓ POST /batchInviteParticipants
Firestore (Users, Splits, Invitations)
    ↓ Real-time updates
WeSplit Mobile App
    ↓ User payments
Split Wallet (Participant shares)
    ↓ Threshold reached
SpendMerchantPaymentService
    ↓ Treasury payment
SPEND Webhook (Payment complete)
    ↓ Order fulfillment
SPEND Merchant Portal
```

### Production Endpoints
```javascript
// User Management
POST /matchUsersByEmail        // Cross-reference emails → existing users
POST /batchInviteParticipants  // Bulk invites → split creation

// Payment Processing
POST /payParticipantShare      // Individual payments → wallet updates
GET  /getSplitStatus          // Progress tracking → real-time status

// Webhook Communication
POST /spendWebhook            // SPEND → WeSplit (order updates)
POST /spendWebhook (outbound) // WeSplit → SPEND (payment complete)
```

### Security Implementation
- **Authentication**: API key validation with Firestore storage
- **Rate Limiting**: 100 requests/15min per API key
- **Webhook Security**: HMAC-SHA256 signature verification
- **Data Protection**: Sensitive data never logged/stored
- **Input Validation**: Comprehensive sanitization & type checking

---

## 📋 Documentation Consolidation Summary

**Files Consolidated**: 9 detailed documents merged into core production docs
- **SPEND_DATA_FLOW.md** → Integrated into README.md architecture section
- **SP3ND_ORDER_SCHEMA.md** → Merged into SPEND_API_REFERENCE.md
- **SPEND_SCREENS_SPECIFICATION.md** → Summarized UX flows in README.md
- **GitBook build files** → Removed from FOR_SPEND/ directory

**Final Structure**: 11 essential production files (down from 20+)
- **README.md**: Complete overview, architecture, and user flows
- **PRODUCTION_READINESS_CHECKLIST.md**: Operational status and monitoring
- **SPEND_API_REFERENCE.md**: Complete API docs with data schemas
- **WEBSITE_DEEP_LINK_FILES.md**: Deployment configuration files
- **FOR_SPEND/**: Streamlined external partner documentation
- **INTERNAL/**: Focused internal maintenance documentation

---

## 🔧 **Complete Implementation Coverage**

### Backend Services (✅ Production Deployed)
- **`SpendMerchantPaymentService`** - Automatic treasury payments with idempotency
- **`SpendWebhookService`** - HMAC-SHA256 webhook communication
- **`SpendPaymentModeService`** - Payment threshold validation
- **Firebase Functions** - 8 production endpoints + 3 testing endpoints

### Frontend Components (✅ Production Ready)
- **`SpendSplitScreen`** - Main split interface with error boundaries
- **`SpendPaymentModal`** - Custom numeric keypad with balance validation
- **`SpendPaymentConfirmationModal`** - Slide-to-pay with network fees
- **`SpendPaymentSuccessModal`** - Transaction confirmation with signatures
- **`SpendSplitProgress`** - Real-time SVG progress visualization
- **`SpendSplitParticipants`** - Participant management with avatars

### Data Processing (✅ Production Ready)
- **`extractOrderData()`** - SP3ND order extraction with fallbacks
- **`calculatePaymentTotals()`** - Completion percentage calculations
- **`formatAmountWithComma()`** - European decimal formatting
- **`findUserParticipant()`** - Type-safe participant lookup
- **`createSpendSplitWallet()`** - Solana program integration

### Security & Monitoring (✅ Production Hardened)
- **API Key Authentication** - Firestore-based with usage tracking
- **Rate Limiting** - 100 requests/15min with proper headers
- **Webhook Signatures** - HMAC-SHA256 with timestamp validation
- **Atomic Operations** - Firestore transactions prevent duplicates
- **Comprehensive Logging** - All operations tracked in dedicated collections
- **Error Handling** - Graceful failures with actionable error messages

### API Endpoints (✅ All Deployed)
```javascript
// SPEND → WeSplit (8 endpoints)
POST /matchUsersByEmail        // Email cross-referencing
POST /batchInviteParticipants  // Bulk participant invites
POST /inviteParticipantsToSplit // Single participant invite
POST /payParticipantShare      // Individual payment processing
GET  /searchKnownUsers         // User search for auto-complete
GET  /getSplitStatus           // Real-time split progress
POST /spendWebhook             // Order status updates (incoming)
POST /mockSpendWebhook         // Testing webhook endpoint

// WeSplit → SPEND (1 webhook service)
SpendWebhookService.callSpendWebhook() // Payment notifications (outgoing)
```

### Data Flow (✅ Fully Operational)
```
SPEND Order Creation
    ↓ POST /matchUsersByEmail (check existing users)
WeSplit API Response (user matching results)
    ↓ POST /batchInviteParticipants (create split + invites)
Firestore Documents Created (splits, pending_invitations)
    ↓ Email invites sent to participants
WeSplit Mobile App
    ↓ User clicks invite link → joins split
    ↓ User views order details + payment progress
    ↓ User enters payment amount via custom keypad
    ↓ Balance validation + network fee calculation
    ↓ Slide-to-pay confirmation → Solana transaction
Split Wallet (Solana Program)
    ↓ Real-time balance monitoring
    ↓ Threshold reached (100%) → automatic trigger
SpendMerchantPaymentService
    ↓ Atomic status update (processing)
    ↓ Treasury wallet payment via extractFairSplitFunds
    ↓ Status update (paid) + webhook notification
SPEND Webhook Receiver
    ↓ HMAC signature verification
    ↓ Order fulfillment process
    ↓ Optional status updates back to WeSplit
SPEND Order Completed
```

---

**Status**: 🟢 **FULLY IMPLEMENTED & PRODUCTION READY** | **Last Updated**: 2025-11-28

