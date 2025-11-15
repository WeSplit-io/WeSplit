# External Web App Integration - Internal Implementation Guide

## Overview

This document outlines the **internal implementation** on the WeSplit side for integrating with external web applications. This guide is for WeSplit developers to understand the complete flow and implementation details.

## Architecture Overview

### Data Flow

```
External Web App
    ↓ (HTTPS POST with API Key)
Firebase Function (createSplitFromPayment)
    ↓ (API Key Validation)
    ↓ (Rate Limiting Check)
    ↓ (Input Sanitization)
    ↓ (Data Validation)
User Service (createOrGetUser)
    ↓ (Check by Email)
    ↓ (Create/Link Wallet)
Split Service (createSplitFromPayment)
    ↓ (Transform Data)
    ↓ (Create Split)
Firestore Database
    ↓ (Return Response)
External Web App
```

### Key Components

1. **Firebase Function** (`externalPaymentIntegration.js`): Receives and validates incoming data
2. **API Key Validation**: Validates API key from Firestore
3. **Rate Limiting**: Enforces 100 requests per 15 minutes per API key
4. **User Service**: Creates or retrieves user account
5. **Wallet Service**: Creates or links wallet address
6. **Split Service**: Creates split from invoice data

---

## Step-by-Step Implementation Process

### Step 1: Request Reception & Security Validation

#### 1.1 Receive HTTP Request

**Location**: `services/firebase-functions/src/externalPaymentIntegration.js`

**What happens:**
1. Firebase Function receives POST request at `/createSplitFromPayment`
2. CORS middleware processes the request
3. Request method is validated (must be POST)

**Security Check:**
```javascript
if (req.method !== 'POST') {
  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use POST.'
  });
}
```

#### 1.2 Extract and Validate API Key

**Security Requirement:** All requests must include valid API key.

**What happens:**
1. Extract API key from `Authorization` header
2. Validate format: `Bearer YOUR_API_KEY`
3. Query Firestore `apiKeys` collection for matching key
4. Check if key is active and not expired
5. Update usage statistics (lastUsedAt, usageCount)

**Implementation:**
```javascript
// Extract API key
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({
    success: false,
    error: 'Missing or invalid Authorization header'
  });
}

const apiKey = authHeader.replace('Bearer ', '').trim();

// Validate API key
const keyValidation = await validateApiKey(apiKey);
if (!keyValidation.valid) {
  return res.status(401).json({
    success: false,
    error: keyValidation.error || 'Invalid API key'
  });
}
```

**What we check:**
- ✅ API key exists in Firestore
- ✅ API key is active (`active: true`)
- ✅ API key is not expired (if `expiresAt` is set)
- ✅ Update usage tracking

#### 1.3 Rate Limiting Check

**Security Requirement:** Prevent abuse with rate limiting.

**What happens:**
1. Extract client IP address
2. Check rate limit for API key + IP combination
3. Limit: 100 requests per 15 minutes
4. Return 429 if limit exceeded

**Implementation:**
```javascript
const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                 req.connection.remoteAddress || 'unknown';
const rateLimit = checkRateLimit(apiKey, clientIp);

if (!rateLimit.allowed) {
  return res.status(429).json({
    success: false,
    error: 'Rate limit exceeded',
    retryAfter: new Date(rateLimit.resetTime).toISOString()
  });
}

// Add rate limit headers
res.setHeader('X-RateLimit-Limit', '100');
res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
```

#### 1.4 Input Sanitization

**Security Requirement:** Prevent XSS and injection attacks.

**What happens:**
1. Recursively sanitize all string inputs
2. Remove script tags and JavaScript handlers
3. Trim whitespace
4. Validate data types

**Implementation:**
```javascript
const paymentData = sanitizeInput(req.body);
```

**What we sanitize:**
- All string fields (email, invoiceId, merchant name, etc.)
- Nested objects (merchant, items)
- Arrays (items array)

---

### Step 2: Data Validation

#### 2.1 Validate Required Fields

**What we validate:**

| Field | Validation Rules |
|-------|------------------|
| `email` | Must be valid email format, non-empty string |
| `invoiceId` | Must be non-empty string |
| `amount` | Must be positive number, > 0, <= 1,000,000 |
| `currency` | Must be non-empty string (ISO 4217 format) |
| `merchant.name` | Must be non-empty string |
| `transactionDate` | Must be valid ISO 8601 date string |
| `source` | Must be non-empty string |

**Implementation:**
```javascript
const validation = validatePaymentData(paymentData);
if (!validation.isValid) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    errors: validation.errors
  });
}
```

#### 2.2 Validate Optional Fields (if provided)

**What we validate:**
- `walletAddress`: Must be valid Solana address (32-44 characters, base58)
- `items`: Each item must have name (string) and price (positive number)
- `subtotal`, `tax`, `tip`: Must be positive numbers if provided

---

### Step 3: User Account Management

#### 3.1 Check if User Exists

**What happens:**
1. Query Firestore `users` collection by email (case-insensitive)
2. Use `where('email', '==', email.toLowerCase().trim())`
3. Limit to 1 result

**Implementation:**
```javascript
const usersRef = db.collection('users');
const emailQuery = await usersRef
  .where('email', '==', email.toLowerCase().trim())
  .limit(1)
  .get();
```

#### 3.2 Handle Existing User

**If user exists:**

**Scenario A: Wallet address provided and matches**
- ✅ User found, wallet matches
- ✅ Return existing user
- ✅ No updates needed

**Scenario B: Wallet address provided but different**
- ✅ User found, but wallet address is different
- ✅ Update user's `wallet_address` field
- ✅ Add to `linkedWallets` collection as external wallet
- ✅ Set `wallet_type` to 'external'
- ✅ Return updated user

**Implementation:**
```javascript
if (!emailQuery.empty) {
  const userDoc = emailQuery.docs[0];
  const userData = userDoc.data();
  
  // Update wallet if provided and different
  if (walletAddress && userData.wallet_address !== walletAddress) {
    // Update user document
    await userDoc.ref.update({
      wallet_address: walletAddress,
      wallet_type: 'external',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Add to linked wallets
    await db.collection('linkedWallets').add({
      userId: userDoc.id,
      type: 'external',
      label: 'External Wallet',
      address: walletAddress,
      status: 'active',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  return { id: userDoc.id, ...userData };
}
```

#### 3.3 Create New User

**If user doesn't exist:**

**Scenario A: Wallet address provided (External Wallet)**
- ✅ Create new user with provided wallet
- ✅ Set `wallet_type` to 'external'
- ✅ Set `wallet_status` to 'healthy'
- ✅ Set `hasCompletedOnboarding` to false
- ⚠️ **Note**: This is an external wallet (e.g., from "spend"). WeSplit wallet will be created when user opens app.

**Scenario B: No wallet address provided**
- ✅ Create new user without wallet
- ✅ Set `wallet_type` to 'app-generated'
- ✅ Set `wallet_status` to 'no_wallet'
- ⚠️ **Important**: WeSplit wallet will be created when user first opens the app
- ✅ Set `hasCompletedOnboarding` to false
- ✅ Split can still be created (works with empty wallet address)

**Implementation:**
```javascript
// User doesn't exist - create new user
const newUserData = {
  email: email.toLowerCase().trim(),
  name: email.split('@')[0], // Default name from email
  wallet_address: walletAddress || '',
  wallet_public_key: '',
  created_at: admin.firestore.FieldValue.serverTimestamp(),
  avatar: '',
  hasCompletedOnboarding: false,
  email_verified: false,
  wallet_status: walletAddress ? 'healthy' : 'no_wallet',
  wallet_type: walletAddress ? 'external' : 'app-generated',
  wallet_migration_status: 'none',
  points: 0,
  total_points_earned: 0,
  firebase_uid: '',
  primary_email: email.toLowerCase().trim()
};

const newUserRef = await usersRef.add(newUserData);
return { id: newUserRef.id, ...newUserData };
```

**User Document Structure:**
```javascript
{
  id: "user_abc123",
  email: "user@example.com",
  name: "user",
  wallet_address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  wallet_type: "external", // or "app-generated"
  wallet_status: "healthy", // or "no_wallet"
  hasCompletedOnboarding: false,
  points: 0,
  created_at: Timestamp,
  // ... other fields
}
```

---

### Step 4: Currency Conversion

#### 4.1 Convert Amount to USDC

**What happens:**
1. Check if currency is USD or USDC (1:1 conversion)
2. For other currencies, apply conversion rate
3. Round to 2 decimal places

**Implementation:**
```javascript
function convertToUSDC(amount, fromCurrency) {
  const upperCurrency = fromCurrency.toUpperCase();
  
  if (upperCurrency === 'USD' || upperCurrency === 'USDC') {
    return amount;
  }
  
  // TODO: Implement currency conversion API
  // For now, assume USD
  return amount;
}
```

**Note:** In production, integrate with a currency conversion API (e.g., ExchangeRate-API, Fixer.io).

---

### Step 5: Split Creation

#### 5.1 Transform Payment Data to Split Format

**What happens:**
1. Generate unique bill ID: `bill_${Date.now()}_${random}`
2. Create split title from invoice number or ID
3. Convert all amounts to USDC
4. Transform items array (if provided)
5. Create participant array with user

**Implementation:**
```javascript
// Generate bill ID
const billId = generateBillId(); // e.g., "bill_1234567890_abc123"

// Convert amounts
const totalAmountUSDC = convertToUSDC(paymentData.amount, paymentData.currency);
const subtotalUSDC = paymentData.subtotal ? 
  convertToUSDC(paymentData.subtotal, paymentData.currency) : undefined;
const taxUSDC = paymentData.tax ? 
  convertToUSDC(paymentData.tax, paymentData.currency) : undefined;

// Transform items
const items = (paymentData.items || []).map((item, index) => ({
  id: `item_${index}`,
  name: item.name,
  price: convertToUSDC(item.price, paymentData.currency),
  quantity: item.quantity || 1,
  category: item.category || 'Other',
  total: convertToUSDC(item.price * (item.quantity || 1), paymentData.currency),
  participants: []
}));
```

#### 5.2 Create Split Document

**What happens:**
1. Create split data structure
2. Set status to 'pending'
3. Set splitType to 'fair'
4. Add user as participant with 'accepted' status
5. Save to Firestore `splits` collection

**Split Document Structure:**
```javascript
{
  id: "split_1234567890_abc",
  billId: "bill_1234567890_abc123",
  title: "Invoice 2024-001",
  description: "Split for Example Restaurant",
  totalAmount: 100.00, // USDC
  currency: "USDC",
  splitType: "fair",
  status: "pending",
  creatorId: "user_abc123",
  creatorName: "user",
  participants: [{
    userId: "user_abc123",
    name: "user",
    email: "user@example.com",
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    amountOwed: 100.00,
    amountPaid: 0,
    status: "accepted",
    avatar: ""
  }],
  items: [...],
  merchant: {
    name: "Example Restaurant",
    address: "123 Main St",
    phone: "+1234567890"
  },
  date: "2024-01-15T12:30:00Z",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  subtotal: 90.00,
  tax: 10.00,
  receiptNumber: "RCP-12345"
}
```

**Implementation:**
```javascript
const splitData = {
  id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  billId: billId,
  title: `Invoice ${paymentData.invoiceNumber || paymentData.invoiceId}`,
  description: `Split for ${paymentData.merchant.name}`,
  totalAmount: totalAmountUSDC,
  currency: 'USDC',
  splitType: 'fair',
  status: 'pending',
  creatorId: user.id,
  creatorName: user.name || user.email.split('@')[0],
  participants: [{
    userId: user.id,
    name: user.name || user.email.split('@')[0],
    email: user.email,
    walletAddress: user.wallet_address || '',
    amountOwed: totalAmountUSDC,
    amountPaid: 0,
    status: 'accepted',
    avatar: user.avatar || ''
  }],
  items: items,
  merchant: {
    name: paymentData.merchant.name,
    address: paymentData.merchant.address || '',
    phone: paymentData.merchant.phone || ''
  },
  date: paymentData.transactionDate,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  subtotal: subtotalUSDC,
  tax: taxUSDC,
  receiptNumber: paymentData.receiptNumber || paymentData.invoiceNumber
};

// Save to Firestore
const splitsRef = db.collection('splits');
const splitDocRef = await splitsRef.add(splitData);
```

#### 5.3 Store Split in Firestore

**What happens:**
1. Split document is created in `splits` collection
2. Split includes metadata to identify external source:
   - `externalSource`: The source identifier (e.g., "external-web-app")
   - `externalInvoiceId`: Original invoice ID for reference
   - `externalMetadata`: Any additional metadata provided
3. Split is stored with all invoice details
4. User is set as creator and participant with 'accepted' status

**Split Document Structure:**
```javascript
{
  id: "split_1234567890_abc",
  billId: "bill_1234567890_abc123",
  title: "Invoice 2024-001",
  description: "Split for Example Restaurant",
  totalAmount: 100.00,
  currency: "USDC",
  splitType: "fair",
  status: "pending", // User can invite others and create wallet
  creatorId: "user_abc123",
  creatorName: "user",
  participants: [{
    userId: "user_abc123",
    name: "user",
    email: "user@example.com",
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    amountOwed: 100.00,
    amountPaid: 0,
    status: "accepted"
  }],
  items: [...],
  merchant: {...},
  date: "2024-01-15T12:30:00Z",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // External payment tracking
  externalSource: "external-web-app",
  externalInvoiceId: "INV-2024-001",
  externalMetadata: {...}
}
```

#### 5.4 Return Response

**What happens:**
1. Build success response with user and split information
2. Include redirect URL if callback URL provided
3. Return 200 status with JSON response

**Response Structure:**
```javascript
{
  success: true,
  data: {
    userId: "user_abc123",
    userEmail: "user@example.com",
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    splitId: "split_1234567890_abc",
    splitStatus: "pending",
    totalAmount: 100.00,
    currency: "USDC",
    createdAt: "2024-01-15T12:30:00Z"
  },
  redirectUrl: "https://your-app.com/success?splitId=split_1234567890_abc&userId=user_abc123&status=success" // if callbackUrl provided
}
```

**Implementation:**
```javascript
const response = {
  success: true,
  data: {
    userId: user.id,
    userEmail: user.email,
    walletAddress: user.wallet_address || '',
    splitId: split.id,
    splitStatus: split.status,
    totalAmount: split.totalAmount,
    currency: split.currency,
    createdAt: split.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
  }
};

// Add redirect URL if callback URL provided
if (paymentData.callbackUrl) {
  response.redirectUrl = `${paymentData.callbackUrl}?splitId=${split.id}&userId=${user.id}&status=success`;
}

return res.status(200).json(response);
```

---

### Step 6: How Users See and Interact with the Split

#### 6.1 Split Appears in User's Split List

**What happens:**
1. Split is stored in Firestore `splits` collection
2. When user opens the app and navigates to Splits List:
   - `SplitStorageService.getUserSplits()` is called
   - Query finds splits where user is creator (all statuses)
   - Split appears in their list because `creatorId === user.id`
3. Split shows with:
   - Title: "Invoice 2024-001"
   - Merchant name
   - Total amount
   - Status: "Pending"
   - Creation date

**User sees:**
- Split card in their splits list
- Can tap to open split details
- Can see it's their split (marked as "Owner")

**⚠️ Important: WeSplit Wallet Creation**
- If user doesn't have a WeSplit wallet yet, they will be prompted to create one when they first open the app
- This is a one-time setup that happens automatically when they open the app
- The split is already created and visible - wallet creation is just for payment collection
- User can view the split immediately, even before wallet is created

#### 6.2 User Opens Split Details

**What happens when user taps the split:**
1. Navigation to `SplitDetailsScreen` with split data
2. Split details are loaded from Firestore
3. User sees:
   - Invoice details (merchant, date, amount)
   - Line items (if provided)
   - Subtotal, tax, tip breakdown
   - Receipt number
   - Current participants (just them for now)

**User can:**
- View all invoice details
- See the breakdown of items
- Invite other users to split the bill (optional)
- Proceed to create split wallet and collect payments

#### 6.3 User Can Invite Others (Optional)

**What happens:**
1. User can tap "Invite" button in SplitDetailsScreen
2. Select contacts to invite
3. Invited users receive notification
4. When they accept, they're added as participants
5. Amounts are recalculated (equal split by default)

**If user doesn't invite others:**
- Split remains with just the creator
- User can still create split wallet
- Can collect payment from themselves (for tracking purposes)
- Or mark as personal expense

#### 6.4 User Creates Split Wallet (When Ready)

**What happens:**
1. User navigates to FairSplit screen
2. Creates split wallet for collecting payments
3. Split wallet is created with participants
4. Split status changes to 'active'
5. Participants can pay their share
6. Creator can withdraw funds when all paid

**Flow:**
- SplitDetails → Select "Split" → Choose "Fair Split" → FairSplitScreen → Create Wallet → Collect Payments

---

### Step 7: Data Storage and Distribution

#### 7.1 Where Data is Stored

**Firestore Collections:**

1. **`users` collection:**
   - User document with email, wallet address
   - Created/updated when payment received

2. **`splits` collection:**
   - Split document with all invoice details
   - Includes `externalSource`, `externalInvoiceId` for tracking
   - User is creator and participant

3. **`linkedWallets` collection (if wallet provided):**
   - External wallet linked to user account

4. **`apiKeys` collection:**
   - API key usage tracking

#### 7.2 How Data is Distributed to Users

**Automatic Distribution:**
- Split appears in user's splits list automatically (they're creator)
- No notification needed (user created it via external payment)
- User can access it immediately when they open the app

**If User Invites Others:**
- Invited users receive notification
- They can accept invitation
- They're added as participants
- They see the split in their list

**Real-time Updates:**
- Split uses Firestore real-time listeners
- Changes sync automatically
- Participants see updates in real-time

#### 7.3 Data Flow Summary

```
External Payment
    ↓
Firebase Function
    ↓
Create/Get User (Firestore: users)
    ↓
Create Split (Firestore: splits)
    ↓
User Opens App
    ↓
SplitsListScreen loads splits
    ↓
Split appears in list (user is creator)
    ↓
User taps split
    ↓
SplitDetailsScreen shows invoice
    ↓
User can:
  - View invoice details
  - Invite others (optional)
  - Create split wallet
  - Collect payments
```

---

### Step 8: Important Implementation Notes

#### 8.1 Split Status Flow

**Initial State:**
- Status: `'pending'`
- User can view, edit, invite others

**After User Creates Wallet:**
- Status: `'active'`
- Participants can pay
- Creator can collect payments

**After All Payments Collected:**
- Status: `'completed'`
- Creator can withdraw funds

#### 8.2 Participant Management

**Initial:**
- Only creator is participant
- Status: `'accepted'`
- Amount owed: Full amount

**After Inviting Others:**
- New participants added
- Amounts recalculated (equal split)
- Status: `'invited'` → `'accepted'` when they join

#### 8.3 Metadata Tracking

**Stored in Split:**
- `externalSource`: Identifies which external app created it
- `externalInvoiceId`: Original invoice ID for reference
- `externalMetadata`: Additional metadata from external app

**Use Cases:**
- Analytics: Track which external apps create splits
- Support: Identify source of issues
- Reconciliation: Match external invoices with splits
- Filtering: Filter splits by source (if needed in future)

---

### Step 6: Error Handling

#### 6.1 Error Types and Responses

**Validation Errors (400):**
- Missing required fields
- Invalid data format
- Invalid email format
- Invalid amount (negative or zero)

**Authentication Errors (401):**
- Missing API key
- Invalid API key
- Expired API key

**Rate Limit Errors (429):**
- Too many requests
- Includes `retryAfter` timestamp

**Server Errors (500):**
- Database errors
- Internal processing errors

**Implementation:**
```javascript
catch (error) {
  console.error('Error in createSplitFromPayment:', error);
  
  if (error instanceof functions.https.HttpsError) {
    return res.status(error.code === 'internal' ? 500 : 400).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
}
```

---

## Security Implementation Details

### API Key Storage

**Location:** Firestore `apiKeys` collection

**Structure:**
```javascript
{
  key: "hashed_key", // SHA-256 hash of actual key
  source: "external-app-name",
  active: true,
  createdAt: Timestamp,
  expiresAt: Timestamp, // Optional
  lastUsedAt: Timestamp,
  usageCount: number,
  permissions: string[],
  rateLimit: {
    maxRequests: 100,
    windowMs: 900000 // 15 minutes
  },
  metadata: {
    contactEmail: string,
    allowedIps: string[] // Optional IP whitelist
  }
}
```

### Rate Limiting

**Implementation:** In-memory Map (for Firebase Functions)
- Key: `${apiKey}_${ip}`
- Value: `{ count: number, resetTime: timestamp }`
- Limit: 100 requests per 15 minutes
- Auto-reset after window expires

**Future Enhancement:** Use Redis or Firestore for distributed rate limiting

### Input Sanitization

**What we sanitize:**
- Remove `<script>` tags
- Remove `javascript:` protocol
- Remove event handlers (`onclick`, `onerror`, etc.)
- Trim whitespace
- Validate data types

---

## Monitoring & Logging

### What We Log

1. **API Key Usage:**
   - Key ID
   - Timestamp
   - IP address
   - Endpoint
   - Success/failure

2. **Request Details:**
   - Request ID
   - Source
   - Response time
   - Status code

3. **Errors:**
   - Error type
   - Error message
   - Request context

### What We Don't Log

- Full API keys (only key ID)
- Sensitive user data
- Full request bodies (only metadata)

---

## Testing Scenarios

### Test Case 1: New User with Wallet
- **Input:** Email + Wallet Address
- **Expected:** User created with external wallet, split created
- **Verify:** User document, wallet linked, split document

### Test Case 2: New User without Wallet
- **Input:** Email only
- **Expected:** User created, wallet_status = 'no_wallet', split created
- **Verify:** User document, split document

### Test Case 3: Existing User
- **Input:** Existing email
- **Expected:** User retrieved, split created
- **Verify:** No duplicate user, split document

### Test Case 4: Existing User with New Wallet
- **Input:** Existing email + new wallet address
- **Expected:** User updated, wallet linked, split created
- **Verify:** User document updated, linkedWallets entry, split document

### Test Case 5: Invalid Data
- **Input:** Missing required fields
- **Expected:** 400 error, no user/split created
- **Verify:** Error response, no database changes

---

## Complete User Flow After Split Creation

### How the User Sees the Split

1. **User Opens App:**
   - Navigates to Splits List screen
   - Split appears automatically (user is creator)
   - Shows: Title, merchant, amount, status "Pending"

2. **User Taps Split:**
   - Opens SplitDetailsScreen
   - Sees complete invoice details:
     - Merchant information
     - Transaction date
     - Line items (if provided)
     - Subtotal, tax, tip breakdown
     - Receipt number

3. **User Can:**
   - **View Invoice**: See all payment details
   - **Invite Others**: Tap "Invite" to add participants (optional)
   - **Create Split Wallet**: Tap "Split" → Choose "Fair Split" → Create wallet
   - **Collect Payments**: Once wallet created, participants can pay

4. **If User Invites Others:**
   - Invited users receive notification
   - They accept invitation
   - Amounts recalculated (equal split)
   - All participants can pay their share

5. **Payment Collection:**
   - Participants pay to split wallet
   - Creator can withdraw when all paid
   - Split status changes to 'completed'

### Data Storage Locations

| Data | Location | Purpose |
|------|----------|---------|
| User Account | `users` collection | User identification and wallet |
| Split Document | `splits` collection | Invoice and split details |
| External Wallet | `linkedWallets` collection | External wallet (if provided) |
| API Key Usage | `apiKeys` collection | API key tracking |
| Split Wallet | `splitWallets` collection | Created when user creates wallet |

### How Data Spreads to Users

**Automatic:**
- Split appears in creator's list immediately
- No notification needed (they created it)

**If Others Invited:**
- Invited users receive notification
- They accept → added as participants
- Split appears in their list
- Real-time updates sync to all participants

---

## Deployment Checklist

- [ ] Firebase Function deployed
- [ ] API key management system ready
- [ ] Rate limiting tested
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Test endpoint verified
- [ ] User flow tested (split appears in list)
- [ ] Split details display correctly
- [ ] Invitation flow works (if users invite others)

## Data Structures

### Incoming Payment Data Format

```typescript
interface ExternalPaymentData {
  // User identification
  email: string;                    // Required: User's email address
  walletAddress?: string;            // Optional: User's Solana wallet address
  
  // Payment/Invoice information
  invoiceId: string;                 // Required: Unique invoice identifier
  invoiceNumber?: string;            // Optional: Human-readable invoice number
  amount: number;                    // Required: Total payment amount
  currency: string;                 // Required: Currency code (will be converted to USDC)
  
  // Merchant information
  merchant: {
    name: string;                    // Required: Merchant name
    address?: string;                 // Optional: Merchant address
    phone?: string;                   // Optional: Merchant phone
  };
  
  // Transaction details
  transactionDate: string;           // Required: ISO 8601 date string
  items?: Array<{                     // Optional: Line items
    name: string;
    price: number;
    quantity?: number;
    category?: string;
  }>;
  
  // Additional metadata
  subtotal?: number;                 // Optional: Subtotal before tax
  tax?: number;                      // Optional: Tax amount
  tip?: number;                      // Optional: Tip amount
  receiptNumber?: string;            // Optional: Receipt number
  
  // Metadata
  source: string;                    // Required: Source identifier (e.g., "external-web-app")
  metadata?: Record<string, any>;     // Optional: Additional metadata
}
```

### ProcessedBillData Format (Internal)

```typescript
interface ProcessedBillData {
  id: string;                        // Generated bill ID
  title: string;                     // Invoice title
  merchant: string;                  // Merchant name
  location?: string;                  // Merchant address
  date: string;                      // ISO date string
  time?: string;                     // Time string
  totalAmount: number;               // Total amount in USDC
  subtotal?: number;                 // Subtotal
  tax?: number;                      // Tax amount
  currency: string;                  // Always 'USDC' after conversion
  items: BillItem[];                // Line items
  participants: BillParticipant[];  // Participants (user will be added)
  settings?: BillSettings;          // Split settings
  receiptNumber?: string;            // Receipt number
  merchantPhone?: string;            // Merchant phone
}
```

## Implementation Details

### User Creation Logic

```typescript
async function createOrGetUser(email: string, walletAddress?: string) {
  // 1. Check if user exists by email
  let user = await firebaseDataService.user.getUserByEmail(email);
  
  if (user) {
    // User exists - update wallet if provided and different
    if (walletAddress && user.wallet_address !== walletAddress) {
      // Option 1: Update existing wallet
      await firebaseDataService.user.updateUser(user.id, {
        wallet_address: walletAddress
      });
      // Option 2: Link as external wallet (preferred for existing users)
      // Use LinkedWalletService to add as external wallet
    }
    return user;
  }
  
  // 2. Create new user
  if (walletAddress) {
    // User provided wallet - create user with wallet
    user = await firebaseDataService.user.createUser({
      email,
      name: email.split('@')[0], // Default name from email
      wallet_address: walletAddress,
      wallet_type: 'external',
      hasCompletedOnboarding: false
    });
  } else {
    // No wallet provided - create user and generate wallet
    user = await firebaseDataService.user.createUser({
      email,
      name: email.split('@')[0],
      wallet_address: '', // Will be created by wallet service
      wallet_type: 'app-generated',
      hasCompletedOnboarding: false
    });
    
    // Create wallet for new user
    const walletResult = await walletService.createWallet(user.id);
    if (walletResult.success && walletResult.wallet) {
      await firebaseDataService.user.updateUser(user.id, {
        wallet_address: walletResult.wallet.address
      });
    }
  }
  
  return user;
}
```

### Split Creation Logic

```typescript
async function createSplitFromInvoice(
  user: User,
  paymentData: ExternalPaymentData
) {
  // 1. Transform payment data to ProcessedBillData
  const processedBillData: ProcessedBillData = {
    id: generateBillId(),
    title: `Invoice ${paymentData.invoiceNumber || paymentData.invoiceId}`,
    merchant: paymentData.merchant.name,
    location: paymentData.merchant.address,
    date: paymentData.transactionDate,
    time: new Date(paymentData.transactionDate).toLocaleTimeString(),
    totalAmount: convertToUSDC(paymentData.amount, paymentData.currency),
    subtotal: paymentData.subtotal ? convertToUSDC(paymentData.subtotal, paymentData.currency) : undefined,
    tax: paymentData.tax ? convertToUSDC(paymentData.tax, paymentData.currency) : undefined,
    currency: 'USDC',
    items: (paymentData.items || []).map((item, index) => ({
      id: `item_${index}`,
      name: item.name,
      price: convertToUSDC(item.price, paymentData.currency),
      quantity: item.quantity || 1,
      category: item.category || 'Other',
      total: convertToUSDC(item.price * (item.quantity || 1), paymentData.currency),
      participants: []
    })),
    participants: [{
      id: user.id,
      name: user.name,
      wallet_address: user.wallet_address,
      walletAddress: user.wallet_address,
      amountOwed: convertToUSDC(paymentData.amount, paymentData.currency),
      items: [],
      status: 'accepted'
    }],
    settings: {
      splitMethod: 'equal',
      currency: 'USDC',
      allowPartialPayments: true,
      requireAllAccept: false,
      autoCalculate: true,
      taxIncluded: paymentData.tax !== undefined
    },
    receiptNumber: paymentData.receiptNumber,
    merchantPhone: paymentData.merchant.phone
  };
  
  // 2. Create split
  const splitData = {
    billId: processedBillData.id,
    title: processedBillData.title,
    description: `Split for ${paymentData.merchant.name}`,
    totalAmount: processedBillData.totalAmount,
    currency: 'USDC',
    splitType: 'fair' as const,
    status: 'pending' as const,
    creatorId: user.id,
    creatorName: user.name,
    participants: processedBillData.participants.map(p => ({
      userId: p.id,
      name: p.name,
      email: user.email,
      walletAddress: p.walletAddress || p.wallet_address,
      amountOwed: p.amountOwed,
      amountPaid: 0,
      status: 'accepted' as const,
      avatar: user.avatar
    })),
    items: processedBillData.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      participants: item.participants || []
    })),
    merchant: {
      name: processedBillData.merchant,
      address: processedBillData.location,
      phone: processedBillData.merchantPhone
    },
    date: processedBillData.date,
    subtotal: processedBillData.subtotal,
    tax: processedBillData.tax,
    receiptNumber: processedBillData.receiptNumber
  };
  
  // 3. Save split
  const result = await SplitStorageService.createSplit(splitData);
  
  return result;
}
```

## Currency Conversion

All amounts must be converted to USDC. The system uses USDC as the standard currency for all splits.

```typescript
function convertToUSDC(amount: number, fromCurrency: string): number {
  // In production, use a currency conversion API
  // For now, assume 1:1 for USD, implement conversion rates for others
  if (fromCurrency.toUpperCase() === 'USD' || fromCurrency.toUpperCase() === 'USDC') {
    return amount;
  }
  
  // TODO: Implement currency conversion API integration
  // For MVP, return amount as-is (assumes USD)
  return amount;
}
```

## Error Handling

### Validation Errors
- Missing required fields (email, amount, merchant name)
- Invalid email format
- Invalid wallet address format (if provided)
- Invalid amount (must be > 0)

### User Creation Errors
- Email already exists with different wallet (handle gracefully)
- Wallet creation failure (retry logic)

### Split Creation Errors
- Invalid bill data
- Database write failures
- Transaction rollback on errors

## Security Considerations

1. **API Authentication**: Implement API key or OAuth authentication
2. **Rate Limiting**: Prevent abuse with rate limits
3. **Data Validation**: Validate all incoming data
4. **Sanitization**: Sanitize user inputs
5. **Logging**: Log all operations for audit trail

## Testing

### Test Scenarios

1. **New User with Wallet**
   - Email: newuser@example.com
   - Wallet: Provided
   - Expected: User created, wallet linked, split created

2. **New User without Wallet**
   - Email: newuser2@example.com
   - Wallet: Not provided
   - Expected: User created, wallet generated, split created

3. **Existing User**
   - Email: existing@example.com
   - Wallet: Provided (matches)
   - Expected: User retrieved, split created

4. **Existing User with New Wallet**
   - Email: existing@example.com
   - Wallet: New address
   - Expected: User retrieved, wallet updated/linked, split created

5. **Invalid Data**
   - Missing email
   - Invalid amount
   - Expected: Error returned, no user/split created

## Next Steps

1. Implement Firebase Function endpoint
2. Add API authentication
3. Implement currency conversion
4. Add comprehensive error handling
5. Add logging and monitoring
6. Create integration tests
7. Document API endpoints for external web app

