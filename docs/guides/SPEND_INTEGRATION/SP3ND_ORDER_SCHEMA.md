# SP3ND Order JSON Schema

## Overview
This document describes the JSON structure of SP3ND Order objects for integration with WeSplit.

## Complete Order Schema

### Root Order Object

```json
{
  "id": "string (required)",
  "order_number": "string (optional)",
  "user_id": "string (required)",
  "user_wallet": "string (optional)",
  "customer_email": "string (optional)",
  "status": "string (required)",
  "created_at": "timestamp (optional)",
  "updated_at": "timestamp (optional)",
  "store": "string (required)",
  "items": "array of OrderItem (optional)",
  "subtotal": "number (optional)",
  "discount": "number (optional)",
  "voucher_code": "string (optional)",
  "voucher_id": "string (optional)",
  "fx_conversion_fee": "number (optional)",
  "tax_amount": "number (optional)",
  "shipping_amount": "number (optional)",
  "no_kyc_fee": "number (optional)",
  "total_amount": "number (optional)",
  "usd_total_at_payment": "number (optional)",
  "shipping_address": "ShippingAddress (optional)",
  "shipping_country": "string (optional)",
  "shipping_option": "string (optional)",
  "is_international_shipping": "boolean (optional)",
  "payment_method": "string (optional)",
  "transaction_signature": "string (optional)",
  "transaction_state": "string (optional)",
  "payment_initiated_at": "timestamp (optional)",
  "payment_confirmed_at": "timestamp (optional)",
  "payment_verified_at": "timestamp (optional)",
  "reference_number": "string (optional)",
  "tracking_number": "string (optional)",
  "tracking_url": "string (optional)",
  "additional_notes": "string (optional)",
  "amazonOrderIds": "array of strings (optional)",
  "shippedAmazonOrderIds": "array of strings (optional)",
  "deliveredAmazonOrderIds": "array of strings (optional)",
  "deliveredAt": "timestamp (optional)",
  "lastStatusChangeAt": "timestamp (optional)",
  "nextPollAt": "timestamp (optional)",
  "international_processing": "InternationalProcessing (optional)",
  "international_submitted_at": "timestamp (optional)",
  "international_ready_at": "timestamp (optional)",
  "international_payment_completed_at": "timestamp (optional)",
  "selected_shipping_method": "ShippingMethod (optional)"
}
```

### OrderItem Schema

```json
{
  "name": "string (optional)",
  "product_title": "string (optional)",
  "product_id": "string (optional)",
  "product_url": "string (optional)",
  "url": "string (optional)",
  "price": "number (required, default: 0.0)",
  "quantity": "number (required, default: 1)",
  "category": "string (optional, default: 'general')",
  "image": "string (optional)",
  "image_url": "string (optional)",
  "isPrimeEligible": "boolean (optional)",
  "variants": "array of ProductVariant (optional)"
}
```

### ProductVariant Schema

```json
{
  "type": "string (required)",
  "value": "string (required)"
}
```

### ShippingAddress Schema

```json
{
  "name": "string (required)",
  "city": "string (required)",
  "state": "string (required)",
  "country": "string (required)",
  "address1": "string (required)",
  "address2": "string (optional)",
  "postal_code": "string (required)",
  "phone": "string (optional)",
  "recipient": "string (optional)",
  "street": "string (optional)",
  "line1": "string (optional)",
  "line2": "string (optional)",
  "zip": "string (optional)",
  "email": "string (optional)",
  "delivery_type": "string (optional)",
  "pickup_location_id": "string (optional)",
  "pickup_location_name": "string (optional)",
  "pickup_location_address": "string (optional)"
}
```

### ShippingMethod Schema

```json
{
  "name": "string (required)",
  "price": "string (required)",
  "minDays": "string (required)",
  "maxDays": "string (required)"
}
```

### InternationalProcessing Schema

```json
{
  "shippingMethods": "array of ShippingMethod (optional)",
  "customsFee": "number (optional)",
  "conversionFee": "number (optional)",
  "internationalTax": "number (optional)",
  "customMessage": "string (optional)",
  "processedBy": "string (optional)",
  "processedAt": "timestamp (optional)"
}
```

## Field Descriptions

### Order Fields

- **id**: Unique order identifier (Firebase document ID)
- **order_number**: Human-readable order number (e.g., "ORD-1234567890")
- **user_id**: Firebase user ID
- **user_wallet**: Solana wallet address
- **customer_email**: Customer email address
- **status**: Order status (see Status Values below)
- **store**: Store identifier ("amazon", "temu", "jumia")
- **items**: Array of order items
- **subtotal**: Subtotal before fees/taxes
- **discount**: Voucher discount amount
- **voucher_code**: Voucher code used (e.g., "A23H-K9P7-QW4X")
- **voucher_id**: Firebase voucher document ID
- **fx_conversion_fee**: Foreign exchange conversion fee
- **tax_amount**: Tax amount
- **shipping_amount**: Shipping cost
- **no_kyc_fee**: Platform fee (5% or $0.50 minimum)
- **total_amount**: Final total amount
- **payment_method**: Payment method used ("SOL", "USDC", "BONK")
- **transaction_signature**: Solana transaction signature
- **tracking_number**: Shipping tracking number
- **tracking_url**: URL to track shipment

### Status Values

- `Created` - Order created, awaiting payment
- `Payment_Pending` - Payment transaction initiated
- `Funded` - Payment confirmed (Supabase)
- `Processing` - Order being processed
- `Paid` - Payment confirmed (Firebase)
- `Ordered` - Order placed with store
- `Shipped` - Order shipped
- `Partially_Shipped` - Some items shipped
- `Delivered` - Order delivered
- `Partially_Delivered` - Some items delivered
- `Completed` - Order completed
- `Canceled` / `Cancelled` - Order canceled
- `Refunded` - Order refunded
- `International_Processing` - International order processing
- `Ready_for_Payment` - International order ready for payment
- `International_Paid` - International order paid

### Timestamp Format

Timestamps can be:
- Firebase Timestamp object
- ISO 8601 string (e.g., "2024-01-15T10:30:00Z")
- Unix timestamp (milliseconds as number)
- Date object

## Example Order JSON

See `SP3ND_ORDER_JSON_MODEL.json` for a complete example with sample data.

## Notes for WeSplit Integration

When mapping SP3ND Order to WeSplit format:

1. **invoiceId**: Format as `AMZ-ORD-{order.id}`
2. **amount**: Use `total_amount` (in USDC)
3. **items**: Map `items` array to WeSplit items format
4. **email**: Use `customer_email` or `user_id` email
5. **merchant.name**: Use `store` value (typically "Amazon")
6. **metadata**: Include order-specific data like `order_number`, `amazonOrderIds`, etc.

## Contact

For questions about the Order schema:
- SP3ND Team
- See WeSplit integration: `WESPLIT_INTEGRATION.md`

