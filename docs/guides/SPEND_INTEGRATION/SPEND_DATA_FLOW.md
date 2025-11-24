# SPEND Data Flow Documentation

## Overview
This document describes how SPEND split data flows through the system, from creation to display.

## Data Storage Structure

### Firestore Collection: `splits`

SPEND splits are stored in the `splits` Firestore collection with the following structure:

```typescript
{
  id: string;                    // Split ID (e.g., "split_1234567890_abc")
  billId: string;                // Bill ID
  title: string;                 // "Order {order_number}"
  description: string;           // "Split for {store} order"
  totalAmount: number;           // Total amount in USDC
  currency: string;              // "USDC"
  splitType: "spend";            // Identifies as SPEND split
  status: string;                // "active", "completed", etc.
  creatorId: string;             // User ID of creator
  participants: Array<{           // Array of participants
    userId: string;
    name: string;
    walletAddress: string;
    amountOwed: number;
    amountPaid: number;
    status: string;
  }>;
  externalMetadata: {            // SPEND-specific metadata
    paymentMode: "merchant_gateway";
    treasuryWallet: string;       // SPEND treasury wallet address
    orderId: string;             // SP3ND order ID
    orderNumber: string;         // SP3ND order number (e.g., "ORD-1234567890")
    orderStatus: string;         // SP3ND order status
    store: string;              // Store name (e.g., "amazon", "temu", "jumia")
    webhookUrl: string;          // Webhook URL for payment notifications
    webhookSecret: string;       // Webhook secret for authentication
    paymentThreshold: number;    // Payment threshold (e.g., 1.0 = 100%)
    paymentTimeout: number;      // Payment timeout in days
    paymentStatus: string;       // "pending", "processing", "paid", etc.
    paymentAttempts: number;     // Number of payment attempts
    paymentTransactionSig?: string; // Transaction signature when paid
    orderData: {                 // **Full SP3ND order object** (see below)
      id: string;
      order_number: string;
      status: string;
      store: string;
      total_amount: number;
      currency: string;
      payment_method: string;
      created_at: string;
      updated_at: string;
      user_wallet: string;
      items: Array<{
        product_id: string;
        product_title: string;
        product_url: string;
        image_url: string;
        price: number;
        quantity: number;
        isPrimeEligible: boolean;
        variants: Array<{
          type: string;
          value: string;
        }>;
      }>;
      shipping_address: {...};
      shipping_method: {...};
      // ... other SP3ND order fields
    };
  };
  walletId?: string;             // Split wallet ID (created automatically)
  walletAddress?: string;         // Split wallet address
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

## Data Flow

### 1. Backend: Split Creation

**Entry Point**: `services/firebase-functions/src/externalPaymentIntegration.js`

**Function**: `createSplitFromPayment(user, paymentData)`

**Process**:
1. SP3ND sends POST request to `/createSplitFromPayment` with order data
2. Order data can be in multiple formats:
   - `paymentData.order` (root level)
   - `paymentData.metadata.orderData`
   - `paymentData.metadata.order`
3. Function extracts SP3ND order from these locations
4. Converts amounts to USDC if needed
5. Maps SP3ND order items to WeSplit item format
6. Creates split document in Firestore with:
   - `splitType: "spend"`
   - Full SP3ND order stored in `externalMetadata.orderData`
   - Order metadata in `externalMetadata` (orderId, orderNumber, store, etc.)
7. Returns created split

**Key Code**:
```javascript
// Extract SP3ND order
const sp3ndOrder = paymentData.order || metadata.orderData || metadata.order;

// Store full order in externalMetadata
externalMetadata: {
  orderData: sp3ndOrder,  // Full SP3ND order object
  orderId: sp3ndOrder.id,
  orderNumber: sp3ndOrder.order_number,
  // ... other metadata
}
```

### 2. Frontend: Split Fetching

**Service**: `src/services/splits/splitStorageService.ts`

**Methods**:
- `SplitStorageService.getSplit(splitId)` - Get split by ID
- `SplitStorageService.getSplitByBillId(billId)` - Get split by bill ID

**Process**:
1. Query Firestore `splits` collection
2. Filter by `splitType === "spend"` if needed
3. Return split document with all `externalMetadata.orderData`

### 3. Frontend: Data Extraction

**Utility**: `src/utils/spend/spendDataUtils.ts`

**Function**: `extractOrderData(split)`

**Process**:
1. Extracts `orderData` from `split.externalMetadata.orderData`
2. Falls back to `split.externalMetadata` fields if `orderData` not present
3. Returns structured data:
   ```typescript
   {
     orderData: {},        // Full SP3ND order
     orderId: string,     // From orderData.id or orderData.order_number
     orderNumber: string, // From orderData.order_number
     orderStatus: string, // From orderData.status
     store: string,       // From orderData.store
     items: Array,        // From orderData.items or split.items
   }
   ```

**Usage**:
```typescript
import { extractOrderData } from '../../utils/spend/spendDataUtils';

const { orderId, orderNumber, orderStatus, store, items } = extractOrderData(splitData);
```

### 4. Frontend: Component Display

**Components**:
- `SpendSplitScreen` - Main screen
- `SpendSplitHeader` - Header with order info
- `SpendSplitProgress` - Payment progress
- `SpendSplitParticipants` - Participant list

**Data Flow**:
1. `SpendSplitScreen` receives `splitData` from route params
2. Uses `extractOrderData()` to get order information
3. Passes extracted data to child components
4. Components display data from `orderData`:
   - Order number: `orderData.order_number`
   - Status: `orderData.status`
   - Items: `orderData.items`
   - Store: `orderData.store`
   - Total: `orderData.total_amount`

## Key Points

1. **Full Order Storage**: The complete SP3ND order object is stored in `split.externalMetadata.orderData`
2. **Backward Compatibility**: Code checks both `orderData` fields and `externalMetadata` fields
3. **Single Source of Truth**: `orderData` is the primary source, with `externalMetadata` as fallback
4. **No Mock Data**: Production code does NOT use mock data - all data comes from Firestore

## Testing

For testing SPEND splits:
1. Use Firebase emulator to create test splits
2. Use `createSplitFromPayment` endpoint with test order data
3. Verify data is stored correctly in Firestore
4. Test frontend components with real Firestore data

**Note**: Mock data files (`SpendMockData.ts`) exist for reference but are NOT used in production code.

