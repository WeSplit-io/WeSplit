# External Web App Integration Guide

## Overview

This guide provides complete instructions for integrating your web application with WeSplit's payment split API. This integration allows you to automatically create user accounts and payment splits when transactions occur on your platform.

## Table of Contents

1. [Quick Start](#quick-start) - Get up and running in 5 minutes
2. [API Reference](#api-reference) - Complete API documentation
3. [Integration Guide](#integration-guide) - Step-by-step integration
4. [Security](#security) - Security best practices
5. [Testing](#testing) - Testing your integration
6. [Troubleshooting](#troubleshooting) - Common issues and solutions

---

## Quick Start

### 🚀 Get Started in 5 Minutes

#### Step 1: Get Your API Key

Contact WeSplit to obtain your API key:
- Email: api-support@wesplit.com
- Include: Your app name, contact email, expected request volume

You'll receive:
- ✅ API Key
- ✅ Base URL: `https://us-central1-[PROJECT-ID].cloudfunctions.net`
- ✅ Test endpoint URL

#### Step 2: Store API Key Securely

**Never commit API keys to version control!**

```bash
# .env file (add to .gitignore)
WESPLIT_API_KEY=your_api_key_here
WESPLIT_API_URL=https://us-central1-[PROJECT-ID].cloudfunctions.net
```

#### Step 3: Make Your First Request

**Node.js Example for Amazon Purchase:**
```javascript
const axios = require('axios');
require('dotenv').config();

async function createSplitForAmazonPurchase(orderData) {
  const response = await axios.post(
    `${process.env.WESPLIT_API_URL}/createSplitFromPayment`,
    {
      email: orderData.userEmail,
      walletAddress: orderData.userWalletAddress, // User's USDC wallet from spend
      invoiceId: `AMZ-${orderData.orderId}`, // Unique order ID
      invoiceNumber: orderData.orderNumber,
      amount: orderData.totalUsdc, // Total in USDC
      currency: 'USDC', // Payment is in USDC
      merchant: { 
        name: 'Amazon',
        address: '410 Terry Avenue North, Seattle, WA 98109'
      },
      transactionDate: orderData.purchaseDate.toISOString(),
      items: orderData.items.map(item => ({
        name: item.productName,
        price: item.priceUsdc,
        quantity: item.quantity,
        category: item.category || 'General'
      })),
      subtotal: orderData.subtotalUsdc,
      tax: orderData.taxUsdc || 0,
      source: 'spend-amazon', // Your source identifier
      callbackUrl: `https://spend.com/orders/${orderData.orderId}/success`,
      metadata: {
        orderId: orderData.orderId,
        amazonOrderNumber: orderData.amazonOrderNumber,
        items: orderData.items.map(item => ({
          asin: item.asin,
          productUrl: item.productUrl,
          seller: item.seller
        }))
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WESPLIT_API_KEY}`
      }
    }
  );
  return response.data;
}

// Usage example
const orderData = {
  userEmail: 'customer@example.com',
  userWalletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  orderId: 'ORD-2024-001234',
  orderNumber: 'ORD-2024-001234',
  totalUsdc: 89.99,
  subtotalUsdc: 89.99,
  taxUsdc: 0,
  purchaseDate: new Date(),
  items: [
    {
      productName: 'Wireless Bluetooth Headphones',
      priceUsdc: 79.99,
      quantity: 1,
      category: 'Electronics',
      asin: 'B08XYZ1234',
      productUrl: 'https://amazon.com/dp/B08XYZ1234',
      seller: 'Amazon.com'
    },
    {
      productName: 'USB-C Charging Cable (2 pack)',
      priceUsdc: 10.00,
      quantity: 1,
      category: 'Electronics',
      asin: 'B09ABC5678',
      productUrl: 'https://amazon.com/dp/B09ABC5678',
      seller: 'Amazon.com'
    }
  ],
  amazonOrderNumber: '123-4567890-1234567'
};

createSplitForAmazonPurchase(orderData)
  .then(result => {
    console.log('Split created:', result.data.splitId);
    // Redirect user to WeSplit app
    const deepLink = `wesplit://view-split?splitId=${result.data.data.splitId}&userId=${result.data.data.userId}`;
    window.location.href = deepLink;
  })
  .catch(error => console.error('Error:', error.response?.data || error.message));
```

**Python Example for Amazon Purchase:**
```python
import requests
import os
from datetime import datetime

def create_split_for_amazon_purchase(order_data):
    url = f"{os.getenv('WESPLIT_API_URL')}/createSplitFromPayment"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.getenv('WESPLIT_API_KEY')}"
    }
    data = {
        'email': order_data['user_email'],
        'walletAddress': order_data['user_wallet_address'],
        'invoiceId': f"AMZ-{order_data['order_id']}",
        'invoiceNumber': order_data['order_number'],
        'amount': order_data['total_usdc'],
        'currency': 'USDC',
        'merchant': {
            'name': 'Amazon',
            'address': '410 Terry Avenue North, Seattle, WA 98109'
        },
        'transactionDate': order_data['purchase_date'].isoformat(),
        'items': [
            {
                'name': item['product_name'],
                'price': item['price_usdc'],
                'quantity': item['quantity'],
                'category': item.get('category', 'General')
            }
            for item in order_data['items']
        ],
        'subtotal': order_data['subtotal_usdc'],
        'tax': order_data.get('tax_usdc', 0),
        'source': 'spend-amazon',
        'callbackUrl': f"https://spend.com/orders/{order_data['order_id']}/success",
        'metadata': {
            'orderId': order_data['order_id'],
            'amazonOrderNumber': order_data.get('amazon_order_number'),
            'items': [
                {
                    'asin': item.get('asin'),
                    'productUrl': item.get('product_url'),
                    'seller': item.get('seller')
                }
                for item in order_data['items']
            ]
        }
    }
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()

# Usage example
order_data = {
    'user_email': 'customer@example.com',
    'user_wallet_address': '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    'order_id': 'ORD-2024-001234',
    'order_number': 'ORD-2024-001234',
    'total_usdc': 89.99,
    'subtotal_usdc': 89.99,
    'tax_usdc': 0,
    'purchase_date': datetime.now(),
    'items': [
        {
            'product_name': 'Wireless Bluetooth Headphones',
            'price_usdc': 79.99,
            'quantity': 1,
            'category': 'Electronics',
            'asin': 'B08XYZ1234',
            'product_url': 'https://amazon.com/dp/B08XYZ1234',
            'seller': 'Amazon.com'
        }
    ],
    'amazon_order_number': '123-4567890-1234567'
}

result = create_split_for_amazon_purchase(order_data)
print(f"Split created: {result['data']['splitId']}")
```

#### Step 4: Test Your Integration

Use the test endpoint first (doesn't create real data):

```javascript
const testUrl = `${process.env.WESPLIT_API_URL}/testCreateSplitFromPayment`;
const testResponse = await axios.post(testUrl, {
  email: 'test@spend.com',
  invoiceId: 'AMZ-TEST-001',
  amount: 50.00,
  currency: 'USDC',
  merchant: { name: 'Amazon' },
  transactionDate: new Date().toISOString(),
  source: 'spend-amazon',
  items: [
    {
      name: 'Test Product',
      price: 50.00,
      quantity: 1,
      category: 'Electronics'
    }
  ]
}, { headers });
```

---

## API Reference

### Base URL

**Production**: `https://us-central1-[YOUR-PROJECT-ID].cloudfunctions.net`  
**Development**: `http://localhost:5001/[YOUR-PROJECT-ID]/us-central1`

### Authentication

All requests require an API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

⚠️ **Security Requirements:**
- Never expose API keys in client-side code
- Store in environment variables
- Use HTTPS only
- Rotate keys periodically

### Endpoints

#### POST /createSplitFromPayment

Creates a user account (if needed) and a split from payment transaction data.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body (Amazon Purchase Example):**
```json
{
  "email": "customer@example.com",
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "invoiceId": "AMZ-ORD-2024-001234",
  "invoiceNumber": "ORD-2024-001234",
  "amount": 89.99,
  "currency": "USDC",
  "merchant": {
    "name": "Amazon",
    "address": "410 Terry Avenue North, Seattle, WA 98109",
    "phone": ""
  },
  "transactionDate": "2024-01-15T14:30:00Z",
  "items": [
    {
      "name": "Wireless Bluetooth Headphones - Premium Sound Quality",
      "price": 79.99,
      "quantity": 1,
      "category": "Electronics"
    },
    {
      "name": "USB-C Charging Cable (2 pack)",
      "price": 10.00,
      "quantity": 1,
      "category": "Electronics"
    }
  ],
  "subtotal": 89.99,
  "tax": 0,
  "tip": 0,
  "receiptNumber": "AMZ-RCP-2024-001234",
  "source": "spend-amazon",
  "callbackUrl": "https://spend.com/orders/AMZ-ORD-2024-001234/success",
  "metadata": {
    "orderId": "AMZ-ORD-2024-001234",
    "amazonOrderNumber": "123-4567890-1234567",
    "items": [
      {
        "asin": "B08XYZ1234",
        "productUrl": "https://amazon.com/dp/B08XYZ1234",
        "seller": "Amazon.com",
        "imageUrl": "https://m.media-amazon.com/images/I/..."
      },
      {
        "asin": "B09ABC5678",
        "productUrl": "https://amazon.com/dp/B09ABC5678",
        "seller": "Amazon.com",
        "imageUrl": "https://m.media-amazon.com/images/I/..."
      }
    ],
    "shippingAddress": "123 Main St, City, State 12345",
    "deliveryDate": "2024-01-20"
  }
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `walletAddress` | string | No | User's Solana wallet address |
| `invoiceId` | string | Yes | Unique invoice identifier |
| `invoiceNumber` | string | No | Human-readable invoice number |
| `amount` | number | Yes | Total payment amount (> 0) |
| `currency` | string | Yes | ISO 4217 currency code |
| `merchant.name` | string | Yes | Merchant/business name |
| `merchant.address` | string | No | Merchant address |
| `merchant.phone` | string | No | Merchant phone |
| `transactionDate` | string | Yes | ISO 8601 date string |
| `items` | array | No | Line items array |
| `items[].name` | string | Yes | Item name |
| `items[].price` | number | Yes | Item price |
| `items[].quantity` | number | No | Item quantity (default: 1) |
| `items[].category` | string | No | Item category |
| `subtotal` | number | No | Subtotal before tax |
| `tax` | number | No | Tax amount |
| `tip` | number | No | Tip amount |
| `receiptNumber` | string | No | Receipt number |
| `source` | string | Yes | Source identifier |
| `callbackUrl` | string | No | Redirect URL after split creation |
| `metadata` | object | No | Custom metadata |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "userEmail": "customer@example.com",
    "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "splitId": "split_1234567890_abc",
    "splitStatus": "pending",
    "totalAmount": 89.99,
    "currency": "USDC",
    "createdAt": "2024-01-15T14:30:00Z"
  },
  "redirectUrl": "https://spend.com/orders/AMZ-ORD-2024-001234/success?splitId=split_1234567890_abc&userId=user_abc123&status=success"
}
```

**📱 App Redirection**: After receiving the response, redirect users to the WeSplit mobile app using:
```
wesplit://view-split?splitId=split_1234567890_abc&userId=user_abc123
```

See [App Redirection Guide](#app-redirection) for complete implementation details.

**Error Responses:**

- **400 Bad Request**: Validation failed (missing/invalid fields)
- **401 Unauthorized**: Invalid or missing API key
- **405 Method Not Allowed**: Request method must be POST
- **429 Too Many Requests**: Rate limit exceeded (100 requests per 15 minutes)
- **500 Internal Server Error**: Server error (retry with exponential backoff)

### Rate Limiting

- **100 requests per 15 minutes** per API key
- Rate limit headers in responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Implement exponential backoff for retries

---

## App Redirection

After successfully creating a split, you can redirect users to the WeSplit mobile app to view their split.

### Deep Link Format

**URL Scheme**: `wesplit://view-split?splitId={splitId}&userId={userId}`

**Example**:
```
wesplit://view-split?splitId=split_1234567890_abc&userId=user_abc123
```

### Implementation

```javascript
// After receiving API response
const { splitId, userId } = response.data.data;

// Build deep link
const params = new URLSearchParams({
  splitId: splitId,
  userId: userId
});
const deepLink = `wesplit://view-split?${params.toString()}`;

// Redirect user
window.location.href = deepLink;

// Fallback: If app not installed
setTimeout(() => {
  if (document.hasFocus()) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.location.href = 'https://apps.apple.com/app/wesplit';
    } else if (isAndroid) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.wesplit.app';
    }
  }
}, 2000);
```

### Complete Implementation with App Redirection

Here's a complete example that includes API integration and app redirection:

```javascript
// services/wesplit-integration.js
const axios = require('axios');
require('dotenv').config();

const WESPLIT_API_KEY = process.env.WESPLIT_API_KEY;
const WESPLIT_API_URL = process.env.WESPLIT_API_URL;

/**
 * Create split in WeSplit with retry logic
 */
async function createSplitInWeSplit(paymentData, maxRetries = 3) {
  const url = `${WESPLIT_API_URL}/createSplitFromPayment`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${WESPLIT_API_KEY}`
  };
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, paymentData, {
        headers: headers,
        timeout: 15000
      });
      
      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          redirectUrl: response.data.redirectUrl
        };
      }
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      if (error.response?.status >= 500 && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Build WeSplit deep link URL
 */
function buildWeSplitDeepLink(splitId, userId) {
  const params = new URLSearchParams({
    splitId: splitId,
    userId: userId
  });
  return `wesplit://view-split?${params.toString()}`;
}

/**
 * Redirect user to WeSplit app
 */
function redirectToWeSplitApp(splitId, userId) {
  const deepLink = buildWeSplitDeepLink(splitId, userId);
  window.location.href = deepLink;
  
  // Fallback: If app not installed
  setTimeout(() => {
    if (document.hasFocus()) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        window.location.href = 'https://apps.apple.com/app/wesplit';
      } else if (isAndroid) {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.wesplit.app';
      } else {
        alert('Please install the WeSplit mobile app to view your split.');
      }
    }
  }, 2000);
}

module.exports = {
  createSplitInWeSplit,
  buildWeSplitDeepLink,
  redirectToWeSplitApp
};
```

### Complete Integration Example

```javascript
// Handle Amazon purchase
async function handleAmazonPurchase(orderData) {
  // 1. Prepare WeSplit data
  const splitData = {
    email: orderData.user.email,
    walletAddress: orderData.user.usdcWallet,
    invoiceId: `AMZ-${orderData.orderId}`,
    amount: orderData.totalUsdc,
    currency: 'USDC',
    merchant: { name: 'Amazon' },
    transactionDate: orderData.purchaseDate.toISOString(),
    items: orderData.items.map(item => ({
      name: item.productName,
      price: item.priceUsdc,
      quantity: item.quantity
    })),
    source: 'spend-amazon',
    callbackUrl: `https://spend.com/orders/${orderData.orderId}/success`,
    metadata: {
      orderId: orderData.orderId,
      amazonOrderNumber: orderData.amazonOrderNumber
    }
  };
  
  // 2. Create split in WeSplit (async, don't block payment)
  createSplitInWeSplit(splitData)
    .then(result => {
      // Store WeSplit IDs
      saveWeSplitIds(orderData.orderId, result.data.userId, result.data.splitId);
      
      // 3. Redirect user to WeSplit app
      if (typeof window !== 'undefined') {
        redirectToWeSplitApp(result.data.splitId, result.data.userId);
      }
    })
    .catch(err => {
      console.error('WeSplit integration failed:', err);
      // Don't fail the purchase
    });
  
  return { success: true, orderId: orderData.orderId };
}
```

### Currency Support

**Important**: Currency conversion is currently limited:
- **USD and USDC**: Converted 1:1 (no conversion needed)
- **Other currencies**: Currently returns amount as-is (assumes USD equivalent)
- **For "spend"**: Since payments are in USDC, set `currency: "USDC"` - no conversion needed

**Future Enhancement**: Full currency conversion API integration planned.

---

## Integration Guide

This section provides a detailed, step-by-step guide for integrating with WeSplit. Follow each step carefully and ensure all security requirements are met.

### Prerequisites

Before starting, ensure you have:
- ✅ Your web application with payment processing capabilities
- ✅ Server-side backend (Node.js, Python, PHP, etc.) - **Client-side JavaScript is NOT supported**
- ✅ HTTPS endpoint (required for production)
- ✅ API key from WeSplit (contact api-support@wesplit.com)

---

## Step-by-Step Integration Process

### Step 1: Obtain and Secure Your API Key

#### 1.1 Request API Key

**What to do:**
- Contact WeSplit: api-support@wesplit.com
- Provide:
  - Your application name
  - Contact email
  - Expected request volume (requests per day)
  - Production domain/IP addresses (for IP whitelisting if needed)

**What you'll receive:**
- ✅ Unique API key (keep this secret!)
- ✅ Base URL: `https://us-central1-[PROJECT-ID].cloudfunctions.net`
- ✅ Test endpoint URL for development

#### 1.2 Store API Key Securely

**⚠️ CRITICAL SECURITY REQUIREMENTS:**

1. **Never store in code:**
   ```javascript
   // ❌ NEVER DO THIS
   const API_KEY = "your_key_here";
   ```

2. **Use environment variables:**
   ```bash
   # ✅ DO THIS - .env file (add to .gitignore)
   WESPLIT_API_KEY=your_api_key_here
   WESPLIT_API_URL=https://us-central1-[PROJECT-ID].cloudfunctions.net
   ```

3. **Verify .gitignore includes .env:**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.production
   ```

4. **Load in your application:**
   ```javascript
   // Node.js
   require('dotenv').config();
   const API_KEY = process.env.WESPLIT_API_KEY;
   ```
   ```python
   # Python
   import os
   from dotenv import load_dotenv
   load_dotenv()
   API_KEY = os.getenv('WESPLIT_API_KEY')
   ```

**Security Checklist:**
- [ ] API key stored in environment variable
- [ ] `.env` file added to `.gitignore`
- [ ] API key never committed to version control
- [ ] API key only accessible from server-side code
- [ ] Different keys for development and production (if applicable)

---

### Step 2: Understand What Data You Need to Provide

#### 2.1 Required Data (Must Provide)

You **MUST** provide the following data for each payment transaction:

| Field | Type | Why We Need It | Example |
|-------|------|----------------|---------|
| `email` | string | To identify/create user account | `"customer@example.com"` |
| `invoiceId` | string | Unique transaction identifier | `"INV-2024-001"` |
| `amount` | number | Total payment amount | `100.00` |
| `currency` | string | Original currency (converted to USDC) | `"USD"` |
| `merchant.name` | string | Business name for the split | `"My Restaurant"` |
| `transactionDate` | string | When the transaction occurred | `"2024-01-15T12:30:00Z"` |
| `source` | string | Your app identifier | `"spend-amazon"` |

**Why each field is required:**
- **email**: We use this to find existing users or create new accounts. This is the primary identifier.
- **invoiceId**: Unique identifier to prevent duplicate splits. Must be unique per transaction.
- **amount**: The total amount to split. Must be a positive number.
- **currency**: We convert all amounts to USDC, but need the original currency for accurate conversion.
- **merchant.name**: Displayed in the split for users to identify the transaction.
- **transactionDate**: Used for sorting and displaying splits chronologically.
- **source**: Helps us identify which external app created the split (for analytics and support).

#### 2.2 Optional Data (Recommended)

These fields improve the user experience but are not required:

| Field | Type | Why It Helps | Example |
|-------|------|--------------|---------|
| `walletAddress` | string | Links user's existing Solana wallet | `"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"` |
| `invoiceNumber` | string | Human-readable invoice number | `"2024-001"` |
| `items` | array | Line item breakdown for detailed splits | See below |
| `subtotal` | number | Subtotal before tax | `90.00` |
| `tax` | number | Tax amount | `10.00` |
| `tip` | number | Tip amount | `15.00` |
| `receiptNumber` | string | Receipt number for reference | `"RCP-12345"` |
| `merchant.address` | string | Merchant location | `"123 Main St"` |
| `merchant.phone` | string | Merchant contact | `"+1234567890"` |
| `callbackUrl` | string | URL to redirect user after split creation | `"https://your-app.com/success"` |

**Why optional fields help:**
- **walletAddress**: If user already has a Solana wallet, we can link it instead of creating a new one.
- **items**: Allows users to see detailed breakdown of what they're splitting.
- **subtotal/tax/tip**: Provides transparency in the split calculation.
- **callbackUrl**: Allows you to redirect users back to your app after split creation.

---

## How the Split Appears to Users

### What Happens After You Send the Data

1. **Split is Created:**
   - User account is created/retrieved
   - Split is stored in WeSplit database
   - Split includes all invoice details you provided

2. **User Opens WeSplit App:**
   - Split appears in their "Splits" list automatically
   - They see: Invoice title, merchant name, amount, date
   - Status shows as "Pending"

3. **User Taps the Split:**
   - Opens split details screen
   - Sees complete invoice:
     - Merchant information
     - Transaction date and time
     - Line items (if you provided them)
     - Subtotal, tax, tip breakdown
     - Receipt number

4. **User Can Then:**
   - **View the Invoice**: See all payment details
   - **Invite Others** (optional): Add friends/contacts to split the bill
   - **Create Split Wallet**: Set up payment collection
   - **Collect Payments**: Participants pay their share

### Important Notes

- **The split is personal to the user** - Only they see it initially
- **They can invite others** - If they want to split with friends
- **They control the flow** - They decide when to create wallet and collect payments
- **All data is preserved** - Invoice details, items, merchant info all stored
- **Real-time updates** - If they invite others, all participants see updates

#### 2.3 Data Format Requirements

**Email:**
- Must be valid email format: `user@domain.com`
- Will be converted to lowercase
- Must be unique per user

**Amount:**
- Must be a positive number
- Can include decimals (e.g., `100.50`)
- Maximum: 1,000,000 (for security)

**Currency:**
- ISO 4217 format (e.g., `USD`, `EUR`, `GBP`)
- Will be converted to USDC automatically

**Transaction Date:**
- ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- Example: `"2024-01-15T12:30:00Z"`
- Must be in UTC timezone

**Wallet Address (if provided):**
- Solana base58 format
- 32-44 characters
- Must be a valid Solana address

---

### Step 3: Prepare Your Payment Data

#### 3.1 Capture Transaction Data

When a user completes a payment on your platform, capture the following:

```javascript
// Example: After successful payment processing
const transaction = {
  id: 'INV-2024-001',              // Your unique transaction ID
  userEmail: user.email,           // User's email
  userWallet: user.solanaWallet,   // Optional: User's wallet if they have one
  totalAmount: 100.00,             // Total payment amount
  currency: 'USDC',                // Payment currency (USDC for spend)
  merchant: {
    name: 'Amazon',
    address: '410 Terry Avenue North, Seattle, WA 98109',  // Optional
    phone: ''                      // Optional
  },
  items: [                         // Optional: Line items
    { name: 'Wireless Bluetooth Headphones', price: 79.99, quantity: 1, category: 'Electronics' },
    { name: 'USB-C Charging Cable (2 pack)', price: 10.00, quantity: 1, category: 'Electronics' }
  ],
  subtotal: 90.00,                 // Optional
  tax: 10.00,                      // Optional
  tip: 0,                          // Optional
  receiptNumber: 'RCP-12345',      // Optional
  createdAt: new Date()            // Transaction timestamp
};
```

#### 3.2 Validate Data Before Sending

**Security Requirement:** Always validate data on your side before sending to WeSplit.

```javascript
function validatePaymentData(data) {
  const errors = [];
  
  // Required fields
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }
  
  if (!data.invoiceId || typeof data.invoiceId !== 'string' || data.invoiceId.trim() === '') {
    errors.push('Invoice ID is required and must be a non-empty string');
  }
  
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Amount must be a positive number');
  }
  
  if (data.amount > 1000000) {
    errors.push('Amount exceeds maximum allowed value');
  }
  
  if (!data.currency || typeof data.currency !== 'string') {
    errors.push('Currency is required');
  }
  
  if (!data.merchant || !data.merchant.name || typeof data.merchant.name !== 'string') {
    errors.push('Merchant name is required');
  }
  
  if (!data.transactionDate || !isValidISODate(data.transactionDate)) {
    errors.push('Valid transaction date (ISO 8601) is required');
  }
  
  if (!data.source || typeof data.source !== 'string') {
    errors.push('Source identifier is required');
  }
  
  // Optional field validation
  if (data.walletAddress && !isValidSolanaAddress(data.walletAddress)) {
    errors.push('Invalid Solana wallet address format');
  }
  
  return errors.length === 0 ? null : errors;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidISODate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

function isValidSolanaAddress(address) {
  return typeof address === 'string' && address.length >= 32 && address.length <= 44;
}
```

#### 3.3 Sanitize Data

**Security Requirement:** Sanitize all user inputs to prevent XSS and injection attacks.

```javascript
function sanitizePaymentData(data) {
  return {
    email: data.email.toLowerCase().trim(),
    walletAddress: data.walletAddress ? data.walletAddress.trim() : undefined,
    invoiceId: data.invoiceId.trim(),
    invoiceNumber: data.invoiceNumber ? data.invoiceNumber.trim() : undefined,
    amount: parseFloat(data.amount),
    currency: data.currency.toUpperCase().trim(),
    merchant: {
      name: sanitizeString(data.merchant.name),
      address: data.merchant.address ? sanitizeString(data.merchant.address) : undefined,
      phone: data.merchant.phone ? sanitizeString(data.merchant.phone) : undefined
    },
    transactionDate: new Date(data.transactionDate).toISOString(),
    items: data.items ? data.items.map(item => ({
      name: sanitizeString(item.name),
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity) || 1,
      category: item.category ? sanitizeString(item.category) : undefined
    })) : undefined,
    subtotal: data.subtotal ? parseFloat(data.subtotal) : undefined,
    tax: data.tax ? parseFloat(data.tax) : undefined,
    tip: data.tip ? parseFloat(data.tip) : undefined,
    receiptNumber: data.receiptNumber ? sanitizeString(data.receiptNumber) : undefined,
    source: sanitizeString(data.source),
    callbackUrl: data.callbackUrl ? data.callbackUrl.trim() : undefined
  };
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

---

### Step 4: Send Data to WeSplit API

#### 4.1 Prepare Request

**Security Requirements:**
1. Use HTTPS only (never HTTP)
2. Include API key in Authorization header
3. Set proper Content-Type header
4. Set reasonable timeout (10-15 seconds recommended)

```javascript
async function sendToWeSplit(paymentData) {
  // 1. Validate data
  const validationErrors = validatePaymentData(paymentData);
  if (validationErrors) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  // 2. Sanitize data
  const sanitizedData = sanitizePaymentData(paymentData);
  
  // 3. Prepare request
  const url = `${process.env.WESPLIT_API_URL}/createSplitFromPayment`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.WESPLIT_API_KEY}`
  };
  
  // 4. Make request with timeout
  const response = await axios.post(url, sanitizedData, {
    headers: headers,
    timeout: 10000, // 10 second timeout
    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
  });
  
  return response;
}
```

#### 4.2 Handle Response

```javascript
async function createSplitInWeSplit(paymentData) {
  try {
    const response = await sendToWeSplit(paymentData);
    
    if (response.status === 200 && response.data.success) {
      const { userId, splitId, redirectUrl } = response.data.data;
      
      // Store WeSplit IDs in your database
      await saveWeSplitIds(paymentData.invoiceId, userId, splitId);
      
      // Log success
      logger.info('Split created successfully', {
        invoiceId: paymentData.invoiceId,
        splitId: splitId,
        userId: userId
      });
      
      return {
        success: true,
        userId: userId,
        splitId: splitId,
        redirectUrl: redirectUrl
      };
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    // Handle errors (see Error Handling section)
    throw error;
  }
}
```

#### 4.3 Implement Retry Logic

**Security Requirement:** Implement exponential backoff for retries to respect rate limits.

```javascript
async function createSplitWithRetry(paymentData, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await createSplitInWeSplit(paymentData);
    } catch (error) {
      // Don't retry on 4xx errors (except 429)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }
      
      // Rate limited - wait longer
      if (error.response?.status === 429) {
        const retryAfter = error.response.data.retryAfter;
        const waitTime = retryAfter 
          ? new Date(retryAfter).getTime() - Date.now()
          : Math.pow(2, attempt) * 1000; // Exponential backoff
        
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        continue;
      }
      
      // Server error - retry with exponential backoff
      if (error.response?.status >= 500 && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw error;
    }
  }
}
```

---

### Step 5: Integrate into Your Payment Flow

#### 5.1 Add to Payment Handler

```javascript
// Your payment processing endpoint
app.post('/api/payments/process', async (req, res) => {
  try {
    // 1. Process Amazon purchase on your platform
    const orderData = await processAmazonPurchase(req.body);
    
    // 2. Create split in WeSplit (async, don't block payment)
    // Don't fail payment if WeSplit integration fails
    createSplitWithRetry({
      email: orderData.user.email,
      walletAddress: orderData.user.usdcWallet, // User's USDC wallet from spend
      invoiceId: `AMZ-${orderData.orderId}`,
      invoiceNumber: orderData.orderNumber,
      amount: orderData.totalUsdc, // Total in USDC
      currency: 'USDC', // Payment is in USDC
      merchant: {
        name: 'Amazon',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        phone: ''
      },
      transactionDate: orderData.purchaseDate.toISOString(),
      items: orderData.items.map(item => ({
        name: item.productName,
        price: item.priceUsdc,
        quantity: item.quantity,
        category: item.category || 'General'
      })),
      subtotal: orderData.subtotalUsdc,
      tax: orderData.taxUsdc || 0,
      tip: 0, // Not applicable for Amazon
      receiptNumber: `AMZ-RCP-${orderData.orderId}`,
      source: 'spend-amazon',
      callbackUrl: `https://spend.com/orders/${orderData.orderId}/success`,
      metadata: {
        orderId: orderData.orderId,
        amazonOrderNumber: orderData.amazonOrderNumber,
        items: orderData.items.map(item => ({
          asin: item.asin,
          productUrl: item.productUrl,
          seller: item.seller
        }))
      }
    }).then(result => {
      // Store WeSplit IDs
      saveWeSplitIds(orderData.orderId, result.data.userId, result.data.splitId);
    }).catch(err => {
      // Log error but don't fail payment
      logger.error('WeSplit integration failed', {
        orderId: orderData.orderId,
        error: err.message
      });
    });
    
    // 3. Return success to user
    res.json({ 
      success: true, 
      orderId: orderData.orderId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 5.2 Store WeSplit IDs

Store the returned `userId` and `splitId` in your database:

```javascript
async function saveWeSplitIds(invoiceId, userId, splitId) {
  await db.transactions.update(invoiceId, {
    wesplitUserId: userId,
    wesplitSplitId: splitId,
    wesplitIntegrated: true,
    wesplitIntegratedAt: new Date()
  });
}
```

---

### Step 6: Handle Errors Properly

See [Error Handling](#error-handling) section for detailed error handling.

---

### Step 7: Test Your Integration

See [Testing](#testing) section for testing procedures.

---

### Step 8: Deploy to Production

See [Production Deployment](#production-deployment) section for deployment checklist.

---

## Data Format

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `email` | string | User's email address | `"customer@example.com"` |
| `invoiceId` | string | Unique invoice/transaction ID | `"AMZ-ORD-2024-001234"` |
| `amount` | number | Total payment amount | `89.99` |
| `currency` | string | ISO 4217 currency code | `"USDC"` |
| `merchant.name` | string | Merchant name | `"Amazon"` |
| `transactionDate` | string | ISO 8601 date string | `"2024-01-15T14:30:00Z"` |
| `source` | string | Your app identifier | `"spend-amazon"` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `walletAddress` | string | User's Solana wallet address | `"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"` |
| `invoiceNumber` | string | Human-readable invoice number | `"2024-001"` |
| `items` | array | Line items breakdown | See below |
| `subtotal` | number | Subtotal before tax | `90.00` |
| `tax` | number | Tax amount | `10.00` |
| `tip` | number | Tip amount | `15.00` |
| `receiptNumber` | string | Receipt number | `"RCP-12345"` |
| `merchant.address` | string | Business address | `"123 Main St"` |
| `merchant.phone` | string | Business phone | `"+1234567890"` |
| `callbackUrl` | string | URL to redirect user after split creation | `"https://your-app.com/success"` |
| `metadata` | object | Custom metadata | `{"orderId": "ORD-123"}` |

### Items Array Format

```json
{
  "items": [
    {
      "name": "Product Name",
      "price": 25.00,
      "quantity": 2,
      "category": "Food"
    }
  ]
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process the response |
| 400 | Bad Request | Check request format and required fields |
| 401 | Unauthorized | Verify API key is correct |
| 429 | Rate Limited | Wait before retrying (check Retry-After) |
| 500 | Server Error | Retry with exponential backoff |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### Retry Logic

Implement exponential backoff for retries:

```javascript
async function createSplitWithRetry(paymentData, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await createSplitInWeSplit(paymentData);
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - wait longer
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (error.response?.status >= 500 && attempt < maxRetries - 1) {
        // Server error - retry
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Don't retry for 4xx errors (except 429)
      throw error;
    }
  }
}
```

---

## Security

### API Key Security

✅ **DO:**
- Store API key in environment variables
- Use server-side code only
- Rotate API keys periodically
- Use different keys for development and production

❌ **DON'T:**
- Commit API keys to version control
- Expose API keys in client-side JavaScript
- Share API keys publicly
- Use the same key for multiple environments

### Data Validation

Always validate data before sending:

```javascript
function validatePaymentData(data) {
  const errors = [];
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Invalid email');
  }
  
  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be positive');
  }
  
  if (!data.invoiceId || data.invoiceId.trim() === '') {
    errors.push('Invoice ID is required');
  }
  
  return errors.length === 0 ? null : errors;
}
```

### HTTPS Only

Always use HTTPS in production. Never send API requests over HTTP.

### Rate Limiting

Respect rate limits:
- 100 requests per 15 minutes per API key
- Implement client-side rate limiting
- Use exponential backoff for retries

### Input Sanitization

Sanitize all user inputs before sending:

```javascript
function sanitizeEmail(email) {
  return email.toLowerCase().trim();
}

function sanitizeString(str) {
  return str.trim().replace(/[<>]/g, '');
}
```

---

## Testing

### Step 1: Use Test Endpoint

Before going live, test with the test endpoint:

```javascript
const TEST_URL = `${API_URL}/testCreateSplitFromPayment`;

// Test request
const testData = {
  email: 'test@example.com',
  invoiceId: 'TEST-INV-001',
  amount: 50.00,
  currency: 'USD',
  merchant: {
    name: 'Test Merchant'
  },
  transactionDate: new Date().toISOString(),
  source: 'test'
};

const response = await axios.post(TEST_URL, testData, { headers });
```

### Step 2: Test Scenarios

Test the following scenarios:

1. **Valid Request**: All required fields provided
2. **Missing Required Fields**: Test error handling
3. **Invalid Email**: Test validation
4. **Invalid Amount**: Test negative/zero amounts
5. **Rate Limiting**: Test with multiple rapid requests
6. **Network Errors**: Test timeout and connection errors

### Step 3: Integration Testing

Test the full flow:

```javascript
// 1. User makes payment on your platform
const transaction = await processPayment(userId, amount);

// 2. Create split in WeSplit
const splitResult = await createSplitInWeSplit({
  email: user.email,
  invoiceId: transaction.id,
  amount: transaction.total,
  currency: transaction.currency,
  merchant: { name: 'Your Business' },
  transactionDate: new Date().toISOString(),
  source: 'your-app'
});

// 3. Verify split was created
assert(splitResult.success === true);
assert(splitResult.data.splitId !== undefined);

// 4. Store IDs in your database
await linkWeSplitIds(transaction.id, splitResult.data.userId, splitResult.data.splitId);
```

---

## Production Deployment

### Checklist

- [ ] API key stored in environment variables
- [ ] HTTPS enabled
- [ ] Error handling implemented
- [ ] Retry logic with exponential backoff
- [ ] Rate limiting respected
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Test endpoint verified
- [ ] Production endpoint tested
- [ ] Database schema updated to store WeSplit IDs

### Monitoring

Set up monitoring for:

1. **API Response Times**: Track average response time
2. **Error Rates**: Monitor 4xx and 5xx errors
3. **Rate Limit Hits**: Track 429 responses
4. **Success Rate**: Monitor successful split creation

### Logging

Log all API interactions:

```javascript
logger.info('WeSplit API Request', {
  invoiceId: paymentData.invoiceId,
  amount: paymentData.amount,
  timestamp: new Date().toISOString()
});

logger.info('WeSplit API Response', {
  success: response.data.success,
  splitId: response.data.data?.splitId,
  userId: response.data.data?.userId
});
```

---

## Common Questions

### What happens if I send the same invoiceId twice?

**Answer**: Each request creates a new split. The API is **NOT idempotent**. To prevent duplicate splits:
- Ensure `invoiceId` is unique per transaction
- Use a combination of order ID + timestamp if needed
- Check if split already exists before sending (store WeSplit IDs in your database)

### How does currency conversion work?

**Answer**: 
- **USD/USDC**: Converted 1:1 (no conversion)
- **Other currencies**: Currently returns amount as-is (assumes USD)
- **For USDC payments**: Set `currency: "USDC"` - no conversion needed

### What is the maximum amount allowed?

**Answer**: There is no maximum amount enforced in the API. However, ensure amounts are reasonable and match your business logic.

### Is the API idempotent?

**Answer**: No. Each request creates a new split. Use unique `invoiceId` values to prevent duplicates.

### What should I do with rate limit headers?

**Answer**: Monitor `X-RateLimit-Remaining` header:
- If remaining is low (< 20), implement client-side rate limiting
- Implement exponential backoff when you receive 429 errors
- Track rate limit usage to optimize request patterns

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API key" Error

**Solution:**
- Verify API key is correct
- Check Authorization header format: `Bearer YOUR_API_KEY`
- Ensure API key is active (contact support)

#### 2. "Rate limit exceeded" Error

**Solution:**
- Wait before retrying (check `retryAfter` in response)
- Implement exponential backoff
- Reduce request frequency

#### 3. "Validation failed" Error

**Solution:**
- Check all required fields are present
- Verify data types (email is string, amount is number)
- Ensure email format is valid
- Check amount is positive

#### 4. Network Timeout

**Solution:**
- Increase timeout (recommended: 10-15 seconds)
- Implement retry logic
- Check your server's network connectivity

#### 5. "User creation failed" Error

**Solution:**
- Verify email is valid and not blocked
- Check wallet address format (if provided)
- Contact support if issue persists

### Getting Help

If you encounter issues:

1. Check error response for detailed messages
2. Review this documentation
3. Test with the test endpoint
4. Contact WeSplit support:
   - Email: api-support@wesplit.com
   - Include: API key (masked), error message, request data (sanitized)

---

## Example Integration

### Complete Node.js Example

```javascript
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.WESPLIT_API_KEY;
const API_URL = process.env.WESPLIT_API_URL;

async function integrateWeSplit(orderData) {
  try {
    // Prepare payment data
    const paymentData = {
      email: orderData.user.email,
      walletAddress: orderData.user.usdcWallet, // User's USDC wallet from spend
      invoiceId: `AMZ-${orderData.orderId}`,
      invoiceNumber: orderData.orderNumber,
      amount: orderData.totalUsdc, // Total in USDC
      currency: 'USDC', // Payment is in USDC
      merchant: {
        name: 'Amazon',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        phone: ''
      },
      transactionDate: orderData.purchaseDate.toISOString(),
      items: orderData.items.map(item => ({
        name: item.productName,
        price: item.priceUsdc,
        quantity: item.quantity,
        category: item.category || 'General'
      })),
      subtotal: orderData.subtotalUsdc,
      tax: orderData.taxUsdc || 0,
      tip: 0, // Not applicable for Amazon
      receiptNumber: `AMZ-RCP-${orderData.orderId}`,
      source: 'spend-amazon',
      callbackUrl: `https://spend.com/orders/${orderData.orderId}/success`,
      metadata: {
        orderId: orderData.orderId,
        amazonOrderNumber: orderData.amazonOrderNumber,
        items: orderData.items.map(item => ({
          asin: item.asin,
          productUrl: item.productUrl,
          seller: item.seller
        }))
      }
    };
    
    // Send to WeSplit
    const response = await axios.post(
      `${API_URL}/createSplitFromPayment`,
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 10000
      }
    );
    
    if (response.data.success) {
      const { userId, splitId, redirectUrl } = response.data.data;
      
      // Store in your database
      await db.transactions.update(transaction.id, {
        wesplitUserId: userId,
        wesplitSplitId: splitId,
        wesplitIntegrated: true
      });
      
      // Return redirect URL if provided
      return {
        success: true,
        redirectUrl: redirectUrl,
        splitId: splitId,
        userId: userId
      };
    } else {
      throw new Error(response.data.error);
    }
    
  } catch (error) {
    console.error('WeSplit integration error:', error.response?.data || error.message);
    
    // Log error but don't fail the transaction
    await db.errors.create({
      transactionId: transaction.id,
      error: error.message,
      timestamp: new Date()
    });
    
    throw error;
  }
}

// Usage in your payment handler
app.post('/api/payments/process', async (req, res) => {
  try {
    // Process payment
    const transaction = await processPayment(req.body);
    
    // Integrate with WeSplit (async, don't block payment)
    integrateWeSplit(transaction).catch(err => {
      console.error('WeSplit integration failed:', err);
      // Don't fail payment if WeSplit fails
    });
    
    res.json({ success: true, transactionId: transaction.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Amazon Purchase Integration Example

### Use Case: Amazon Articles Paid with USDC

If you're integrating Amazon purchases (e.g., users buying Amazon products with USDC), here's a specific example:

#### Example Request for Amazon Purchase

```javascript
const amazonPurchase = {
  email: "customer@example.com",
  walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // User's USDC wallet
  invoiceId: "AMZ-ORD-2024-001234", // Your unique order ID
  invoiceNumber: "ORD-2024-001234",
  amount: 89.99, // Total in USDC (already USDC, no conversion needed)
  currency: "USDC", // Since payment is in USDC
  merchant: {
    name: "Amazon", // Use "Amazon" as merchant name
    address: "410 Terry Avenue North, Seattle, WA 98109", // Amazon HQ (optional)
    phone: "" // Not applicable for Amazon
  },
  transactionDate: "2024-01-15T14:30:00Z",
  items: [
    {
      name: "Wireless Bluetooth Headphones - Premium Sound Quality",
      price: 79.99,
      quantity: 1,
      category: "Electronics"
    },
    {
      name: "USB-C Charging Cable (2 pack)",
      price: 10.00,
      quantity: 1,
      category: "Electronics"
    }
  ],
  subtotal: 89.99,
  tax: 0, // No tax if applicable, or include if charged
  tip: 0, // Not applicable for Amazon
  receiptNumber: "AMZ-RCP-2024-001234",
  source: "spend-amazon", // Your source identifier
  callbackUrl: "https://spend.com/order/AMZ-ORD-2024-001234/success",
  metadata: {
    // Amazon-specific metadata (optional but recommended)
    orderId: "AMZ-ORD-2024-001234",
    amazonOrderNumber: "123-4567890-1234567", // Amazon's order number
    items: [
      {
        asin: "B08XYZ1234", // Amazon ASIN
        productUrl: "https://amazon.com/dp/B08XYZ1234",
        seller: "Amazon.com", // Or actual seller name
        imageUrl: "https://m.media-amazon.com/images/..." // Product image (optional)
      },
      {
        asin: "B09ABC5678",
        productUrl: "https://amazon.com/dp/B09ABC5678",
        seller: "Amazon.com",
        imageUrl: "https://m.media-amazon.com/images/..."
      }
    ],
    shippingAddress: "123 Main St, City, State 12345", // Optional
    deliveryDate: "2024-01-20" // Expected delivery date (optional)
  }
};

// Send to WeSplit
const response = await axios.post(
  `${API_URL}/createSplitFromPayment`,
  amazonPurchase,
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  }
);
```

#### Key Points for Amazon Integration

1. **Currency**: Since users pay with USDC, set `currency: "USDC"` - no conversion needed
2. **Merchant Name**: Use `"Amazon"` as the merchant name
3. **Items**: Include product details in the `items` array
4. **Metadata**: Store Amazon-specific data (ASIN, product URLs) in the `metadata` field
5. **Invoice ID**: Use your unique order ID (must be unique per transaction)
6. **Source**: Use a descriptive source like `"spend-amazon"` for tracking

#### What Users Will See

After you send this data:
- ✅ **User account automatically created** (if new user)
- ✅ **Split automatically created** and appears in user's WeSplit app
- ✅ Title: "Invoice ORD-2024-001234"
- ✅ Merchant: "Amazon"
- ✅ Items: Both products listed with prices
- ⚠️ **WeSplit Wallet**: Created automatically when user first opens the app (one-time setup)
- ✅ User can invite others to split the cost
- ✅ User can create split wallet to collect payments from others

**Important Notes:**
- **Account Creation**: ✅ Fully automatic - no user action needed
- **Split Creation**: ✅ Fully automatic - no user action needed  
- **WeSplit Wallet**: ⚠️ Created automatically when user opens app for first time (requires app to be opened once)
- **External Wallet**: If you provide `walletAddress`, it's linked immediately (this is the user's USDC wallet from "spend", not a WeSplit wallet)

#### Complete Integration Flow

```javascript
// 1. User completes Amazon purchase on your platform with USDC
async function handleAmazonPurchase(orderData) {
  // 2. Prepare WeSplit data
  const splitData = {
    email: orderData.user.email,
    walletAddress: orderData.user.usdcWallet, // User's USDC wallet
    invoiceId: `AMZ-${orderData.orderId}`,
    invoiceNumber: orderData.orderNumber,
    amount: orderData.totalUsdc, // Already in USDC
    currency: "USDC",
    merchant: {
      name: "Amazon"
    },
    transactionDate: orderData.purchaseDate.toISOString(),
    items: orderData.items.map(item => ({
      name: item.productName,
      price: item.priceUsdc,
      quantity: item.quantity,
      category: item.category || "General"
    })),
    subtotal: orderData.subtotalUsdc,
    tax: orderData.taxUsdc || 0,
    source: "spend-amazon",
    callbackUrl: `https://spend.com/orders/${orderData.orderId}/success`,
    metadata: {
      orderId: orderData.orderId,
      amazonOrderNumber: orderData.amazonOrderNumber,
      items: orderData.items.map(item => ({
        asin: item.asin,
        productUrl: item.productUrl,
        seller: item.seller
      }))
    }
  };
  
  // 3. Send to WeSplit (async, don't block payment)
  createSplitWithRetry(splitData)
    .then(result => {
      // Store WeSplit IDs in your database
      saveWeSplitIds(orderData.orderId, result.userId, result.splitId);
      console.log('Split created:', result.splitId);
    })
    .catch(err => {
      // Log error but don't fail the purchase
      console.error('WeSplit integration failed:', err);
    });
  
  // 4. Complete purchase on your platform
  return { success: true, orderId: orderData.orderId };
}
```

---

## Implementation Checklist

### Pre-Implementation

- [ ] Contact WeSplit for API key (api-support@wesplit.com)
- [ ] Store API key in environment variables
- [ ] Add `.env` to `.gitignore`
- [ ] Review all required fields
- [ ] Review app redirection guide

### Implementation

- [ ] Create helper functions (validate, sanitize, createSplit)
- [ ] Implement retry logic with exponential backoff
- [ ] Add error handling
- [ ] Implement app redirection
- [ ] Add fallback for app not installed
- [ ] Store WeSplit IDs in database
- [ ] Add logging

### Testing

- [ ] Test with test endpoint
- [ ] Test with valid data
- [ ] Test error scenarios
- [ ] Test app redirection on iOS
- [ ] Test app redirection on Android
- [ ] Test fallback behavior

### Deployment

- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor API responses
- [ ] Monitor error rates
- [ ] Set up alerts

---

## Next Steps

1. **Obtain API Key**: Contact WeSplit to get your API key
2. **Set Up Environment**: Configure environment variables
3. **Test Integration**: Use test endpoint to verify
4. **Implement in Code**: Add integration to your payment flow
5. **Implement App Redirection**: Add deep link redirection
6. **Deploy to Production**: Test thoroughly before going live
7. **Monitor**: Set up monitoring and logging

For questions or support, contact: api-support@wesplit.com

