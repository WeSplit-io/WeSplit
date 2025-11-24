# SP3ND Data Format Handling

## Overview
This document describes how WeSplit handles SP3ND order data format in both backend and frontend.

## Backend Data Handling

### Order Data Extraction
The backend Firebase function `createSplitFromPayment` handles SP3ND order data in multiple formats:

1. **Root Level**: `paymentData.order` - Full SP3ND order object at root level
2. **Metadata Level**: `paymentData.metadata.order` or `paymentData.metadata.orderData` - Order nested in metadata

The function checks in this order:
```javascript
const sp3ndOrder = paymentData.order || metadata.orderData || metadata.order || null;
```

### Amount Extraction
- **Primary**: Uses `sp3ndOrder.total_amount` if available
- **Fallback**: Uses `paymentData.amount`
- **Currency**: Uses `sp3ndOrder.payment_method` (SOL/USDC/BONK) or `paymentData.currency`

### Items Extraction
- **Primary**: Uses `sp3ndOrder.items` array from SP3ND order
- **Fallback**: Uses `paymentData.items` array
- Each item supports full SP3ND item structure:
  - `product_title` (preferred over `name`)
  - `product_id`, `product_url`
  - `image_url` or `image`
  - `variants` array
  - `isPrimeEligible` flag

### Order Metadata Storage
The full SP3ND order is stored in `split.externalMetadata.orderData` with all fields:
- Order identification: `id`, `order_number`
- Status: `status`
- Store: `store` (amazon, temu, jumia)
- Financial: `subtotal`, `tax_amount`, `shipping_amount`, `total_amount`, etc.
- Shipping: `shipping_address`, `tracking_number`, `tracking_url`
- Items: Full `items` array
- Timestamps: `created_at`, `updated_at`, etc.

## Frontend Data Handling

### Order Data Extraction
The frontend extracts SP3ND order data from `split.externalMetadata`:

```typescript
const externalMetadata = split.externalMetadata || {};
const orderData = externalMetadata.orderData || {};

// Order identification
const orderId = orderData.id || orderData.order_number || externalMetadata.orderId;
const orderNumber = orderData.order_number || externalMetadata.orderNumber;
const orderStatus = orderData.status || externalMetadata.orderStatus;
const store = orderData.store || externalMetadata.store;
```

### Order Number Formatting
- Extracts numeric part from formats like "ORD-1234567890" → "1234567890"
- Displays as "Order #1234567890" in UI

### Status Mapping
SP3ND status values are mapped to display text:
- `Created`, `Payment_Pending` → "Pending"
- `Funded`, `Paid` → "Paid"
- `Processing`, `Ordered` → "Processing"
- `Shipped`, `Partially_Shipped` → "Shipped"
- `Delivered`, `Partially_Delivered` → "Delivered"
- `Completed` → "Completed"
- `Canceled`, `Cancelled` → "Canceled"
- `Refunded` → "Refunded"
- `International_Processing` → "Processing"
- `Ready_for_Payment` → "Ready"
- `International_Paid` → "Paid"

### Items Display
Items are extracted in priority order:
1. `split.externalMetadata.orderData.items` (from SP3ND order)
2. `split.externalMetadata.items` (from metadata)
3. `split.items` (from split data)

Each item displays:
- Product image (if `image_url` available)
- Product title (`product_title` or `name`)
- Variants (if available)
- Quantity and price
- Prime badge (if `isPrimeEligible`)

## Data Flow

### SP3ND → WeSplit API
```
SP3ND sends:
{
  "email": "user@example.com",
  "amount": 116.71,
  "currency": "USDC",
  "metadata": {
    "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
    "orderId": "abc123def456",
    "webhookUrl": "https://...",
    "webhookSecret": "...",
    "order": {  // OR "orderData": { ... }
      "id": "abc123def456",
      "order_number": "ORD-1234567890",
      "status": "Payment_Pending",
      "store": "amazon",
      "total_amount": 116.71,
      "items": [...],
      ...
    }
  }
}
```

### WeSplit Storage
```
split: {
  "id": "split_...",
  "title": "Order ORD-1234567890",
  "totalAmount": 116.71,
  "currency": "USDC",
  "splitType": "spend",
  "items": [...],  // Transformed items
  "externalMetadata": {
    "paymentMode": "merchant_gateway",
    "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
    "orderId": "abc123def456",
    "orderNumber": "ORD-1234567890",
    "orderStatus": "Payment_Pending",
    "store": "amazon",
    "orderData": {  // Full SP3ND order
      "id": "abc123def456",
      "order_number": "ORD-1234567890",
      "status": "Payment_Pending",
      "store": "amazon",
      "items": [...],
      ...
    }
  }
}
```

### Frontend Display
- **Header**: Shows "Order #1234567890" with status badge "Pending"
- **Items**: Displays product images, titles, variants from `orderData.items`
- **Progress**: Shows collection progress toward `total_amount`
- **Participants**: Shows wallet addresses and amounts

## Timestamp Handling
The backend handles multiple timestamp formats:
- ISO 8601 string: `"2024-01-15T10:30:00Z"`
- Firebase Timestamp: `Timestamp` object with `.toDate()` method
- Unix timestamp (ms): `1705315800000`
- Date object: `Date` instance

All are normalized to ISO 8601 strings for storage and display.

## Testing
To test with SP3ND order format:
1. Send POST to `/createSplitFromPayment` with `metadata.order` containing full SP3ND order
2. Verify split is created with `splitType: 'spend'`
3. Check `externalMetadata.orderData` contains full order
4. Verify frontend displays order number, status, and items correctly

## Notes
- All SP3ND order fields are preserved in `orderData` for future use
- Frontend gracefully falls back if order data is missing
- Amount formatting uses comma separators for thousands (e.g., "1,234.56 USDC")
- Order number extraction handles both "ORD-1234567890" and plain numeric formats

